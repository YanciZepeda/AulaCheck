#!/usr/bin/env python3
"""
generate_bubble_sheet.py
========================
Script en Python para generar dinámicamente hojas de respuestas de burbujas (OMR)
en formato PDF con:
1. Marcadores fiduciarios (cuadros negros sólidos en las 4 esquinas) para alineación.
2. Código QR único incrustado con JSON: {"studentId": "...", "activityId": "...", "examTitle": "..."}.
3. Burbujas A, B, C, D para N preguntas (10, 20, 25, 50, etc.).
4. Datos del alumno, NIE, materia y grado.

Requisitos:
    pip install reportlab qrcode pillow
"""

import sys
import json
import argparse
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import mm
import qrcode

def generate_qr_image(data_dict):
    """Genera una imagen en memoria del código QR con el JSON de metadatos."""
    qr_data_str = json.dumps(data_dict, ensure_ascii=False)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=1,
    )
    qr.add_data(qr_data_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr

def draw_fiducial_marker(c, x, y, size=14 * mm):
    """Dibuja un marcador fiduciario (cuadro negro sólido) en las coordenadas dadas."""
    c.setFillColor(colors.black)
    c.rect(x, y, size, size, fill=1, stroke=0)

def generate_bubble_sheet_pdf(
    output_pdf_path="hoja_respuestas.pdf",
    student_id="stud-1",
    student_name="Alejandro David Aguilar Ramos",
    nie="2026-48912",
    institution_name="Complejo Educativo San Salvador",
    grade_name="Primer Grado - Sección A",
    subject_name="Matemáticas",
    activity_id="act-3",
    exam_title="Examen Oficial de Periodo 1",
    total_questions=10,
    exam_key_id="A"
):
    # Dimensiones de página Letter: 215.9 mm x 279.4 mm
    page_width, page_height = letter
    c = canvas.Canvas(output_pdf_path, pagesize=letter)
    
    margin = 15 * mm
    marker_size = 12 * mm

    # 1. MARCADORES FIDUCIARIOS EN LAS 4 ESQUINAS (Para Perspective Transform con OpenCV)
    # Esquina Superior Izquierda
    draw_fiducial_marker(c, margin, page_height - margin - marker_size, marker_size)
    # Esquina Superior Derecha
    draw_fiducial_marker(c, page_width - margin - marker_size, page_height - margin - marker_size, marker_size)
    # Esquina Inferior Izquierda
    draw_fiducial_marker(c, margin, margin, marker_size)
    # Esquina Inferior Derecha
    draw_fiducial_marker(c, page_width - margin - marker_size, margin, marker_size)

    # 2. ENCABEZADO INSTITUCIONAL
    header_x = margin + marker_size + 5 * mm
    header_y = page_height - margin - 4 * mm

    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(header_x, header_y, institution_name.upper())

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(header_x, header_y - 5 * mm, f"HOJA DE RESPUESTAS ÓPTICA (OMR) • {exam_title}")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    c.drawString(header_x, header_y - 10 * mm, f"Estudiante: {student_name}   |   NIE: {nie or 'N/A'}")
    c.drawString(header_x, header_y - 14 * mm, f"Grado: {grade_name}   |   Materia: {subject_name}   |   Tipo de Clave: [{exam_key_id}]")

    # 3. CÓDIGO QR ÚNICO CON METADATOS JSON
    qr_metadata = {
        "studentId": student_id,
        "studentName": student_name,
        "nie": nie,
        "activityId": activity_id,
        "subject": subject_name,
        "examTitle": exam_title,
        "totalQuestions": total_questions,
        "keyId": exam_key_id
    }
    qr_stream = generate_qr_image(qr_metadata)
    qr_size = 28 * mm
    qr_x = page_width - margin - marker_size - qr_size - 4 * mm
    qr_y = page_height - margin - qr_size - 2 * mm
    
    # Dibujar QR y marco
    c.setStrokeColor(colors.HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.rect(qr_x - 1 * mm, qr_y - 1 * mm, qr_size + 2 * mm, qr_size + 2 * mm, fill=0, stroke=1)
    c.drawImage(qr_stream, qr_x, qr_y, width=qr_size, height=qr_size)
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 3 * mm, "CÓDIGO QR DE IDENTIFICACIÓN")

    # Línea divisoria decorativa
    divider_y = page_height - margin - 35 * mm
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1.5)
    c.line(margin + 2 * mm, divider_y, page_width - margin - 2 * mm, divider_y)

    # 4. INSTRUCCIONES DE LLENADO
    inst_y = divider_y - 6 * mm
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawString(margin + 5 * mm, inst_y, "INSTRUCCIONES PARA EL ESTUDIANTE:")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(margin + 5 * mm, inst_y - 4 * mm, "• Rellene completamente la burbuja de la opción elegida con lápiz o lapicero oscuro (ej: [●]).")
    c.drawString(margin + 5 * mm, inst_y - 8 * mm, "• No haga marcas fuera del círculo ni use corrector líquido sobre los cuadros fiduciarios de las esquinas.")

    # 5. MATRIZ DE BURBUJAS DE RESPUESTA (A, B, C, D)
    options = ['A', 'B', 'C', 'D']
    start_y = inst_y - 18 * mm
    row_height = 8.5 * mm
    col_gap = 12 * mm
    bubble_radius = 2.8 * mm

    # Dibujar encabezados de columnas
    box_x = margin + 15 * mm
    box_width = page_width - 2 * (margin + 15 * mm)
    
    # Contenedor de la cuadrícula
    c.setStrokeColor(colors.HexColor("#2563EB"))
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.roundRect(box_x, margin + marker_size + 8 * mm, box_width, (start_y - (margin + marker_size)) + 4 * mm, 6, fill=1, stroke=1)

    # Título de la tabla de preguntas
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(page_width / 2, start_y + 4 * mm, "TABLA DE RESPUESTAS PARA CALIFICACIÓN AUTOMÁTICA")

    # Columnas: dividir según la cantidad de preguntas
    cols_count = 2 if total_questions > 12 else 1
    questions_per_col = (total_questions + cols_count - 1) // cols_count

    for q in range(1, total_questions + 1):
        col_idx = (q - 1) // questions_per_col
        row_idx = (q - 1) % questions_per_col

        q_center_x = box_x + 18 * mm + col_idx * (box_width / cols_count)
        curr_y = start_y - 5 * mm - row_idx * row_height

        # Número de Pregunta
        c.setFillColor(colors.HexColor("#1E293B"))
        c.setFont("Helvetica-Bold", 10)
        c.drawRightString(q_center_x - 6 * mm, curr_y - 1 * mm, f"{q:02d}.")

        # 4 Burbujas: A, B, C, D
        for opt_idx, opt in enumerate(options):
            b_x = q_center_x + (opt_idx * col_gap)
            b_y = curr_y

            # Círculo exterior de la burbuja
            c.setStrokeColor(colors.HexColor("#1E293B"))
            c.setLineWidth(1.2)
            c.setFillColor(colors.white)
            c.circle(b_x, b_y, bubble_radius, fill=1, stroke=1)

            # Letra interior
            c.setFillColor(colors.HexColor("#1E293B"))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawCentredString(b_x, b_y - 2.5, opt)

    # 6. PIE DE PÁGINA Y MARCADOR DE SINCRONIZACIÓN
    footer_y = margin + 3 * mm
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawCentredString(page_width / 2, footer_y, "EduControl Pro OMR System • Hoja estandarizada para alineación por visión artificial OpenCV")

    c.showPage()
    c.save()
    print(f"[✓] Hoja de burbujas generada exitosamente en: {output_pdf_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generador de Hojas de Burbujas OMR en PDF")
    parser.add_argument("--output", default="hoja_burbujas.pdf", help="Ruta del archivo PDF de salida")
    parser.add_argument("--student-id", default="stud-1", help="ID del estudiante")
    parser.add_argument("--student-name", default="Alejandro David Aguilar Ramos", help="Nombre completo")
    parser.add_argument("--nie", default="2026-48912", help="NIE del estudiante")
    parser.add_argument("--institution", default="Complejo Educativo San Salvador", help="Nombre de la escuela")
    parser.add_argument("--grade", default="Primer Grado - Sección A", help="Grado")
    parser.add_argument("--subject", default="Matemáticas", help="Materia")
    parser.add_argument("--activity-id", default="act-3", help="ID de la evaluación")
    parser.add_argument("--exam-title", default="Examen de Periodo 1", help="Título del examen")
    parser.add_argument("--questions", type=int, default=10, help="Total de preguntas (ej. 10)")
    parser.add_argument("--key", default="A", help="Clave asignada (A, B, C...)")

    args = parser.parse_args()

    generate_bubble_sheet_pdf(
        output_pdf_path=args.output,
        student_id=args.student_id,
        student_name=args.student_name,
        nie=args.nie,
        institution_name=args.institution,
        grade_name=args.grade,
        subject_name=args.subject,
        activity_id=args.activity_id,
        exam_title=args.exam_title,
        total_questions=args.questions,
        exam_key_id=args.key
    )
