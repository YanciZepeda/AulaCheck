import { FullCustomExam } from '../types';
import { generateCustomExam } from './examGenerator';

export interface GenerateExamParams {
  institutionName: string;
  gradeName: string;
  gradeId: string;
  subjectName: string;
  examTitle: string;
  periodNum?: number;
  totalQuestions: number;
  topics: string[];
  keyCount?: number;
  difficulty?: 'básico' | 'intermedio' | 'avanzado';
  customInstructions?: string;
  sourceFileName?: string;
}

export interface GenerateExamResult {
  exam: FullCustomExam;
  isAIGenerated: boolean;
  model?: string;
  message?: string;
}

/**
 * Invoca el servicio de Inteligencia Artificial del backend (Gemini 3.8 Flash)
 * para crear un examen pedagógico real con preguntas, opciones, claves y explicaciones.
 * Si el servidor o la red no responden, provee respaldo algorítmico sin bloquear al usuario.
 */
export async function requestAIExamGeneration(params: GenerateExamParams): Promise<GenerateExamResult> {
  try {
    const response = await fetch('/api/generate-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        institutionName: params.institutionName,
        gradeName: params.gradeName,
        gradeId: params.gradeId,
        subjectName: params.subjectName,
        examTitle: params.examTitle,
        periodNum: params.periodNum,
        totalQuestions: params.totalQuestions,
        topics: params.topics,
        keyCount: params.keyCount || 3,
        difficulty: params.difficulty || 'intermedio',
        customInstructions: params.customInstructions,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.exam) {
        return {
          exam: data.exam,
          isAIGenerated: Boolean(data.isAIGenerated),
          model: data.model || (data.isAIGenerated ? 'gemini-3.8-flash' : undefined),
          message: data.note || (data.isAIGenerated ? '¡Examen generado exitosamente con Inteligencia Artificial (Gemini 3.8 Flash)!' : 'Examen generado con motor pedagógico estructurado.')
        };
      }
    }
  } catch (error) {
    console.warn('No se pudo conectar con el endpoint /api/generate-exam, usando generador local de respaldo:', error);
  }

  // Generador local de alta fidelidad como respaldo
  const fallbackExam = generateCustomExam({
    institutionName: params.institutionName,
    gradeName: params.gradeName,
    gradeId: params.gradeId,
    subjectName: params.subjectName,
    examTitle: params.examTitle,
    periodNum: params.periodNum || 1,
    date: new Date().toISOString().split('T')[0],
    totalQuestions: params.totalQuestions,
    topics: params.topics,
    sourceFileName: params.sourceFileName,
    keyCount: params.keyCount || 3,
  });

  return {
    exam: fallbackExam,
    isAIGenerated: false,
    message: 'Examen generado con motor pedagógico local.'
  };
}

/**
 * Alias exported for components utilizing generateAIExamWithGemini
 */
export const generateAIExamWithGemini = requestAIExamGeneration;

