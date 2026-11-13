export type InstitutionType = 'publica' | 'privada';

export type UserRole = 'escuela' | 'profesor' | 'estudiante' | 'padre';

export type AcademicStatus = 'excelente' | 'bueno' | 'regular' | 'critico';

export interface Student {
  id: string;
  listNumber: number;
  fullName: string;
  nie?: string; // Número de Identificación Estudiantil (si es pública)
  gradeId: string;
  institutionCode: string;
  parentEmail?: string;
}

export interface TeacherAssignment {
  id: string;
  teacherName: string;
  teacherEmail: string;
  subjectName: string; // ej. Matemáticas, Lenguaje y Literatura
  gradeId: string; // ej. "1-grado", "2-grado"
  scheduleTime?: string; // ej. "07:30 - 08:30 AM"
}

export interface GradeLevel {
  id: string;
  name: string; // ej: "1° Grado", "2° Grado", "7° Grado", "1° Bachillerato"
  subjects: string[]; // materias correspondientes
}

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  infrastructureCode: string; // Código de infraestructura (ej. INF-06123)
  institutionCode: string; // Código autogenerado para padres y profesores (ej. ESC-7890)
  contactEmail: string;
  logoUrl?: string;
  gradeLevels: GradeLevel[];
  teachers: TeacherAssignment[];
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // ej: "08:30 AM"
  subjectName: string;
  gradeId: string;
  institutionCode: string;
  studentId: string;
  status: 'presente' | 'ausente' | 'tardanza' | 'justificado';
  notes?: string;
}

export interface ActivityWeight {
  id: string;
  name: string; // ej. "Actividad 1 (Resumen)", "Laboratorio", "Examen de Periodo"
  percentage: number; // ej. 25 (%)
  dueDate: string; // YYYY-MM-DD
  tagId?: string; // Etiqueta personalizada
  isExam?: boolean;
}

export interface StudentGrade {
  studentId: string;
  activityId: string;
  score: number; // 0 - 10 escala escolar
}

export interface PeriodGrades {
  id: string;
  institutionCode: string;
  gradeId: string;
  subjectName: string;
  period: number; // Periodo 1, 2, 3, 4
  activities: ActivityWeight[];
  grades: StudentGrade[]; // registro de notas
  criticalThreshold: number; // generalmente < 6.0 o < 5.0
}

export interface ExamAnswerKey {
  id: string;
  keyNumber: number; // 1, 2, 3
  name: string; // ej: "Clave A (Tipo 1)", "Clave B (Tipo 2)"
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>; // pregunta -> respuesta
}

export interface ExamConfiguration {
  id: string;
  subjectName: string;
  gradeId: string;
  totalQuestions: number; // ej: 10
  exportColumnTarget: string; // nombre de actividad en el cuadro (ej. "Examen")
  keys: ExamAnswerKey[];
  activeKeyId: string;
}

export interface ParentThresholdConfig {
  minGradeAverage: number; // e.g. 6.0, 7.0, 8.0 - Umbral de nota promedio mínima
  minAttendancePercentage: number; // e.g. 80, 85 - Umbral de porcentaje de asistencia mínimo
  notifyOnSingleAbsence: boolean; // Alerta inmediata por cada falta
  notifyOnGradeBelowThreshold: boolean; // Alerta automática al caer bajo la nota mínima
  notifyOnAttendanceBelowThreshold: boolean; // Alerta automática al caer bajo el % de asistencia
  subjectOverrides?: Record<string, { minGradeAverage?: number; minAttendancePercentage?: number }>;
}

export interface NotificationItem {
  id: string;
  type: 'inasistencia' | 'nota_critica' | 'asistencia_critica' | 'examen_recordatorio' | 'aviso_general';
  title: string;
  message: string;
  date: string;
  time: string;
  subjectName?: string;
  studentName?: string;
  studentId?: string;
  parentEmail?: string;
  institutionCode: string;
  read: boolean;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string;
  subjectName: string;
  gradeId: string;
  institutionCode: string;
  type: 'examen' | 'entrega' | 'reunion' | 'feriado';
  tagId?: string;
}

export interface CustomTag {
  id: string;
  name: string;
  color: string; // Tailwind color or hex
  description?: string;
}

export interface ParentProfile {
  parentEmail: string;
  parentName: string;
  childName: string;
  institutionType: InstitutionType;
  nie?: string;
  studentId?: string;
  institutionName: string;
  institutionCode: string;
  thresholds?: ParentThresholdConfig;
}

export interface TeacherProfile {
  teacherEmail: string;
  teacherName: string;
  institutionCode: string;
  assignedGradeId: string;
  assignedSubject: string;
  scheduleTime?: string;
}

export interface ExamQuestion {
  id: string;
  questionNumber: number;
  topic: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface GeneratedExamKey {
  keyId: string; // 'A', 'B', 'C', 'D'
  keyName: string; // 'Clave A', 'Clave B'
  questions: ExamQuestion[];
  answerKey: Record<number, 'A' | 'B' | 'C' | 'D'>;
}

export interface FullCustomExam {
  id: string;
  institutionName: string;
  gradeName: string;
  gradeId: string;
  subjectName: string;
  examTitle: string;
  periodNum: number;
  date: string;
  totalQuestions: number; // 1 to 20
  topics: string[];
  sourceFileName?: string;
  keys: Record<string, GeneratedExamKey>; // 'A', 'B', 'C', 'D'
  isAIGenerated?: boolean;
  aiModel?: string;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5; // 1: Lunes, 2: Martes, 3: Miércoles, 4: Jueves, 5: Viernes
  startTime: string; // ej. "07:30"
  endTime: string; // ej. "08:30"
  subjectName: string;
  gradeId: string;
  gradeName: string;
  classroom?: string; // ej. "Aula 3-B", "Lab. Informática"
  color?: string; // ej. "blue", "emerald", "purple", "amber"
  notes?: string;
}

export interface StudentExamSession {
  studentId: string;
  studentName: string;
  nie: string;
  email?: string;
  keyId: string; // 'A', 'B', 'C', 'D'
  status: 'in_lobby' | 'in_progress' | 'blocked' | 'submitted';
  startedAt?: string;
  submittedAt?: string;
  score?: number; // 0.0 a 10.0
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  hasLeftPage: boolean;
  leftPageCount: number;
  lastLeftPageAt?: string;
  isReEnabledByTeacher?: boolean;
  deniedByTeacher?: boolean;
}

export interface VirtualOnlineExam {
  id: string;
  pin: string; // ej. "684910"
  institutionCode: string;
  gradeId: string;
  gradeName: string;
  subjectName: string;
  periodId: string;
  targetActivityId: string; // Columna del cuadro de notas donde se guardará la calificación
  targetActivityName: string;
  examTitle: string;
  topics: string[];
  totalQuestions: number;
  durationMinutes: number;
  keys: Record<string, GeneratedExamKey>;
  createdAt: string;
  isActive: boolean;
  studentSessions: Record<string, StudentExamSession>; // studentId -> session
  teacherAlerts: Array<{
    id: string;
    studentId: string;
    studentName: string;
    message: string;
    timestamp: string;
    type: 'tab_switched' | 'submitted' | 'joined' | 'reenabled' | 'denied';
  }>;
}

