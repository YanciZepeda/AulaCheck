#!/usr/bin/env python3
import sys
import json
import argparse
import numpy as np # type: ignore[reportMissingModuleSource]
import cv2 # type: ignore[reportMissingModuleSource]

def decode_qr_code(image):
    metadata = None
    qr_detector = cv2.QRCodeDetector()
    val, points, _ = qr_detector.detectAndDecode(image)
    if val:
        try:
            metadata = json.loads(val)
            return metadata, points
        except Exception:
            return {"raw": val}, points
    return metadata, None

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def find_fiducial_markers_and_warp(image, target_width=612, target_height=792):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    
    # Intentar buscar cuadros fiduciarios
    _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    h, w = gray.shape[:2]
    candidate_squares = []

    for c in contours:
        area = cv2.contourArea(c)
        if (w * h) * 0.0003 < area < (w * h) * 0.08:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.04 * peri, True)
            if len(approx) == 4 and cv2.isContourConvex(approx):
                (x, y, cw, ch) = cv2.boundingRect(approx)
                aspect_ratio = cw / float(ch)
                if 0.75 <= aspect_ratio <= 1.25:
                    M = cv2.moments(c)
                    if M["m00"] != 0:
                        candidate_squares.append([int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])])

    if len(candidate_squares) >= 4:
        candidate_squares = np.array(candidate_squares, dtype="float32")
        corners = np.zeros((4, 2), dtype="float32")
        corners[0] = candidate_squares[np.argmin(candidate_squares[:, 0] + candidate_squares[:, 1])]
        corners[2] = candidate_squares[np.argmax(candidate_squares[:, 0] + candidate_squares[:, 1])]
        corners[1] = candidate_squares[np.argmax(candidate_squares[:, 0] - candidate_squares[:, 1])]
        corners[3] = candidate_squares[np.argmin(candidate_squares[:, 0] - candidate_squares[:, 1])]

        ordered = order_points(corners)
        dst = np.array([[0, 0], [target_width - 1, 0], [target_width - 1, target_height - 1], [0, target_height - 1]], dtype="float32")
        M = cv2.getPerspectiveTransform(ordered, dst)
        return cv2.warpPerspective(image, M, (target_width, target_height)), True

    # Respaldo: Redimensionar directamente si no se detectan esquinas
    return cv2.resize(image, (target_width, target_height)), False

def detect_filled_bubbles(warped_image, total_questions=10, options=('A', 'B', 'C', 'D')):
    gray = cv2.cvtColor(warped_image, cv2.COLOR_BGR2GRAY) if len(warped_image.shape) == 3 else warped_image
    
    # CLAHE para neutralizar sombras
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

    detected_answers = {}
    bubble_radius = 8  
    y_start = 302      
    y_spacing = 38.5   
    x_start = 475      
    x_spacing = 32     

    annotated = warped_image.copy()

    for q in range(1, total_questions + 1):
        q_y = int(y_start + (q - 1) * y_spacing)
        bubble_pixel_counts = []

        for opt_idx, opt in enumerate(options):
            b_x = int(x_start + (opt_idx * x_spacing))
            b_y = q_y

            mask = np.zeros(thresh.shape, dtype="uint8")
            cv2.circle(mask, (b_x, b_y), bubble_radius, 255, -1)

            mask_pixels = cv2.bitwise_and(thresh, thresh, mask=mask)
            total_dark_pixels = cv2.countNonZero(mask_pixels)
            bubble_pixel_counts.append((total_dark_pixels, opt, (b_x, b_y)))

        bubble_pixel_counts.sort(key=lambda x: x[0], reverse=True)
        top_pixels, top_opt, top_coords = bubble_pixel_counts[0]
        second_pixels, _, _ = bubble_pixel_counts[1]

        # Umbral ultra sensible (12% de área) para asegurar lectura bajo sombras
        min_fill_threshold = int(np.pi * (bubble_radius ** 2) * 0.12)
        
        print(f"Pregunta {q}: Top={top_opt} ({top_pixels} px) | 2da opción ({second_pixels} px)")

        if top_pixels > min_fill_threshold and (top_pixels > second_pixels * 1.10):
            detected_answers[q] = top_opt
            cv2.circle(annotated, top_coords, bubble_radius + 4, (0, 200, 0), 2)
            cv2.putText(annotated, f"Q{q}:{top_opt}", (top_coords[0] + 12, top_coords[1] + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 180, 0), 1)
        else:
            detected_answers[q] = None
            cv2.circle(annotated, (x_start, q_y), bubble_radius + 2, (0, 0, 255), 1)

    return detected_answers, annotated

def evaluate_exam(detected_answers, answer_key, max_score=10.0):
    total = len(answer_key)
    correct_count = 0
    details = []

    for q, correct_opt in answer_key.items():
        q_num = int(q)
        student_ans = detected_answers.get(q_num)
        is_correct = (student_ans == correct_opt)
        if is_correct:
            correct_count += 1
        details.append({
            "question": q_num,
            "studentAnswer": student_ans or "SIN_MARCAR",
            "correctAnswer": correct_opt,
            "isCorrect": is_correct
        })

    score = round((correct_count / total) * max_score, 1) if total > 0 else 0.0
    return {
        "correctCount": correct_count,
        "totalQuestions": total,
        "score": score,
        "isApproved": score >= 6.0,
        "details": details
    }

def process_exam_image(image_path, answer_key=None, output_annotated="examen_calificado.jpg"):
    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"No se pudo cargar la imagen desde {image_path}"}

    qr_data, _ = decode_qr_code(img)
    warped, warped_success = find_fiducial_markers_and_warp(img)

    total_q = qr_data.get("totalQuestions", 10) if qr_data else 10
    detected, annotated = detect_filled_bubbles(warped, total_questions=total_q)

    if not answer_key:
        answer_key = {i: "A" if i % 2 == 1 else "B" for i in range(1, total_q + 1)}

    evaluation = evaluate_exam(detected, answer_key)
    cv2.imwrite(output_annotated, annotated)

    return {
        "status": "success",
        "qrMetadata": qr_data,
        "perspectiveTransformed": warped_success,
        "evaluation": evaluation,
        "annotatedImagePath": output_annotated
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--key", default=None)
    parser.add_argument("--output", default="examen_calificado.jpg")
    args = parser.parse_args()
    key_dict = json.loads(args.key) if args.key else None
    res = process_exam_image(args.image, key_dict, args.output)
    print(json.dumps(res, indent=2, ensure_ascii=False))