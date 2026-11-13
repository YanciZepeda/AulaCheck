import * as XLSX from 'xlsx';
import { ExamQuestion, GeneratedExamKey, FullCustomExam } from '../types';

export const DEFAULT_SUBJECT_TOPICS: Record<string, string[]> = {
  'Matemáticas': [
    'Operaciones combinadas con números enteros y fracciones',
    'Álgebra básica: reducción de términos semejantes y polinomios',
    'Ecuaciones lineales de primer grado con una incógnita',
    'Geometría plana: cálculo de perímetro, área de polígonos y círculos',
    'Razones, proporciones y regla de tres simple',
    'Porcentajes, descuentos e interés simple',
    'Teorema de Pitágoras y propiedades de triángulos',
    'Estadística descriptiva: media aritmética, mediana y moda',
    'Probabilidad clásica y diagramas de árbol',
    'Potenciación, radicación y notación científica'
  ],
  'Lenguaje y Literatura': [
    'Comprensión lectora, análisis inferencial y mensaje explícito',
    'Reglas ortográficas de acentuación: palabras agudas, graves y esdrújulas',
    'Estructura sintáctica de la oración simple: sujeto y predicado',
    'Figuras literarias retóricas: metáfora, símil y personificación',
    'Tipologías textuales: textos narrativos, descriptivos y argumentativos',
    'Uso normativo de grafías: b/v, c/s/z, g/j y signos de puntuación',
    'Estructura del párrafo, conectores lógicos y coherencia textual',
    'Géneros literarios: narrativa, lírica y dramática',
    'Sinónimos, antónimos, homófonos y contexto semántico',
    'El ensayo corto: tesis, argumentos de apoyo y conclusión'
  ],
  'Ciencias Naturales': [
    'El método científico: observación, hipótesis y experimentación',
    'La célula eucariota y procariota: organelos y funciones celulares',
    'Niveles de organización biológica y cadenas tróficas en ecosistemas',
    'Leyes del movimiento de Newton, fuerza y aceleración',
    'Estados de la materia, cambios físicos y reacciones químicas',
    'El ciclo hidrológico del agua y conservación de recursos hídricos',
    'Sistemas del cuerpo humano: digestivo, circulatorio y nervioso',
    'Energía cinética, potencial y fuentes renovables',
    'Genética básica: herencia de caracteres y ADN',
    'Biodiversidad, impacto ambiental y desarrollo sostenible'
  ],
  'Estudios Sociales': [
    'Geografía física, relieve y climatología regional',
    'Pueblos originarios prehispánicos: cultura, legado y cosmovisión',
    'El proceso de Independencia y conformación del Estado republicano',
    'Estructura democrática: poderes legislativo, ejecutivo y judicial',
    'Derechos humanos fundamentales y deberes según la Constitución',
    'Sectores económicos: primario, secundario y terciario',
    'Cultura de paz, resolución pacífica de conflictos y diálogo social',
    'Patrimonio cultural, tradiciones e identidad nacional',
    'Demografía, migración y urbanización en el siglo XXI',
    'Educación cívica y participación ciudadana responsable'
  ],
  'Inglés': [
    'Present simple tense vs. Present continuous usage',
    'Daily routines, hobbies and time expressions (adverbs of frequency)',
    'Wh- question words: Who, What, Where, When, Why and How',
    'Comparative and superlative adjectives in sentences',
    'Reading comprehension: extracting main ideas and details',
    'Prepositions of place and time: in, on, at, under, next to',
    'Past simple tense: regular and irregular common verbs',
    'Vocabulary in context: technology, environment and school life',
    'Modal verbs for permission and obligation: can, must, should',
    'Future tense with will and be going to'
  ]
};

/**
 * Parsea un archivo subido por el maestro (Excel, CSV, TXT) para extraer la lista de temas vistos.
 */
export async function parseExamTopicsFile(file: File): Promise<{ topics: string[]; fileName: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (extension === 'xlsx' || extension === 'xls') {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const extractedTopics: string[] = [];
          rows.forEach((row) => {
            if (!Array.isArray(row)) return;
            row.forEach((cell) => {
              if (typeof cell === 'string') {
                const cleaned = cell.trim().replace(/^[\d\.\-\*\•\)]+\s*/, '');
                // Ignorar encabezados obvios o celdas demasiado cortas
                if (
                  cleaned.length >= 4 &&
                  !/^(n°|no\.|id|fecha|docente|grado|materia|periodo|semana|unidad)$/i.test(cleaned) &&
                  !extractedTopics.includes(cleaned)
                ) {
                  extractedTopics.push(cleaned);
                }
              }
            });
          });

          if (extractedTopics.length === 0) {
            resolve({
              topics: ['Unidad Temática General', 'Conceptos Clave del Periodo', 'Aplicación Práctica'],
              fileName: file.name
            });
          } else {
            resolve({ topics: extractedTopics.slice(0, 30), fileName: file.name });
          }
        } catch (err) {
          reject(new Error('No se pudo leer el archivo Excel. Asegúrate de que no esté corrupto o protegido.'));
        }
      };
      reader.onerror = () => reject(new Error('Error de lectura de archivo'));
      reader.readAsArrayBuffer(file);
    } else {
      // Archivo de texto, CSV o documento plano
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/);
          const extractedTopics: string[] = [];

          lines.forEach((line) => {
            const cleaned = line
              .trim()
              .replace(/^[0-9]+[\.\-\)\:]\s*/, '')
              .replace(/^[\-\*\•]\s*/, '')
              .trim();

            if (cleaned.length >= 4 && !extractedTopics.includes(cleaned)) {
              // Dividir por comas si es CSV de una sola línea
              if (cleaned.includes(',') && !cleaned.includes('.')) {
                cleaned.split(',').forEach((sub) => {
                  const sClean = sub.trim();
                  if (sClean.length >= 4 && !extractedTopics.includes(sClean)) {
                    extractedTopics.push(sClean);
                  }
                });
              } else {
                extractedTopics.push(cleaned);
              }
            }
          });

          if (extractedTopics.length === 0) {
            resolve({
              topics: ['Concepto Central del Periodo', 'Habilidades y Procedimientos', 'Evaluación de Criterios'],
              fileName: file.name
            });
          } else {
            resolve({ topics: extractedTopics.slice(0, 30), fileName: file.name });
          }
        } catch (err) {
          reject(new Error('No se pudo procesar el archivo de texto.'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de texto'));
      reader.readAsText(file);
    }
  });
}

/**
 * Banco de plantillas pedagógicas para generar preguntas de opción múltiple contextualizadas.
 */
interface QuestionTemplate {
  questionPattern: (topic: string, subject: string, index: number) => string;
  generateOptions: (topic: string, subject: string, index: number) => {
    correct: string;
    distractors: [string, string, string];
    explanation: string;
  };
}

const QUESTION_PATTERNS: QuestionTemplate[] = [
  {
    questionPattern: (t, s, i) => `Respecto a "${t}", ¿cuál de las siguientes afirmaciones describe de manera correcta su principio fundamental?`,
    generateOptions: (t, s, i) => ({
      correct: `Constituye un proceso estructurado esencial para resolver problemas y aplicar conceptos clave de ${s}.`,
      distractors: [
        `Es un elemento secundario que únicamente se aplica de forma teórica sin relevancia práctica.`,
        `Se limita exclusivamente a definiciones memorísticas sin conexión con otros temas de ${s}.`,
        `Es un procedimiento obsoleto que ha sido reemplazado por metodologías no comprobadas.`
      ],
      explanation: `El concepto "${t}" es fundamental para el razonamiento y la aplicación práctica de ${s}.`
    })
  },
  {
    questionPattern: (t, s, i) => `En una situación práctica relacionada con "${t}", ¿cuál es el paso o criterio determinante a seguir?`,
    generateOptions: (t, s, i) => ({
      correct: `Analizar los datos iniciales, identificar variables relevantes y verificar los resultados de acuerdo con los estándares establecidos.`,
      distractors: [
        `Omitir la fase de análisis y proceder con una respuesta estimada al azar.`,
        `Modificar las variables sin justificación metodológica para forzar un resultado rápido.`,
        `Considerar únicamente la intuición sin contrastar con las normas y leyes de ${s}.`
      ],
      explanation: `La resolución rigurosa en "${t}" requiere análisis sistemático y verificación de variables.`
    })
  },
  {
    questionPattern: (t, s, i) => `¿Cuál de las siguientes opciones representa el beneficio o aplicación más destacada de dominar "${t}"?`,
    generateOptions: (t, s, i) => ({
      correct: `Permite comprender relaciones complejas, optimizar soluciones y formular conclusiones fundamentadas en evidencias.`,
      distractors: [
        `Garantiza memorizar fórmulas o fechas sin necesidad de comprender su significado lógico.`,
        `Reduce la necesidad de argumentación y pensamiento crítico en evaluaciones.`,
        `Aísla el conocimiento impidiendo su integración con otras disciplinas escolares.`
      ],
      explanation: `Dominar "${t}" fortalece el pensamiento crítico y la formulación fundamentada.`
    })
  },
  {
    questionPattern: (t, s, i) => `Al contrastar las características principales de "${t}", se deduce acertadamente que:`,
    generateOptions: (t, s, i) => ({
      correct: `Mantiene una correlación directa y coherente con los objetivos de aprendizaje del periodo evaluado.`,
      distractors: [
        `Presenta contradicciones constantes con los postulados generales de ${s}.`,
        `Es completamente independiente y no guarda relación con ningún otro contenido del curso.`,
        `Carece de validez cuando se somete a verificación empírica o demostración lógica.`
      ],
      explanation: `Las características de "${t}" guardan coherencia integral con el currículo del periodo.`
    })
  },
  {
    questionPattern: (t, s, i) => `¿Qué consecuencia inmediata se produce si se aplica de forma incorrecta el procedimiento de "${t}"?`,
    generateOptions: (t, s, i) => ({
      correct: `Se introducen inconsistencias en las conclusiones finales y se desvía la precisión del resultado esperado.`,
      distractors: [
        `El resultado final no se ve afectado bajo ninguna circunstancia.`,
        `Se obtiene automáticamente la respuesta óptima mediante compensación de errores.`,
        `Se anulan todas las leyes científicas y lingüísticas previas de forma permanente.`
      ],
      explanation: `Un error en la aplicación de "${t}" compromete la exactitud del resultado.`
    })
  }
];

/**
 * Genera el examen completo con claves múltiples y preguntas asociadas a los temas seleccionados.
 */
export function generateCustomExam({
  institutionName,
  gradeName,
  gradeId,
  subjectName,
  examTitle,
  periodNum,
  date,
  totalQuestions,
  topics,
  sourceFileName,
  keyCount = 3
}: {
  institutionName: string;
  gradeName: string;
  gradeId: string;
  subjectName: string;
  examTitle: string;
  periodNum: number;
  date: string;
  totalQuestions: number;
  topics: string[];
  sourceFileName?: string;
  keyCount?: number;
}): FullCustomExam {
  const safeTotal = Math.min(20, Math.max(1, totalQuestions));
  const effectiveTopics =
    topics && topics.length > 0
      ? topics
      : DEFAULT_SUBJECT_TOPICS[subjectName] || [
          'Fundamentos Generales',
          'Procedimientos y Métodos',
          'Análisis y Resolución'
        ];

  // 1. Generar conjunto base de preguntas para Clave A
  const baseQuestions: ExamQuestion[] = [];
  const optionsLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  for (let q = 1; q <= safeTotal; q++) {
    const topicIndex = (q - 1) % effectiveTopics.length;
    const currentTopic = effectiveTopics[topicIndex];
    const templateIndex = (q - 1) % QUESTION_PATTERNS.length;
    const template = QUESTION_PATTERNS[templateIndex];

    const questionText = template.questionPattern(currentTopic, subjectName, q);
    const { correct, distractors, explanation } = template.generateOptions(currentTopic, subjectName, q);

    // En Clave A, la respuesta correcta se asigna de manera rotativa equilibrada (A, B, C, D)
    const targetCorrectLetter = optionsLetters[(q - 1) % 4];

    const allChoices: { letter: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
    let distractorIdx = 0;

    optionsLetters.forEach((letter) => {
      if (letter === targetCorrectLetter) {
        allChoices.push({ letter, text: correct });
      } else {
        allChoices.push({ letter, text: distractors[distractorIdx++] });
      }
    });

    baseQuestions.push({
      id: `q-${q}`,
      questionNumber: q,
      topic: currentTopic,
      questionText,
      options: {
        A: allChoices.find((c) => c.letter === 'A')!.text,
        B: allChoices.find((c) => c.letter === 'B')!.text,
        C: allChoices.find((c) => c.letter === 'C')!.text,
        D: allChoices.find((c) => c.letter === 'D')!.text
      },
      correctAnswer: targetCorrectLetter,
      explanation
    });
  }

  // 2. Construir claves (Clave A, Clave B, Clave C, Clave D) con permutaciones únicas de respuestas
  const keyLetters = ['A', 'B', 'C', 'D'].slice(0, Math.min(4, Math.max(1, keyCount)));
  const keysRecord: Record<string, GeneratedExamKey> = {};

  keyLetters.forEach((keyId, kIdx) => {
    const keyName = `Clave ${keyId}`;
    const keyQuestions: ExamQuestion[] = [];
    const answerKey: Record<number, 'A' | 'B' | 'C' | 'D'> = {};

    baseQuestions.forEach((baseQ, qIdx) => {
      if (kIdx === 0) {
        // Clave A: copia directa
        keyQuestions.push({ ...baseQ });
        answerKey[baseQ.questionNumber] = baseQ.correctAnswer;
      } else {
        // Clave B, C, D: permutar sistemáticamente las opciones de respuesta
        // Desplazamiento cíclico dependiente del índice de la clave (kIdx)
        const shift = kIdx;
        const correctOriginalText = baseQ.options[baseQ.correctAnswer];
        const allOriginalTexts = [baseQ.options.A, baseQ.options.B, baseQ.options.C, baseQ.options.D];

        // Rotar las opciones
        const shiftedTexts = [
          allOriginalTexts[(0 + shift) % 4],
          allOriginalTexts[(1 + shift) % 4],
          allOriginalTexts[(2 + shift) % 4],
          allOriginalTexts[(3 + shift) % 4]
        ];

        // Encontrar la nueva posición de la respuesta correcta
        const newCorrectIndex = shiftedTexts.findIndex((t) => t === correctOriginalText);
        const newCorrectLetter = optionsLetters[newCorrectIndex >= 0 ? newCorrectIndex : 0];

        keyQuestions.push({
          ...baseQ,
          options: {
            A: shiftedTexts[0],
            B: shiftedTexts[1],
            C: shiftedTexts[2],
            D: shiftedTexts[3]
          },
          correctAnswer: newCorrectLetter
        });
        answerKey[baseQ.questionNumber] = newCorrectLetter;
      }
    });

    keysRecord[keyId] = {
      keyId,
      keyName,
      questions: keyQuestions,
      answerKey
    };
  });

  return {
    id: `custom-exam-${Date.now()}`,
    institutionName,
    gradeName,
    gradeId,
    subjectName,
    examTitle,
    periodNum,
    date,
    totalQuestions: safeTotal,
    topics: effectiveTopics,
    sourceFileName,
    keys: keysRecord
  };
}

/**
 * Genera el script en Python para compilar tanto el examen formateado como la hoja OMR con ReportLab.
 */
export function generatePythonExamScript(exam: FullCustomExam, selectedKey: string): string {
  const currentKey = exam.keys[selectedKey] || exam.keys['A'];

  return `#!/usr/bin/env python3
"""
generate_exam_and_omr.py
========================
Genera dinámicamente un archivo PDF que incluye:
1. El Examen Escrito Personalizado con encabezado oficial y preguntas de opción múltiple (A, B, C, D).
2. La Hoja de Respuestas de Burbujas (OMR) con 4 cuadros fiduciarios en las esquinas y Código QR único con metadatos JSON.
3. El Solucionario Oficial de la Clave (${currentKey.keyName}).

Requisitos:
    pip install reportlab qrcode pillow
"""

import sys
import json
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import mm
import qrcode

EXAM_DATA = ${JSON.stringify(
    {
      institution: exam.institutionName,
      grade: exam.gradeName,
      subject: exam.subjectName,
      title: exam.examTitle,
      key: currentKey.keyName,
      keyId: currentKey.keyId,
      questions: currentKey.questions.map((q) => ({
        num: q.questionNumber,
        text: q.questionText,
        options: q.options,
        correct: q.correctAnswer
      }))
    },
    null,
    2
  )}

def generate_qr_image(payload):
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(json.dumps(payload))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def build_pdf(filename="examen_completo_${exam.subjectName.toLowerCase().replace(/\\s+/g, '_')}_${selectedKey}.pdf"):
    page_w, page_h = letter
    c = canvas.Canvas(filename, pagesize=letter)
    m = 15 * mm

    # ========================================================
    # PÁGINA 1 (ESTRICTAMENTE PRIMERA): HOJA DE BURBUJAS OMR CON QR
    # ========================================================
    marker_size = 12 * mm
    # 4 Esquinas: Marcadores Fiduciarios para OpenCV
    for (x, y_pos) in [(m, m), (m, page_h - m - marker_size), (page_w - m - marker_size, m), (page_w - m - marker_size, page_h - m - marker_size)]:
        c.setFillColor(colors.black)
        c.rect(x, y_pos, marker_size, marker_size, fill=1, stroke=0)

    # QR Code con metadatos JSON
    qr_payload = {
        "institution": EXAM_DATA["institution"],
        "subject": EXAM_DATA["subject"],
        "keyId": EXAM_DATA["keyId"],
        "totalQuestions": len(EXAM_DATA["questions"])
    }
    qr_stream = generate_qr_image(qr_payload)
    c.drawImage(qr_stream, page_w - m - marker_size - 28*mm, page_h - m - 28*mm, 25*mm, 25*mm)

    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(m + marker_size + 4*mm, page_h - m - 6*mm, EXAM_DATA["institution"].upper())
    c.setFont("Helvetica-Bold", 9)
    c.drawString(m + marker_size + 4*mm, page_h - m - 11*mm, f"PÁGINA 1: HOJA DE RESPUESTAS OMR • {EXAM_DATA['subject']} • [{EXAM_DATA['key']}]")
    c.setFont("Helvetica", 8)
    c.drawString(m + marker_size + 4*mm, page_h - m - 16*mm, "Alumno: _________________________________________________   NIE: ___________")
    c.drawString(m + marker_size + 4*mm, page_h - m - 20*mm, "Instrucciones: Rellene completamente con lapicero o lápiz la burbuja [●]. Las preguntas inician en Pág. 2.")

    # Matriz de burbujas
    start_y = page_h - m - 45*mm
    for q in EXAM_DATA["questions"]:
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.black)
        c.drawString(m + 8*mm, start_y, f"{q['num']:02d}.")
        
        for idx, opt in enumerate(['A', 'B', 'C', 'D']):
            bx = m + 22*mm + (idx * 12*mm)
            c.setStrokeColor(colors.black)
            c.setLineWidth(1)
            c.circle(bx, start_y + 1*mm, 3.2*mm, fill=0, stroke=1)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(bx, start_y - 0.2*mm, opt)
        start_y -= 8*mm

    c.showPage()

    # ========================================================
    # PÁGINA 2+ (PÁGINAS SIGUIENTES): CUESTIONARIO DE PREGUNTAS
    # ========================================================
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(m, page_h - m - 5*mm, EXAM_DATA["institution"].upper())
    
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(m, page_h - m - 11*mm, f"PÁGINA 2+: CUESTIONARIO • {EXAM_DATA['title']} • {EXAM_DATA['subject']}")
    
    c.setFont("Helvetica", 9)
    c.drawString(m, page_h - m - 17*mm, f"Grado: {EXAM_DATA['grade']}   |   Fecha: ${exam.date}   |   Clave: [{EXAM_DATA['key']}]")
    
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.line(m, page_h - m - 20*mm, page_w - m, page_h - m - 20*mm)
    
    y = page_h - m - 27*mm
    for q in EXAM_DATA["questions"]:
        if y < 35*mm:
            c.showPage()
            y = page_h - m - 10*mm
            
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#0F172A"))
        c.drawString(m, y, f"{q['num']}. {q['text']}")
        y -= 4.5*mm
        
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#334155"))
        for opt in ['A', 'B', 'C', 'D']:
            c.drawString(m + 4*mm, y, f"{opt}) {q['options'][opt]}")
            y -= 4*mm
        y -= 2*mm

    c.showPage()
    c.save()
    print(f"PDF generado exitosamente con Página 1 (OMR) y Páginas 2+ (Preguntas): {filename}")

if __name__ == "__main__":
    build_pdf()
`;
}

/**
 * Genera el documento HTML completo, independiente y funcional con botón onclick="window.print()"
 * y regla @media print para imprimir o guardar como PDF sin botones ni controles.
 */
export function generatePrintableExamHTML(exam: FullCustomExam, selectedKey: string = 'A', studentName?: string, nie?: string): string {
  const currentKey = exam.keys[selectedKey] || exam.keys['A'];
  const questions = currentKey.questions;
  const total = exam.totalQuestions;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exam.subjectName} - ${exam.examTitle} [Clave ${currentKey.keyId}]</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      line-height: 1.4;
      padding-bottom: 40px;
    }
    .no-print {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s ease;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    .page-sheet {
      background: #ffffff;
      width: 216mm;
      min-height: 279mm;
      margin: 20px auto;
      padding: 18mm 16mm;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      position: relative;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    /* Marcadores fiduciarios en 4 esquinas */
    .fiducial-marker {
      position: absolute;
      width: 12mm;
      height: 12mm;
      background: #000000;
    }
    .marker-tl { top: 8mm; left: 8mm; }
    .marker-tr { top: 8mm; right: 8mm; }
    .marker-bl { bottom: 8mm; left: 8mm; }
    .marker-br { bottom: 8mm; right: 8mm; }
    
    .sheet-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 15px;
    }
    .sheet-title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      color: #1e3a8a;
    }
    .sheet-sub {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .meta-box {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
    }
    .instructions-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      font-size: 11px;
      margin-bottom: 16px;
      color: #334155;
    }
    .bubble-grid {
      display: grid;
      grid-template-columns: repeat(${total > 10 ? 2 : 1}, 1fr);
      gap: 8px 30px;
      margin-top: 10px;
    }
    .bubble-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .q-num {
      font-weight: 800;
      font-size: 12px;
      width: 28px;
      font-family: monospace;
    }
    .bubble-group {
      display: flex;
      gap: 12px;
    }
    .bubble {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      background: #ffffff;
    }
    .bubble.filled {
      background: #0f172a !important;
      color: #ffffff !important;
    }
    .question-block {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .question-text {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      padding-left: 12px;
    }
    .option-item {
      font-size: 11px;
      color: #334155;
      display: flex;
      gap: 6px;
    }
    .option-letter {
      font-weight: 800;
      color: #1e3a8a;
    }
    .solucionario-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 12px;
    }
    .solucionario-table th, .solucionario-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    .solucionario-table th {
      background: #1e3a8a;
      color: #ffffff;
      font-weight: 800;
    }

    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .page-sheet {
        margin: 0 !important;
        box-shadow: none !important;
        width: 100% !important;
        min-height: 100vh !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }
  </style>
</head>
<body>

  <!-- Barra de Acciones para el Docente (se oculta al imprimir) -->
  <div class="no-print">
    <div>
      <strong style="font-size: 15px;">${exam.institutionName} • ${exam.subjectName}</strong>
      <span style="font-size: 12px; opacity: 0.85; margin-left: 10px;">[Clave ${currentKey.keyId}] • Pág 1: Hoja OMR | Pág 2+: Preguntas</span>
    </div>
    <button onclick="window.print()" class="print-btn">
      🖨️ Imprimir / Guardar como PDF
    </button>
  </div>

  <!-- PÁGINA 1 (ESTRICTAMENTE PRIMERA): HOJA DE BURBUJAS OMR PARA EL ESTUDIANTE -->
  <div class="page-sheet page-break">
    <!-- Marcadores fiduciarios para calibración de cámara -->
    <div class="fiducial-marker marker-tl"></div>
    <div class="fiducial-marker marker-tr"></div>
    <div class="fiducial-marker marker-bl"></div>
    <div class="fiducial-marker marker-br"></div>

    <div style="padding: 4mm 8mm;">
      <div class="sheet-header">
        <div class="sheet-title">${exam.institutionName}</div>
        <div class="sheet-sub">PÁGINA 1: HOJA DE RESPUESTAS ÓPTICAS (OMR) • ${exam.subjectName} • [CLAVE ${currentKey.keyId}]</div>
        <div class="meta-box">
          <span><strong>Alumno(a):</strong> ${studentName || '________________________________________________'}</span>
          <span><strong>NIE:</strong> ${nie || '____________'}</span>
          <span><strong>Grado:</strong> ${exam.gradeName}</span>
          <span><strong>Fecha:</strong> ${exam.date}</span>
        </div>
      </div>

      <div class="instructions-box">
        <strong>Instrucciones de Llenado:</strong> Rellene completamente con lápiz grafito o lapicero negro la burbuja correspondiente a la opción elegida (A, B, C o D). El cuestionario con las preguntas se encuentra en la <strong>Página 2</strong>. No doble la hoja ni manche los 4 cuadros negros fiduciarios de las esquinas.
      </div>

      <div class="bubble-grid">
        ${questions.map((q) => `
          <div class="bubble-row">
            <span class="q-num">${q.questionNumber < 10 ? '0' + q.questionNumber : q.questionNumber}.</span>
            <div class="bubble-group">
              <span class="bubble">A</span>
              <span class="bubble">B</span>
              <span class="bubble">C</span>
              <span class="bubble">D</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 25px; text-align: center; font-size: 10px; color: #64748b; font-family: monospace; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        EduControl Pro OMR System • Hoja con marcadores fiduciarios para calibración de cámara web / móvil OpenCV
      </div>
    </div>
  </div>

  <!-- PÁGINA 2+ (PÁGINAS SIGUIENTES): CUESTIONARIO DE PREGUNTAS Y ALTERNATIVAS -->
  <div class="page-sheet page-break">
    <div class="sheet-header">
      <div class="sheet-title">${exam.institutionName}</div>
      <div class="sheet-sub">PÁGINA 2: CUESTIONARIO DE PREGUNTAS • ${exam.examTitle} • ${exam.subjectName}</div>
      <div class="meta-box">
        <span><strong>Materia:</strong> ${exam.subjectName}</span>
        <span><strong>Nivel:</strong> ${exam.gradeName}</span>
        <span><strong>Clave Asignada:</strong> [${currentKey.keyName}]</span>
        <span><strong>Total Preguntas:</strong> ${total}</span>
      </div>
    </div>

    <div class="instructions-box">
      <strong>Instrucciones:</strong> Lea detenidamente cada una de las siguientes preguntas. Traslade sus respuestas a la <strong>Hoja de Respuestas OMR de la Página 1</strong> rellenando la opción correspondiente.
    </div>

    <div>
      ${questions.map((q) => `
        <div class="question-block">
          <div class="question-text">${q.questionNumber}. ${q.questionText} <span style="font-size: 10px; color: #64748b; font-weight: normal; margin-left: 6px;">(${q.topic})</span></div>
          <div class="options-grid">
            <div class="option-item"><span class="option-letter">A)</span> <span>${q.options.A}</span></div>
            <div class="option-item"><span class="option-letter">B)</span> <span>${q.options.B}</span></div>
            <div class="option-item"><span class="option-letter">C)</span> <span>${q.options.C}</span></div>
            <div class="option-item"><span class="option-letter">D)</span> <span>${q.options.D}</span></div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top: 30px; display: flex; justify-content: space-around; font-size: 11px; text-align: center; color: #475569;">
      <div>
        <div style="border-bottom: 1px solid #94a3b8; width: 180px; margin-bottom: 4px;"></div>
        <span>Firma del Docente Evaluador</span>
      </div>
      <div>
        <div style="border-bottom: 1px solid #94a3b8; width: 140px; margin-bottom: 4px;"></div>
        <span>Calificación Obtenida</span>
      </div>
    </div>
  </div>

  <!-- PÁGINA 3: SOLUCIONARIO OFICIAL Y HOJA CONTESTADA (USO EXCLUSIVO DEL DOCENTE) -->
  <div class="page-sheet">
    <div class="sheet-header">
      <div class="sheet-title" style="color: #7e22ce;">SOLUCIONARIO OFICIAL Y HOJA CONTESTADA</div>
      <div class="sheet-sub">Uso Exclusivo del Docente • ${exam.subjectName} • [Clave ${currentKey.keyId}]</div>
      <div class="meta-box">
        <span><strong>Institución:</strong> ${exam.institutionName}</span>
        <span><strong>Evaluación:</strong> ${exam.examTitle}</span>
        <span><strong>Periodo:</strong> ${exam.periodNum}</span>
        <span><strong>Total Claves:</strong> ${Object.keys(exam.keys).length}</span>
      </div>
    </div>

    <!-- Hoja de Burbujas Contestada Oficial -->
    <div style="background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
      <strong style="font-size: 12px; color: #065f46; display: block; margin-bottom: 8px;">
        Hoja de Respuestas Contestada Oficial • [Clave ${currentKey.keyId}]
      </strong>
      <div class="bubble-grid">
        ${questions.map((q) => {
          const correct = q.correctAnswer;
          return `
            <div class="bubble-row" style="border-color: #a7f3d0;">
              <span class="q-num" style="color: #065f46;">${q.questionNumber < 10 ? '0' + q.questionNumber : q.questionNumber}.</span>
              <div class="bubble-group">
                <span class="bubble ${correct === 'A' ? 'filled' : ''}">A</span>
                <span class="bubble ${correct === 'B' ? 'filled' : ''}">B</span>
                <span class="bubble ${correct === 'C' ? 'filled' : ''}">C</span>
                <span class="bubble ${correct === 'D' ? 'filled' : ''}">D</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Tabla Comparativa y Justificación -->
    <strong style="font-size: 12px; color: #1e293b; display: block; margin-top: 14px; margin-bottom: 4px;">
      Fundamentación Pedagógica de Respuestas Correctas
    </strong>
    <table class="solucionario-table">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">N°</th>
          <th style="width: 60px; text-align: center;">Clave</th>
          <th>Tema Evaluado y Explicación Docente</th>
        </tr>
      </thead>
      <tbody>
        ${questions.map((q) => `
          <tr>
            <td style="text-align: center; font-weight: 800;">${q.questionNumber}</td>
            <td style="text-align: center; font-weight: 800; background: #eff6ff; color: #1e3a8a;">[ ${q.correctAnswer} ]</td>
            <td>
              <strong>${q.topic}:</strong> ${q.explanation || `La opción ${q.correctAnswer} (${q.options[q.correctAnswer]}) es la respuesta válida.`}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

</body>
</html>`;
}

