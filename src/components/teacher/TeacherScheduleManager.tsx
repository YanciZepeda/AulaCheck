import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Printer,
  RotateCcw,
  BookOpen,
  MapPin,
  Users,
  Check,
  X,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScheduleSlot } from '../../types';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lunes', short: 'LUN' },
  { id: 2, name: 'Martes', short: 'MAR' },
  { id: 3, name: 'Miércoles', short: 'MIÉ' },
  { id: 4, name: 'Jueves', short: 'JUE' },
  { id: 5, name: 'Viernes', short: 'VIE' }
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', badge: 'bg-blue-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', badge: 'bg-indigo-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', badge: 'bg-emerald-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900', badge: 'bg-purple-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', badge: 'bg-amber-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900', badge: 'bg-rose-600' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-900', badge: 'bg-sky-600' },
  slate: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-900', badge: 'bg-slate-700' }
};

interface TeacherScheduleManagerProps {
  currentSubject?: string;
  currentGradeId?: string;
}

export const TeacherScheduleManager: React.FC<TeacherScheduleManagerProps> = ({
  currentSubject = 'Matemáticas',
  currentGradeId = '1-grado'
}) => {
  const {
    activeTeacher,
    activeInstitution,
    scheduleSlots,
    addScheduleSlot,
    updateScheduleSlot,
    deleteScheduleSlot,
    resetDefaultSchedule
  } = useApp();

  // Filters
  const [filterDay, setFilterDay] = useState<number | 'all'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  // Modal State for Add / Edit Class Block
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Form State
  const [slotDay, setSlotDay] = useState<number>(1);
  const [slotStartTime, setSlotStartTime] = useState<string>('07:30');
  const [slotEndTime, setSlotEndTime] = useState<string>('08:30');
  const [slotSubject, setSlotSubject] = useState<string>(currentSubject);
  const [slotGradeName, setSlotGradeName] = useState<string>('Primer Grado "A"');
  const [slotClassroom, setSlotClassroom] = useState<string>('Aula 101');
  const [slotColor, setSlotColor] = useState<string>('blue');
  const [slotNotes, setSlotNotes] = useState<string>('');

  // Available subjects and grades from active institution
  const availableGrades = activeInstitution?.gradeLevels || [
    { id: '1-grado', name: 'Primer Grado "A"', subjects: ['Matemáticas', 'Lenguaje', 'Ciencias', 'Sociales'] },
    { id: '2-grado', name: 'Segundo Grado "A"', subjects: ['Matemáticas', 'Lenguaje', 'Inglés'] }
  ];

  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    availableGrades.forEach((g) => g.subjects.forEach((s) => set.add(s)));
    set.add('Matemáticas');
    set.add('Razonamiento Lógico');
    set.add('Refuerzo Académico');
    set.add('Tutoría');
    return Array.from(set);
  }, [availableGrades]);

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return scheduleSlots.filter((slot) => {
      if (filterDay !== 'all' && slot.dayOfWeek !== filterDay) return false;
      if (filterSubject !== 'all' && slot.subjectName !== filterSubject) return false;
      return true;
    });
  }, [scheduleSlots, filterDay, filterSubject]);

  // Slots grouped by day (1 to 5)
  const slotsByDay = useMemo(() => {
    const map: Record<number, ScheduleSlot[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    filteredSlots.forEach((slot) => {
      if (map[slot.dayOfWeek]) {
        map[slot.dayOfWeek].push(slot);
      }
    });

    // Sort each day's slots by start time
    Object.keys(map).forEach((d) => {
      map[Number(d)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return map;
  }, [filteredSlots]);

  const handleOpenAddModal = (day: number = 1, defaultStartTime: string = '07:30') => {
    setEditingSlotId(null);
    setSlotDay(day);
    setSlotStartTime(defaultStartTime);
    setSlotEndTime(defaultStartTime === '07:30' ? '08:30' : '09:30');
    setSlotSubject(currentSubject || 'Matemáticas');
    setSlotGradeName(availableGrades[0]?.name || 'Primer Grado');
    setSlotClassroom('Aula 101');
    setSlotColor('blue');
    setSlotNotes('');
    setIsSlotModalOpen(true);
  };

  const handleOpenEditModal = (slot: ScheduleSlot) => {
    setEditingSlotId(slot.id);
    setSlotDay(slot.dayOfWeek);
    setSlotStartTime(slot.startTime);
    setSlotEndTime(slot.endTime);
    setSlotSubject(slot.subjectName);
    setSlotGradeName(slot.gradeName);
    setSlotClassroom(slot.classroom || '');
    setSlotColor(slot.color || 'blue');
    setSlotNotes(slot.notes || '');
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();

    if (!slotSubject || !slotStartTime || !slotEndTime) return;

    if (editingSlotId) {
      updateScheduleSlot(editingSlotId, {
        dayOfWeek: slotDay as any,
        startTime: slotStartTime,
        endTime: slotEndTime,
        subjectName: slotSubject,
        gradeName: slotGradeName,
        classroom: slotClassroom,
        color: slotColor,
        notes: slotNotes
      });
    } else {
      addScheduleSlot({
        dayOfWeek: slotDay as any,
        startTime: slotStartTime,
        endTime: slotEndTime,
        subjectName: slotSubject,
        gradeId: currentGradeId || '1-grado',
        gradeName: slotGradeName,
        classroom: slotClassroom,
        color: slotColor,
        notes: slotNotes
      });
    }

    setIsSlotModalOpen(false);
  };

  const handlePrintSchedule = () => {
    window.print();
  };

  // Total weekly class hours
  const totalWeeklyClasses = scheduleSlots.length;

  return (
    <div className="space-y-6">
      {/* Top Banner - Azul Rey Institucional */}
      <div className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-white/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white border border-white/30 shadow-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-300" />
                CALENDARIO ACADÉMICO SEMANAL
              </span>
              <span className="text-xs font-bold text-blue-100">
                {activeInstitution?.name || 'Centro Escolar'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black mt-2 text-white tracking-tight">
              Gestión de Horarios y Carga Académica
            </h2>

            <p className="text-xs sm:text-sm text-blue-100 font-medium mt-1">
              Docente: <strong className="text-white font-bold">{activeTeacher?.teacherName || 'Prof. Carlos Mendoza'}</strong> •{' '}
              Total: <strong className="text-amber-300 font-mono font-black">{totalWeeklyClasses} bloques de clase</strong> a la semana
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal(1)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-2 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Bloque de Clase</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSchedule}
              className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-white/30 transition flex items-center gap-1.5"
              title="Imprimir horario semanal"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={resetDefaultSchedule}
              className="bg-white/15 hover:bg-white/25 text-white font-bold px-3 py-2.5 rounded-xl text-xs border border-white/30 transition flex items-center gap-1.5"
              title="Restablecer horario plantilla por defecto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Control Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Filtrar Día:
          </span>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterDay('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterDay === 'all' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toda la Semana
            </button>
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setFilterDay(d.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  filterDay === d.id ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-600">Materia:</span>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 outline-none text-xs"
          >
            <option value="all">Todas las Materias</option>
            {allSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Calendar Grid (Lunes a Viernes) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const daySlots = slotsByDay[day.id] || [];
          const isFilterActive = filterDay !== 'all' && filterDay !== day.id;

          if (isFilterActive) return null;

          return (
            <div
              key={day.id}
              className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-white tracking-wide">{day.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {daySlots.length} {daySlots.length === 1 ? 'bloque' : 'bloques'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddModal(day.id)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
                  title={`Agregar clase el ${day.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Day Slots List */}
              <div className="p-3 space-y-2.5 flex-1 min-h-[300px] bg-slate-50/50">
                {daySlots.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs">
                    <Clock className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                    <span>Sin clases asignadas este día</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(day.id)}
                      className="mt-2 text-[#2563EB] font-bold hover:underline"
                    >
                      + Asignar materia
                    </button>
                  </div>
                ) : (
                  daySlots.map((slot) => {
                    const colorStyle = COLOR_MAP[slot.color || 'blue'] || COLOR_MAP.blue;
                    return (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-xl border-2 transition-all shadow-xs ${colorStyle.bg} ${colorStyle.border} relative group hover:shadow-md`}
                      >
                        {/* Time range */}
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-mono font-black text-slate-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {slot.startTime} - {slot.endTime}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(slot)}
                              className="p-1 text-slate-600 hover:text-blue-700 rounded-md hover:bg-white transition"
                              title="Editar bloque"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteScheduleSlot(slot.id)}
                              className="p-1 text-slate-600 hover:text-red-700 rounded-md hover:bg-white transition"
                              title="Eliminar bloque"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Subject Title */}
                        <h4 className={`font-black text-sm leading-tight ${colorStyle.text}`}>
                          {slot.subjectName}
                        </h4>

                        {/* Grade and Classroom */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-600">
                          <span className="bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                            {slot.gradeName}
                          </span>
                          {slot.classroom && (
                            <span className="bg-white/90 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {slot.classroom}
                            </span>
                          )}
                        </div>

                        {/* Optional Notes */}
                        {slot.notes && (
                          <p className="mt-1.5 text-[10px] text-slate-500 italic line-clamp-1">
                            {slot.notes}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Agregar / Editar Bloque de Horario */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <header className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white p-4 flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-300" />
                {editingSlotId ? 'Editar Bloque de Clase' : 'Nuevo Bloque de Clase'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="text-blue-100 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <form onSubmit={handleSaveSlot} className="p-5 space-y-4 text-xs font-bold text-slate-700">
              {/* Día de la semana */}
              <div>
                <label className="block mb-1">Día de la Semana:</label>
                <select
                  value={slotDay}
                  onChange={(e) => setSlotDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 outline-none"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Horas de Inicio y Fin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Hora Inicio:</label>
                  <input
                    type="time"
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-800 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Hora Fin:</label>
                  <input
                    type="time"
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-800 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Materia */}
              <div>
                <label className="block mb-1">Materia o Asignatura:</label>
                <input
                  type="text"
                  placeholder="Ej. Matemáticas, Lenguaje..."
                  value={slotSubject}
                  onChange={(e) => setSlotSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 outline-none"
                  required
                />
              </div>

              {/* Grado / Sección y Aula */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Grado / Nivel:</label>
                  <input
                    type="text"
                    value={slotGradeName}
                    onChange={(e) => setSlotGradeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Aula / Espacio:</label>
                  <input
                    type="text"
                    placeholder="Ej. Aula 101, Lab. 1"
                    value={slotClassroom}
                    onChange={(e) => setSlotClassroom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Color del Bloque */}
              <div>
                <label className="block mb-1">Color Identificador:</label>
                <div className="flex items-center gap-2">
                  {Object.keys(COLOR_MAP).map((colorKey) => {
                    const c = COLOR_MAP[colorKey];
                    const isSelected = slotColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setSlotColor(colorKey)}
                        className={`w-7 h-7 rounded-full ${c.badge} transition-transform ${
                          isSelected ? 'ring-2 ring-slate-900 ring-offset-2 scale-110' : 'opacity-80'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Notas u Observaciones */}
              <div>
                <label className="block mb-1">Notas u Observaciones (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej. Llevar material didáctico, clase práctica..."
                  value={slotNotes}
                  onChange={(e) => setSlotNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-xl font-black shadow-md transition"
                >
                  {editingSlotId ? 'Guardar Cambios' : 'Crear Bloque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
