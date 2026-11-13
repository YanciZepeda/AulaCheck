import { Institution, Student, AttendanceRecord, PeriodGrades, CalendarEvent, CustomTag, NotificationItem } from '../types';

export const INITIAL_INSTITUTIONS: Institution[] = [
  {
    id: 'inst-1',
    name: 'Complejo Educativo San Salvador',
    type: 'publica',
    infrastructureCode: 'INF-06123',
    institutionCode: 'ESC-PUB-2026',
    contactEmail: 'direccion@cedusansalvador.edu.sv',
    logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=160&q=80',
    gradeLevels: [
      {
        id: '1-grado',
        name: 'Primer Grado - Sección A',
        subjects: ['Matemáticas', 'Lenguaje y Literatura', 'Ciencias Naturales', 'Estudios Sociales']
      },
      {
        id: '2-grado',
        name: 'Segundo Grado - Sección A',
        subjects: ['Matemáticas', 'Lenguaje y Literatura', 'Ciencias Naturales', 'Estudios Sociales', 'Inglés']
      }
    ],
    teachers: [
      {
        id: 'teach-1',
        teacherName: 'Prof. Carlos Mendoza',
        teacherEmail: 'carlos.mendoza@cedusansalvador.edu.sv',
        subjectName: 'Matemáticas',
        gradeId: '1-grado',
        scheduleTime: '07:30 - 08:30 AM'
      },
      {
        id: 'teach-2',
        teacherName: 'Profa. María Elena Rivas',
        teacherEmail: 'maria.rivas@cedusansalvador.edu.sv',
        subjectName: 'Lenguaje y Literatura',
        gradeId: '1-grado',
        scheduleTime: '08:30 - 09:30 AM'
      },
      {
        id: 'teach-3',
        teacherName: 'Prof. Roberto Gómez',
        teacherEmail: 'roberto.gomez@cedusansalvador.edu.sv',
        subjectName: 'Ciencias Naturales',
        gradeId: '1-grado',
        scheduleTime: '09:45 - 10:45 AM'
      },
      {
        id: 'teach-4',
        teacherName: 'Profa. Ana Lucía Flores',
        teacherEmail: 'ana.flores@cedusansalvador.edu.sv',
        subjectName: 'Estudios Sociales',
        gradeId: '1-grado',
        scheduleTime: '10:45 - 11:45 AM'
      }
    ]
  },
  {
    id: 'inst-2',
    name: 'Colegio Bilingüe Santa Teresa',
    type: 'privada',
    infrastructureCode: 'INF-09412',
    institutionCode: 'ESC-PRI-2026',
    contactEmail: 'administracion@santateresa.edu.sv',
    logoUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=160&q=80',
    gradeLevels: [
      {
        id: '1-grado',
        name: 'Primer Grado Primaria',
        subjects: ['Matemáticas', 'Lenguaje', 'Science', 'Social Studies']
      }
    ],
    teachers: [
      {
        id: 'teach-5',
        teacherName: 'Lic. Fernando Ramos',
        teacherEmail: 'fernando.ramos@santateresa.edu.sv',
        subjectName: 'Matemáticas',
        gradeId: '1-grado',
        scheduleTime: '08:00 - 09:15 AM'
      }
    ]
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'stud-1',
    listNumber: 1,
    fullName: 'Alejandro David Aguilar Ramos',
    nie: '18882846',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    parentEmail: 'familia.aguilar@gmail.com'
  },
  {
    id: 'stud-2',
    listNumber: 2,
    fullName: 'Camila Sofía Benítez Castro',
    nie: '18882847',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    parentEmail: 'padres.benitez@gmail.com'
  },
  {
    id: 'stud-3',
    listNumber: 3,
    fullName: 'Diego Alexander Carranza Mejía',
    nie: '18882848',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    parentEmail: 'diego.tutor@hotmail.com'
  },
  {
    id: 'stud-4',
    listNumber: 4,
    fullName: 'Gabriela Michelle Delgado Ortiz',
    nie: '18882849',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    parentEmail: 'gaby.familia@gmail.com'
  },
  {
    id: 'stud-5',
    listNumber: 5,
    fullName: 'Mateo Sebastián Escalante Pineda',
    nie: '18882850',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    parentEmail: 'familia.escalante@outlook.com'
  },
  {
    id: 'stud-6',
    listNumber: 6,
    fullName: 'Valeria Nicole Fuentes Morales',
    nie: '18882851',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    parentEmail: 'valeria.padre@yahoo.com'
  }
];

export const INITIAL_CUSTOM_TAGS: CustomTag[] = [
  { id: 'tag-1', name: 'Examen de Periodo', color: '#ef4444', description: 'Evaluación formal acumulativa' },
  { id: 'tag-2', name: 'Tarea en Casa', color: '#3b82f6', description: 'Ejercicios de refuerzo para entregar' },
  { id: 'tag-3', name: 'Laboratorio Práctico', color: '#10b981', description: 'Actividad grupal o experimental' },
  { id: 'tag-4', name: 'Proyecto Integrador', color: '#8b5cf6', description: 'Proyecto interdisciplinario' },
  { id: 'tag-5', name: 'Alerta Académica', color: '#f59e0b', description: 'Requiere atención inmediata de padres' }
];

export const INITIAL_PERIOD_GRADES: PeriodGrades[] = [
  {
    id: 'period-mat-1',
    institutionCode: 'ESC-PUB-2026',
    gradeId: '1-grado',
    subjectName: 'Matemáticas',
    period: 1,
    criticalThreshold: 6.0,
    activities: [
      { id: 'act-1', name: 'Actividad 1: Álgebra Básica', percentage: 20, dueDate: '2026-10-15', tagId: 'tag-2' },
      { id: 'act-2', name: 'Laboratorio de Geometría', percentage: 25, dueDate: '2026-10-22', tagId: 'tag-3' },
      { id: 'act-3', name: 'Cuaderno y Participación', percentage: 15, dueDate: '2026-10-28', tagId: 'tag-2' },
      { id: 'act-4', name: 'Examen de Periodo', percentage: 40, dueDate: '2026-11-05', tagId: 'tag-1', isExam: true }
    ],
    grades: [
      // Estudiante 1 (Alejandro)
      { studentId: 'stud-1', activityId: 'act-1', score: 8.5 },
      { studentId: 'stud-1', activityId: 'act-2', score: 9.0 },
      { studentId: 'stud-1', activityId: 'act-3', score: 9.5 },
      { studentId: 'stud-1', activityId: 'act-4', score: 8.8 },
      // Estudiante 2 (Camila)
      { studentId: 'stud-2', activityId: 'act-1', score: 9.2 },
      { studentId: 'stud-2', activityId: 'act-2', score: 9.6 },
      { studentId: 'stud-2', activityId: 'act-3', score: 10.0 },
      { studentId: 'stud-2', activityId: 'act-4', score: 9.5 },
      // Estudiante 3 (Diego) - Estado Crítico
      { studentId: 'stud-3', activityId: 'act-1', score: 4.8 },
      { studentId: 'stud-3', activityId: 'act-2', score: 5.2 },
      { studentId: 'stud-3', activityId: 'act-3', score: 6.0 },
      { studentId: 'stud-3', activityId: 'act-4', score: 4.5 },
      // Estudiante 4 (Gabriela)
      { studentId: 'stud-4', activityId: 'act-1', score: 7.5 },
      { studentId: 'stud-4', activityId: 'act-2', score: 7.0 },
      { studentId: 'stud-4', activityId: 'act-3', score: 8.0 },
      { studentId: 'stud-4', activityId: 'act-4', score: 7.2 },
      // Estudiante 5 (Mateo)
      { studentId: 'stud-5', activityId: 'act-1', score: 6.5 },
      { studentId: 'stud-5', activityId: 'act-2', score: 6.8 },
      { studentId: 'stud-5', activityId: 'act-3', score: 7.0 },
      { studentId: 'stud-5', activityId: 'act-4', score: 6.2 },
      // Estudiante 6 (Valeria)
      { studentId: 'stud-6', activityId: 'act-1', score: 8.8 },
      { studentId: 'stud-6', activityId: 'act-2', score: 8.5 },
      { studentId: 'stud-6', activityId: 'act-3', score: 9.0 },
      { studentId: 'stud-6', activityId: 'act-4', score: 8.9 }
    ]
  },
  {
    id: 'period-leng-1',
    institutionCode: 'ESC-PUB-2026',
    gradeId: '1-grado',
    subjectName: 'Lenguaje y Literatura',
    period: 1,
    criticalThreshold: 6.0,
    activities: [
      { id: 'act-leng-1', name: 'Comprensión Lectora', percentage: 30, dueDate: '2026-10-18', tagId: 'tag-2' },
      { id: 'act-leng-2', name: 'Ensayo Literario', percentage: 30, dueDate: '2026-10-26', tagId: 'tag-4' },
      { id: 'act-leng-3', name: 'Examen de Periodo', percentage: 40, dueDate: '2026-11-08', tagId: 'tag-1', isExam: true }
    ],
    grades: [
      { studentId: 'stud-1', activityId: 'act-leng-1', score: 9.0 },
      { studentId: 'stud-1', activityId: 'act-leng-2', score: 8.8 },
      { studentId: 'stud-1', activityId: 'act-leng-3', score: 9.2 },
      { studentId: 'stud-2', activityId: 'act-leng-1', score: 9.5 },
      { studentId: 'stud-2', activityId: 'act-leng-2', score: 9.8 },
      { studentId: 'stud-2', activityId: 'act-leng-3', score: 9.4 },
      { studentId: 'stud-3', activityId: 'act-leng-1', score: 5.5 },
      { studentId: 'stud-3', activityId: 'act-leng-2', score: 5.0 },
      { studentId: 'stud-3', activityId: 'act-leng-3', score: 5.8 },
      { studentId: 'stud-4', activityId: 'act-leng-1', score: 7.8 },
      { studentId: 'stud-4', activityId: 'act-leng-2', score: 7.4 },
      { studentId: 'stud-4', activityId: 'act-leng-3', score: 8.0 },
      { studentId: 'stud-5', activityId: 'act-leng-1', score: 6.8 },
      { studentId: 'stud-5', activityId: 'act-leng-2', score: 7.0 },
      { studentId: 'stud-5', activityId: 'act-leng-3', score: 6.5 },
      { studentId: 'stud-6', activityId: 'act-leng-1', score: 8.9 },
      { studentId: 'stud-6', activityId: 'act-leng-2', score: 8.5 },
      { studentId: 'stud-6', activityId: 'act-leng-3', score: 9.1 }
    ]
  },
  {
    id: 'period-cien-1',
    institutionCode: 'ESC-PUB-2026',
    gradeId: '1-grado',
    subjectName: 'Ciencias Naturales',
    period: 1,
    criticalThreshold: 6.0,
    activities: [
      { id: 'act-cien-1', name: 'Feria de Ciencias - Ecosistemas', percentage: 40, dueDate: '2026-10-20', tagId: 'tag-4' },
      { id: 'act-cien-2', name: 'Guía de Estudio', percentage: 20, dueDate: '2026-10-27', tagId: 'tag-2' },
      { id: 'act-cien-3', name: 'Examen Trimestral', percentage: 40, dueDate: '2026-11-10', tagId: 'tag-1', isExam: true }
    ],
    grades: [
      { studentId: 'stud-1', activityId: 'act-cien-1', score: 9.5 },
      { studentId: 'stud-1', activityId: 'act-cien-2', score: 8.7 },
      { studentId: 'stud-1', activityId: 'act-cien-3', score: 9.0 },
      { studentId: 'stud-2', activityId: 'act-cien-1', score: 9.2 },
      { studentId: 'stud-2', activityId: 'act-cien-2', score: 9.5 },
      { studentId: 'stud-2', activityId: 'act-cien-3', score: 9.8 },
      { studentId: 'stud-3', activityId: 'act-cien-1', score: 6.2 },
      { studentId: 'stud-3', activityId: 'act-cien-2', score: 6.0 },
      { studentId: 'stud-3', activityId: 'act-cien-3', score: 5.9 },
      { studentId: 'stud-4', activityId: 'act-cien-1', score: 7.5 },
      { studentId: 'stud-4', activityId: 'act-cien-2', score: 8.0 },
      { studentId: 'stud-4', activityId: 'act-cien-3', score: 7.7 },
      { studentId: 'stud-5', activityId: 'act-cien-1', score: 7.0 },
      { studentId: 'stud-5', activityId: 'act-cien-2', score: 6.8 },
      { studentId: 'stud-5', activityId: 'act-cien-3', score: 7.2 },
      { studentId: 'stud-6', activityId: 'act-cien-1', score: 8.6 },
      { studentId: 'stud-6', activityId: 'act-cien-2', score: 8.9 },
      { studentId: 'stud-6', activityId: 'act-cien-3', score: 8.7 }
    ]
  },
  {
    id: 'period-soc-1',
    institutionCode: 'ESC-PUB-2026',
    gradeId: '1-grado',
    subjectName: 'Estudios Sociales',
    period: 1,
    criticalThreshold: 6.0,
    activities: [
      { id: 'act-soc-1', name: 'Historia Cívica y Mapa', percentage: 35, dueDate: '2026-10-19', tagId: 'tag-2' },
      { id: 'act-soc-2', name: 'Examen Escrito', percentage: 65, dueDate: '2026-11-06', tagId: 'tag-1', isExam: true }
    ],
    grades: [
      { studentId: 'stud-1', activityId: 'act-soc-1', score: 9.0 },
      { studentId: 'stud-1', activityId: 'act-soc-2', score: 8.6 },
      { studentId: 'stud-2', activityId: 'act-soc-1', score: 9.7 },
      { studentId: 'stud-2', activityId: 'act-soc-2', score: 9.4 },
      { studentId: 'stud-3', activityId: 'act-soc-1', score: 6.0 },
      { studentId: 'stud-3', activityId: 'act-soc-2', score: 5.4 },
      { studentId: 'stud-4', activityId: 'act-soc-1', score: 7.8 },
      { studentId: 'stud-4', activityId: 'act-soc-2', score: 7.2 },
      { studentId: 'stud-5', activityId: 'act-soc-1', score: 6.9 },
      { studentId: 'stud-5', activityId: 'act-soc-2', score: 6.4 },
      { studentId: 'stud-6', activityId: 'act-soc-1', score: 8.7 },
      { studentId: 'stud-6', activityId: 'act-soc-2', score: 8.5 }
    ]
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: '2026-10-08',
    time: '07:30 AM',
    subjectName: 'Matemáticas',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    studentId: 'stud-1',
    status: 'presente'
  },
  {
    id: 'att-2',
    date: '2026-10-08',
    time: '07:30 AM',
    subjectName: 'Matemáticas',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    studentId: 'stud-3',
    status: 'ausente',
    notes: 'No se presentó a la primera hora'
  },
  {
    id: 'att-3',
    date: '2026-10-07',
    time: '09:15 AM',
    subjectName: 'Lenguaje y Literatura',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    studentId: 'stud-1',
    status: 'presente'
  },
  {
    id: 'att-4',
    date: '2026-10-07',
    time: '09:15 AM',
    subjectName: 'Lenguaje y Literatura',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    studentId: 'stud-3',
    status: 'ausente',
    notes: 'Inasistencia sin justificación médica'
  },
  {
    id: 'att-5',
    date: '2026-10-06',
    time: '10:45 AM',
    subjectName: 'Ciencias Naturales',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    studentId: 'stud-1',
    status: 'presente'
  }
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-1',
    title: 'Examen de Periodo 1 - Matemáticas',
    description: 'Evaluación acumulativa de álgebra y geometría elemental. Traer regla y lápiz.',
    date: '2026-11-05',
    time: '07:30 AM',
    subjectName: 'Matemáticas',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    type: 'examen',
    tagId: 'tag-1'
  },
  {
    id: 'cal-2',
    title: 'Entrega Laboratorio de Geometría',
    description: 'Subir o presentar en físico maquetas de figuras geométricas tridimensionales.',
    date: '2026-10-22',
    time: '09:00 AM',
    subjectName: 'Matemáticas',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    type: 'entrega',
    tagId: 'tag-3'
  },
  {
    id: 'cal-3',
    title: 'Examen de Periodo 1 - Lenguaje',
    description: 'Prueba de comprensión lectora y ortografía de acentuación.',
    date: '2026-11-08',
    time: '08:15 AM',
    subjectName: 'Lenguaje y Literatura',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    type: 'examen',
    tagId: 'tag-1'
  },
  {
    id: 'cal-4',
    title: 'Feria de Ciencias - Ecosistemas',
    description: 'Presentación de carteles y maquetas sobre flora y fauna de El Salvador.',
    date: '2026-10-20',
    time: '10:00 AM',
    subjectName: 'Ciencias Naturales',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    type: 'entrega',
    tagId: 'tag-4'
  },
  {
    id: 'cal-5',
    title: 'Reunión de Padres y Entrega de Boletas',
    description: 'Revisión del avance académico y notas del primer periodo con los profesores guías.',
    date: '2026-11-15',
    time: '03:00 PM',
    subjectName: 'General',
    gradeId: '1-grado',
    institutionCode: 'ESC-PUB-2026',
    type: 'reunion'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'inasistencia',
    title: 'Alerta de Inasistencia a Clases',
    message: 'Su hijo(a) no asistió a la clase de Matemáticas el día 08/10/2026 a las 07:30 AM.',
    date: '2026-10-08',
    time: '07:35 AM',
    subjectName: 'Matemáticas',
    studentName: 'Diego Alexander Carranza Mejía',
    studentId: 'stud-3',
    parentEmail: 'diego.tutor@hotmail.com',
    institutionCode: 'ESC-PUB-2026',
    read: false,
    priority: 'alta'
  },
  {
    id: 'notif-2',
    type: 'nota_critica',
    title: 'Advertencia: Nivel Bajo / Estado Crítico',
    message: 'El profesor Carlos Mendoza reporta que el promedio acumulado en Matemáticas es 5.1 (Menor a 6.0). Se recomienda refuerzo urgente.',
    date: '2026-10-08',
    time: '11:00 AM',
    subjectName: 'Matemáticas',
    studentName: 'Diego Alexander Carranza Mejía',
    studentId: 'stud-3',
    parentEmail: 'diego.tutor@hotmail.com',
    institutionCode: 'ESC-PUB-2026',
    read: false,
    priority: 'urgente'
  },
  {
    id: 'notif-3',
    type: 'examen_recordatorio',
    title: 'Recordatorio de Examen Próximo',
    message: 'Examen de Periodo 1 programado para el 05/11/2026 a las 07:30 AM en Matemáticas.',
    date: '2026-10-09',
    time: '08:00 AM',
    subjectName: 'Matemáticas',
    studentName: 'Alejandro David Aguilar Ramos',
    studentId: 'stud-1',
    parentEmail: 'familia.aguilar@gmail.com',
    institutionCode: 'ESC-PUB-2026',
    read: true,
    priority: 'media'
  }
];
