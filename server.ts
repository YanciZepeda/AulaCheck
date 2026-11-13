import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'model';
  text: string;
}

interface TeacherCopilotRequest {
  message: string;
  history?: ChatHistoryItem[];
  context?: {
    subject?: string;
    gradeName?: string;
    teacherName?: string;
    institutionName?: string;
  };
}

// API: Multi-turn Teacher Pedagogical Co-pilot Chatbot using Gemini 1.5 Flash
app.post('/api/teacher-copilot', async (req: Request, res: Response) => {
  try {
    const { message, history = [], context = {} } = req.body as TeacherCopilotRequest;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }

    const currentSubject = context.subject || 'Educación General';
    const currentGrade = context.gradeName || 'Nivel Escolar';
    const teacherName = context.teacherName || 'Docente';
    const institution = context.institutionName || 'Centro Educativo';

    const systemInstruction = `Eres el "Co-piloto Pedagógico EduControl", un asesor pedagógico y didáctico de alto nivel para docentes de educación inicial, básica, secundaria y bachillerato.
Estás interactuando con ${teacherName}, docente de "${currentSubject}" en "${currentGrade}" del "${institution}".

Tu misión exclusiva es la ASESORÍA PEDAGÓGICA Y DIDÁCTICA:
1. Explicar conceptos difíciles o abstractos con analogías cotidianas, narrativas vivas y pasos lógicos claros adaptados fielmente al nivel cognitivo de los estudiantes de 
${currentGrade}.
2. Diseñar dinámicas lúdicas de 10 a 25 minutos, juegos de aula, proyectos colaborativos y estrategias de participación activa utilizando materiales sencillos o recursos cotidianos.
3. Proponer adaptaciones curriculares y estrategias para ritmos de aprendizaje diversos (estudiantes que necesitan refuerzo o desafíos adicionales).
4. Diseñar rúbricas formativas, tickets de salida y preguntas de sondeo rápido para verificar la comprensión antes de concluir la sesión.
5. Estructurar la clase con pedagogía efectiva (Enganche inicial, Modelado guiado, Práctica colaborativa/autónoma y Cierre reflexivo).

Pautas de comunicación:
- Sé empático, motivador, práctico y ultra-claro.
- Enfócate directamente en la enseñanza, la didáctica de la materia y el trabajo con los alumnos en el aula.
- Utiliza formato markdown con negritas, listas y subtítulos breves para una lectura rápida. Responde en español con calidez docente profesional.`;

    // Check for API key and execute Gemini models with resilient fallback
    if (process.env.GEMINI_API_KEY) {
      const ai = aiClient || new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          apiVersion: 'v1beta',
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Format conversation history for Gemini API
      const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const item of history.slice(-10)) {
        if (item.text && item.text.trim()) {
          const role = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';
          formattedContents.push({
            role,
            parts: [{ text: item.text.trim() }]
          });
        }
      }

      // Add the latest user message with rich pedagogical framing
      formattedContents.push({
        role: 'user',
        parts: [{
          text: `Contexto pedagógico actual:\nMateria: ${currentSubject}\nGrado / Nivel: ${currentGrade}\nDocente: ${teacherName}\nInstitución: ${institution}\n\nConsulta del docente:\n${message.trim()}`
        }]
      });

      // Candidate models: prioritize responsive Gemini 1.5 y 2.0 models
      const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 15000)
          );

          const generatePromise = ai.models.generateContent({
            model: modelName,
            contents: formattedContents,
            config: {
              systemInstruction,
            }
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);
          const replyText = response.text?.trim();

          if (replyText) {
            return res.json({
              reply: replyText,
              model: modelName,
              timestamp: new Date().toISOString()
            });
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} failed or timed out:`, err?.status || err?.message || err);
        }
      }

      console.error('All candidate Gemini models failed, proceeding to fallback:', lastError);
    }

    // Pedagogical Fallback when API key is not configured
    const lower = message.toLowerCase();
    let fallbackReply = '';

    if (lower.includes('dinamica') || lower.includes('juego') || lower.includes('actividad') || lower.includes('15 minuto')) {
      fallbackReply = `### 🎯 Dinámica de Aula: "El Relé de Conceptos" (15 minutos)
- **Materia:** ${currentSubject}**Nivel:** 
${currentGrade}

1. **Preparación (2 min):** Divide al grupo en 3 o 4 equipos. Coloca en la pizarra o en tarjetas un reto central del tema.
2. **Desarrollo (10 min):** Cada estudiante aporta por turnos un paso o argumento para resolver el problema sin repetir lo dicho por su compañero.
3. **Cierre y Reflexión (3 min):** El equipo contrasta su solución final y el docente destaca el principio clave aprendido.`;
    } else if (lower.includes('rubrica') || lower.includes('evalua') || lower.includes('criterio')) {
      fallbackReply = `### 📋 Rúbrica Formativa de 3 Criterios para ${currentSubject}
1. **Comprensión Conceptual (40%):** Identifica y explica los fundamentos del tema con precisión y vocabulario adecuado.
2. **Procedimiento y Aplicación (40%):** Resuelve situaciones problema siguiendo una secuencia lógica y justificada.
3. **Comunicación y Argumentación (20%):** Comunica sus conclusiones de manera clara, respetando las opiniones de sus compañeros.`;
    } else if (lower.includes('analogia') || lower.includes('explicar') || lower.includes('dificil') || lower.includes('visual')) {
      fallbackReply = `### 💡 Analogía Cotidiana para ${currentSubject}
Para explicar este tema de forma intuitiva a los estudiantes de **${currentGrade}**:
- **Conexión con la vida real:** Imagina el concepto como un sistema de engranajes de bicicleta o un intercambio en el mercado local, donde cada elemento cumple una función indispensable para que todo el mecanismo avance.
- **Visualización en el aula:** Dibuja un esquema de 3 pasos conectando: *Entrada de información* ➔ *Procesamiento/Acción* ➔ *Resultado observable*.`;
    } else {
      fallbackReply = `¡Hola, colega! Como tu **Co-piloto Pedagógico**, estoy aquí para apoyarte en la planificación y didáctica de **${currentSubject}** para **${currentGrade}**.

¿En qué aspecto de tu clase te gustaría que colaboremos hoy?
- 💡 **Analogías y Explicaciones Visuales:** Convertir conceptos abstractos en ideas cotidianas y memorables.
- ⏱️ **Dinámicas de 15 minutos:** Juegos de aula y actividades de enganche rápido.
- 📊 **Rúbricas e Instrumentos Formativos:** Criterios claros de evaluación continua.
- 🧩 **Atención a la Diversidad:** Estrategias y adaptaciones para distintos ritmos de aprendizaje.`;
    }

    return res.json({
      reply: fallbackReply,
      model: 'pedagogical-engine-local',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error in /api/teacher-copilot:', err);
    return res.status(500).json({
      error: 'Error al procesar la consulta pedagógica',
      details: err?.message || 'Error desconocido'
    });
  }
});

interface TranscribeAudioRequest {
  audioBase64: string;
  mimeType?: string;
  expectedStudentNames?: string[];
}

// API: Transcribe Audio using Gemini 1.5 Flash (Multimodal)
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body as TranscribeAudioRequest;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Se requiere el audio codificado en Base64.' });
    }

    if (process.env.GEMINI_API_KEY) {
      const ai = aiClient || new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const cleanMimeType = mimeType.split(';')[0] || 'audio/webm';
      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

      const audioPart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: cleanBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: {
          parts: [
            audioPart,
            {
              text: 'Transcribe este audio en español con la mayor exactitud posible. Presta especial atención a nombres propios de alumnos de la clase y las palabras clave "presente" o "ausente". Devuelve únicamente el texto transcrito sin introducciones ni explicaciones.',
            },
          ],
        },
      });

      const transcript = response.text?.trim() || '';

      return res.json({
        transcript,
        model: 'gemini-1.5-flash',
        timestamp: new Date().toISOString()
      });
    }

    // Graceful fallback if no API key in dev environment
    return res.json({
      transcript: '',
      fallback: true,
      message: 'API Key no configurada para transcripción en servidor.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error in /api/transcribe-audio:', err);
    return res.status(500).json({
      error: 'Error al transcribir el audio',
      details: err?.message || 'Error desconocido'
    });
  }
});



interface GenerateExamRequest {
  institutionName?: string;
  gradeName?: string;
  gradeId?: string;
  subjectName: string;
  examTitle?: string;
  periodNum?: number;
  totalQuestions: number;
  topics: string[];
  keyCount?: number;
  difficulty?: 'básico' | 'intermedio' | 'avanzado';
  customInstructions?: string;
}

// API: Generate real AI exam using Gemini 1.5 Flash
app.post('/api/generate-exam', async (req: Request, res: Response) => {
  const {
    institutionName = 'Centro Escolar Oficial',
    gradeName = 'Primer Grado',
    gradeId = '1-grado',
    subjectName = 'Matemáticas',
    examTitle = 'Examen de Periodo',
    periodNum = 1,
    totalQuestions = 10,
    topics = [],
    keyCount = 3,
    difficulty = 'intermedio',
    customInstructions = ''
  } = req.body as GenerateExamRequest;

  const safeTotal = Math.min(20, Math.max(1, Number(totalQuestions) || 10));
  const safeKeys = Math.min(4, Math.max(1, Number(keyCount) || 3));

  // Determine effective topics
  const effectiveTopics = Array.isArray(topics) && topics.length > 0
    ? topics.map((t) => String(t).trim()).filter(Boolean)
    : [`Conceptos Fundamentales de ${subjectName}`, `Resolución de Problemas y Aplicación`, `Análisis Metodológico`];

  // If Gemini API Key is available, use real Gemini 1.5 Flash
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = aiClient || new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          apiVersion: 'v1beta',
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Eres un docente especialista y evaluador pedagógico oficial de la materia "${subjectName}" para el nivel escolar "${gradeName}".
Genera exactamente ${safeTotal} preguntas de opción múltiple de alta calidad técnica y pedagógica en idioma Español para una evaluación sumativa oficial.

DATOS DEL EXAMEN:
- Materia: 
${subjectName}
- Nivel / Grado: 
${gradeName}
- Título: 
${examTitle}
- Dificultad: 
${difficulty}
- Temas a evaluar estrictamente: 
${effectiveTopics.join('; ')}
${customInstructions ? `- Instrucciones pedagógicas especiales del docente: ${customInstructions}` : ''}

REGLAS DE EVALUACIÓN:
1. Cada pregunta debe contener exactamente 4 opciones identificadas con letras 'A', 'B', 'C', 'D'.
2. Debe haber únicamente UNA opción correcta irrefutable.
3. Los 3 distractores deben ser plausibles, coherentes con el nivel de los alumnos de ${gradeName}, y basados en errores conceptuales comunes, sin opciones absurdas ni triviales.
4. Incluye una justificación o explicación pedagógica detallada de por qué la respuesta correcta es válida y por qué las demás son erróneas.
5. El lenguaje debe ser formal, académico y adaptado fielmente al nivel cognitivo de ${gradeName}.
6. Distribuye las opciones correctas de forma equilibrada entre A, B, C y D.`;

      const examCandidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
      let examResponseText = '';
      let usedExamModel = 'gemini-1.5-flash';

      for (const modelName of examCandidateModels) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 20000)
          );

          const callPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: 'Eres un diseñador curricular y evaluador pedagógico experto. Genera evaluaciones educativas rigurosas con preguntas de opción múltiple estructuradas en formato JSON estricto.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  examTitle: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  grade: { type: Type.STRING },
                  instructions: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionNumber: { type: Type.INTEGER },
                        topic: { type: Type.STRING },
                        text: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              letter: { type: Type.STRING },
                              text: { type: Type.STRING }
                            },
                            required: ['letter', 'text']
                          }
                        },
                        correctOption: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                      },
                      required: ['questionNumber', 'topic', 'text', 'options', 'correctOption', 'explanation']
                    }
                  }
                },
                required: ['questions']
              }
            }
          });

          const resp = await Promise.race([callPromise, timeoutPromise]);
          if (resp?.text) {
            examResponseText = resp.text.trim();
            usedExamModel = modelName;
            break;
          }
        } catch (mErr: any) {
          console.warn(`Exam generation failed on ${modelName}:`, mErr?.status || mErr?.message);
        }
      }

      const rawJson = examResponseText || '{}';
      const parsedData = JSON.parse(rawJson);

      const generatedQuestions = (parsedData.questions || []).slice(0, safeTotal);

      if (generatedQuestions.length > 0) {
        // Construct Clave A
        const baseKeyQuestions = generatedQuestions.map((q: any, idx: number) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const findOpt = (ltr: string) => {
            const found = opts.find((o: any) => String(o.letter).toUpperCase() === ltr);
            return found ? String(found.text).trim() : `Opción ${ltr}`;
          };

          const correctLetter = (['A', 'B', 'C', 'D'].includes(String(q.correctOption).toUpperCase())
            ? String(q.correctOption).toUpperCase()
            : 'A') as 'A' | 'B' | 'C' | 'D';

          return {
            id: `q-${idx + 1}`,
            questionNumber: idx + 1,
            topic: q.topic || effectiveTopics[idx % effectiveTopics.length] || subjectName,
            questionText: q.text || q.questionText || `Pregunta ${idx + 1}`,
            options: {
              A: findOpt('A'),
              B: findOpt('B'),
              C: findOpt('C'),
              D: findOpt('D'),
            },
            correctAnswer: correctLetter,
            explanation: q.explanation || `Respuesta correcta: Opción ${correctLetter}`
          };
        });

        // Generate multiple keys (Clave A, Clave B, Clave C, etc.)
        const keysObj: Record<string, any> = {};
        const keyLetters = ['A', 'B', 'C', 'D'].slice(0, safeKeys);

        keyLetters.forEach((kLetter, kIndex) => {
          if (kIndex === 0) {
            const ansKey: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
            baseKeyQuestions.forEach((bq: any) => {
              ansKey[bq.questionNumber] = bq.correctAnswer;
            });

            keysObj[kLetter] = {
              keyId: kLetter,
              keyName: `Clave ${kLetter}`,
              questions: baseKeyQuestions,
              answerKey: ansKey
            };
          } else {
            const shift = kIndex;
            const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
            const keyQuestions: any[] = [];
            const ansKey: Record<number, 'A' | 'B' | 'C' | 'D'> = {};

            baseKeyQuestions.forEach((baseQ: any) => {
              const correctOriginalText = baseQ.options[baseQ.correctAnswer];
              const allOriginalTexts = [baseQ.options.A, baseQ.options.B, baseQ.options.C, baseQ.options.D];

              const shiftedTexts = [
                allOriginalTexts[(0 + shift) % 4],
                allOriginalTexts[(1 + shift) % 4],
                allOriginalTexts[(2 + shift) % 4],
                allOriginalTexts[(3 + shift) % 4]
              ];

              const newCorrectIndex = shiftedTexts.findIndex((t) => t === correctOriginalText);
              const newCorrectLetter = letters[newCorrectIndex >= 0 ? newCorrectIndex : 0];

              keyQuestions.push({
                ...baseQ,
                options: {
                  A: shiftedTexts[0],
                  B: shiftedTexts[1],
                  C: shiftedTexts[2],
                  D: shiftedTexts[3]
                },
                correctAnswer: newCorrectLetter,
                explanation: `${baseQ.explanation} [En Clave ${kLetter}, la opción correcta se ubica en (${newCorrectLetter})]`
              });

              ansKey[baseQ.questionNumber] = newCorrectLetter;
            });

            keysObj[kLetter] = {
              keyId: kLetter,
              keyName: `Clave ${kLetter}`,
              questions: keyQuestions,
              answerKey: ansKey
            };
          }
        });

        const fullExam = {
          id: `exam-ai-${Date.now()}`,
          institutionName,
          gradeName,
          gradeId,
          subjectName,
          examTitle: parsedData.examTitle || examTitle,
          periodNum,
          date: new Date().toISOString().split('T')[0],
          totalQuestions: baseKeyQuestions.length,
          topics: effectiveTopics,
          keys: keysObj,
          isAIGenerated: true,
          aiModel: usedExamModel
        };

        return res.json({
          success: true,
          isAIGenerated: true,
          model: usedExamModel,
          exam: fullExam
        });
      }
    } catch (aiErr: any) {
      console.error('Error generating exam with Gemini API:', aiErr);
      // Fallback gracefully below with error details
    }
  }

  // Fallback heuristic generator if API key is not configured or temporary network issue
  const fallbackLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const baseQuestions: any[] = [];
  const ansKeyA: Record<number, 'A' | 'B' | 'C' | 'D'> = {};

  for (let q = 1; q <= safeTotal; q++) {
    const topic = effectiveTopics[(q - 1) % effectiveTopics.length];
    const targetCorrectLetter = fallbackLetters[(q - 1) % 4];

    baseQuestions.push({
      id: `q-${q}`,
      questionNumber: q,
      topic,
      questionText: `En relación al tema "${topic}", ¿cuál de las siguientes opciones describe el postulado metodológico fundamental para su aplicación rigurosa en ${subjectName}?`,
      options: {
        A: targetCorrectLetter === 'A'
          ? `Constituye el método analítico verificado para identificar variables críticas y resolver problemas de ${topic}.`
          : `Postulado alternativo que omite las condiciones iniciales del sistema evaluado en ${topic}.`,
        B: targetCorrectLetter === 'B'
          ? `Constituye el método analítico verificado para identificar variables críticas y resolver problemas de ${topic}.`
          : `Procedimiento empírico sin justificación teórica aplicable a la disciplina de ${subjectName}.`,
        C: targetCorrectLetter === 'C'
          ? `Constituye el método analítico verificado para identificar variables críticas y resolver problemas de ${topic}.`
          : `Enfoque descriptivo general que no permite cuantificar ni comprobar resultados en ${topic}.`,
        D: targetCorrectLetter === 'D'
          ? `Constituye el método analítico verificado para identificar variables críticas y resolver problemas de ${topic}.`
          : `Criterio subjetivo basado en aproximaciones arbitrarias sin validez académica.`
      },
      correctAnswer: targetCorrectLetter,
      explanation: `La opción [${targetCorrectLetter}] expone el criterio analítico exacto y fundamentado para el aprendizaje de "${topic}".`
    });
    ansKeyA[q] = targetCorrectLetter;
  }

  const keysObj: Record<string, any> = {
    A: {
      keyId: 'A',
      keyName: 'Clave A',
      questions: baseQuestions,
      answerKey: ansKeyA
    }
  };

  const fullExam = {
    id: `exam-gen-${Date.now()}`,
    institutionName,
    gradeName,
    gradeId,
    subjectName,
    examTitle,
    periodNum,
    date: new Date().toISOString().split('T')[0],
    totalQuestions: baseQuestions.length,
    topics: effectiveTopics,
    keys: keysObj,
    isAIGenerated: false
  };

  return res.json({
    success: true,
    isAIGenerated: false,
    exam: fullExam,
    note: 'Generado con motor pedagógico base (configure GEMINI_API_KEY para generación IA avanzada).'
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`EduControl Pro Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});