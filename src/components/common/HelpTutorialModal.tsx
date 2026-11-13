import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  HelpCircle,
  X,
  GraduationCap,
  Users,
  School,
  CheckCircle2,
  FileSpreadsheet,
  ScanLine,
  Bell,
  SlidersHorizontal,
  ChevronRight,
  Search,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Play,
  Check,
  Gamepad2,
  Mic,
  Clock,
  Printer,
  Bot,
  Hash
} from 'lucide-react';
import { UserRole } from '../../types';

interface HelpTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'tutorial' | 'faq';
}

export const HelpTutorialModal: React.FC<HelpTutorialModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'tutorial'
}) => {
  const { role, switchRole } = useApp();

  const [activeTab, setActiveTab] = useState<'tutorial' | 'faq'>(defaultTab);
  const [selectedRoleGuide, setSelectedRoleGuide] = useState<UserRole>(role);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handleFinishTutorial = () => {
    localStorage.setItem('edu_tutorial_completed', 'true');
    onClose();
  };

  // Steps definition for each role with all newest features
  const tutorialStepsByRole: Record<
    UserRole,
    { title: string; subtitle: string; icon: any; content: string; keyPoints: string[]; badge: string }[]
  > = {
    profesor: [
      {
        title: '1. Pase de Asistencia por Voz con IA y Micrófono Real',
        subtitle: 'Captura con webkitSpeechRecognition y Levenshtein',
        icon: Mic,
        badge: 'Nueva Función IA',
        content:
          'Activa el micrófono con permiso real del navegador. Di el nombre del alumno y luego "Presente" o "Ausente" (o ambos juntos, ej. "Juan Pérez presente"). El motor con distancia de Levenshtein tolera variaciones de pronunciación. La vista panorámica te permite ver a todos los alumnos a la vez y sincronizar directamente con el cuadro oficial.',
        keyPoints: [
          'Solicitud real de micrófono mediante el navegador (sin simulaciones).',
          'Vista panorámica multi-columna de todos los alumnos de la nómina.',
          'Sincronización instantánea con el cuadro diario y mensual del docente.'
        ]
      },
      {
        title: '2. Examen Virtual en Vivo con Anti-Copia y Desbloqueo',
        subtitle: 'Evaluación digital con asignación de columna',
        icon: Gamepad2,
        badge: 'Nueva Función Examen',
        content:
          'Crea un Examen Virtual con IA especificando temas y cantidad de preguntas. Selecciona en qué columna del cuadro de notas se guardará la calificación. Cada alumno entra con su PIN, NIE (8 dígitos, ej. 18882846) y recibe una clave única. Si un alumno sale de la pestaña, su examen se bloquea y recibes una alerta inmediata para conceder reingreso o calificar con 0.',
        keyPoints: [
          'Elección de columna destino para auto-calificar sobre 10.',
          'Detección anti-trampa al cambiar de pestaña o salir de pantalla.',
          'Panel de notificaciones del profesor para autorizar o denegar reingreso.'
        ]
      },
      {
        title: '3. Generador de Exámenes y Hojas OMR en PDF Imprimible',
        subtitle: 'Solucionario oficial y hoja de burbujas sin botones de app',
        icon: Printer,
        badge: 'Exportación Limpia',
        content:
          'Genera exámenes completos en HTML con hoja de preguntas, solucionario (clave de respuestas) y hoja de óvalos OMR para los alumnos. Al presionar "Imprimir / Guardar PDF" (window.print()), las reglas CSS @media print ocultan automáticamente botones y controles de la app, entregando un documento limpio y profesional.',
        keyPoints: [
          'Hoja de examen, clave docente y plantilla de burbujas OMR en un solo documento.',
          'Regla @media print para PDF limpio sin menús ni botones de interfaz.',
          'Compatible con el escáner óptico de cámara para calificar hojas físicas.'
        ]
      },
      {
        title: '4. Gestor de Horarios Escolares Semanales',
        subtitle: 'Calendario semanal de lunes a viernes',
        icon: Clock,
        badge: 'Organizador Semanal',
        content:
          'Define tus materias por día de la semana y bloques de hora. El componente tipo calendario semanal te permite visualizar de un vistazo tu carga académica, aulas y grupos escolares asignados.',
        keyPoints: [
          'Visualización tipo calendario semanal de Lunes a Viernes.',
          'Bloques horarios con código de color por materia.',
          'Persistencia permanente para consulta rápida en el aula.'
        ]
      },
      {
        title: '5. Cuadro Oficial de Notas y Límite Estricto del 100%',
        subtitle: 'Control de ponderaciones y exportación con logo',
        icon: FileSpreadsheet,
        badge: 'Calificaciones Oficiales',
        content:
          'Edita calificaciones directamente en las celdas con visualización dinámica (< 6.0 en rojo, >= 6.0 en azul). Si agregas evaluaciones que superen el 100% acumulado, el sistema te avisa y te permite auto-ajustar al saldo disponible. Puedes exportar el cuadro con el logo oficial de la escuela.',
        keyPoints: [
          'Notas menores a 6.0 en color rojo y notas aprobatorias en azul.',
          'Validación matemática del límite del 100% de ponderaciones.',
          'Exportación en PDF y Excel con el logo institucional del colegio.'
        ]
      },
      {
        title: '6. Asistente Pedagógico y Soporte de la App con IA',
        subtitle: 'Copiloto interactivo en la esquina inferior derecha',
        icon: Bot,
        badge: 'Gemini 3.8 Flash',
        content:
          'En la esquina inferior derecha dispones de tu Asistente con IA. Puedes consultarle dudas pedagógicas (ideas lúdicas, dinámicas de clase, explicaciones sencillas) y también dudas de la app (cómo pasar lista por voz, cómo crear exámenes virtuales o escanear OMR).',
        keyPoints: [
          'Ideas y planeaciones didácticas adaptadas a tu materia y grado.',
          'Guía paso a paso sobre cualquier herramienta de la plataforma.',
          'Disponible permanentemente en la esquina de tu pantalla.'
        ]
      }
    ],
    padre: [
      {
        title: '1. Sincronización Total con el Cuadro del Docente',
        subtitle: 'Notas exactas y actualizadas al instante',
        icon: BookOpen,
        badge: 'Datos 100% Fidedignos',
        content:
          'Las calificaciones reflejadas en el portal familiar son exactamente las mismas que el profesor registra en su cuadro de notas, ya sea mediante evaluaciones continuas, exámenes virtuales en línea o escaneo de hojas de respuestas OMR.',
        keyPoints: [
          'Sincronización en tiempo real sin desfase de datos.',
          'Visualización de notas individuales con código de color (rojo si es menor a 6.0).',
          'Identificación por NIE oficial MINED de 8 dígitos (ej. 18882846).'
        ]
      },
      {
        title: '2. Alertas de Inasistencia y Estado Crítico',
        subtitle: 'Notificaciones inmediatas',
        icon: Bell,
        badge: 'Seguridad y Asistencia',
        content:
          'Recibirás una notificación instantánea en caso de que tu hijo no asista a una clase, indicando la materia perdida, la fecha y la hora exacta, así como avisos de exámenes próximos.',
        keyPoints: [
          'Notificación cuando el profesor pase lista y marque inasistencia.',
          'Advertencia si el estudiante entra en nivel bajo o crítico.',
          'Registro detallado de asistencias, tardanzas y justificaciones.'
        ]
      },
      {
        title: '3. Configuración de Umbrales Personalizados',
        subtitle: 'Tus propias reglas de alerta preventiva',
        icon: SlidersHorizontal,
        badge: 'Control Personalizado',
        content:
          'En la pestaña "Configurar Umbrales" puedes definir a partir de qué nota promedio (ej. 7.0 u 8.0) o qué porcentaje de asistencia (ej. 85%) deseas recibir una alerta automática preventiva de estado crítico.',
        keyPoints: [
          'Ajusta tu umbral de nota mínima y asistencia.',
          'Simulador de prueba para verificar cómo se reciben las alertas.',
          'Tus umbrales se guardan permanentemente en tu perfil.'
        ]
      }
    ],
    escuela: [
      {
        title: '1. Registro Institucional y Código Compartido',
        subtitle: 'Verificación de infraestructura MINED',
        icon: School,
        badge: 'Administración',
        content:
          'Registra tu escuela o colegio ingresando el código de infraestructura oficial (ej. INF-06123) y logo escolar. Al completar el registro, se genera un Código Único de Institución que docentes y familias utilizan para vincularse.',
        keyPoints: [
          'Válido para instituciones públicas (con NIE oficial) y colegios privados.',
          'Generación de código único para compartir en un clic.',
          'Soporte de logo escolar para encabezados oficiales y PDF.'
        ]
      },
      {
        title: '2. Matrícula y NIE Oficial MINED (8 Dígitos)',
        subtitle: 'Carga masiva sin duplicados',
        icon: Hash,
        badge: 'Formato MINED',
        content:
          'Sube la nómina de estudiantes con archivo Excel sin tener que escribir nombres. Todos los estudiantes utilizan el formato oficial MINED de 8 dígitos continuos (ej. 18882846) sin guiones. El detector anti-duplicados previene inscripciones repetidas.',
        keyPoints: [
          'NIE de 8 dígitos estandarizado según la normativa de El Salvador.',
          'Prevención automática de alumnos duplicados en la base de datos.',
          'Asignación directa a grados y materias de la planta docente.'
        ]
      }
    ],
    estudiante: [
      {
        title: '1. Ingreso a la Evaluación con PIN, Correo y NIE',
        subtitle: 'Acceso seguro con NIE de 8 dígitos',
        icon: Gamepad2,
        badge: 'Acceso Seguro',
        content:
          'Ingresa tu correo institucional, tu NIE oficial de 8 dígitos continuos (ej. 18882846) y el PIN de 6 dígitos que te proporcione tu profesor para ingresar a la sala del examen en vivo.',
        keyPoints: [
          'Acceso inmediato con el PIN de la sala.',
          'Clave de examen individualizada asignada automáticamente.',
          'Identificación fidedigna por NIE institucional de 8 dígitos.'
        ]
      },
      {
        title: '2. Respuestas Rápidas y Detección Anti-Copia',
        subtitle: 'Prueba en vivo con auto-calificación',
        icon: AlertTriangle,
        badge: 'Anti-Copia Activo',
        content:
          'Selecciona la opción correcta en las tarjetas de colores y figuras geométricas. Si cambias de pestaña o sales de la pantalla, tu examen se bloqueará y tu docente recibirá una alerta inmediata con opción de reactivar o asignar 0 automáticamente.',
        keyPoints: [
          '4 botones de colores y figuras geométricas de alta visibilidad.',
          'Alerta en vivo al profesor si el alumno sale de la pestaña.',
          'Calificación instantánea registrada directamente en el cuadro de notas.'
        ]
      }
    ]
  };

  const currentSteps = tutorialStepsByRole[selectedRoleGuide];
  const activeStep = currentSteps[currentStepIndex] || currentSteps[0];

  // FAQ Items updated with all latest features
  const faqItems = [
    {
      q: '¿Cómo habilitar el permiso de micrófono para la asistencia por voz?',
      role: 'profesor',
      ans: 'En la ventana de Asistencia por Voz, haz clic en "Aceptar y Conectar Micrófono". Tu navegador desplegará la solicitud oficial de permiso. Selecciona "Permitir". Si alguna vez lo bloqueaste, haz clic en el ícono de candado o cámara en la barra de direcciones de tu navegador y activa el permiso de micrófono.',
      actionText: 'Ir a Asistencia por Voz',
      actionRole: 'profesor' as UserRole
    },
    {
      q: '¿Cómo funciona el examen virtual con anti-trampa y cómo desbloquear a un alumno?',
      role: 'profesor',
      ans: 'Al crear el examen virtual, seleccionas la columna destino en el cuadro de notas. Cuando un alumno sale de la pestaña o minimiza la ventana, su examen se bloquea de inmediato y te aparece una notificación en pantalla. Puedes presionar "Permitir reingreso" para darle otra oportunidad o "Denegar" para fijar su nota en 0.0.',
      actionText: 'Ver Examen Virtual',
      actionRole: 'profesor' as UserRole
    },
    {
      q: '¿Por qué las notas de los exámenes coinciden exactamente con el perfil de los padres?',
      role: 'profesor',
      ans: 'El sistema tiene sincronización bidireccional automática: la nota que obtenga el alumno en el examen virtual o en la lectura óptica OMR se graba directamente en la columna elegida del cuadro de notas, y se refleja de inmediato en el portal del padre de familia.',
      actionText: 'Ir al Cuadro de Notas',
      actionRole: 'profesor' as UserRole
    },
    {
      q: '¿Cómo descargar el examen en PDF limpio para imprimir con hoja de respuestas?',
      role: 'profesor',
      ans: 'En el generador de exámenes, haz clic en "Generar Examen Imprimible y OMR". Se renderizará el HTML completo con las preguntas, el solucionario para el profesor y la plantilla de óvalos para los estudiantes. Haz clic en "Imprimir / Guardar como PDF" y la regla @media print excluirá automáticamente todos los botones de la app.',
      actionText: 'Ir a Exámenes',
      actionRole: 'profesor' as UserRole
    },
    {
      q: '¿Cuál es el formato oficial del NIE de los estudiantes según el MINED?',
      role: 'escuela',
      ans: 'El NIE oficial del MINED de El Salvador está compuesto por 8 dígitos numéricos continuos sin guiones ni espacios (ejemplo: 18882846). Este formato está estandarizado en la matrícula, en los cuadros de notas, en la asistencia por voz y en el acceso a evaluaciones virtuales.',
      actionText: 'Ver Matrícula',
      actionRole: 'escuela' as UserRole
    },
    {
      q: '¿Cómo usar el Asistente Pedagógico para resolver dudas de la app?',
      role: 'profesor',
      ans: 'Haz clic en el botón flotante en la esquina inferior derecha. Puedes escribirle cualquier duda como "¿Cómo paso asistencia por voz?", "¿Cómo exporto las notas a PDF con el logo escolar?" o pedirle actividades lúdicas de 15 minutos para tu materia.',
      actionText: 'Consultar Asistente',
      actionRole: 'profesor' as UserRole
    },
    {
      q: '¿Cómo funciona la regla de color para notas menores a 6.0?',
      role: 'profesor',
      ans: 'En todos los cuadros de calificaciones y reportes de padres, las notas inferiores a 6.0 se destacan automáticamente en color rojo para identificar a los alumnos en riesgo académico, mientras que las notas aprobatorias mantienen el color azul institucional.',
      actionText: 'Ver Cuadro de Notas',
      actionRole: 'profesor' as UserRole
    },
    {
      q: '¿Qué pasa si agrego más del 100% en las evaluaciones del cuadro de notas?',
      role: 'profesor',
      ans: 'El sistema valida la suma de ponderaciones. Si intentas agregar evaluaciones que superen el 100%, se abrirá una ventana de advertencia con un botón para "Ajustar al disponible", garantizando el cumplimiento normativo.',
      actionText: 'Ir al Cuadro de Notas',
      actionRole: 'profesor' as UserRole
    }
  ];

  const filteredFaqs = faqItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.q.toLowerCase().includes(q) || item.ans.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <HelpCircle className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  Guía de Uso y Centro de Ayuda
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Actualizado v2.5
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Aprende a utilizar todas las funciones avanzadas y nuevas herramientas de la plataforma.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Tutorial vs FAQ */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('tutorial')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'tutorial'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Tutorial Interactivo Guiado ({currentSteps.length} Pasos)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'faq'
                ? 'border-[#2563EB] text-[#2563EB] dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Preguntas Frecuentes y Nuevas Funciones
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'tutorial' ? (
            <div className="space-y-5">
              {/* Profile selector tabs */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  Selecciona el perfil que deseas explorar:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleGuide('profesor');
                      setCurrentStepIndex(0);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRoleGuide === 'profesor'
                        ? 'border-[#2563EB] bg-blue-50 text-[#1E3A8A] shadow-xs ring-2 ring-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-[#2563EB]" />
                    <span>Docente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleGuide('estudiante');
                      setCurrentStepIndex(0);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRoleGuide === 'estudiante'
                        ? 'border-[#2563EB] bg-blue-50 text-[#1E3A8A] shadow-xs ring-2 ring-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 text-purple-600" />
                    <span>Estudiante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleGuide('padre');
                      setCurrentStepIndex(0);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRoleGuide === 'padre'
                        ? 'border-[#2563EB] bg-blue-50 text-[#1E3A8A] shadow-xs ring-2 ring-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>Padre</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleGuide('escuela');
                      setCurrentStepIndex(0);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRoleGuide === 'escuela'
                        ? 'border-[#2563EB] bg-blue-50 text-[#1E3A8A] shadow-xs ring-2 ring-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <School className="w-4 h-4 text-emerald-600" />
                    <span>Escuela</span>
                  </button>
                </div>
              </div>

              {/* Step indicator pagination dots */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl text-xs border border-slate-200">
                <span className="font-bold text-slate-600">
                  Paso {currentStepIndex + 1} de {currentSteps.length}
                </span>
                <div className="flex items-center gap-1.5">
                  {currentSteps.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        currentStepIndex === idx
                          ? 'w-7 bg-[#2563EB]'
                          : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                      }`}
                      aria-label={`Ir al paso ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Step Card */}
              <div className="p-5 rounded-2xl border-2 border-slate-200 bg-white shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center shrink-0 border border-blue-200">
                      <activeStep.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {activeStep.badge}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                        {activeStep.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{activeStep.subtitle}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {activeStep.content}
                </p>

                {/* Key Points */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black text-slate-900 block">
                    Puntos clave de esta función:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeStep.keyPoints.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={currentStepIndex === 0}
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  Anterior
                </button>

                <div className="flex items-center gap-2">
                  {currentStepIndex < currentSteps.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      Siguiente Paso <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinishTutorial}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Entendido, ¡Comenzar!
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Bar for Quick FAQs */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar dudas (ej. micrófono, examen virtual, OMR, horario, NIE, 100%, rojo < 6.0)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#2563EB] outline-none"
                />
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                    No se encontraron respuestas para "{searchQuery}". Intenta con palabras clave como "voz", "examen", "nie", "horario" o "notas".
                  </div>
                ) : (
                  filteredFaqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs hover:border-blue-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-[#1E3A8A] text-xs font-black flex items-center justify-center shrink-0">
                            ?
                          </span>
                          {faq.q}
                        </h4>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            faq.role === 'profesor'
                              ? 'bg-blue-100 text-[#1E3A8A]'
                              : faq.role === 'padre'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {faq.role}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed pl-7 font-medium">
                        {faq.ans}
                      </p>

                      <div className="pt-2 pl-7 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            switchRole(faq.actionRole);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-black text-[#2563EB] hover:underline bg-blue-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          {faq.actionText} <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-medium">EduControl Pro • Tutorial y Guía Oficial Actualizada</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
