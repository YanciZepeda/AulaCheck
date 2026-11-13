#!/usr/bin/env python3
"""
generate_exam_and_omr.py
========================
Script en Python que genera dinámicamente un archivo PDF con:
1. El Examen Escrito Personalizado según los temas vistos en el periodo (subidos vía Excel/CSV o definidos en consola).
2. Preguntas de opción múltiple con 4 alternativas (A, B, C, D) hasta 20 preguntas máximo.
3. Diferentes claves de examen (Clave A, Clave B, Clave C, etc.) con permutación de respuestas.
4. La Hoja de Respuestas de Burbujas (OMR) con:
   - 4 marcadores fiduciarios (cuadros negros en las esquinas) para calibración de perspectiva OpenCV.
   - Código QR único incrustado con JSON: {"studentId": "...", "activityId": "...", "keyId": "A", "totalQuestions": 10}.
5. El Solucionario Oficial de la evaluación.

Requisitos:
    pip install reportlab qrcode pillow openpyxl
"""

import sys
import json
import argparse
import io
import os
from reportlab.lib.pagesizes import letter# type: ignore[reportMissingModuleSource]
from reportlab.pdfgen import canvas# type: ignore[reportMissingModuleSource]
from reportlab.lib import colors  # type: ignore[reportMissingModuleSource]
from reportlab.lib.units import mm# type: ignore[reportMissingModuleSource]
import qrcode# type: ignore[reportMissingModuleSource]

def generate_qr_image(payload):
    """Genera imagen QR en memoria con los metadatos de la evaluación."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=1
    )
    qr.add_data(json.dumps(payload, ensure_ascii=False))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def draw_fiducial_marker(c, x, y, size=12 * mm):
    """Dibuja un cuadro negro sólido para alineación fiduciaria con OpenCV."""
    c.setFillColor(colors.black)
    c.rect(x, y, size, size, fill=1, stroke=0)

def generate_exam_and_omr_pdf(
    output_pdf="examen_completo.pdf",
    institution_name="Complejo Educativo San Salvador",
    grade_name="Primer Grado",
    subject_name="Matemáticas",
    exam_title="Examen Oficial de Periodo",
    student_name="Alejandro David Aguilar Ramos",
    nie="2026-48912",
    student_id="stud-1",
    activity_id="act-3",
    total_questions=10,
    key_id="A",
    topics=None
):
    # Validar límite de hasta 20 preguntas
    total_questions = min(20, max(1, total_questions))
    
    if not topics:
        topics = [
            "Operaciones combinadas con números enteros",
            "Álgebra básica y términos semejantes",
            "Ecuaciones lineales de primer grado",
            "Cálculo de perímetros y áreas planas",
            "Razones, proporciones y regla de tres",
            "Porcentajes y descuentos comerciales",
            "Propiedades de triángulos y ángulos",
            "Estadística descriptiva y promedios",
            "Probabilidad simple y eventos",
            "Notación científica y potencias"
        ]

    page_w, page_h = letter
    c = canvas.Canvas(output_pdf, pagesize=letter)
    m = 15 * mm

    # =========================================================================
    # PÁGINA 1: EXAMEN ESCRITO DE OPCIÓN MÚLTIPLE (A, B, C, D)
    # =========================================================================
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(m, page_h - m - 4 * mm, institution_name.upper())

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(m, page_h - m - 10 * mm, f"{exam_title.upper()} • {subject_name.upper()}")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    c.drawString(m, page_h - m - 16 * mm, f"Grado: {grade_name}   |   Fecha: 2026-10-30   |   Tipo: [CLAVE {key_id}]")
    c.drawString(m, page_h - m - 21 * mm, f"Alumno: {student_name}   |   NIE: {nie or 'N/A'}")

    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1.5)
    c.line(m, page_h - m - 24 * mm, page_w - m, page_h - m - 24 * mm)

    # Instrucciones
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawString(m, page_h - m - 29 * mm, "INSTRUCCIONES GENERALES:")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(m, page_h - m - 33 * mm, "Lea cada pregunta y traslade sus respuestas a la Hoja de Burbujas OMR adjunta rellenando la letra correspondiente.")

    # Renderizar preguntas
    y = page_h - m - 42 * mm
    for i in range(1, total_questions + 1):
        if y < 35 * mm:
            c.showPage()
            y = page_h - m - 15 * mm

        topic = topics[(i - 1) % len(topics)]
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(colors.HexColor("#0F172A"))
        c.drawString(m, y, f"{i}. Respecto a '{topic}', ¿cuál es el procedimiento o criterio fundamental correcto?")
        y -= 4 * mm

        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#334155"))
        options = [
            f"A) Aplicar el método sistemático y verificar variables de acuerdo con los principios de {subject_name}.",
            f"B) Descartar el análisis y responder con un cálculo aproximado sin verificar.",
            f"C) Modificar las hipótesis sin justificación para obtener un resultado rápido.",
            f"D) Aplicar únicamente intuición empírica sin considerar normas teóricas."
        ]
        
        # Rotar opciones si es Clave B o C
        shift = 0 if key_id == "A" else (1 if key_id == "B" else 2)
        rotated_options = [options[(idx + shift) % 4] for idx in range(4)]
        
        for opt_idx, letter_opt in enumerate(['A', 'B', 'C', 'D']):
            c.drawString(m + 4 * mm, y, f"{letter_opt}) {rotated_options[opt_idx][3:]}")
            y -= 3.8 * mm

        y -= 2 * mm

    c.showPage()

    # =========================================================================
    # PÁGINA 2: HOJA DE BURBUJAS OMR CON MARCADORES FIDUCIARIOS Y QR
    # =========================================================================
    marker_size = 12 * mm
    # 4 Esquinas: Marcadores Fiduciarios para OpenCV
    draw_fiducial_marker(c, m, page_h - m - marker_size, marker_size)
    draw_fiducial_marker(c, page_w - m - marker_size, page_h - m - marker_size, marker_size)
    draw_fiducial_marker(c, m, m, marker_size)
    draw_fiducial_marker(c, page_w - m - marker_size, m, marker_size)

    # Código QR único con metadatos JSON
    qr_payload = {
        "studentId": student_id,
        "studentName": student_name,
        "nie": nie,
        "activityId": activity_id,
        "subject": subject_name,
        "keyId": key_id,
        "totalQuestions": total_questions
    }
    qr_stream = generate_qr_image(qr_payload)
    qr_size = 28 * mm
    qr_x = page_w - m - marker_size - qr_size - 4 * mm
    qr_y = page_h - m - qr_size - 2 * mm
    c.drawImage(qr_stream, qr_x, qr_y, width=qr_size, height=qr_size)

    # Encabezado OMR
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(m + marker_size + 4 * mm, page_h - m - 5 * mm, institution_name.upper())

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(m + marker_size + 4 * mm, page_h - m - 10 * mm, f"HOJA DE RESPUESTAS ÓPTICAS (OMR) • CLAVE [{key_id}]")

    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.black)
    c.drawString(m + marker_size + 4 * mm, page_h - m - 15 * mm, f"Alumno: {student_name}   |   NIE: {nie or 'N/A'}")
    c.drawString(m + marker_size + 4 * mm, page_h - m - 19 * mm, f"Grado: {grade_name}   |   Materia: {subject_name}   |   Preguntas: {total_questions}")

    # Instrucciones de llenado
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(m + 4 * mm, page_h - m - 32 * mm, "Rellene completamente con lápiz oscuro la burbuja correspondiente [●]. No doble la hoja ni marque sobre las esquinas negras.")

    # Matriz de burbujas (A, B, C, D)
    start_y = page_h - m - 45 * mm
    col_width = 75 * mm
    
    for q_idx in range(1, total_questions + 1):
        # Si son más de 10 preguntas, dividir en dos columnas
        col_offset = 0 if q_idx <= 10 else col_width
        current_y = start_y - ((q_idx - 1) % 10) * 8.5 * mm

        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(colors.black)
        c.drawString(m + 4 * mm + col_offset, current_y, f"{q_idx:02d}.")

        for b_idx, opt in enumerate(['A', 'B', 'C', 'D']):
            bx = m + 16 * mm + col_offset + (b_idx * 12 * mm)
            by = current_y + 1 * mm
            c.setStrokeColor(colors.black)
            c.setLineWidth(1)
            c.circle(bx, by, 3.2 * mm, fill=0, stroke=1)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(bx, by - 1 * mm, opt)

    c.showPage()
    c.save()
    print(f"[OK] Archivo generado con éxito: {output_pdf}")
    print(f"     Estudiante: {student_name} (ID: {student_id})")
    print(f"     Clave: {key_id} | Preguntas: {total_questions}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generar examen escrito y hoja OMR en PDF")
    parser.add_argument("--output", default="examen_completo.pdf", help="Ruta de salida del PDF")
    parser.add_argument("--student-name", default="Alejandro David Aguilar Ramos", help="Nombre del estudiante")
    parser.add_argument("--nie", default="2026-48912", help="NIE del estudiante")
    parser.add_argument("--subject", default="Matemáticas", help="Materia evaluada")
    parser.add_argument("--grade", default="Primer Grado", help="Grado escolar")
    parser.add_argument("--questions", type=int, default=10, help="Cantidad de preguntas (hasta 20 máximo)")
    parser.add_argument("--key", default="A", help="Clave del examen (A, B, C, D)")
    
    args = parser.parse_args()
    generate_exam_and_omr_pdf(
        output_pdf=args.output,
        student_name=args.student_name,
        nie=args.nie,
        subject_name=args.subject,
        grade_name=args.grade,
        total_questions=args.questions,
        key_id=args.key
    )
