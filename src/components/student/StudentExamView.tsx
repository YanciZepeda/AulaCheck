import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  Send,
  Trophy,
  RotateCcw,
  BookOpen,
  User,
  Key,
  GraduationCap,
  Sparkle,
  Zap,
  HelpCircle,
  Eye,
  Info,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StudentExamSession, Student, ExamQuestion } from '../../types';

/**
 * Interfaz de pregunta sanitizada para el cliente:
 * NO contiene 'correctAnswer' ni 'explanation' para prevenir filtraciones
 * en el estado del componente React, en la memoria o en el DOM.
 */
export interface SanitizedExamQuestion {
  questionNumber: number;
  topic: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

/**
 * Metadatos sanitizados del examen para el entorno del estudiante
 */
export interface SanitizedExamInfo {
  id: string;
  examTitle: string;
  subjectName: string;
  gradeName: string;
  targetActivityName: string;
  totalQuestions: number;
  keyId: string;
}

export const StudentExamView: React.FC = () => {
  const {
    students,
    virtualExams,
    joinVirtualExam,
    recordStudentTabSwitch,
    submitStudentOnlineExam,
    showToast,
    switchRole
  } = useApp();

  // Authentication & Lobby State
  const [studentEmail, setStudentEmail] = useState<string>('alejandro.aguilar@cedusansalvador.edu.sv');
  const [studentNie, setStudentNie] = useState<string>('18882846');
  const [examPin, setExamPin] = useState<string>(virtualExams[0]?.pin || '849201');

  // Estado del Examen Sanitizado: SIN respuestas correctas en el estado
  const [examInfo, setExamInfo] = useState<SanitizedExamInfo | null>(null);
  const [questions, setQuestions] = useState<SanitizedExamQuestion[]>([]);
  const [activeSession, setActiveSession] = useState<StudentExamSession | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  // Exam screen state: 'login' | 'lobby' | 'exam' | 'submitted'
  const [examState, setExamState] = useState<'login' | 'lobby' | 'exam' | 'submitted'>('login');

  // Navegación de preguntas y selección de respuestas
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [finalScoreData, setFinalScoreData] = useState<{ score: number; total: number; correctCount: number } | null>(null);

  // Anti-Cheat: Local blocked flag
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Keep exam session synchronized with context (for unblocking)
  useEffect(() => {
    if (!examInfo || !currentStudent) return;
    const liveExam = virtualExams.find((e) => e.id === examInfo.id);
    if (liveExam) {
      const liveSession = liveExam.studentSessions[currentStudent.id];
      if (liveSession) {
        setActiveSession(liveSession);
        // Si el docente re-habilitó el examen, levantar bloqueo local
        if (liveSession.status === 'in_progress' && !liveSession.hasLeftPage) {
          setIsBlocked(false);
        } else if (liveSession.hasLeftPage || liveSession.status === 'blocked') {
          setIsBlocked(true);
        }

        // Si el docente denegó el permiso
        if (liveSession.deniedByTeacher) {
          setIsBlocked(false);
          setExamState('submitted');
          setFinalScoreData({
            score: 0.0,
            total: examInfo.totalQuestions || 5,
            correctCount: 0
          });
        }
      }
    }
  }, [virtualExams, examInfo, currentStudent]);

  // Anti-Cheat: Detectar cambio de pestaña o pérdida de foco (REQUISITO ESTRICTO)
  useEffect(() => {
    if (examState !== 'exam' || !examInfo || !currentStudent || isBlocked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlocked(true);
        recordStudentTabSwitch(examInfo.id, currentStudent.id);
      }
    };

    const handleWindowBlur = () => {
      setIsBlocked(true);
      recordStudentTabSwitch(examInfo.id, currentStudent.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [examState, examInfo, currentStudent, isBlocked, recordStudentTabSwitch]);

  // Join Exam Handler: filtra y sanitiza los datos para no almacenar respuestas correctas en el cliente
  const handleJoinExam = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const result = joinVirtualExam(examPin, studentEmail, studentNie);
    if (!result.success || !result.exam || !result.session || !result.student) {
      setLoginError(result.error || 'No se pudo ingresar a la actividad. Verifica tus datos y el PIN.');
      return;
    }

    const assignedKeyId = result.session.keyId || 'A';
    const rawKeyData = result.exam.keys[assignedKeyId] || result.exam.keys['A'];

    // SEGURIDAD CRÍTICA: Extraer únicamente el enunciado y las opciones A, B, C, D.
    // Se elimina completamente 'correctAnswer' y 'explanation' antes de fijar el estado del componente.
    const safeQuestions: SanitizedExamQuestion[] = (rawKeyData?.questions || []).map((q: ExamQuestion) => ({
      questionNumber: q.questionNumber,
      topic: q.topic,
      questionText: q.questionText,
      options: {
        A: q.options.A,
        B: q.options.B,
        C: q.options.C,
        D: q.options.D
      }
    }));

    // Almacenar sólo metadatos y preguntas sanitizadas
    setExamInfo({
      id: result.exam.id,
      examTitle: result.exam.examTitle,
      subjectName: result.exam.subjectName,
      gradeName: result.exam.gradeName,
      targetActivityName: result.exam.targetActivityName,
      totalQuestions: result.exam.totalQuestions,
      keyId: assignedKeyId
    });
    setQuestions(safeQuestions);
    setActiveSession(result.session);
    setCurrentStudent(result.student);
    setStudentAnswers(result.session.answers || {});

    if (result.session.status === 'submitted') {
      setExamState('submitted');
      setFinalScoreData({
        score: result.session.score || 0,
        total: result.exam.totalQuestions,
        correctCount: Math.round(((result.session.score || 0) / 10) * result.exam.totalQuestions)
      });
    } else if (result.session.hasLeftPage || result.session.status === 'blocked') {
      setIsBlocked(true);
      setExamState('exam');
    } else {
      setExamState('lobby');
    }
  };

  // Quick Demo Logins for Testing
  const handleQuickDemoLogin = (email: string, nie: string, pin: string) => {
    setStudentEmail(email);
    setStudentNie(nie);
    setExamPin(pin);
  };

  // Start exam from lobby
  const handleStartExam = () => {
    setExamState('exam');
    setCurrentQuestionIndex(0);
  };

  // Select option for current question (sin validación previa ni retroalimentación)
  const handleSelectOption = (questionNumber: number, optionLetter: 'A' | 'B' | 'C' | 'D') => {
    if (isBlocked) return;
    setStudentAnswers((prev) => ({
      ...prev,
      [questionNumber]: optionLetter
    }));
  };

  // Submit Exam: Validación segura ÚNICAMENTE al enviar el examen completo en el servidor/contexto
  const handleSubmitExam = () => {
    if (!examInfo || !currentStudent) return;

    // La evaluación se realiza de forma segura y autoritativa en AppContext (lado servidor/contexto)
    const result = submitStudentOnlineExam(examInfo.id, currentStudent.id, studentAnswers);
    setFinalScoreData(result);
    setExamState('submitted');
  };

  // Pregunta actual sanitizada (sin correctAnswer ni en estado ni en DOM)
  const currentQuestion: SanitizedExamQuestion | undefined = questions[currentQuestionIndex];

  // Mapeo neutro de opciones A, B, C, D (sin colores ni formas que sugieran respuestas)
  const EXAM_OPTIONS = [
    { key: 'A' as const, letter: 'A' },
    { key: 'B' as const, letter: 'B' },
    { key: 'C' as const, letter: 'C' },
    { key: 'D' as const, letter: 'D' }
  ];

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
      {/* ========================================================
          PANTALLA 1: INGRESO DE ESTUDIANTE Y PIN DE EXAMEN VIRTUAL
         ======================================================== */}
      {examState === 'login' && (
        <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-2xl border-2 border-indigo-500/30 overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Logo & Virtual Exam Title */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-red-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
              <Gamepad2 className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              EduControl <span className="text-amber-400">Examen Virtual en Vivo</span>
            </h1>
            <p className="text-xs text-indigo-200">
              Portal del Estudiante • Ingresa con tu cuenta institucional y el PIN de tu profesor
            </p>
          </div>

          {loginError && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Formulario de Entrada */}
          <form onSubmit={handleJoinExam} className="space-y-4 text-xs font-bold">
            {/* PIN de la Actividad */}
            <div>
              <label className="block text-indigo-200 mb-1 text-[11px] uppercase tracking-wider font-extrabold">
                Código PIN del Examen:
              </label>
              <input
                type="text"
                value={examPin}
                onChange={(e) => setExamPin(e.target.value)}
                placeholder="Ej. 849201"
                className="w-full bg-white text-slate-900 font-mono text-center text-2xl font-black tracking-widest px-4 py-3 rounded-2xl border-2 border-indigo-400 focus:ring-4 focus:ring-indigo-500/50 outline-none placeholder-slate-400"
                required
              />
            </div>

            {/* Correo Institucional */}
            <div>
              <label className="block text-indigo-200 mb-1 text-[11px] uppercase tracking-wider font-extrabold">
                Correo Institucional del Estudiante:
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="alumno@escuela.edu.sv"
                className="w-full bg-white/10 text-white font-medium text-xs px-4 py-2.5 rounded-xl border border-white/20 focus:border-indigo-400 outline-none"
                required
              />
            </div>

            {/* NIE */}
            <div>
              <label className="block text-indigo-200 mb-1 text-[11px] uppercase tracking-wider font-extrabold">
                Número de Identificación Estudiantil (NIE):
              </label>
              <input
                type="text"
                value={studentNie}
                onChange={(e) => setStudentNie(e.target.value)}
                placeholder="Ej. 18882846"
                className="w-full bg-white/10 text-white font-mono text-xs px-4 py-2.5 rounded-xl border border-white/20 focus:border-indigo-400 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm py-3.5 rounded-2xl shadow-xl transition-transform hover:scale-[1.02] active:scale-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚀 Entrar a la Actividad</span>
            </button>
          </form>

          {/* Accesos Demo Rápidos para Pruebas del Usuario */}
          <div className="pt-3 border-t border-white/10">
            <span className="text-[11px] text-indigo-300 font-bold block mb-2 text-center">
              Accesos Demo para Pruebas:
            </span>
            <div className="flex flex-col gap-1.5 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleQuickDemoLogin(
                    'alejandro.aguilar@cedusansalvador.edu.sv',
                    '18882846',
                    virtualExams[0]?.pin || '849201'
                  )
                }
                className="w-full bg-white/10 hover:bg-white/20 text-indigo-100 py-1.5 px-3 rounded-lg text-left text-[11px] font-semibold flex items-center justify-between border border-white/15 cursor-pointer"
              >
                <span>👤 Alejandro David Aguilar (1° Grado)</span>
                <span className="font-mono text-amber-400">NIE: 18882846</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickDemoLogin(
                    'camila.benitez@cedusansalvador.edu.sv',
                    '18882847',
                    virtualExams[0]?.pin || '849201'
                  )
                }
                className="w-full bg-white/10 hover:bg-white/20 text-indigo-100 py-1.5 px-3 rounded-lg text-left text-[11px] font-semibold flex items-center justify-between border border-white/15 cursor-pointer"
              >
                <span>👤 Camila Sofía Benítez (1° Grado)</span>
                <span className="font-mono text-amber-400">NIE: 18882847</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PANTALLA 2: SALA DE ESPERA / LOBBY PREVIO
         ======================================================== */}
      {examState === 'lobby' && examInfo && currentStudent && (
        <div className="w-full max-w-xl bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-2xl border-2 border-indigo-400/40 p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95">
          <div className="space-y-2">
            <span className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              ¡Conectado a la Sala!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
              {examInfo.examTitle}
            </h2>
            <p className="text-sm text-indigo-200">
              Materia: <strong>{examInfo.subjectName}</strong> • {examInfo.gradeName}
            </p>
          </div>

          {/* Tarjeta del Estudiante y Clave Asignada */}
          <div className="bg-white/10 rounded-2xl p-5 border border-white/20 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div>
                <span className="text-[11px] text-indigo-300 font-bold block">Estudiante:</span>
                <h4 className="text-base font-black text-white">{currentStudent.fullName}</h4>
              </div>
              <span className="font-mono text-xs bg-indigo-500/30 border border-indigo-400/50 px-2.5 py-1 rounded-lg text-indigo-200">
                NIE: {currentStudent.nie}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-indigo-300 font-bold block">Clave Asignada:</span>
                <span className="text-sm font-black text-amber-400 bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-md inline-block">
                  Clave {examInfo.keyId}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-indigo-300 font-bold block">Preguntas:</span>
                <span className="text-sm font-black text-white">{questions.length} Reactivos</span>
              </div>
            </div>
          </div>

          {/* Reglas de Seguridad Anti-Cheat */}
          <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-4 text-xs text-red-200 text-left space-y-1.5">
            <h5 className="font-black text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> REGLA ESTRICTA DE SEGURIDAD (ANTI-CHEAT):
            </h5>
            <p>
              Durante el examen, <strong>NO salgas de esta pestaña</strong>, no cambies de ventana ni minimices el navegador. Si lo haces, el examen quedará bloqueado de forma inmediata y se notificará a tu profesor.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartExam}
            className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base py-4 rounded-2xl shadow-xl transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Iniciar Examen Ahora</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ========================================================
          PANTALLA 3: INTERFAZ DE EXAMEN VIRTUAL EN VIVO
         ======================================================== */}
      {examState === 'exam' && examInfo && currentStudent && currentQuestion && (
        <div className="w-full max-w-4xl relative">
          {/* OVERLAY DE BLOQUEO ANTI-CHEAT (REQUISITO ESTRICTO) */}
          {isBlocked && (
            <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center text-white space-y-5 animate-in fade-in">
              <div className="w-20 h-20 rounded-full bg-red-600/20 border-4 border-red-500 flex items-center justify-center animate-pulse">
                <ShieldAlert className="w-10 h-10 text-red-500" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-2xl font-black text-red-400">
                  ¡EXAMEN BLOQUEADO POR SALIR DE LA PÁGINA!
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Se ha detectado que cambiaste de ventana, pestaña o minimizaste el navegador.{' '}
                  <strong>Tu profesor ya ha recibido la notificación en su panel:</strong>
                </p>
                <div className="bg-red-950/80 border border-red-700/80 p-3 rounded-xl font-mono text-xs text-red-200 font-bold">
                  "{currentStudent.fullName} ha salido de la página"
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl border border-white/15 max-w-md text-xs text-indigo-200">
                <p>
                  Por motivos de seguridad académica no puedes continuar. Solicita a tu profesor que presione{' '}
                  <strong className="text-amber-300">"Volver a Habilitar Examen"</strong> desde su monitor docente para que puedas continuar.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 animate-pulse">
                <RotateCcw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Esperando desbloqueo del docente en tiempo real...</span>
              </div>
            </div>
          )}

          {/* Header Superior del Examen */}
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-800 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center font-black text-white shadow-xs">
                {examInfo.keyId}
              </div>
              <div>
                <h3 className="font-black text-sm text-white">{examInfo.examTitle}</h3>
                <p className="text-xs text-slate-400">
                  {currentStudent.fullName} • [Clave {examInfo.keyId}]
                </p>
              </div>
            </div>

            {/* Contador de Preguntas */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Progreso:</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  Pregunta {currentQuestionIndex + 1} de {questions.length}
                </span>
              </div>

              {/* Botón de Finalizar Prueba */}
              <button
                type="button"
                onClick={handleSubmitExam}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar Prueba</span>
              </button>
            </div>
          </div>

          {/* Tarjeta de la Pregunta Actual (Sanitizada: sin respuestas correctas) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-slate-200 space-y-5">
            <div>
              <span className="inline-block bg-blue-100 text-[#1E3A8A] font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                {currentQuestion.topic || 'Reactivo de Evaluación'}
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug">
                {currentQuestion.questionNumber}. {currentQuestion.questionText}
              </h2>
            </div>

            {/* Aviso de Confidencialidad y Modo Examen */}
            <div className="bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-2xl text-xs font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1E3A8A] shrink-0" />
              <span>
                <strong>Modo Examen Confidencial:</strong> Selecciona tu respuesta y avanza libremente. Las respuestas se envían y validan únicamente al presionar "Finalizar Prueba".
              </span>
            </div>

            {/* Cuadrícula de Opciones Académicas Neutras (Sin pistas ni respuestas correctas en DOM o estado) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {EXAM_OPTIONS.map((opt) => {
                const optionText = currentQuestion.options[opt.key];
                const isSelected = studentAnswers[currentQuestion.questionNumber] === opt.key;

                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => handleSelectOption(currentQuestion.questionNumber, opt.key)}
                    className={`p-4 sm:p-5 rounded-2xl font-bold text-left text-sm sm:text-base border-2 transition-all flex items-center justify-between shadow-xs cursor-pointer ${
                      isSelected
                        ? 'border-[#1E3A8A] bg-blue-50/80 text-[#1E3A8A] shadow-md ring-2 ring-blue-500/30'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition ${
                          isSelected
                            ? 'bg-[#1E3A8A] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {opt.letter}
                      </span>
                      <span className="font-semibold text-slate-900 leading-snug">{optionText}</span>
                    </div>

                    {/* Indicador de Selección Tipo Radio Neutro */}
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                        isSelected ? 'border-[#1E3A8A] bg-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-3 h-3 rounded-full bg-[#1E3A8A]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navegador Inferior */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>

              {/* Botones de preguntas (Neutros: pizarra oscura para respondidas, sin color verde ni feedback) */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-none">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(studentAnswers[q.questionNumber]);
                  const isCurrent = idx === currentQuestionIndex;

                  return (
                    <button
                      key={q.questionNumber}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1E3A8A] text-white ring-2 ring-blue-400 shadow-xs'
                          : isAnswered
                          ? 'bg-slate-700 text-white' // Color pizarra neutro: indica que fue respondida sin revelar si es correcta
                          : 'bg-slate-200 text-slate-600'
                      }`}
                      title={`Pregunta ${q.questionNumber}: ${isAnswered ? 'Respondida' : 'Sin responder'}`}
                    >
                      {q.questionNumber}
                    </button>
                  );
                })}
              </div>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2 rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Finalizar Prueba
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          PANTALLA 4: RESULTADO FINAL Y AUTO-CALIFICACIÓN EN CUADRO
         ======================================================== */}
      {examState === 'submitted' && examInfo && currentStudent && finalScoreData && (
        <div className="w-full max-w-lg bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-2xl border-2 border-indigo-400/40 p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95">
          {activeSession?.deniedByTeacher ? (
            <div className="w-20 h-20 rounded-full bg-red-600/30 border-4 border-red-500 flex items-center justify-center mx-auto shadow-xl shadow-red-500/25 animate-pulse">
              <ShieldAlert className="w-10 h-10 text-red-400" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/25">
              <Trophy className="w-10 h-10 text-slate-950" />
            </div>
          )}

          {activeSession?.deniedByTeacher ? (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-2xl p-4 text-xs text-red-200 text-left space-y-2">
              <h4 className="font-black text-red-400 flex items-center gap-1.5 text-sm">
                <ShieldAlert className="w-5 h-5 text-red-400" /> Permiso Denegado por el Docente
              </h4>
              <p>
                Has salido de la página durante la realización del examen virtual. Tu docente ha denegado la solicitud para reanudar la prueba y, de acuerdo con el protocolo institucional de seguridad académica, se ha asignado una calificación oficial de <strong>0.0</strong> que ha sido registrada directamente en la columna <strong>"{examInfo.targetActivityName}"</strong> del cuadro de notas.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                ¡Examen Finalizado Exitosamente!
              </span>
              <h2 className="text-3xl font-black text-white">{currentStudent.fullName}</h2>
              <p className="text-xs text-indigo-200">
                Evaluación: <strong>{examInfo.examTitle}</strong>
              </p>
            </div>
          )}

          {/* Calificación Calculada */}
          <div className="bg-white/10 rounded-2xl p-6 border border-white/20 space-y-3">
            <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider block">
              Tu Calificación Obtenida:
            </span>
            <div className={`text-5xl font-black font-mono ${activeSession?.deniedByTeacher ? 'text-red-400' : 'text-amber-400'}`}>
              {finalScoreData.score.toFixed(1)}{' '}
              <span className="text-xl text-white font-normal">/ 10.0</span>
            </div>
            <p className={`text-xs font-semibold ${activeSession?.deniedByTeacher ? 'text-red-300' : 'text-emerald-300'}`}>
              {activeSession?.deniedByTeacher ? 'Calificación fijada en 0.0 por incumplimiento de seguridad' : `Respuestas Correctas: ${finalScoreData.correctCount} de ${finalScoreData.total}`}
            </p>
          </div>

          {/* Confirmación de Guardado en el Cuadro de Notas (REQUISITO ESTRICTO) */}
          <div className={`${activeSession?.deniedByTeacher ? 'bg-red-500/20 border-2 border-red-400 text-red-200' : 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-200'} rounded-2xl p-4 text-xs text-left flex items-start gap-3`}>
            {activeSession?.deniedByTeacher ? (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="text-white block font-black">
                Calificación Agregada Automáticamente al Cuadro de Notas:
              </strong>
              <span>
                Tu nota de <strong>{finalScoreData.score.toFixed(1)}</strong> se agregó directamente en la casilla correspondiente a la columna{' '}
                <strong>"{examInfo.targetActivityName}"</strong> en el registro de tu docente.
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setExamState('login')}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl text-xs transition border border-white/20 cursor-pointer"
            >
              Salir de la Sala
            </button>
            <button
              type="button"
              onClick={() => switchRole('profesor')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 rounded-2xl text-xs transition shadow-md cursor-pointer"
            >
              Ver en Perfil Docente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
