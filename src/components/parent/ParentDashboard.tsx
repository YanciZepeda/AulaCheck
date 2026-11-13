import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Calendar as CalendarIcon,
  Bell,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Award,
  Plus,
  AlertOctagon,
  CalendarCheck,
  SlidersHorizontal,
  ShieldAlert,
  Gauge,
  Info,
  Save,
  RotateCcw,
  Check,
  Percent,
  Flame,
  CheckCircle,
  HelpCircle,
  Edit3,
  X,
  User
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const {
    activeParent,
    updateActiveParent,
    selectedChild,
    activeInstitution,
    students,
    periodGrades,
    attendance,
    calendarEvents,
    notifications,
    customTags,
    addCustomTag,
    parentThresholds,
    updateParentThresholds,
    evaluateParentThresholdsNow,
    triggerSimulatedThresholdAlert
  } = useApp();

  // Active view tab in Parent Portal
  const [activeTab, setActiveTab] = useState<'materias' | 'calendario' | 'notificaciones' | 'etiquetas' | 'umbrales'>('materias');

  // Currently selected subject in the subjects menu
  const [selectedSubject, setSelectedSubject] = useState<string>('Matemáticas');
  const [selectedPeriodNum, setSelectedPeriodNum] = useState<number>(1);

  // Edit Parent Profile state
  const [isEditParentModalOpen, setIsEditParentModalOpen] = useState<boolean>(false);
  const [editParentName, setEditParentName] = useState<string>(activeParent?.parentName || '');
  const [editChildName, setEditChildName] = useState<string>(activeParent?.childName || '');
  const [editNie, setEditNie] = useState<string>(activeParent?.nie || '');
  const [editParentEmail, setEditParentEmail] = useState<string>(activeParent?.parentEmail || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(activeParent?.studentId || '');

  // Students available in this school
  const schoolStudents = students.filter(
    (s) => s.institutionCode === (activeParent?.institutionCode || 'ESC-PUB-2026')
  );

  // Local state for parent threshold configuration editor
  const [tempMinGradeAvg, setTempMinGradeAvg] = useState<number>(parentThresholds.minGradeAverage);
  const [tempMinAttPct, setTempMinAttPct] = useState<number>(parentThresholds.minAttendancePercentage);
  const [tempNotifySingleAbsence, setTempNotifySingleAbsence] = useState<boolean>(parentThresholds.notifyOnSingleAbsence);
  const [tempNotifyGradeBelow, setTempNotifyGradeBelow] = useState<boolean>(parentThresholds.notifyOnGradeBelowThreshold);
  const [tempNotifyAttBelow, setTempNotifyAttBelow] = useState<boolean>(parentThresholds.notifyOnAttendanceBelowThreshold);
  const [thresholdSavedSuccess, setThresholdSavedSuccess] = useState<boolean>(false);

  // Sync when context changes
  useEffect(() => {
    setTempMinGradeAvg(parentThresholds.minGradeAverage);
    setTempMinAttPct(parentThresholds.minAttendancePercentage);
    setTempNotifySingleAbsence(parentThresholds.notifyOnSingleAbsence);
    setTempNotifyGradeBelow(parentThresholds.notifyOnGradeBelowThreshold);
    setTempNotifyAttBelow(parentThresholds.notifyOnAttendanceBelowThreshold);
  }, [parentThresholds]);

  // New tag modal
  const [isNewTagModalOpen, setIsNewTagModalOpen] = useState<boolean>(false);
  const [tagName, setTagName] = useState<string>('');
  const [tagColor, setTagColor] = useState<string>('#3b82f6');
  const [tagDesc, setTagDesc] = useState<string>('');

  // Selected tag filter in calendar
  const [calendarTagFilter, setCalendarTagFilter] = useState<string>('todos');

  // Child's relevant period grades - strictly synchronized with student's enrolled grade and official gradebook
  const childPeriodGrades = React.useMemo(() => {
    if (!selectedChild) return [];

    // Filter by student's enrolled grade and current period
    const matched = periodGrades.filter((p) => {
      const matchPeriod = p.period === selectedPeriodNum;
      const matchGrade = p.gradeId === selectedChild.gradeId;
      const matchInstitution = !p.institutionCode || p.institutionCode === selectedChild.institutionCode;
      return matchPeriod && matchGrade && matchInstitution;
    });

    if (matched.length > 0) return matched;

    // Fallback: search if periodGrades contains actual grades for this student
    const withStudentGrades = periodGrades.filter(
      (p) => p.period === selectedPeriodNum && p.grades.some((g) => g.studentId === selectedChild.id)
    );
    if (withStudentGrades.length > 0) return withStudentGrades;

    return periodGrades.filter((p) => p.period === selectedPeriodNum);
  }, [periodGrades, selectedChild, selectedPeriodNum]);

  // Keep selectedSubject in sync with available subjects
  useEffect(() => {
    if (childPeriodGrades.length > 0 && !childPeriodGrades.some((p) => p.subjectName === selectedSubject)) {
      setSelectedSubject(childPeriodGrades[0].subjectName);
    }
  }, [childPeriodGrades, selectedSubject]);

  // Current selected subject's data
  const currentSubjectPeriod = React.useMemo(() => {
    return childPeriodGrades.find((p) => p.subjectName === selectedSubject) || childPeriodGrades[0];
  }, [childPeriodGrades, selectedSubject]);

  // Calculate scores for this subject
  let weightedSum = 0;
  let totalWeight = 0;
  if (currentSubjectPeriod && selectedChild) {
    currentSubjectPeriod.activities.forEach((act) => {
      const g = currentSubjectPeriod.grades.find(
        (gr) => gr.studentId === selectedChild.id && gr.activityId === act.id
      );
      if (g !== undefined) {
        weightedSum += g.score * (act.percentage / 100);
        totalWeight += act.percentage;
      }
    });
  }
  const currentAverage = totalWeight > 0 ? weightedSum / (totalWeight / 100) : 0;

  // Custom Threshold vs School default
  const effectiveGradeThreshold = parentThresholds.notifyOnGradeBelowThreshold
    ? parentThresholds.minGradeAverage
    : (currentSubjectPeriod?.criticalThreshold || 6.0);

  const isCriticalAverage = currentAverage < effectiveGradeThreshold && totalWeight > 0;

  // Attendance for this subject and this student
  const subjectAttendance = attendance.filter(
    (a) => a.studentId === selectedChild?.id && a.subjectName === selectedSubject
  );

  const totalClasses = subjectAttendance.length;
  const absences = subjectAttendance.filter((a) => a.status === 'ausente').length;
  const tardies = subjectAttendance.filter((a) => a.status === 'tardanza').length;
  const presents = subjectAttendance.filter((a) => a.status === 'presente').length;

  // Notifications for this student/parent
  const childNotifications = notifications.filter(
    (n) =>
      n.studentId === selectedChild?.id ||
      n.parentEmail === activeParent?.parentEmail ||
      n.institutionCode === activeParent?.institutionCode
  );

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    addCustomTag({
      name: tagName,
      color: tagColor,
      description: tagDesc
    });
    setTagName('');
    setTagDesc('');
    setIsNewTagModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Parent & Child Banner - Azul Brillante con Detalles Cálidos */}
      <div className="bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#0284C7] text-white rounded-3xl p-6 sm:p-7 shadow-lg border-2 border-[#FED7AA] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black px-3 py-1 bg-white/20 text-white rounded-full uppercase tracking-wider border border-white/30 shadow-xs">
            Portal Familiar de Padres y Tutores
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-2 text-white tracking-tight">
            Estudiante: {selectedChild?.fullName || 'Diego Alexander Carranza'}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-sky-100 mt-1">
            <span>
              Tutor: <strong className="text-white font-bold">{activeParent?.parentName || 'Lic. Roberto Carranza'}</strong>
            </span>
            <span>•</span>
            <span>
              Institución: <strong className="text-white font-bold">{activeInstitution?.name}</strong>
            </span>
            {selectedChild?.nie && (
              <>
                <span>•</span>
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold border border-white/30">
                  NIE: {selectedChild.nie}
                </span>
              </>
            )}
            <span>•</span>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-black border border-white/30">
              {activeInstitution?.type === 'publica' ? 'Escuela Pública' : 'Colegio Privado'}
            </span>
          </div>
        </div>

        {/* Top Controls: Quick Student Switcher, Edit Profile & Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Student Switcher if school has multiple students */}
          {schoolStudents.length > 1 && (
            <div className="bg-[#0284C7]/80 p-2 rounded-xl border border-white/30 text-xs shadow-xs">
              <label className="block text-[10px] text-sky-100 mb-0.5 font-bold">Cambiar Alumno:</label>
              <select
                value={selectedChild?.id || ''}
                onChange={(e) => {
                  const st = schoolStudents.find((s) => s.id === e.target.value);
                  if (st) {
                    updateActiveParent({
                      childName: st.fullName,
                      nie: st.nie,
                      studentId: st.id,
                      parentEmail: st.parentEmail || activeParent?.parentEmail
                    });
                  }
                }}
                className="bg-white text-[#1F2937] border border-sky-300 rounded px-2 py-1 font-bold outline-none text-xs"
              >
                {schoolStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setEditParentName(activeParent?.parentName || '');
              setEditChildName(activeParent?.childName || selectedChild?.fullName || '');
              setEditNie(activeParent?.nie || selectedChild?.nie || '');
              setEditParentEmail(activeParent?.parentEmail || '');
              setSelectedStudentId(selectedChild?.id || activeParent?.studentId || '');
              setIsEditParentModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-sky-50 text-[#0369A1] text-xs font-black px-3.5 py-2 rounded-xl border border-white transition shadow-sm"
            title="Editar y guardar datos del tutor o estudiante permanentemente"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Perfil
          </button>

          {/* Period Selector */}
          <div className="bg-[#0284C7]/80 p-2.5 rounded-xl border border-white/30 text-xs shadow-xs">
            <label className="block text-[10px] text-sky-100 mb-0.5 font-bold">Periodo Escolar:</label>
            <select
              value={selectedPeriodNum}
              onChange={(e) => setSelectedPeriodNum(Number(e.target.value))}
              className="bg-white text-[#1F2937] border border-sky-300 rounded px-2.5 py-1 font-bold outline-none"
            >
              <option value={1}>Periodo 1</option>
              <option value={2}>Periodo 2</option>
              <option value={3}>Periodo 3</option>
              <option value={4}>Periodo 4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Critical Status Alert Bars if thresholds breached */}
      {isCriticalAverage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-400 dark:border-red-800 rounded-2xl flex items-start gap-3 shadow-md animate-pulse">
          <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                🚨 ALERTA: PROMEDIO POR DEBAJO DEL UMBRAL CRÍTICO EN {selectedSubject.toUpperCase()}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200">
                Umbral Padre: &lt; {effectiveGradeThreshold.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-red-800 dark:text-red-300 mt-1 leading-relaxed">
              El promedio actual es de <strong>{currentAverage.toFixed(1)} / 10.0</strong>, situándose por debajo de su umbral crítico configurado de <strong>{effectiveGradeThreshold.toFixed(1)} / 10.0</strong>.
              Se recomienda programar refuerzo y comunicarse con el docente.
            </p>
          </div>
        </div>
      )}

      {/* Attendance Alert Bar if below threshold */}
      {(() => {
        const currentAttPct = totalClasses > 0 ? Math.round(((presents + tardies * 0.5) / totalClasses) * 100) : 100;
        const isBelowAttThreshold = parentThresholds.notifyOnAttendanceBelowThreshold &&
          totalClasses > 0 &&
          currentAttPct < parentThresholds.minAttendancePercentage;

        if (!isBelowAttThreshold) return null;

        return (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-400 dark:border-orange-800 rounded-2xl flex items-start gap-3 shadow-md">
            <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-orange-900 dark:text-orange-200">
                  ⚠️ ALERTA: ASISTENCIA CRÍTICA EN {selectedSubject.toUpperCase()} ({currentAttPct}%)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  Umbral Mínimo: {parentThresholds.minAttendancePercentage}%
                </span>
              </div>
              <p className="text-xs text-orange-800 dark:text-orange-300 mt-1 leading-relaxed">
                El porcentaje de asistencia en {selectedSubject} ha descendido al <strong>{currentAttPct}%</strong> ({absences} inasistencias), por debajo del umbral mínimo del <strong>{parentThresholds.minAttendancePercentage}%</strong> configurado en su perfil.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Navigation Tabs - Azul Brillante y Fondo Cálido */}
      <div className="flex bg-white p-1 rounded-2xl border-2 border-[#FED7AA] space-x-1 sm:space-x-2 overflow-x-auto text-sm font-bold shadow-2xs">
        <button
          onClick={() => setActiveTab('materias')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'materias'
              ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
              : 'text-[#1F2937] hover:bg-amber-100/60 font-bold'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Notas y Progreso por Materia
        </button>

        <button
          onClick={() => setActiveTab('umbrales')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'umbrales'
              ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
              : 'text-[#1F2937] hover:bg-amber-100/60 font-bold'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Umbrales de Estado Crítico
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              activeTab === 'umbrales'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-[#78350F] border border-amber-300'
            }`}
          >
            &lt;{parentThresholds.minGradeAverage.toFixed(1)} / &lt;{parentThresholds.minAttendancePercentage}%
          </span>
        </button>

        <button
          onClick={() => setActiveTab('calendario')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'calendario'
              ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
              : 'text-[#1F2937] hover:bg-amber-100/60 font-bold'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          Calendario de Actividades
        </button>

        <button
          onClick={() => setActiveTab('notificaciones')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition relative ${
            activeTab === 'notificaciones'
              ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
              : 'text-[#1F2937] hover:bg-amber-100/60 font-bold'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alertas ({childNotifications.filter((n) => !n.read).length})
        </button>

        <button
          onClick={() => setActiveTab('etiquetas')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'etiquetas'
              ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
              : 'text-[#1F2937] hover:bg-amber-100/60 font-bold'
          }`}
        >
          <Tag className="w-4 h-4" />
          Etiquetas Personalizadas
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MENÚ DE MATERIAS Y DETALLE DE CALIFICACIONES Y ASISTENCIAS
      ========================================================================= */}
      {activeTab === 'materias' && (
        <div className="space-y-6">
          {/* Subjects Menu Horizontal Cards */}
          <div>
            <label className="block text-xs font-black text-[#1F2937] uppercase tracking-wider mb-2">
              Selecciona una Materia para ver Calificaciones y Asistencia:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {childPeriodGrades.map((p) => {
                // Compute average for this subject card
                let sSum = 0;
                let sWeight = 0;
                p.activities.forEach((act) => {
                  const g = p.grades.find((gr) => gr.studentId === selectedChild?.id && gr.activityId === act.id);
                  if (g !== undefined) {
                    sSum += g.score * (act.percentage / 100);
                    sWeight += act.percentage;
                  }
                });
                const sAvg = sWeight > 0 ? sSum / (sWeight / 100) : 0;
                const isSelected = selectedSubject === p.subjectName;

                const isSubjectCritical = sAvg < effectiveGradeThreshold && sWeight > 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedSubject(p.subjectName)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between shadow-2xs ${
                      isSelected
                        ? 'border-[#0EA5E9] bg-sky-50 ring-2 ring-[#0EA5E9]/30'
                        : 'border-[#FED7AA] hover:border-sky-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <BookOpen
                        className={`w-4 h-4 ${
                          isSelected ? 'text-[#0EA5E9]' : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg border ${
                          sAvg < 6.0
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-blue-50 text-[#2563EB] border-blue-200'
                        }`}
                        title={sAvg < 6.0 ? 'Calificación menor a 6.0' : 'Calificación aprobada'}
                      >
                        {sAvg.toFixed(1)}
                      </span>
                    </div>

                    <h4 className="font-black text-xs text-[#1F2937] truncate">
                      {p.subjectName}
                    </h4>

                    <span className="text-[11px] text-[#4B5563] font-medium mt-1">
                      {p.activities.length} actividades
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details for selected subject */}
          {currentSubjectPeriod && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Desglose de Calificaciones */}
              <div className="lg:col-span-2 bg-white rounded-3xl border-2 border-[#FED7AA] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#FED7AA] pb-3">
                  <div>
                    <h3 className="font-black text-base text-[#1F2937]">
                      Detalle de Calificaciones: {selectedSubject}
                    </h3>
                    <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                      Periodo {currentSubjectPeriod.period} • Ponderación total acumulada
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-[#4B5563] font-bold block">Promedio Ponderado:</span>
                    <span
                      className={`text-2xl font-black font-mono ${
                        currentAverage < 6.0 ? 'text-red-600' : 'text-[#2563EB]'
                      }`}
                    >
                      {currentAverage.toFixed(1)} / 10.0
                    </span>
                  </div>
                </div>

                {/* Table of Activities & Scores - Azul Brillante Header */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse bg-white">
                    <thead>
                      <tr className="bg-[#0EA5E9] text-white border-b-2 border-[#0284C7] font-black uppercase tracking-wider text-[11px]">
                        <th className="p-3 text-white font-black border-r border-sky-400/40">Actividad Evaluada</th>
                        <th className="p-3 text-center text-white font-black border-r border-sky-400/40">Ponderación (%)</th>
                        <th className="p-3 text-center text-white font-black border-r border-sky-400/40">Fecha Entrega</th>
                        <th className="p-3 text-center text-white font-black border-r border-sky-400/40">Calificación</th>
                        <th className="p-3 text-center text-white font-black">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-sans bg-white">
                      {currentSubjectPeriod.activities.map((act) => {
                        const grade = currentSubjectPeriod.grades.find(
                          (g) => g.studentId === selectedChild?.id && g.activityId === act.id
                        );
                        const score = grade?.score;
                        const isScoreCritical = (score || 0) < 6.0 && score !== undefined;

                        return (
                          <tr key={act.id} className="hover:bg-amber-50/50 transition">
                            <td className="p-3 font-bold text-[#1F2937] border-r border-slate-200">
                              {act.name} {act.isExam && <span className="text-[#0369A1] ml-1 font-semibold">(Examen)</span>}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-[#0369A1] border-r border-slate-200">
                              {act.percentage}%
                            </td>
                            <td className="p-3 text-center text-[#1F2937] font-medium border-r border-slate-200">
                              {act.dueDate || 'En periodo'}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-sm border-r border-slate-200">
                              {score !== undefined ? (
                                <span
                                  className={`px-2 py-0.5 rounded font-black font-mono border ${
                                    score < 6.0
                                      ? 'text-red-600 bg-red-50 border-red-300'
                                      : 'text-[#2563EB] bg-blue-50 border-blue-200'
                                  }`}
                                >
                                  {score.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-[#64748B] italic font-sans text-xs">Pendiente</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {score !== undefined ? (
                                score >= 6.0 ? (
                                  <span className="text-emerald-950 bg-emerald-100 border border-emerald-300 font-black text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprobada
                                  </span>
                                ) : (
                                  <span className="text-red-950 bg-red-100 border border-red-300 font-black text-[11px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Nivel Bajo
                                  </span>
                                )
                              ) : (
                                <span className="text-[#64748B] text-[11px] font-semibold">En curso</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Col: Desglose de Asistencias en esta materia */}
              <div className="bg-white rounded-3xl border-2 border-[#FED7AA] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="border-b border-[#FED7AA] pb-3 mb-3">
                    <h3 className="font-black text-sm text-[#1F2937]">
                      Registro de Asistencias: {selectedSubject}
                    </h3>
                    <p className="text-xs text-[#4B5563] font-medium">
                      Asistencia del estudiante en este periodo
                    </p>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="p-2.5 bg-emerald-50 rounded-xl border-2 border-emerald-200">
                      <span className="block text-xl font-black text-emerald-800 font-mono">
                        {presents}
                      </span>
                      <span className="text-[10px] text-emerald-950 font-black">
                        Asistencias
                      </span>
                    </div>

                    <div className="p-2.5 bg-red-50 rounded-xl border-2 border-red-200">
                      <span className="block text-xl font-black text-red-800 font-mono">
                        {absences}
                      </span>
                      <span className="text-[10px] text-red-950 font-black">
                        Faltas
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-50 rounded-xl border-2 border-amber-300">
                      <span className="block text-xl font-black text-amber-900 font-mono">
                        {tardies}
                      </span>
                      <span className="text-[10px] text-amber-950 font-black">
                        Tardanzas
                      </span>
                    </div>
                  </div>

                  {/* Attendance Log List */}
                  <h4 className="text-xs font-black text-[#1F2937] mb-2">
                    Historial de Clases Registradas:
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {subjectAttendance.length === 0 ? (
                      <p className="text-xs text-[#64748B] italic text-center py-4">
                        No hay registros de asistencia cargados aún en esta materia.
                      </p>
                    ) : (
                      subjectAttendance.map((att) => (
                        <div
                          key={att.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            att.status === 'ausente'
                              ? 'bg-red-50 border-2 border-red-300 text-red-950'
                              : 'bg-slate-50 border border-slate-200 text-[#1F2937]'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-[#1F2937] block">{att.date} • {att.time}</span>
                            {att.notes && <span className="text-[11px] text-[#4B5563] italic">{att.notes}</span>}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              att.status === 'presente'
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                : att.status === 'ausente'
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-amber-100 text-amber-950 border border-amber-300'
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#FED7AA] text-center">
                  <span className="text-[11px] text-[#4B5563] font-semibold">
                    Notificaciones enviadas en vivo al pasar lista • EduControl Pro
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: CALENDARIO DE ACTIVIDADES Y RECORDATORIOS AUTOMÁTICOS DE EXÁMENES
      ========================================================================= */}
      {activeTab === 'calendario' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-[#FED7AA] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm text-[#1F2937]">
                Calendario Escolar y Recordatorios Automáticos
              </h3>
              <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                Fechas programadas para exámenes de periodo, entregas de guías y reuniones de tutores.
              </p>
            </div>

            {/* Filter by custom tags */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#1F2937] font-bold">Filtrar por etiqueta:</span>
              <select
                value={calendarTagFilter}
                onChange={(e) => setCalendarTagFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border-2 border-[#FED7AA] bg-white text-xs font-bold text-[#1F2937] outline-none"
              >
                <option value="todos">Todas las Categorías</option>
                {customTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendarEvents
              .filter((ev) => calendarTagFilter === 'todos' || ev.tagId === calendarTagFilter)
              .map((event) => {
                const assignedTag = customTags.find((t) => t.id === event.tagId);

                return (
                  <div
                    key={event.id}
                    className="p-5 rounded-2xl bg-white border-2 border-[#FED7AA] shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            event.type === 'examen'
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : 'bg-sky-100 text-[#0369A1] border border-sky-300'
                          }`}
                        >
                          {event.type === 'examen' ? '📝 Examen Oficial' : '📌 Entrega'}
                        </span>

                        {assignedTag && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-2xs"
                            style={{ backgroundColor: assignedTag.color }}
                          >
                            {assignedTag.name}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-sm text-[#1F2937] leading-tight">
                        {event.title}
                      </h4>
                      <p className="text-xs text-[#4B5563] font-medium mt-1.5 leading-relaxed">
                        {event.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#FED7AA]/60 flex items-center justify-between text-xs">
                      <span className="font-black text-[#0369A1]">
                        {event.subjectName}
                      </span>
                      <span className="flex items-center gap-1 font-mono font-bold text-[#1F2937]">
                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {event.date} {event.time ? `• ${event.time}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CENTRO DE NOTIFICACIONES Y ALERTAS DE INASISTENCIA
      ========================================================================= */}
      {activeTab === 'notificaciones' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-[#FED7AA] shadow-xs">
            <h3 className="font-black text-sm text-[#1F2937]">
              Historial de Notificaciones de Inasistencia y Advertencias
            </h3>
            <p className="text-xs text-[#4B5563] font-medium mt-0.5">
              Avisos recibidos en vivo cuando el docente pasa lista en el aula o reporta notas bajas.
            </p>
          </div>

          <div className="space-y-3">
            {childNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border-2 transition shadow-xs flex items-start gap-3 ${
                  notif.type === 'inasistencia'
                    ? 'border-red-300 bg-red-50/80 text-red-950'
                    : notif.type === 'nota_critica'
                    ? 'border-amber-300 bg-amber-50/90 text-amber-950'
                    : 'border-[#FED7AA] bg-white text-[#1F2937]'
                }`}
              >
                {notif.type === 'inasistencia' ? (
                  <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                ) : notif.type === 'nota_critica' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Bell className="w-6 h-6 text-[#0EA5E9] shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-[#1F2937]">
                      {notif.title}
                    </h4>
                    <span className="text-[11px] font-mono font-bold text-[#4B5563]">
                      {notif.date} • {notif.time}
                    </span>
                  </div>

                  <p className="text-xs text-[#334155] font-medium mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.subjectName && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-white border border-[#FED7AA] rounded-md text-[11px] font-black text-[#0369A1]">
                      Materia: {notif.subjectName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: GESTIÓN DE ETIQUETAS PERSONALIZADAS
      ========================================================================= */}
      {activeTab === 'etiquetas' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-[#FED7AA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm text-[#1F2937]">
                Categorización mediante Etiquetas Personalizadas
              </h3>
              <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                Organiza las evaluaciones, tareas y materias de tus hijos con etiquetas por color.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewTagModalOpen(true)}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Crear Nueva Etiqueta
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {customTags.map((tag) => (
              <div
                key={tag.id}
                className="p-4 rounded-2xl bg-white border-2 border-[#FED7AA] shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full shadow-xs"
                    style={{ backgroundColor: tag.color }}
                  />
                  <div>
                    <h4 className="font-black text-xs text-[#1F2937]">{tag.name}</h4>
                    <span className="text-[11px] text-[#4B5563] font-medium">{tag.description || 'Sin descripción'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: CONFIGURACIÓN DE UMBRALES DE ESTADO CRÍTICO PARA PADRES
      ========================================================================= */}
      {activeTab === 'umbrales' && (
        <div className="space-y-6">
          {/* Header Explanation Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#FED7AA] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-sky-100 text-[#0369A1] rounded-2xl shrink-0 mt-0.5">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-[#1F2937]">
                  Sistema de Umbrales Críticos Personalizados para Padres
                </h3>
                <p className="text-xs text-[#334155] font-medium mt-1 leading-relaxed max-w-2xl">
                  Define a partir de qué <strong>nota promedio</strong> o <strong>porcentaje de asistencia</strong> el sistema debe enviar automáticamente una alerta de <strong>'estado crítico'</strong> a tu perfil de tutor y bandeja de notificaciones.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => evaluateParentThresholdsNow()}
                className="px-4 py-2.5 rounded-xl border-2 border-[#FED7AA] hover:bg-sky-50 text-xs font-black text-[#0369A1] transition flex items-center gap-1.5 shadow-2xs"
                title="Comprobar notas y asistencias actuales contra tus umbrales"
              >
                <Gauge className="w-4 h-4 text-[#0EA5E9]" />
                Diagnosticar Ahora
              </button>
            </div>
          </div>

          {/* Threshold Sliders & Input Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Control 1: Umbral de Nota Promedio Mínima */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#FED7AA] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#FED7AA] pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  <h4 className="font-black text-sm text-[#1F2937]">
                    1. Umbral de Nota Promedio Mínima
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 bg-red-100 border border-red-300 px-3 py-1 rounded-xl">
                  <span className="text-[11px] text-red-900 font-black">Alerta si &lt;</span>
                  <span className="text-base font-black text-red-700 font-mono">
                    {tempMinGradeAvg.toFixed(1)}
                  </span>
                  <span className="text-xs text-red-700 font-black">/10.0</span>
                </div>
              </div>

              <p className="text-xs text-[#4B5563] font-medium leading-relaxed">
                Si el promedio acumulado del estudiante en cualquier materia desciende por debajo de este valor, se enviará de inmediato una alerta de <strong>'Estado Crítico'</strong>.
              </p>

              {/* Slider & Input */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    value={tempMinGradeAvg}
                    onChange={(e) => setTempMinGradeAvg(parseFloat(e.target.value))}
                    className="flex-1 accent-[#0EA5E9] cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    value={tempMinGradeAvg}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setTempMinGradeAvg(Math.min(10, Math.max(1, val)));
                      }
                    }}
                    className="w-16 px-2 py-1 text-center font-mono font-black text-sm rounded-lg border-2 border-[#FED7AA] bg-white text-[#1F2937]"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] font-bold text-[#4B5563] block mb-1.5">
                    Valores predefinidos sugeridos:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 6.0, label: '6.0 (MINED)' },
                      { val: 7.0, label: '7.0 (Estándar)' },
                      { val: 8.0, label: '8.0 (Exigente)' },
                      { val: 9.0, label: '9.0 (Honor)' }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setTempMinGradeAvg(preset.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs transition text-center ${
                          tempMinGradeAvg === preset.val
                            ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
                            : 'bg-amber-100 hover:bg-amber-200 text-[#1F2937] font-bold'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Informative footer */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium">
                  Con este umbral establecido en <strong>{tempMinGradeAvg.toFixed(1)}</strong>, se alertará de inmediato si el docente registra notas o ponderaciones que hagan que el promedio caiga a {tempMinGradeAvg.toFixed(1)} o menos.
                </span>
              </div>
            </div>

            {/* Control 2: Umbral de Porcentaje de Asistencia Mínima */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#FED7AA] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#FED7AA] pb-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-orange-500" />
                  <h4 className="font-black text-sm text-[#1F2937]">
                    2. Umbral de Asistencia Mínima (%)
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 px-3 py-1 rounded-xl">
                  <span className="text-[11px] text-orange-950 font-black">Alerta si &lt;</span>
                  <span className="text-base font-black text-orange-800 font-mono">
                    {tempMinAttPct}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#4B5563] font-medium leading-relaxed">
                Si el porcentaje acumulado de asistencia del estudiante en cualquier materia o en general cae por debajo de este porcentaje, se emitirá una alerta de <strong>'Asistencia Crítica'</strong>.
              </p>

              {/* Slider & Input */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={tempMinAttPct}
                    onChange={(e) => setTempMinAttPct(parseInt(e.target.value, 10))}
                    className="flex-1 accent-[#0EA5E9] cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    min="50"
                    max="100"
                    step="1"
                    value={tempMinAttPct}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setTempMinAttPct(Math.min(100, Math.max(50, val)));
                      }
                    }}
                    className="w-16 px-2 py-1 text-center font-mono font-black text-sm rounded-lg border-2 border-[#FED7AA] bg-white text-[#1F2937]"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] font-bold text-[#4B5563] block mb-1.5">
                    Porcentajes sugeridos:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 75, label: '75% (Flexible)' },
                      { val: 80, label: '80% (Escolar)' },
                      { val: 85, label: '85% (Preventiva)' },
                      { val: 90, label: '90% (Estricta)' }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setTempMinAttPct(preset.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs transition text-center ${
                          tempMinAttPct === preset.val
                            ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
                            : 'bg-amber-100 hover:bg-amber-200 text-[#1F2937] font-bold'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Informative footer */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span className="font-medium">
                  Al fijar la asistencia mínima en <strong>{tempMinAttPct}%</strong>, el sistema calculará las inasistencias sobre el total de clases impartidas y notificará preventivamente antes de incurrir en reprobación por faltas.
                </span>
              </div>
            </div>
          </div>

          {/* Toggles Card: Reglas de Automatización de Alertas */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#FED7AA] shadow-xs space-y-4">
            <h4 className="font-black text-sm text-[#1F2937] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#0EA5E9]" />
              Reglas y Disparadores Automáticos de Notificación
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Toggle 1 */}
              <div
                onClick={() => setTempNotifySingleAbsence(!tempNotifySingleAbsence)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  tempNotifySingleAbsence
                    ? 'border-[#0EA5E9] bg-sky-50/70'
                    : 'border-[#FED7AA] bg-white opacity-70'
                }`}
              >
                <input
                  type="checkbox"
                  checked={tempNotifySingleAbsence}
                  onChange={() => {}}
                  className="mt-1 rounded text-[#0EA5E9] accent-[#0EA5E9]"
                />
                <div>
                  <span className="font-black text-xs text-[#1F2937] block">
                    Alerta por Falta Individual
                  </span>
                  <span className="text-[11px] text-[#4B5563] font-medium mt-0.5 block leading-relaxed">
                    Enviar notificación inmediata especificando materia perdida, hora y día exacto de la inasistencia.
                  </span>
                </div>
              </div>

              {/* Toggle 2 */}
              <div
                onClick={() => setTempNotifyGradeBelow(!tempNotifyGradeBelow)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  tempNotifyGradeBelow
                    ? 'border-red-500 bg-red-50/70'
                    : 'border-[#FED7AA] bg-white opacity-70'
                }`}
              >
                <input
                  type="checkbox"
                  checked={tempNotifyGradeBelow}
                  onChange={() => {}}
                  className="mt-1 rounded text-red-600 accent-red-600"
                />
                <div>
                  <span className="font-black text-xs text-[#1F2937] block">
                    Alerta de Nota Crítica
                  </span>
                  <span className="text-[11px] text-[#4B5563] font-medium mt-0.5 block leading-relaxed">
                    Enviar alerta roja urgente cuando el promedio de cualquier asignatura caiga bajo <strong>{tempMinGradeAvg.toFixed(1)}</strong>.
                  </span>
                </div>
              </div>

              {/* Toggle 3 */}
              <div
                onClick={() => setTempNotifyAttBelow(!tempNotifyAttBelow)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  tempNotifyAttBelow
                    ? 'border-orange-500 bg-orange-50/70'
                    : 'border-[#FED7AA] bg-white opacity-70'
                }`}
              >
                <input
                  type="checkbox"
                  checked={tempNotifyAttBelow}
                  onChange={() => {}}
                  className="mt-1 rounded text-orange-600 accent-orange-600"
                />
                <div>
                  <span className="font-black text-xs text-[#1F2937] block">
                    Alerta de Asistencia Crítica
                  </span>
                  <span className="text-[11px] text-[#4B5563] font-medium mt-0.5 block leading-relaxed">
                    Enviar alerta preventiva si el porcentaje de asistencia acumulada cae bajo <strong>{tempMinAttPct}%</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Save & Simulation Action Bar */}
            <div className="pt-4 border-t border-[#FED7AA] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateParentThresholds({
                      minGradeAverage: tempMinGradeAvg,
                      minAttendancePercentage: tempMinAttPct,
                      notifyOnSingleAbsence: tempNotifySingleAbsence,
                      notifyOnGradeBelowThreshold: tempNotifyGradeBelow,
                      notifyOnAttendanceBelowThreshold: tempNotifyAttBelow
                    });
                    evaluateParentThresholdsNow();
                  }}
                  className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar Umbrales y Evaluar en Vivo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTempMinGradeAvg(6.0);
                    setTempMinAttPct(80);
                    setTempNotifySingleAbsence(true);
                    setTempNotifyGradeBelow(true);
                    setTempNotifyAttBelow(true);
                    updateParentThresholds({
                      minGradeAverage: 6.0,
                      minAttendancePercentage: 80,
                      notifyOnSingleAbsence: true,
                      notifyOnGradeBelowThreshold: true,
                      notifyOnAttendanceBelowThreshold: true
                    });
                  }}
                  className="px-3.5 py-2.5 rounded-xl border-2 border-[#FED7AA] hover:bg-amber-100 text-xs font-bold text-[#1F2937] transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restablecer Defecto (6.0 / 80%)
                </button>
              </div>

              {/* Simulation buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#4B5563] font-bold hidden sm:inline">Probar alertas:</span>
                <button
                  type="button"
                  onClick={() => triggerSimulatedThresholdAlert('nota')}
                  className="px-3 py-1.5 rounded-xl bg-red-100 text-red-900 border border-red-300 hover:bg-red-200 text-[11px] font-black transition flex items-center gap-1"
                  title="Simula la recepción de una alerta de nota baja en tiempo real"
                >
                  <Flame className="w-3 h-3 text-red-600" />
                  Simular Alerta de Nota
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulatedThresholdAlert('asistencia')}
                  className="px-3 py-1.5 rounded-xl bg-orange-100 text-orange-950 border border-orange-300 hover:bg-orange-200 text-[11px] font-black transition flex items-center gap-1"
                  title="Simula la recepción de una alerta de asistencia baja"
                >
                  <Percent className="w-3 h-3 text-orange-600" />
                  Simular Alerta de Asistencia
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Diagnostic Monitor: Current Child standing vs Configured Thresholds */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#FED7AA] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#FED7AA] pb-3">
              <div>
                <h4 className="font-black text-sm text-[#1F2937] flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  Monitor de Diagnóstico en Tiempo Real: {selectedChild?.fullName}
                </h4>
                <p className="text-xs text-[#4B5563] font-medium mt-0.5">
                  Estado actual de cada materia comparado contra tus umbrales (Promedio Mínimo: <strong>{parentThresholds.minGradeAverage.toFixed(1)}</strong> • Asistencia Mínima: <strong>{parentThresholds.minAttendancePercentage}%</strong>).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {childPeriodGrades.map((p) => {
                // Compute subject average
                let subSum = 0;
                let subWeight = 0;
                p.activities.forEach((act) => {
                  const g = p.grades.find((gr) => gr.studentId === selectedChild?.id && gr.activityId === act.id);
                  if (g !== undefined) {
                    subSum += g.score * (act.percentage / 100);
                    subWeight += act.percentage;
                  }
                });
                const subAvg = subWeight > 0 ? subSum / (subWeight / 100) : 0;
                const isGradeUnder = subAvg < parentThresholds.minGradeAverage && subWeight > 0;

                // Attendance in this subject
                const subAttRecords = attendance.filter(
                  (a) => a.studentId === selectedChild?.id && a.subjectName === p.subjectName
                );
                const subTotalClasses = subAttRecords.length;
                const subPresents = subAttRecords.filter((a) => a.status === 'presente' || a.status === 'justificado').length;
                const subTardies = subAttRecords.filter((a) => a.status === 'tardanza').length;
                const subAbsences = subAttRecords.filter((a) => a.status === 'ausente').length;
                const subAttPct = subTotalClasses > 0
                  ? Math.round(((subPresents + subTardies * 0.5) / subTotalClasses) * 100)
                  : 100;
                const isAttUnder = subAttPct < parentThresholds.minAttendancePercentage && subTotalClasses > 0;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border-2 transition ${
                      isGradeUnder || isAttUnder
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-[#FED7AA] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xs text-[#1F2937] flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#0369A1]" />
                        {p.subjectName}
                      </span>
                      {isGradeUnder || isAttUnder ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          Bajo Umbral Crítico
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Cumple Umbrales
                        </span>
                      )}
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-2 mt-3 text-xs">
                      {/* Grade comparison */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[#4B5563] font-bold text-[11px]">
                            Promedio: <strong className={isGradeUnder ? 'text-red-700 font-black' : 'text-[#0369A1] font-black'}>{subAvg.toFixed(1)}</strong> / 10.0
                          </span>
                          <span className="text-[10px] text-[#4B5563] font-mono font-bold">
                            Umbral mínimo: {parentThresholds.minGradeAverage.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isGradeUnder ? 'bg-red-600' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (subAvg / 10) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Attendance comparison */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[#4B5563] font-bold text-[11px]">
                            Asistencia: <strong className={isAttUnder ? 'text-orange-700 font-black' : 'text-[#0369A1] font-black'}>{subAttPct}%</strong> ({subAbsences} faltas)
                          </span>
                          <span className="text-[10px] text-[#4B5563] font-mono font-bold">
                            Umbral mínimo: {parentThresholds.minAttendancePercentage}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isAttUnder ? 'bg-orange-500' : 'bg-[#0EA5E9]'
                            }`}
                            style={{ width: `${subAttPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Etiqueta Personalizada */}
      {isNewTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border-2 border-[#FED7AA] shadow-2xl">
            <h3 className="font-black text-sm text-[#1F2937] mb-1">
              Crear Etiqueta Personalizada
            </h3>
            <p className="text-xs text-[#4B5563] font-medium mb-4">
              Categoriza tareas y exámenes con colores distintivos.
            </p>

            <form onSubmit={handleCreateTag} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-[#1F2937] mb-1">
                  Nombre de la Etiqueta
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Refuerzo de Fin de Semana"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#FED7AA] bg-white text-xs font-bold text-[#1F2937] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#1F2937] mb-1">
                  Color Identificador
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border-2 border-[#FED7AA] cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-[#1F2937]">{tagColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#1F2937] mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Tareas prioritarias para estudiar con tutor"
                  value={tagDesc}
                  onChange={(e) => setTagDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#FED7AA] bg-white text-xs font-medium text-[#1F2937] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#FED7AA]">
                <button
                  type="button"
                  onClick={() => setIsNewTagModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#4B5563] hover:text-[#1F2937]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs"
                >
                  Guardar Etiqueta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Perfil de Padre y Estudiante Persistente */}
      {isEditParentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border-2 border-[#FED7AA] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#FED7AA]">
              <div className="flex items-center gap-2 text-[#0369A1]">
                <User className="w-5 h-5 text-[#0EA5E9]" />
                <h3 className="font-black text-sm text-[#1F2937]">
                  Editar Datos del Padre y Estudiante
                </h3>
              </div>
              <button
                onClick={() => setIsEditParentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editChildName.trim()) return;
                updateActiveParent({
                  parentName: editParentName.trim(),
                  childName: editChildName.trim(),
                  nie: editNie.trim() || undefined,
                  parentEmail: editParentEmail.trim(),
                  studentId: selectedStudentId || undefined
                });
                setIsEditParentModalOpen(false);
              }}
              className="space-y-3"
            >
              {/* Selector para vincular con alumno existente en la institución */}
              {schoolStudents.length > 0 && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-[#FED7AA] space-y-1.5">
                  <label className="block text-xs font-black text-amber-950">
                    Vincular con Alumno Existente en la Escuela:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedStudentId(id);
                      const found = schoolStudents.find((s) => s.id === id);
                      if (found) {
                        setEditChildName(found.fullName);
                        setEditNie(found.nie || '');
                        if (found.parentEmail) setEditParentEmail(found.parentEmail);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#FED7AA] bg-white text-xs font-bold text-[#1F2937] outline-none"
                  >
                    <option value="">-- Seleccionar de la lista de alumnos --</option>
                    {schoolStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.listNumber ? `${st.listNumber}. ` : ''}{st.fullName} {st.nie ? `(NIE: ${st.nie})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-900 font-semibold">
                    Al seleccionar un alumno, se sincronizarán inmediatamente sus notas y asistencias reales registradas por los profesores.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-[#1F2937] mb-1">
                  Nombre del Padre o Tutor
                </label>
                <input
                  type="text"
                  required
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#FED7AA] bg-white text-xs font-bold text-[#1F2937] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#1F2937] mb-1">
                  Nombre del Estudiante (Hijo/a)
                </label>
                <input
                  type="text"
                  required
                  value={editChildName}
                  onChange={(e) => setEditChildName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#FED7AA] bg-white text-xs font-bold text-[#1F2937] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#1F2937] mb-1">
                  NIE del Estudiante (si aplica)
                </label>
                <input
                  type="text"
                  placeholder="2026-48914"
                  value={editNie}
                  onChange={(e) => setEditNie(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#FED7AA] bg-white text-xs font-mono font-bold text-[#1F2937] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#1F2937] mb-1">
                  Correo Electrónico para Alertas
                </label>
                <input
                  type="email"
                  required
                  value={editParentEmail}
                  onChange={(e) => setEditParentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#FED7AA] bg-white text-xs font-bold text-[#1F2937] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#FED7AA]">
                <button
                  type="button"
                  onClick={() => setIsEditParentModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#4B5563] hover:text-[#1F2937]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs transition"
                >
                  Guardar Perfil Permanentemente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
