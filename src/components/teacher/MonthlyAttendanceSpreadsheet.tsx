import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Settings2,
  FileSpreadsheet,
  Check,
  X,
  Layers,
  ArrowRight,
  FileDown,
  CalendarRange
} from 'lucide-react';
import {
  getDefaultSchoolMonths,
  getMonthSchoolDays,
  exportMonthlyAttendanceToExcel,
  exportPeriodAttendanceToExcel,
  exportAnnualAttendanceToExcel,
  TRIMESTRE_PRESETS,
  PERIODO_PRESETS,
  MonthOption,
  DayInfo,
  PeriodPreset
} from '../../utils/attendanceExport';

interface MonthlyAttendanceSpreadsheetProps {
  gradeId: string;
  subjectName: string;
  periodNum: number;
}

export const MonthlyAttendanceSpreadsheet: React.FC<MonthlyAttendanceSpreadsheetProps> = ({
  gradeId,
  subjectName,
  periodNum
}) => {
  const {
    students,
    attendance,
    activeInstitution,
    activeTeacher,
    setSingleAttendance,
    showToast
  } = useApp();

  // All 10 school months from Febrero up to Noviembre
  const allMonths = useMemo(() => getDefaultSchoolMonths(2026), []);

  // Distribution Mode: 'trimestres' | 'periodos' | 'anual' | 'personalizado'
  const [distributionMode, setDistributionMode] = useState<'trimestres' | 'periodos' | 'anual' | 'personalizado'>('trimestres');

  // Selected preset inside trimestres or periodos
  const [selectedTrimestreId, setSelectedTrimestreId] = useState<string>('trim-1');
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>(`per-${Math.min(4, Math.max(1, periodNum))}`);

  // Duration & Starting month for customized mode
  const [customMonthsCount, setCustomMonthsCount] = useState<number>(3);
  const [customStartMonthIdx, setCustomStartMonthIdx] = useState<number>(1);

  // Compute active months for the current view
  const activeMonthsList = useMemo((): MonthOption[] => {
    if (distributionMode === 'trimestres') {
      const preset = TRIMESTRE_PRESETS.find((t) => t.id === selectedTrimestreId) || TRIMESTRE_PRESETS[0];
      return preset.monthIndices.map((idx) => allMonths[idx - 1]).filter(Boolean);
    }

    if (distributionMode === 'periodos') {
      const preset = PERIODO_PRESETS.find((p) => p.id === selectedPeriodoId) || PERIODO_PRESETS[0];
      return preset.monthIndices.map((idx) => allMonths[idx - 1]).filter(Boolean);
    }

    if (distributionMode === 'anual') {
      // All 10 months from Febrero up to Noviembre
      return allMonths;
    }

    // Custom mode
    return allMonths.slice(customStartMonthIdx - 1, customStartMonthIdx - 1 + customMonthsCount);
  }, [distributionMode, selectedTrimestreId, selectedPeriodoId, customStartMonthIdx, customMonthsCount, allMonths]);

  // Selected tab index within activeMonthsList
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const currentMonth: MonthOption = activeMonthsList[selectedMonthIndex] || activeMonthsList[0] || allMonths[0];

  // School days (Lunes a Viernes) for the selected month
  const schoolDays: DayInfo[] = useMemo(() => {
    return getMonthSchoolDays(currentMonth.year, currentMonth.month);
  }, [currentMonth]);

  // Students for this grade and institution
  const gradeStudents = useMemo(() => {
    const list = students.filter(
      (s) => s.gradeId === gradeId && s.institutionCode === (activeInstitution?.institutionCode || 'ESC-PUB-2026')
    );
    return list.sort((a, b) => (a.listNumber || 0) - (b.listNumber || 0));
  }, [students, gradeId, activeInstitution]);

  const gradeName = activeInstitution?.gradeLevels.find((g) => g.id === gradeId)?.name || 'Primer Grado';

  // Handle cell click: cycles P (Presente) -> F (Falta/Ausente) -> T (Tardanza) -> FJ (Justificada) -> P
  const handleCellClick = (studentId: string, dateStr: string) => {
    const current = attendance.find(
      (a) => a.studentId === studentId && a.date === dateStr && a.subjectName === subjectName
    );

    let nextStatus: 'presente' | 'ausente' | 'tardanza' | 'justificado' = 'presente';
    if (!current) {
      nextStatus = 'presente';
    } else if (current.status === 'presente') {
      nextStatus = 'ausente';
    } else if (current.status === 'ausente') {
      nextStatus = 'tardanza';
    } else if (current.status === 'tardanza') {
      nextStatus = 'justificado';
    } else if (current.status === 'justificado') {
      nextStatus = 'presente';
    }

    setSingleAttendance(studentId, subjectName, gradeId, dateStr, nextStatus);
  };

  // Label for active period/distribution
  const activeDistributionLabel = useMemo(() => {
    if (distributionMode === 'trimestres') {
      const preset = TRIMESTRE_PRESETS.find((t) => t.id === selectedTrimestreId);
      return preset ? preset.name : 'Trimestre';
    }
    if (distributionMode === 'periodos') {
      const preset = PERIODO_PRESETS.find((p) => p.id === selectedPeriodoId);
      return preset ? preset.name : 'Periodo';
    }
    if (distributionMode === 'anual') {
      return 'Año Lectivo Completo (Febrero - Noviembre)';
    }
    return `Bloque Personalizado (${currentMonth.name})`;
  }, [distributionMode, selectedTrimestreId, selectedPeriodoId, currentMonth]);

  // 1. Export Current Month Excel
  const handleExportMonthExcel = () => {
    exportMonthlyAttendanceToExcel({
      institutionName: activeInstitution?.name || 'Centro Escolar',
      institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
      teacherName: activeTeacher?.teacherName || 'Docente Asignado',
      subjectName,
      gradeName,
      periodNum: activeDistributionLabel,
      monthName: currentMonth.name,
      schoolDays,
      students: gradeStudents,
      attendanceRecords: attendance
    });
    showToast('Descarga Iniciada', `Cuadro mensual de ${currentMonth.name} descargado en Excel.`, 'success');
  };

  // 2. Export Active Period/Trimester Excel (All included months + Period Summary sheet)
  const handleExportPeriodExcel = () => {
    exportPeriodAttendanceToExcel({
      institutionName: activeInstitution?.name || 'Centro Escolar',
      institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
      teacherName: activeTeacher?.teacherName || 'Docente Asignado',
      subjectName,
      gradeName,
      periodLabel: activeDistributionLabel,
      months: activeMonthsList,
      students: gradeStudents,
      attendanceRecords: attendance
    });
    showToast('Descarga Iniciada', `Cuadro consolidado de ${activeDistributionLabel} descargado con hojas mensuales y resumen.`, 'success');
  };

  // 3. Export Full Year Excel (Febrero a Noviembre + Consolidado Anual)
  const handleExportAnnualExcel = () => {
    exportAnnualAttendanceToExcel({
      institutionName: activeInstitution?.name || 'Centro Escolar',
      institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
      teacherName: activeTeacher?.teacherName || 'Docente Asignado',
      subjectName,
      gradeName,
      students: gradeStudents,
      attendanceRecords: attendance
    });
    showToast('Descarga Iniciada', `Asistencia anual completa (Febrero a Noviembre) descargada con consolidado anual.`, 'success');
  };

  // Group summary calculations for the active month
  let groupTotalPresent = 0;
  let groupTotalAbsent = 0;
  let groupTotalTardy = 0;
  let groupTotalJustified = 0;

  gradeStudents.forEach((st) => {
    schoolDays.forEach((d) => {
      const rec = attendance.find(
        (a) => a.studentId === st.id && a.date === d.dateStr && a.subjectName === subjectName
      );
      if (rec?.status === 'presente') groupTotalPresent++;
      else if (rec?.status === 'ausente') groupTotalAbsent++;
      else if (rec?.status === 'tardanza') groupTotalTardy++;
      else if (rec?.status === 'justificado') groupTotalJustified++;
    });
  });

  const groupTotalEvents = groupTotalPresent + groupTotalAbsent + groupTotalTardy + groupTotalJustified;
  const groupEffective = groupTotalPresent + groupTotalJustified + groupTotalTardy * 0.5;
  const groupOverallPct = groupTotalEvents > 0 ? Math.round((groupEffective / groupTotalEvents) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* Sincronización Permanente con el Visualizador de Asistencia */}
      <div className="bg-emerald-50 border-2 border-emerald-300 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block shrink-0" />
          <p className="text-xs text-emerald-950 font-medium">
            <strong className="text-emerald-900 font-black">Conectado y Guardado Permanente:</strong> Todos los pases de asistencia realizados en el Visualizador de Asistencia o por voz se guardan automáticamente en este cuadro de meses hasta Noviembre.
          </p>
        </div>
        <span className="text-[11px] font-black text-emerald-800 bg-white border border-emerald-300 px-3 py-1 rounded-xl self-start sm:self-auto shrink-0 shadow-2xs">
          Guardado Permanente y Sincronizado ✓
        </span>
      </div>

      {/* Barra de Distribución (Trimestres / Periodos / Año Completo hasta Noviembre) */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selector de Esquema de Distribución */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-[#1E3A8A]" />
              Distribución Escolar:
            </span>

            <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setDistributionMode('trimestres');
                  setSelectedMonthIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  distributionMode === 'trimestres'
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Por Trimestres (3)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDistributionMode('periodos');
                  setSelectedMonthIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  distributionMode === 'periodos'
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Por Periodos (4)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDistributionMode('anual');
                  setSelectedMonthIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  distributionMode === 'anual'
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Año Completo (Feb - Nov)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDistributionMode('personalizado');
                  setSelectedMonthIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  distributionMode === 'personalizado'
                    ? 'bg-[#1E3A8A] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Botones de Descarga en Excel (Mes, Periodo y Año Completo) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportMonthExcel}
              className="bg-white hover:bg-slate-100 text-[#1E3A8A] border-2 border-[#1E3A8A] px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Descargar solo el mes visible en pantalla con conteos"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Mes ({currentMonth.shortName})
            </button>

            <button
              type="button"
              onClick={handleExportPeriodExcel}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Descargar todas las hojas del periodo/trimestre activo con resumen de conteos"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Descargar {distributionMode === 'trimestres' ? 'Trimestre' : distributionMode === 'periodos' ? 'Periodo' : 'Bloque'} (.xlsx)
            </button>

            <button
              type="button"
              onClick={handleExportAnnualExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Descargar toda la asistencia de Febrero a Noviembre con hoja de consolidado anual"
            >
              <FileDown className="w-3.5 h-3.5" />
              Descargar Año Completo (10 Meses)
            </button>
          </div>
        </div>

        {/* Sub-barra de Selección de Trimestre o Periodo */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            {distributionMode === 'trimestres' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-600">Trimestre:</span>
                {TRIMESTRE_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTrimestreId(t.id);
                      setSelectedMonthIndex(0);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedTrimestreId === t.id
                        ? 'bg-[#2563EB] text-white shadow-xs font-black'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {distributionMode === 'periodos' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-600">Periodo:</span>
                {PERIODO_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPeriodoId(p.id);
                      setSelectedMonthIndex(0);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedPeriodoId === p.id
                        ? 'bg-[#2563EB] text-white shadow-xs font-black'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {distributionMode === 'personalizado' && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                  <span className="text-[11px] font-bold text-slate-700 px-1">Inicio:</span>
                  <select
                    value={customStartMonthIdx}
                    onChange={(e) => {
                      setCustomStartMonthIdx(Number(e.target.value));
                      setSelectedMonthIndex(0);
                    }}
                    className="bg-white px-2 py-0.5 rounded text-xs font-black text-slate-800 cursor-pointer"
                  >
                    {allMonths.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                  <span className="text-[11px] font-bold text-slate-700 px-1">Duración:</span>
                  {[2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        setCustomMonthsCount(cnt);
                        setSelectedMonthIndex(0);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        customMonthsCount === cnt ? 'bg-[#2563EB] text-white' : 'text-slate-700'
                      }`}
                    >
                      {cnt} m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Leyenda de Estados */}
          <div className="flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 font-mono font-bold">
            <span className="flex items-center gap-1 text-emerald-800 font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> P: Asistencia
            </span>
            <span className="flex items-center gap-1 text-red-800 font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> F: Falta
            </span>
            <span className="flex items-center gap-1 text-blue-800 font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> FJ: Justificada
            </span>
            <span className="flex items-center gap-1 text-amber-900 font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> T: Tardanza
            </span>
          </div>
        </div>

        {/* Pestañas de Meses Activos */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-200">
          {activeMonthsList.map((m, idx) => {
            const isSelected = selectedMonthIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedMonthIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#1E3A8A] text-white shadow-md'
                    : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                <span>{m.name}</span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla Oficial de Asistencia con Conteos de Faltas, Asistencias y Justificaciones */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        {/* Banner Superior de la Tabla */}
        <div className="p-3.5 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-800 gap-2 font-bold">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900 text-sm">
              Cuadro Oficial: {currentMonth.name.toUpperCase()}
            </span>
            <span>•</span>
            <span className="text-[#1E3A8A] font-bold">{activeDistributionLabel}</span>
            <span>•</span>
            <span>{schoolDays.length} días lectivos (Lunes a Viernes)</span>
            <span>•</span>
            <span>{gradeStudents.length} estudiantes</span>
          </div>
          <span className="text-[11px] font-black text-[#1E3A8A] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
            💡 Haz clic en cualquier casilla para alternar: P (Asistencia) ➔ F (Falta) ➔ FJ (Justificada) ➔ T (Tardanza).
          </span>
        </div>

        {/* Malla Scrollable */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs bg-white">
            <thead>
              <tr className="bg-[#1E3A8A] text-white border-b-2 border-blue-900 font-black uppercase text-[11px]">
                <th className="p-2.5 w-10 text-center border-r border-blue-400/40 sticky left-0 bg-[#1E3A8A] z-20 text-white font-black">
                  N°
                </th>
                <th className="p-2.5 min-w-[190px] border-r border-blue-400/40 sticky left-10 bg-[#1E3A8A] z-20 text-white font-black">
                  Estudiante
                </th>
                <th className="p-2.5 w-24 border-r border-blue-400/40 font-mono text-white font-black">
                  NIE
                </th>

                {/* Columnas de Días de la Semana */}
                {schoolDays.map((day) => (
                  <th
                    key={day.dateStr}
                    className="p-1 text-center border-r border-blue-400/40 min-w-[34px] bg-[#2563EB] text-white"
                    title={`${day.dayOfWeekName} ${day.dayOfMonth} de ${currentMonth.name}`}
                  >
                    <span className="block font-black text-white text-[10px]">{day.dayOfWeekShort}</span>
                    <span className="block font-mono text-white text-xs font-black">{day.dayOfMonth}</span>
                  </th>
                ))}

                {/* Columnas de Conteo Solicitadas: Asistencias, Faltas, Faltas Justificadas y Tardanzas */}
                <th className="p-2 text-center bg-emerald-700 text-white border-r border-blue-400/40 font-black min-w-[65px]" title="Total Asistencias">
                  Asistencias (P)
                </th>
                <th className="p-2 text-center bg-red-700 text-white border-r border-blue-400/40 font-black min-w-[65px]" title="Total Inasistencias / Faltas">
                  Faltas (F)
                </th>
                <th className="p-2 text-center bg-blue-700 text-white border-r border-blue-400/40 font-black min-w-[70px]" title="Faltas Justificadas">
                  F. Justif. (FJ)
                </th>
                <th className="p-2 text-center bg-amber-500 text-slate-950 border-r border-amber-600 font-black min-w-[55px]" title="Total Tardanzas">
                  Tardanzas (T)
                </th>
                <th className="p-2 text-center bg-[#0F172A] text-white font-black min-w-[75px]" title="Porcentaje de Asistencia Efectiva">
                  % Mes
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-mono bg-white">
              {gradeStudents.map((st) => {
                let presentCount = 0;
                let absentCount = 0;
                let tardyCount = 0;
                let justifiedCount = 0;

                return (
                  <tr key={st.id} className="hover:bg-blue-50/50 transition">
                    {/* N° Correlativo */}
                    <td className="p-2 text-center font-black text-[#1E3A8A] border-r border-slate-200 sticky left-0 bg-white z-10 text-xs">
                      {st.listNumber}
                    </td>

                    {/* Nombre del Estudiante */}
                    <td className="p-2 font-sans font-bold text-slate-900 border-r border-slate-200 truncate sticky left-10 bg-white z-10 text-xs">
                      {st.fullName}
                    </td>

                    {/* NIE */}
                    <td className="p-2 font-mono font-bold text-slate-700 border-r border-slate-200 text-[11px]">
                      {st.nie || '18882846'}
                    </td>

                    {/* Casillas de Días Lectivos */}
                    {schoolDays.map((day) => {
                      const record = attendance.find(
                        (a) => a.studentId === st.id && a.date === day.dateStr && a.subjectName === subjectName
                      );

                      if (record?.status === 'presente') presentCount++;
                      else if (record?.status === 'ausente') absentCount++;
                      else if (record?.status === 'tardanza') tardyCount++;
                      else if (record?.status === 'justificado') justifiedCount++;

                      return (
                        <td
                          key={day.dateStr}
                          onClick={() => handleCellClick(st.id, day.dateStr)}
                          className="p-1 text-center border-r border-slate-200 cursor-pointer select-none hover:bg-blue-100/50 transition"
                          title={`${st.fullName} • ${day.dayOfWeekName} ${day.dayOfMonth}: clic para alternar`}
                        >
                          {!record ? (
                            <span className="text-slate-300 font-bold text-[11px]">-</span>
                          ) : record.status === 'presente' ? (
                            <span className="inline-block w-6 h-6 leading-6 rounded bg-emerald-600 text-white font-black text-[11px] shadow-2xs">
                              P
                            </span>
                          ) : record.status === 'ausente' ? (
                            <span className="inline-block w-6 h-6 leading-6 rounded bg-red-600 text-white font-black text-[11px] animate-pulse shadow-2xs">
                              F
                            </span>
                          ) : record.status === 'tardanza' ? (
                            <span className="inline-block w-6 h-6 leading-6 rounded bg-amber-500 text-slate-950 font-black text-[11px] border border-amber-600 shadow-2xs">
                              T
                            </span>
                          ) : (
                            <span className="inline-block w-6 h-6 leading-6 rounded bg-blue-600 text-white font-black text-[11px] shadow-2xs">
                              FJ
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Conteos Integrados por Estudiante */}
                    {(() => {
                      const totalRecorded = presentCount + absentCount + tardyCount + justifiedCount;
                      const effectivePresent = presentCount + justifiedCount + tardyCount * 0.5;
                      const pct = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 100) : 100;
                      const isCritical = pct < 80 && totalRecorded > 0;

                      return (
                        <>
                          {/* Asistencias (P) */}
                          <td className="p-2 text-center font-black text-emerald-900 border-r border-slate-200 bg-emerald-50 text-xs">
                            {presentCount}
                          </td>
                          {/* Faltas (F) */}
                          <td className="p-2 text-center font-black text-red-900 border-r border-slate-200 bg-red-50 text-xs">
                            {absentCount}
                          </td>
                          {/* Faltas Justificadas (FJ) */}
                          <td className="p-2 text-center font-black text-blue-900 border-r border-slate-200 bg-blue-50 text-xs">
                            {justifiedCount}
                          </td>
                          {/* Tardanzas (T) */}
                          <td className="p-2 text-center font-black text-amber-950 border-r border-slate-200 bg-amber-50 text-xs">
                            {tardyCount}
                          </td>
                          {/* % Mes */}
                          <td className="p-2 text-center font-black bg-slate-50">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-black text-xs border ${
                                isCritical
                                  ? 'bg-red-600 text-white border-red-700'
                                  : pct >= 85
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : 'bg-blue-100 text-[#1E3A8A] border-blue-300'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                );
              })}
            </tbody>

            {/* Fila Inferior de Totales Consolidados del Grupo */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="p-2.5 text-center font-black sticky left-0 bg-slate-100 z-10 border-r border-slate-300" colSpan={3}>
                  TOTAL ASISTENCIAS DEL GRUPO:
                </td>
                {schoolDays.map((day) => {
                  const dayRecords = attendance.filter(
                    (a) => a.date === day.dateStr && a.subjectName === subjectName && a.status === 'presente'
                  );
                  return (
                    <td key={day.dateStr} className="p-1 text-center font-black text-[#1E3A8A] border-r border-slate-300 text-xs">
                      {dayRecords.length}
                    </td>
                  );
                })}
                {/* Totales globales del mes */}
                <td className="p-2 text-center font-black text-emerald-900 bg-emerald-100/70 border-r border-slate-300">
                  {groupTotalPresent}
                </td>
                <td className="p-2 text-center font-black text-red-900 bg-red-100/70 border-r border-slate-300">
                  {groupTotalAbsent}
                </td>
                <td className="p-2 text-center font-black text-blue-900 bg-blue-100/70 border-r border-slate-300">
                  {groupTotalJustified}
                </td>
                <td className="p-2 text-center font-black text-amber-950 bg-amber-100/70 border-r border-slate-300">
                  {groupTotalTardy}
                </td>
                <td className="p-2 text-center font-black bg-slate-200 text-slate-900 text-xs">
                  {groupOverallPct}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
