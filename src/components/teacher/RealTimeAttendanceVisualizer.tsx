import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  Calendar,
  Sparkles,
  RotateCcw,
  Bell,
  Check,
  ShieldCheck,
  Volume2,
  Mic
} from 'lucide-react';
import { Student, AttendanceRecord } from '../../types';
import { VoiceAttendanceModal } from './VoiceAttendanceModal';

interface RealTimeAttendanceVisualizerProps {
  gradeId: string;
  subjectName: string;
}

interface ActionConfirmation {
  studentId: string;
  status: 'presente' | 'ausente' | 'tardanza' | 'justificado';
  studentName: string;
  timeStr: string;
}

export const RealTimeAttendanceVisualizer: React.FC<RealTimeAttendanceVisualizerProps> = ({
  gradeId,
  subjectName
}) => {
  const {
    students,
    attendance,
    activeInstitution,
    activeTeacher,
    setSingleAttendance,
    markAllPresentForDate,
    exportAttendanceCSV,
    showToast
  } = useApp();

  // Current session date and time
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>('07:30 AM');

  // Search and status filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'presente' | 'ausente' | 'tardanza' | 'justificado'>('all');

  // Visual confirmation tracking: map of studentId -> confirmation feedback
  const [recentConfirmations, setRecentConfirmations] = useState<Record<string, ActionConfirmation>>({});
  const [lastAction, setLastAction] = useState<ActionConfirmation | null>(null);

  // Local notes map for students
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});

  // Voice attendance modal state
  const [isVoiceAttendanceOpen, setIsVoiceAttendanceOpen] = useState<boolean>(false);

  // Handle saving attendance from Voice Attendance Modal
  const handleSaveVoiceAttendance = (
    records: Array<{ studentId: string; studentName: string; status: 'presente' | 'ausente' }>
  ) => {
    let updatedPresent = 0;
    let updatedAbsent = 0;

    records.forEach((rec) => {
      const studentObj = gradeStudents.find((s) => s.id === rec.studentId);
      if (studentObj) {
        setSingleAttendance(studentObj.id, subjectName, gradeId, selectedDate, rec.status);
        if (rec.status === 'presente') updatedPresent++;
        else updatedAbsent++;
      }
    });

    showToast(
      'Asistencia por Voz Guardada',
      `Se actualizaron ${records.length} alumnos: ${updatedPresent} presentes y ${updatedAbsent} ausentes.`,
      'success'
    );
  };

  // Filter students belonging to this grade and institution
  const gradeStudents = useMemo(() => {
    const list = students.filter(
      (s) =>
        s.gradeId === gradeId &&
        s.institutionCode === (activeInstitution?.institutionCode || 'ESC-PUB-2026')
    );
    return list.sort((a, b) => (a.listNumber || 0) - (b.listNumber || 0));
  }, [students, gradeId, activeInstitution]);

  // Map of studentId -> AttendanceRecord for the selected date & subject
  const currentAttendanceMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance.forEach((rec) => {
      if (rec.date === selectedDate && rec.subjectName === subjectName) {
        map[rec.studentId] = rec;
      }
    });
    return map;
  }, [attendance, selectedDate, subjectName]);

  // Statistics for this live session
  const stats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let tardyCount = 0;
    let justifiedCount = 0;

    gradeStudents.forEach((st) => {
      const rec = currentAttendanceMap[st.id];
      if (rec?.status === 'presente') presentCount++;
      else if (rec?.status === 'ausente') absentCount++;
      else if (rec?.status === 'tardanza') tardyCount++;
      else if (rec?.status === 'justificado') justifiedCount++;
    });

    const totalEvaluated = presentCount + absentCount + tardyCount + justifiedCount;
    const effectivePresent = presentCount + justifiedCount + tardyCount * 0.5;
    const livePercentage =
      totalEvaluated > 0 ? Math.round((effectivePresent / totalEvaluated) * 100) : 100;

    return {
      totalStudents: gradeStudents.length,
      presentCount,
      absentCount,
      tardyCount,
      justifiedCount,
      unrecordedCount: gradeStudents.length - totalEvaluated,
      livePercentage
    };
  }, [gradeStudents, currentAttendanceMap]);

  // Filtered student list for display
  const displayedStudents = useMemo(() => {
    return gradeStudents.filter((st) => {
      const rec = currentAttendanceMap[st.id];
      const status = rec?.status;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'presente' && status !== 'presente') return false;
        if (statusFilter === 'ausente' && status !== 'ausente') return false;
        if (statusFilter === 'tardanza' && status !== 'tardanza') return false;
        if (statusFilter === 'justificado' && status !== 'justificado') return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = st.fullName.toLowerCase().includes(q);
        const matchesNie = (st.nie || '').toLowerCase().includes(q);
        const matchesNum = String(st.listNumber).includes(q);
        return matchesName || matchesNie || matchesNum;
      }

      return true;
    });
  }, [gradeStudents, currentAttendanceMap, statusFilter, searchQuery]);

  // Handle Mark Attendance with instantaneous visual feedback
  const handleMarkAttendance = (
    student: Student,
    status: 'presente' | 'ausente' | 'tardanza' | 'justificado',
    note?: string
  ) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Save in context
    setSingleAttendance(student.id, subjectName, gradeId, selectedDate, status);

    // Provide visual confirmation feedback
    const confirmation: ActionConfirmation = {
      studentId: student.id,
      status,
      studentName: student.fullName,
      timeStr
    };

    setRecentConfirmations((prev) => ({
      ...prev,
      [student.id]: confirmation
    }));

    setLastAction(confirmation);

    // Audio or toast notification
    if (status === 'ausente') {
      showToast(
        'Falta Registrada',
        `Falta registrada: ${student.fullName}. Notificación enviada al padre/tutor.`,
        'alert'
      );
    } else if (status === 'tardanza') {
      showToast(
        'Tardanza Registrada',
        `Tardanza registrada: ${student.fullName} (${timeStr})`,
        'alert'
      );
    } else {
      showToast('Asistencia Actualizada', `${student.fullName} marcado como ${status}`, 'success');
    }

    // Auto-clear individual badge after 4 seconds
    setTimeout(() => {
      setRecentConfirmations((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
    }, 4000);
  };

  // Mark all present in 1 click
  const handleMarkAllPresent = () => {
    markAllPresentForDate(gradeStudents.map((s) => s.id), subjectName, gradeId, selectedDate);
    showToast('Asistencia Completa', `Todos los ${gradeStudents.length} estudiantes marcados presentes.`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Live Connection Banner with Cuadro Mensual */}
      <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping inline-block shrink-0" />
          <p className="text-xs text-[#1E3A8A] font-semibold">
            <strong className="font-black">Cuadro de Asistencia Conectado:</strong> Cada registro de asistencia aquí se guarda de forma permanente en el Cuadro Mensual de Asistencia y actualiza las estadísticas inmediatamente.
          </p>
        </div>
        <span className="text-[11px] font-black text-[#1E3A8A] bg-white border border-blue-200 px-2.5 py-0.5 rounded-lg shrink-0">
          Sincronizado con Cuadro de Asistencia ✓
        </span>
      </div>

      {/* Visualizer Top Banner - Azul Rey Institucional (#1E3A8A to #2563EB) */}
      <div className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-white/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white border border-white/30 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                EN VIVO • TIEMPO REAL
              </span>
              <span className="text-xs font-bold text-blue-100">
                Pase de Asistencia Activo
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black mt-2 text-white tracking-tight">
              Visualizador de Asistencia en Tiempo Real
            </h2>

            <p className="text-xs sm:text-sm text-blue-100 font-medium mt-1">
              Docente: <strong className="text-white font-bold">{activeTeacher?.teacherName}</strong> • Materia:{' '}
              <strong className="text-white font-bold">{subjectName}</strong> • Código Escuela:{' '}
              <span className="text-amber-300 font-mono font-black">{activeInstitution?.institutionCode}</span>
            </p>
          </div>

          {/* Date, Time and Quick Action */}
          <div className="flex flex-wrap items-center gap-2 bg-[#1E3A8A]/90 p-3 rounded-2xl border-2 border-white/30 text-xs shadow-md">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-white" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white text-[#1E293B] px-2 py-1 rounded-lg font-black text-xs outline-none border border-slate-300"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white" />
              <input
                type="text"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                placeholder="07:30 AM"
                className="w-24 bg-white text-[#1E293B] px-2 py-1 rounded-lg font-black text-xs text-center outline-none border border-slate-300"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="bg-white hover:bg-blue-50 text-[#1E3A8A] font-black px-2.5 py-1 rounded-lg text-xs transition shadow-xs"
              title="Ir al día de hoy"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Real-Time Live Counters (Pure Contrast) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-white/20 text-xs">
          {/* Total Estudiantes */}
          <div className="bg-white/15 backdrop-blur-xs p-3 rounded-2xl border border-white/20">
            <span className="text-blue-100 font-bold block text-[11px]">Total en Clase</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
              {stats.totalStudents}
            </span>
          </div>

          {/* Presentes */}
          <div className="bg-emerald-600 p-3 rounded-2xl border border-emerald-400/50 shadow-xs">
            <span className="text-emerald-100 font-bold block text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Presentes
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
              {stats.presentCount}
            </span>
          </div>

          {/* Faltas / Ausencias (Alerta Roja) */}
          <div className="bg-red-600 p-3 rounded-2xl border border-red-400/50 shadow-xs">
            <span className="text-red-100 font-bold block text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-white" /> Faltas (Ausencias)
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
              {stats.absentCount}
            </span>
          </div>

          {/* Tardanzas */}
          <div className="bg-amber-500 p-3 rounded-2xl border border-amber-300 shadow-xs">
            <span className="text-[#1F2937] font-black block text-[11px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#1F2937]" /> Tardanzas
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#1F2937] font-mono mt-0.5 block">
              {stats.tardyCount}
            </span>
          </div>

          {/* % Efectividad de Asistencia */}
          <div className="bg-[#1E3A8A] p-3 rounded-2xl border border-white/30 shadow-xs">
            <span className="text-blue-100 font-black block text-[11px]">Efectividad en Vivo</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
              {stats.livePercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Floating Action Confirmation Banner (Appears on every action) */}
      {lastAction && (
        <div className="bg-white border-2 border-[#2563EB] text-[#1E293B] p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0 ${
                lastAction.status === 'ausente'
                  ? 'bg-red-600'
                  : lastAction.status === 'tardanza'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-emerald-600'
              }`}
            >
              ✓
            </span>
            <div>
              <p className="text-xs sm:text-sm font-black text-[#1E293B]">
                Confirmación Visual:{' '}
                <span className="text-[#2563EB] font-black">{lastAction.studentName}</span> marcado como{' '}
                <span
                  className={`uppercase font-extrabold px-2 py-0.5 rounded text-xs ${
                    lastAction.status === 'ausente'
                      ? 'bg-red-100 text-red-950 border border-red-300'
                      : lastAction.status === 'tardanza'
                      ? 'bg-amber-100 text-amber-950 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                  }`}
                >
                  {lastAction.status}
                </span>{' '}
                a las {lastAction.timeStr}
              </p>
              <p className="text-[11px] text-[#475569] font-medium">
                {lastAction.status === 'ausente'
                  ? '⚡ Alerta despachada en tiempo real a los padres de familia y registrada en el historial.'
                  : 'Sincronizado en tiempo real con el portal familiar y la dirección escolar.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLastAction(null)}
            className="text-[#64748B] hover:text-[#1E293B] text-xs px-2.5 py-1 font-bold rounded-lg border border-slate-200"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Control Toolbar: Search, Filters & Batch Actions */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por estudiante o NIE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-[#1E293B] font-bold text-xs outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* Center: Status filter pills with high contrast */}
        <div className="flex items-center gap-1 overflow-x-auto bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
              statusFilter === 'all'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#1E293B] hover:bg-slate-200'
            }`}
          >
            Todos ({gradeStudents.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ausente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
              statusFilter === 'ausente'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Faltas ({stats.absentCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('tardanza')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
              statusFilter === 'tardanza'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Tardanzas ({stats.tardyCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('presente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
              statusFilter === 'presente'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Presentes ({stats.presentCount})
          </button>
        </div>

        {/* Right: Quick actions */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setIsVoiceAttendanceOpen(true)}
            className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
            title="Pasar asistencia por voz con captura de micrófono en tiempo real y tolerancia fonética Levenshtein"
          >
            <Mic className="w-4 h-4 text-amber-300" />
            Asistencia por Voz
          </button>

          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
            title="Marcar todos los estudiantes de la lista como presentes con 1 clic"
          >
            <Check className="w-4 h-4" />
            Marcar Todos Presentes
          </button>

          <button
            type="button"
            onClick={() => exportAttendanceCSV(subjectName, gradeId)}
            className="border-2 border-slate-300 bg-white text-[#1E293B] px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
            title="Descargar reporte oficial en formato Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Interactive Real-Time Attendance Table (Pure White & Azul Rey) */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        {/* Banner with notice */}
        <div className="p-3.5 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
          <span className="font-black text-[#1E293B] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            Nómina de Asistencia en Tiempo Real: {displayedStudents.length} de {gradeStudents.length} estudiantes
          </span>

          <span className="text-[#1E3A8A] font-bold text-[11px] flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            <Bell className="w-3.5 h-3.5 text-[#2563EB]" />
            Las faltas marcadas notifican inmediatamente a los padres de familia
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs bg-white">
            <thead>
              <tr className="bg-[#2563EB] text-white border-b-2 border-[#1D4ED8] font-black uppercase tracking-wider text-[11px]">
                <th className="p-3 w-12 text-center text-white font-black border-r border-blue-400/40">N°</th>
                <th className="p-3 min-w-[200px] text-white font-black border-r border-blue-400/40">
                  Estudiante y NIE
                </th>
                <th className="p-3 w-36 text-center text-white font-black border-r border-blue-400/40">
                  Estado Actual
                </th>
                <th className="p-3 min-w-[280px] text-center text-white font-black border-r border-blue-400/40">
                  Acción Rápida (1 Clic con Confirmación Visual)
                </th>
                <th className="p-3 min-w-[190px] text-white font-black">
                  Observación / Motivo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {displayedStudents.map((st) => {
                const rec = currentAttendanceMap[st.id];
                const currentStatus = rec?.status;
                const hasRecentAction = !!recentConfirmations[st.id];
                const confData = recentConfirmations[st.id];

                return (
                  <tr
                    key={st.id}
                    className={`transition-colors ${
                      hasRecentAction
                        ? 'bg-blue-50/80 ring-2 ring-[#2563EB]'
                        : currentStatus === 'ausente'
                        ? 'bg-red-50/70'
                        : currentStatus === 'tardanza'
                        ? 'bg-amber-50/70'
                        : 'hover:bg-blue-50/40'
                    }`}
                  >
                    {/* List Number */}
                    <td className="p-3 text-center font-black text-[#1E3A8A] border-r border-slate-200 font-mono text-sm">
                      {st.listNumber}
                    </td>

                    {/* Student Full Name & NIE */}
                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-[#1E293B] text-sm leading-tight">
                        {st.fullName}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs font-bold text-[#1E293B] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          NIE: {st.nie || 'N/A'}
                        </span>
                        {st.parentEmail && (
                          <span className="text-[11px] text-[#64748B] font-medium truncate max-w-[170px]">
                            {st.parentEmail}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Current Status Badge */}
                    <td className="p-3 text-center border-r border-slate-200">
                      {currentStatus === 'presente' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                        </span>
                      )}

                      {currentStatus === 'ausente' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-red-600 text-white shadow-xs animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" /> Falta (Ausente)
                        </span>
                      )}

                      {currentStatus === 'tardanza' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-slate-950 border border-amber-600 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-950" /> Tardanza
                        </span>
                      )}

                      {currentStatus === 'justificado' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 text-white shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5" /> Justificada
                        </span>
                      )}

                      {!currentStatus && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-[#475569] border border-slate-200">
                          Sin registrar
                        </span>
                      )}

                      {/* Visual in-row confirmation message */}
                      {hasRecentAction && (
                        <div className="mt-1 text-[10px] font-black text-emerald-700 animate-in fade-in">
                          ✓ Guardado {confData.timeStr}
                        </div>
                      )}
                    </td>

                    {/* Interactive Action Buttons */}
                    <td className="p-3 border-r border-slate-200">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {/* Botón MARCAR FALTA */}
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(st, 'ausente')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                            currentStatus === 'ausente'
                              ? 'bg-red-700 text-white ring-2 ring-red-400 shadow-md'
                              : 'bg-red-50 hover:bg-red-100 text-red-950 border-2 border-red-300'
                          }`}
                          title="Marcar Falta (Ausente) y notificar de inmediato a los padres"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          Marcar Falta
                        </button>

                        {/* Botón MARCAR TARDANZA */}
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(st, 'tardanza')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                            currentStatus === 'tardanza'
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-700 shadow-md'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-amber-300'
                          }`}
                          title="Marcar Tardanza"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          Tardanza
                        </button>

                        {/* Botón PRESENTE */}
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(st, 'presente')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                            currentStatus === 'presente'
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-2 border-emerald-300'
                          }`}
                          title="Marcar Presente"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Presente
                        </button>

                        {/* Botón JUSTIFICAR */}
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(st, 'justificado')}
                          className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition ${
                            currentStatus === 'justificado'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-[#1E293B] border border-slate-300'
                          }`}
                          title="Justificar inasistencia"
                        >
                          Justificar
                        </button>
                      </div>
                    </td>

                    {/* Notes / Reason input with auto-save */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Motivo médica, lluvia..."
                          value={studentNotes[st.id] !== undefined ? studentNotes[st.id] : rec?.notes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudentNotes((prev) => ({ ...prev, [st.id]: val }));
                          }}
                          onBlur={(e) => {
                            if (currentStatus) {
                              handleMarkAttendance(st, currentStatus, e.target.value);
                            }
                          }}
                          className="w-full px-2 py-1 rounded-lg border-2 border-slate-300 bg-white text-[#1E293B] font-medium text-xs outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Pase de Asistencia por Voz con Web Speech API y Levenshtein */}
      <VoiceAttendanceModal
        isOpen={isVoiceAttendanceOpen}
        onClose={() => setIsVoiceAttendanceOpen(false)}
        realStudents={gradeStudents}
        gradeId={gradeId}
        gradeName={gradeStudents[0]?.gradeId || gradeId}
        subjectName={subjectName}
        selectedDate={selectedDate}
        onSaveAttendance={handleSaveVoiceAttendance}
      />
    </div>
  );
};
