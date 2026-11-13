import { ScheduleSlot, VirtualOnlineExam, GeneratedExamKey } from '../types';

export const DEFAULT_SCHEDULE_SLOTS: ScheduleSlot[] = [
  {
    id: 'slot-1',
    dayOfWeek: 1, // Lunes
    startTime: '07:30',
    endTime: '08:30',
    subjectName: 'Matemáticas',
    gradeId: '1-grado',
    gradeName: 'Primer Grado "A"',
    classroom: 'Aula 101',
    color: 'blue',
    notes: 'Aritmética básica y conteo posicional'
  },
  {
    id: 'slot-2',
    dayOfWeek: 1, // Lunes
    startTime: '08:30',
    endTime: '09:30',
    subjectName: 'Matemáticas',
    gradeId: '2-grado',
    gradeName: 'Segundo Grado "A"',
    classroom: 'Aula 102',
    color: 'indigo',
    notes: 'Tablas de multiplicar y cálculo mental'
  },
  {
    id: 'slot-3',
    dayOfWeek: 2, // Martes
    startTime: '07:30',
    endTime: '08:30',
    subjectName: 'Razonamiento Lógico',
    gradeId: '1-grado',
    gradeName: 'Primer Grado "A"',
    classroom: 'Aula 101',
    color: 'emerald',
    notes: 'Secuencias numéricas y patrones'
  },
  {
    id: 'slot-4',
    dayOfWeek: 2, // Martes
    startTime: '09:30',
    endTime: '10:30',
    subjectName: 'Matemáticas',
    gradeId: '1-grado',
    gradeName: 'Primer Grado "A"',
    classroom: 'Aula 101',
    color: 'blue',
    notes: 'Resolución de problemas cotidianos'
  },
  {
    id: 'slot-5',
    dayOfWeek: 3, // Miércoles
    startTime: '08:30',
    endTime: '09:30',
    subjectName: 'Matemáticas',
    gradeId: '1-grado',
    gradeName: 'Primer Grado "A"',
    classroom: 'Aula 101',
    color: 'blue',
    notes: 'Geometría plana y figuras básicas'
  },
  {
    id: 'slot-6',
    dayOfWeek: 3, // Miércoles
    startTime: '10:00',
    endTime: '11:30',
    subjectName: 'Taller de Razonamiento',
    gradeId: '2-grado',
    gradeName: 'Segundo Grado "A"',
    classroom: 'Lab. Matemáticas',
    color: 'amber',
    notes: 'Juegos de mesa y acertijos numéricos'
  },
  {
    id: 'slot-7',
    dayOfWeek: 4, // Jueves
    startTime: '07:30',
    endTime: '08:30',
    subjectName: 'Matemáticas',
    gradeId: '2-grado',
    gradeName: 'Segundo Grado "A"',
    classroom: 'Aula 102',
    color: 'indigo',
    notes: 'Fracciones y partes iguales'
  },
  {
    id: 'slot-8',
    dayOfWeek: 4, // Jueves
    startTime: '09:30',
    endTime: '10:30',
    subjectName: 'Refuerzo Académico',
    gradeId: '1-grado',
    gradeName: 'Primer Grado "A"',
    classroom: 'Biblioteca',
    color: 'sky',
    notes: 'Atención personalizada a estudiantes'
  },
  {
    id: 'slot-9',
    dayOfWeek: 5, // Viernes
    startTime: '08:00',
    endTime: '09:30',
    subjectName: 'Evaluación Virtual en Línea',
    gradeId: '1-grado',
    gradeName: 'Primer Grado "A"',
    classroom: 'Aula de Cómputo',
    color: 'rose',
    notes: 'Examen Virtual en Línea con IA'
  },
  {
    id: 'slot-10',
    dayOfWeek: 5, // Viernes
    startTime: '10:00',
    endTime: '11:00',
    subjectName: 'Atención a Padres y Tutoría',
    gradeId: '1-grado',
    gradeName: 'Primer Grado "A"',
    classroom: 'Sala de Profesores',
    color: 'purple',
    notes: 'Reunión de seguimiento académico'
  }
];

// Claves iniciales para el examen virtual demo
const DEMO_EXAM_KEYS: Record<string, GeneratedExamKey> = {
  A: {
    keyId: 'A',
    keyName: 'Clave A',
    answerKey: { 1: 'B', 2: 'A', 3: 'C', 4: 'B', 5: 'A' },
    questions: [
      {
        id: 'q1-a',
        questionNumber: 1,
        topic: 'Operaciones Aritméticas',
        questionText: '¿Cuál es el resultado de sumar 38 + 27?',
        options: { A: '55', B: '65', C: '61', D: '75' },
        correctAnswer: 'B',
        explanation: '38 + 27 = 65.'
      },
      {
        id: 'q2-a',
        questionNumber: 2,
        topic: 'Geometría Plana',
        questionText: '¿Cuántos lados iguales tiene un triángulo equilátero?',
        options: { A: '3 lados iguales', B: '2 lados iguales', C: '4 lados iguales', D: 'Ningún lado igual' },
        correctAnswer: 'A',
        explanation: 'Por definición, un triángulo equilátero tiene sus tres lados exactamente de la misma longitud.'
      },
      {
        id: 'q3-a',
        questionNumber: 3,
        topic: 'Fracciones Básicas',
        questionText: 'Si partes una pizza en 4 porciones iguales y te comes 2, ¿qué fracción de la pizza comiste?',
        options: { A: '1/4', B: '3/4', C: '1/2 (dos cuartos)', D: '4/4' },
        correctAnswer: 'C',
        explanation: '2 de 4 porciones simplificadas equivalen exactamente a 1/2 de la pizza.'
      },
      {
        id: 'q4-a',
        questionNumber: 4,
        topic: 'Razonamiento Lógico',
        questionText: '¿Cuál es el siguiente número en la serie: 5, 10, 15, 20, ...?',
        options: { A: '22', B: '25', C: '30', D: '24' },
        correctAnswer: 'B',
        explanation: 'La serie avanza con un patrón constante de sumar 5 a cada término: 20 + 5 = 25.'
      },
      {
        id: 'q5-a',
        questionNumber: 5,
        topic: 'Multiplicación y Problemas',
        questionText: 'En una caja hay 6 paquetes y cada paquete tiene 4 lápices. ¿Cuántos lápices hay en total?',
        options: { A: '24 lápices', B: '20 lápices', C: '10 lápices', D: '28 lápices' },
        correctAnswer: 'A',
        explanation: 'Multiplicamos 6 paquetes por 4 lápices: 6 × 4 = 24 lápices en total.'
      }
    ]
  },
  B: {
    keyId: 'B',
    keyName: 'Clave B',
    answerKey: { 1: 'C', 2: 'B', 3: 'A', 4: 'C', 5: 'B' },
    questions: [
      {
        id: 'q1-b',
        questionNumber: 1,
        topic: 'Operaciones Aritméticas',
        questionText: '¿Cuál es el resultado de sumar 38 + 27?',
        options: { A: '55', B: '61', C: '65', D: '75' },
        correctAnswer: 'C',
        explanation: '38 + 27 = 65.'
      },
      {
        id: 'q2-b',
        questionNumber: 2,
        topic: 'Geometría Plana',
        questionText: '¿Cuántos lados iguales tiene un triángulo equilátero?',
        options: { A: '2 lados iguales', B: '3 lados iguales', C: '4 lados iguales', D: 'Ningún lado igual' },
        correctAnswer: 'B',
        explanation: 'Un triángulo equilátero tiene 3 lados iguales.'
      },
      {
        id: 'q3-b',
        questionNumber: 3,
        topic: 'Fracciones Básicas',
        questionText: 'Si partes una pizza en 4 porciones iguales y te comes 2, ¿qué fracción de la pizza comiste?',
        options: { A: '1/2 (dos cuartos)', B: '1/4', C: '3/4', D: '4/4' },
        correctAnswer: 'A',
        explanation: '2 de 4 porciones es 1/2.'
      },
      {
        id: 'q4-b',
        questionNumber: 4,
        topic: 'Razonamiento Lógico',
        questionText: '¿Cuál es el siguiente número en la serie: 5, 10, 15, 20, ...?',
        options: { A: '22', B: '24', C: '25', D: '30' },
        correctAnswer: 'C',
        explanation: 'El patrón suma 5: 20 + 5 = 25.'
      },
      {
        id: 'q5-b',
        questionNumber: 5,
        topic: 'Multiplicación y Problemas',
        questionText: 'En una caja hay 6 paquetes y cada paquete tiene 4 lápices. ¿Cuántos lápices hay en total?',
        options: { A: '20 lápices', B: '24 lápices', C: '10 lápices', D: '28 lápices' },
        correctAnswer: 'B',
        explanation: '6 × 4 = 24 lápices.'
      }
    ]
  }
};

export const DEFAULT_VIRTUAL_EXAMS: VirtualOnlineExam[] = [
  {
    id: 'exam-virtual-demo-1',
    pin: '849201',
    institutionCode: 'ESC-PUB-2026',
    gradeId: '1-grado',
    gradeName: 'Primer Grado - Sección A',
    subjectName: 'Matemáticas',
    periodId: 'period-mat-1',
    targetActivityId: 'act-mat-4', // Columna Examen de Periodo (25%)
    targetActivityName: 'Examen de Periodo (25%)',
    examTitle: 'Evaluación Virtual de Matemáticas con IA',
    topics: ['Aritmética y Suma', 'Geometría Plana', 'Fracciones Básicas', 'Multiplicación'],
    totalQuestions: 5,
    durationMinutes: 30,
    keys: DEMO_EXAM_KEYS,
    createdAt: new Date().toISOString(),
    isActive: true,
    studentSessions: {
      'stud-1': {
        studentId: 'stud-1',
        studentName: 'Alejandro David Aguilar Ramos',
        nie: '18882846',
        email: 'alejandro.aguilar@cedusansalvador.edu.sv',
        keyId: 'A',
        status: 'in_progress',
        startedAt: '08:00 AM',
        answers: { 1: 'B', 2: 'A' },
        hasLeftPage: false,
        leftPageCount: 0
      },
      'stud-2': {
        studentId: 'stud-2',
        studentName: 'Camila Sofía Benítez Castro',
        nie: '18882847',
        email: 'camila.benitez@cedusansalvador.edu.sv',
        keyId: 'B',
        status: 'submitted',
        startedAt: '08:01 AM',
        submittedAt: '08:14 AM',
        score: 10.0,
        answers: { 1: 'C', 2: 'B', 3: 'A', 4: 'C', 5: 'B' },
        hasLeftPage: false,
        leftPageCount: 0
      }
    },
    teacherAlerts: [
      {
        id: 'al-1',
        studentId: 'stud-2',
        studentName: 'Camila Sofía Benítez Castro',
        message: 'Camila Sofía Benítez Castro finalizó el examen con calificación 10.0/10 (Registrado en cuadro de notas).',
        timestamp: '08:14 AM',
        type: 'submitted'
      }
    ]
  }
];
