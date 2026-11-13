import React, { useState } from 'react';
import {
  Gamepad2,
  Sparkles,
  Users,
  Copy,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Key,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Layers,
  Send,
  HelpCircle,
  Trophy,
  Volume2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActivityWeight, VirtualOnlineExam, GeneratedExamKey } from '../../types';
import { generateCustomExam, DEFAULT_SUBJECT_TOPICS } from '../../utils/examGenerator';
import { generateAIExamWithGemini } from '../../utils/aiExamService';

interface OnlineExamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradeId: string;
  gradeName: string;
  subjectName: string;
  periodId: string;
  activities: ActivityWeight[];
}

export const OnlineExamManagerModal: React.FC<OnlineExamManagerModalProps> = ({
  isOpen,
  onClose,
  gradeId,
  gradeName,
  subjectName,
  periodId,
  activities
}) => {
  const {
    activeInstitution,
    activeTeacher,
    virtualExams,
    createVirtualOnlineExam,
    reEnableStudentExam,
    denyStudentExam,
    showToast,
    addActivity
  } = useApp();

  // Active or selected virtual exam
  const currentExam = virtualExams.find(
    (e) => e.gradeId === gradeId && e.subjectName === subjectName && e.isActive
  ) || virtualExams[0];

  const [activeTab, setActiveTab] = useState<'monitor' | 'crear'>(
    currentExam ? 'monitor' : 'crear'
  );

  // Form State for creating a new Virtual Exam
  const [examTitle, setExamTitle] = useState<string>('Evaluación Virtual en Línea');
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [keyCount, setKeyCount] = useState<number>(4);
  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    activities[activities.length - 1]?.id || 'act-exam'
  );
  const [newActivityName, setNewActivityName] = useState<string>('Examen Virtual en Línea');
  const [newActivityWeight, setNewActivityWeight] = useState<number>(20);

  // Topics
  const defaultTopics = DEFAULT_SUBJECT_TOPICS[subjectName] || [
    'Operaciones y conceptos centrales',
    'Resolución de problemas de aplicación',
    'Análisis crítico y procedimientos'
  ];
  const [topics, setTopics] = useState<string[]>(defaultTopics.slice(0, 4));
  const [newTopicInput, setNewTopicInput] = useState<string>('');

  // AI Loading state
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAddTopic = () => {
    if (newTopicInput.trim() && !topics.includes(newTopicInput.trim())) {
      setTopics([...topics, newTopicInput.trim()]);
      setNewTopicInput('');
    }
  };

  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    showToast('PIN Copiado', `El código ${pin} fue copiado al portapapeles`, 'success');
    setTimeout(() => setCopiedPin(false), 2500);
  };

  // Create Exam Handler
  const handleCreateExam = async (useAI: boolean = false) => {
    let effectiveActivityId = selectedActivityId;
    let effectiveActivityName = activities.find((a) => a.id === selectedActivityId)?.name || 'Examen Virtual';

    // If teacher chose to create a new column in gradebook
    if (selectedActivityId === 'new-activity') {
      const newActId = `act-vexam-${Date.now()}`;
      addActivity(periodId, {
        name: newActivityName.trim() || 'Examen Virtual en Línea',
        percentage: Number(newActivityWeight) || 20,
        dueDate: new Date().toISOString().split('T')[0],
        isExam: true
      });
      effectiveActivityId = newActId;
      effectiveActivityName = newActivityName.trim() || 'Examen Virtual en Línea';
    }

    let generatedKeys: Record<string, GeneratedExamKey> = {};

    if (useAI) {
      setIsGeneratingAI(true);
      try {
        const aiResult = await generateAIExamWithGemini({
          institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
          gradeName,
          gradeId,
          subjectName,
          examTitle,
          periodNum: 1,
          totalQuestions,
          topics,
          keyCount
        });
        generatedKeys = aiResult.exam.keys;
      } catch (err) {
        console.warn('AI fallback to pedagogical engine:', err);
        const fallbackExam = generateCustomExam({
          institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
          gradeName,
          gradeId,
          subjectName,
          examTitle,
          periodNum: 1,
          date: new Date().toISOString().split('T')[0],
          totalQuestions,
          topics,
          keyCount
        });
        generatedKeys = fallbackExam.keys;
      } finally {
        setIsGeneratingAI(false);
      }
    } else {
      const standardExam = generateCustomExam({
        institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
        gradeName,
        gradeId,
        subjectName,
        examTitle,
        periodNum: 1,
        date: new Date().toISOString().split('T')[0],
        totalQuestions,
        topics,
        keyCount
      });
      generatedKeys = standardExam.keys;
    }

    // Create the virtual exam
    const created = createVirtualOnlineExam({
      pin: Math.floor(100000 + Math.random() * 900000).toString(),
      institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
      gradeId,
      gradeName,
      subjectName,
      periodId,
      targetActivityId: effectiveActivityId,
      targetActivityName: effectiveActivityName,
      examTitle,
      topics,
      totalQuestions,
      durationMinutes: 40,
      keys: generatedKeys,
      isActive: true
    });

    setActiveTab('monitor');
  };

  const studentSessionsList = currentExam ? Object.values(currentExam.studentSessions) : [];
  const blockedStudents = studentSessionsList.filter((s) => s.hasLeftPage || s.status === 'blocked');
  const submittedStudents = studentSessionsList.filter((s) => s.status === 'submitted');
  const inProgressStudents = studentSessionsList.filter((s) => s.status === 'in_progress');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Cabecera Examen Virtual & Azul Rey */}
        <header className="bg-gradient-to-r from-[#1E3A8A] via-[#2563eb] to-[#1d4ed8] text-white px-6 py-4 flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-md">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  Examen Virtual en Vivo con IA
                </h2>
                <span className="bg-amber-400 text-slate-900 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Anti-Cheat Integrado
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                {subjectName} • {gradeName} • Cada alumno con clave distinta y auto-calificación directa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white/15 p-1 rounded-xl border border-white/20 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('monitor')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === 'monitor' ? 'bg-white text-indigo-900 shadow-xs' : 'text-white hover:bg-white/10'
                }`}
              >
                Panel de Monitoreo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crear')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === 'crear' ? 'bg-white text-indigo-900 shadow-xs' : 'text-white hover:bg-white/10'
                }`}
              >
                + Crear Nuevo Examen
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-blue-100 hover:text-white hover:bg-white/15 rounded-xl transition ml-2"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* TAB 1: MONITOR EN VIVO Y CÓDIGO PIN */}
        {activeTab === 'monitor' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/60">
            {currentExam ? (
              <>
                {/* Banner de PIN de Sala */}
                <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border-2 border-indigo-400/30 flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5 justify-center sm:justify-start">
                      <Gamepad2 className="w-4 h-4" /> CÓDIGO PIN DE LA ACTIVIDAD (ENTRADA ESTUDIANTES)
                    </span>
                    <h3 className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-white drop-shadow-md">
                      {currentExam.pin}
                    </h3>
                    <p className="text-xs text-blue-200">
                      Los estudiantes deben entrar al perfil de <strong>Estudiante</strong>, ingresar su correo institucional, NIE y este PIN.
                    </p>
                  </div>

                  <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyPin(currentExam.pin)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-2"
                    >
                      {copiedPin ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPin ? '¡PIN Copiado!' : 'Copiar PIN'}</span>
                    </button>

                    <div className="text-[11px] text-blue-200 bg-white/10 px-3 py-1 rounded-lg border border-white/20">
                      Columna de Guardado:{' '}
                      <strong className="text-white font-bold">{currentExam.targetActivityName}</strong>
                    </div>
                  </div>
                </div>

                {/* Banner de Alerta Crítica Anti-Cheat */}
                {blockedStudents.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 shadow-md animate-pulse">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-600 text-white rounded-xl shrink-0 mt-0.5">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-red-950 flex items-center gap-1.5">
                            ⚠️ Alerta de Seguridad: {blockedStudents.length}{' '}
                            {blockedStudents.length === 1 ? 'estudiante ha' : 'estudiantes han'} salido de la página
                          </h4>
                          <p className="text-xs text-red-800 mt-0.5">
                            Se detectó que abrieron otra pestaña o cambiaron de aplicación. Su examen ha sido pausado y bloqueado inmediatamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumen de Estado en Vivo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs">
                    <span className="text-slate-500 font-bold block text-[11px]">Conectados en Sala</span>
                    <span className="text-xl font-black text-indigo-700 font-mono mt-0.5 block">
                      {studentSessionsList.length}
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-3.5 rounded-2xl border-2 border-emerald-200 shadow-xs text-emerald-950">
                    <span className="font-bold block text-[11px] text-emerald-700">Rindiendo Examen</span>
                    <span className="text-xl font-black font-mono mt-0.5 block">{inProgressStudents.length}</span>
                  </div>

                  <div className="bg-red-50 p-3.5 rounded-2xl border-2 border-red-200 shadow-xs text-red-950">
                    <span className="font-bold block text-[11px] text-red-700">Bloqueados por Salir</span>
                    <span className="text-xl font-black font-mono mt-0.5 block">{blockedStudents.length}</span>
                  </div>

                  <div className="bg-blue-50 p-3.5 rounded-2xl border-2 border-blue-200 shadow-xs text-blue-950">
                    <span className="font-bold block text-[11px] text-blue-700">Finalizados con Nota</span>
                    <span className="text-xl font-black font-mono mt-0.5 block">{submittedStudents.length}</span>
                  </div>
                </div>

                {/* Tabla de Estudiantes en Tiempo Real */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-300" />
                        Monitoreo de Alumnos en Vivo
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Cada alumno rinde una clave distinta con orden de preguntas aleatorio.
                      </p>
                    </div>

                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                      ● Sincronización en Vivo
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Estudiante</th>
                          <th className="p-3">NIE</th>
                          <th className="p-3">Clave Asignada</th>
                          <th className="p-3">Estado del Alumno</th>
                          <th className="p-3">Nota Cuadro</th>
                          <th className="p-3 text-right">Acción del Docente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {studentSessionsList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                              Aún no hay estudiantes conectados en esta sala. Pídeles que ingresen al perfil de{' '}
                              <strong>Estudiante</strong> con el PIN{' '}
                              <strong className="text-indigo-600 font-mono">{currentExam.pin}</strong>.
                            </td>
                          </tr>
                        ) : (
                          studentSessionsList.map((st) => {
                            const isBlocked = st.hasLeftPage || st.status === 'blocked';
                            const isSubmitted = st.status === 'submitted';

                            return (
                              <tr
                                key={st.studentId}
                                className={`transition-colors ${
                                  isBlocked
                                    ? 'bg-red-50/80'
                                    : isSubmitted
                                    ? 'bg-emerald-50/50'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="p-3 font-bold text-slate-900">
                                  {st.studentName}
                                  {st.email && (
                                    <span className="block text-[10px] text-slate-500 font-normal">
                                      {st.email}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-slate-600">{st.nie}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-black text-[11px] border border-indigo-200">
                                    Clave {st.keyId}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {isBlocked ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-600 text-white flex items-center gap-1 w-fit shadow-xs animate-bounce">
                                      <AlertTriangle className="w-3 h-3" />
                                      Ha salido de la página
                                    </span>
                                  ) : isSubmitted ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 w-fit">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Prueba Finalizada
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 flex items-center gap-1 w-fit">
                                      <Clock className="w-3 h-3 text-blue-600" />
                                      Rindiendo examen...
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-black text-sm">
                                  {isSubmitted ? (
                                    <span
                                      className={`font-mono font-black ${
                                        (st.score ?? 0) < 6.0 ? 'text-red-600' : 'text-[#2563EB]'
                                      }`}
                                    >
                                      {st.score?.toFixed(1)} / 10
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs font-normal">En curso</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {st.deniedByTeacher ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-900 border border-red-300">
                                      Permiso Denegado (Nota: 0.0)
                                    </span>
                                  ) : isBlocked ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => reEnableStudentExam(currentExam.id, st.studentId)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg text-xs shadow-xs transition inline-flex items-center gap-1"
                                        title="Permitir que el estudiante continúe la prueba"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Permitir
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => denyStudentExam(currentExam.id, st.studentId)}
                                        className="bg-red-600 hover:bg-red-700 text-white font-black px-2.5 py-1 rounded-lg text-xs shadow-xs transition inline-flex items-center gap-1"
                                        title="Denegar permiso y asignar 0.0 en el cuadro de notas"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Denegar (0.0)
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">En regla ✓</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 space-y-3">
                <Gamepad2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-black text-base text-slate-700">No hay ningún examen virtual activo</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Crea una nueva sala de evaluación virtual para que tus estudiantes puedan ingresar desde sus dispositivos.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('crear')}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition"
                >
                  + Configurar Nuevo Examen Virtual
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONFIGURADOR DE NUEVO EXAMEN CON IA */}
        {activeTab === 'crear' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">
            <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Configuración del Examen Virtual y Asignación de Calificación
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                {/* Título */}
                <div>
                  <label className="block mb-1">Título de la Evaluación:</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none"
                    placeholder="Ej. Prueba Virtual de Matemáticas"
                  />
                </div>

                {/* Preguntar en qué columna se guardará la nota (REQUISITO ESTRICTO) */}
                <div>
                  <label className="block mb-1 text-blue-900 font-extrabold flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    ¿En qué columna del Cuadro de Notas se guardará la nota?
                  </label>
                  <select
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-blue-400 bg-blue-50/50 text-blue-950 font-bold outline-none"
                  >
                    {activities.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.name} ({act.percentage}%) {act.isExam ? '★ Examen Oficial' : ''}
                      </option>
                    ))}
                    <option value="new-activity">+ Crear Nueva Columna en el Cuadro de Notas</option>
                  </select>
                </div>
              </div>

              {/* Si se elige crear nueva columna */}
              {selectedActivityId === 'new-activity' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-amber-950 mb-1">Nombre de la Nueva Columna:</label>
                    <input
                      type="text"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 font-bold outline-none"
                      placeholder="Ej. Examen de Periodo 1"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-950 mb-1">Ponderación (%):</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={newActivityWeight}
                      onChange={(e) => setNewActivityWeight(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Cantidad de Preguntas y Claves */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700 pt-2 border-t border-slate-200">
                <div>
                  <label className="block mb-1">Cantidad de Preguntas:</label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTotalQuestions(num)}
                        className={`flex-1 py-2 rounded-xl font-black text-xs transition ${
                          totalQuestions === num
                            ? 'bg-[#2563EB] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                      >
                        {num} preguntas
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block mb-1">Claves Distintas para los Alumnos:</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKeyCount(k)}
                        className={`flex-1 py-2 rounded-xl font-black text-xs transition ${
                          keyCount === k
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                      >
                        {k} {k === 1 ? 'Clave' : 'Claves'}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                    Al asignar múltiples claves, cada alumno recibe un orden distinto de preguntas para evitar copias.
                  </span>
                </div>
              </div>

              {/* Temas del Examen */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Temas a Evaluar en el Examen:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {topics.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(i)}
                        className="text-blue-500 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTopicInput}
                    onChange={(e) => setNewTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTopic();
                      }
                    }}
                    placeholder="Escribe un tema adicional y presiona Agregar..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Botones de Creación */}
              <div className="pt-4 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={() => handleCreateExam(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Generación Rápida
                </button>

                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={() => handleCreateExam(true)}
                  className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-800 hover:to-blue-700 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition flex items-center gap-2 disabled:opacity-50 hover:scale-105"
                >
                  {isGeneratingAI ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Diseñando con Gemini 3.8 Flash...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Crear Examen Virtual con IA (Gemini 3.8 Flash)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
