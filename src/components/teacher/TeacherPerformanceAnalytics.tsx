import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Users,
  Percent,
  BookOpen,
  ArrowUpRight,
  Filter,
  Sparkles,
  Info,
  Printer
} from 'lucide-react';
import { GradesPDFExportModal } from './GradesPDFExportModal';

interface TeacherPerformanceAnalyticsProps {
  gradeId: string;
  subjectName: string;
  periodNum: number;
}

export const TeacherPerformanceAnalytics: React.FC<TeacherPerformanceAnalyticsProps> = ({
  gradeId,
  subjectName,
  periodNum
}) => {
  const { students, periodGrades, activeInstitution, activeTeacher } = useApp();

  const [selectedActivityFilter, setSelectedActivityFilter] = useState<string>('all');
  const [isPDFExportOpen, setIsPDFExportOpen] = useState<boolean>(false);

  // Enrolled students in this grade
  const gradeStudents = useMemo(() => {
    const list = students.filter(
      (s) => s.gradeId === gradeId && s.institutionCode === (activeInstitution?.institutionCode || 'ESC-PUB-2026')
    );
    return list.sort((a, b) => (a.listNumber || 0) - (b.listNumber || 0));
  }, [students, gradeId, activeInstitution]);

  // Current period record
  const currentPeriod = useMemo(() => {
    return (
      periodGrades.find(
        (p) =>
          p.gradeId === gradeId &&
          p.subjectName === subjectName &&
          p.period === periodNum &&
          p.institutionCode === (activeInstitution?.institutionCode || 'ESC-PUB-2026')
      ) || periodGrades.find((p) => p.subjectName === subjectName) || periodGrades[0]
    );
  }, [periodGrades, gradeId, subjectName, periodNum, activeInstitution]);

  const activities = currentPeriod?.activities || [];

  // Compute metrics per activity
  const activitiesMetrics = useMemo(() => {
    return activities.map((act) => {
      const scores = gradeStudents
        .map((st) => {
          const g = currentPeriod?.grades.find(
            (item) => item.studentId === st.id && item.activityId === act.id
          );
          return g ? g.score : null;
        })
        .filter((sc): sc is number => sc !== null);

      const count = scores.length;
      const sum = scores.reduce((acc, val) => acc + val, 0);
      const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
      const max = count > 0 ? Math.max(...scores) : 0;
      const min = count > 0 ? Math.min(...scores) : 0;

      const excelente = scores.filter((s) => s >= 9.0).length;
      const bueno = scores.filter((s) => s >= 7.0 && s < 9.0).length;
      const regular = scores.filter((s) => s >= 6.0 && s < 7.0).length;
      const critico = scores.filter((s) => s < 6.0).length;

      const passCount = excelente + bueno + regular;
      const passRate = count > 0 ? Math.round((passCount / count) * 100) : 0;

      // Identify students with critical scores
      const criticalStudents = gradeStudents
        .map((st) => {
          const g = currentPeriod?.grades.find(
            (item) => item.studentId === st.id && item.activityId === act.id
          );
          return g && g.score < 6.0 ? { student: st, score: g.score } : null;
        })
        .filter((item): item is { student: typeof gradeStudents[0]; score: number } => item !== null);

      return {
        activity: act,
        count,
        totalEnrolled: gradeStudents.length,
        avg,
        max,
        min,
        excelente,
        bueno,
        regular,
        critico,
        passRate,
        criticalStudents
      };
    });
  }, [activities, gradeStudents, currentPeriod]);

  // Overall statistics
  const overallAvg = useMemo(() => {
    if (activitiesMetrics.length === 0) return 0;
    const sum = activitiesMetrics.reduce((acc, a) => acc + a.avg, 0);
    return Number((sum / activitiesMetrics.length).toFixed(1));
  }, [activitiesMetrics]);

  const lowestActivity = useMemo(() => {
    if (activitiesMetrics.length === 0) return null;
    return [...activitiesMetrics].sort((a, b) => a.avg - b.avg)[0];
  }, [activitiesMetrics]);

  const highestActivity = useMemo(() => {
    if (activitiesMetrics.length === 0) return null;
    return [...activitiesMetrics].sort((a, b) => b.avg - a.avg)[0];
  }, [activitiesMetrics]);

  const filteredMetrics = useMemo(() => {
    if (selectedActivityFilter === 'all') return activitiesMetrics;
    return activitiesMetrics.filter((m) => m.activity.id === selectedActivityFilter);
  }, [activitiesMetrics, selectedActivityFilter]);

  return (
    <div className="space-y-6">
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Promedio General</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#1E293B] font-mono">{overallAvg}</span>
            <span className="text-xs font-semibold text-[#475569]">/ 10.0</span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            Calculado sobre {activities.length} actividades evaluadas
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Alumnos Evaluados</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#1E293B] font-mono">{gradeStudents.length}</span>
            <span className="text-xs font-semibold text-[#10B981]">100% Matriculados</span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            En {subjectName} (Periodo {periodNum})
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Mejor Rendimiento</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-[#1E293B] line-clamp-1">
              {highestActivity ? highestActivity.activity.name : 'N/A'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600">
              Promedio: {highestActivity ? highestActivity.avg : 0} / 10
            </span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            {highestActivity?.passRate}% de aprobación
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Punto de Refuerzo</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-[#1E293B] line-clamp-1">
              {lowestActivity ? lowestActivity.activity.name : 'N/A'}
            </span>
            <span className="text-xs font-mono font-bold text-amber-600">
              Promedio: {lowestActivity ? lowestActivity.avg : 0} / 10
            </span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            {lowestActivity ? `${lowestActivity.critico} alumnos en estado crítico` : 'Sin alertas'}
          </p>
        </div>
      </div>

      {/* Main Bar Chart: Promedio por Actividad */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-black text-base text-[#1E293B] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2563EB]" />
              Gráfica de Rendimiento: Promedio por Actividad
            </h3>
            <p className="text-xs text-[#475569] font-medium mt-0.5">
              Comparativa de calificaciones medias sobre escala escolar de 0 a 10 con línea de aprobación mínima (6.0).
            </p>
          </div>

          {/* Filter by activity & PDF Export Button */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#475569] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <select
              value={selectedActivityFilter}
              onChange={(e) => setSelectedActivityFilter(e.target.value)}
              className="bg-white border-2 border-slate-200 text-[#1E293B] font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-[#2563EB]"
            >
              <option value="all">Todas las actividades ({activities.length})</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.percentage}%)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsPDFExportOpen(true)}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 ml-1"
              title="Exportar notas académicas a PDF profesional con logo institucional"
            >
              <Printer className="w-3.5 h-3.5" />
              Exportar PDF Oficial
            </button>
          </div>
        </div>

        {/* SVG Interactive Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="relative h-64 sm:h-72 w-full flex items-end justify-around gap-2 sm:gap-4 px-2 sm:px-6 border-b-2 border-slate-300">
            {/* Horizontal guideline for minimum pass grade 6.0 (60% from bottom) */}
            <div className="absolute inset-x-0 bottom-[60%] border-b-2 border-dashed border-amber-400 z-10 pointer-events-none flex items-center justify-end pr-2">
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shadow-2xs">
                Mínimo Aprobatorio: 6.0
              </span>
            </div>

            {/* Horizontal guideline for 8.0 (80% from bottom) */}
            <div className="absolute inset-x-0 bottom-[80%] border-b border-dashed border-emerald-300 z-10 pointer-events-none flex items-center justify-end pr-2">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Nivel Sobresaliente: 8.0
              </span>
            </div>

            {/* Bars */}
            {filteredMetrics.map((item) => {
              const heightPct = Math.min(100, Math.max(8, (item.avg / 10) * 100));
              const isPassing = item.avg >= 6.0;
              const isExcellent = item.avg >= 8.5;

              return (
                <div
                  key={item.activity.id}
                  className="flex-1 max-w-[110px] flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Floating tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-16 bg-[#1E293B] text-white text-[11px] p-2 rounded-xl shadow-xl z-30 whitespace-nowrap text-center">
                    <p className="font-black">{item.activity.name}</p>
                    <p className="text-blue-200 font-mono">
                      Promedio: {item.avg} | Aprobación: {item.passRate}%
                    </p>
                    <p className="text-[10px] text-slate-300">
                      Máx: {item.max} • Mín: {item.min}
                    </p>
                  </div>

                  {/* Score badge above bar */}
                  <span className="font-mono text-xs font-black mb-1.5 text-[#1E293B] group-hover:scale-110 transition">
                    {item.avg}
                  </span>

                  {/* The Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-xl transition-all duration-500 shadow-md flex flex-col justify-between p-1 relative overflow-hidden ${
                      isExcellent
                        ? 'bg-gradient-to-t from-[#2563EB] to-[#60A5FA] border-t-2 border-x-2 border-blue-400'
                        : isPassing
                        ? 'bg-gradient-to-t from-[#1D4ED8] to-[#3B82F6] border-t-2 border-x-2 border-blue-400'
                        : 'bg-gradient-to-t from-red-600 to-amber-500 border-t-2 border-x-2 border-red-400'
                    }`}
                  >
                    {/* Inner highlight */}
                    <div className="w-full h-1 bg-white/40 rounded-full" />
                    {item.activity.isExam && (
                      <span className="text-[10px] text-white font-bold text-center">📝</span>
                    )}
                  </div>

                  {/* Label below bar */}
                  <div className="mt-2 text-center w-full">
                    <span className="text-[11px] font-black text-[#1E293B] block truncate" title={item.activity.name}>
                      {item.activity.name}
                    </span>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-1.5 py-0.2 rounded">
                      {item.activity.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-[#475569] font-medium border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#2563EB]" />
            <span>Promedio Aprobatorio (≥ 6.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-red-600 to-amber-500" />
            <span>Promedio Crítico (&lt; 6.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-b-2 border-dashed border-amber-500" />
            <span>Línea Mínima (6.0)</span>
          </div>
        </div>
      </div>

      {/* Distribution Breakdown per Activity: Excelente, Bueno, Regular, Crítico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-black text-sm text-[#1E293B] flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#2563EB]" />
              Distribución de Niveles por Actividad
            </h3>
            <p className="text-xs text-[#475569] font-medium mt-0.5">
              Porcentaje de estudiantes en cada rango de calificación.
            </p>
          </div>

          <div className="space-y-3.5">
            {filteredMetrics.map((item) => {
              const total = item.count || 1;
              const pctExc = Math.round((item.excelente / total) * 100);
              const pctBue = Math.round((item.bueno / total) * 100);
              const pctReg = Math.round((item.regular / total) * 100);
              const pctCri = Math.round((item.critico / total) * 100);

              return (
                <div key={item.activity.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1E293B] truncate max-w-[200px]">
                      {item.activity.name}
                    </span>
                    <span className="font-mono text-xs font-black text-[#2563EB]">
                      {item.passRate}% Aprobados
                    </span>
                  </div>

                  {/* Multi-segment progress bar */}
                  <div className="h-3.5 w-full bg-slate-100 rounded-lg overflow-hidden flex shadow-2xs">
                    {pctExc > 0 && (
                      <div
                        style={{ width: `${pctExc}%` }}
                        className="bg-emerald-500 hover:opacity-90 transition"
                        title={`Excelente (9-10): ${item.excelente} alumnos (${pctExc}%)`}
                      />
                    )}
                    {pctBue > 0 && (
                      <div
                        style={{ width: `${pctBue}%` }}
                        className="bg-blue-500 hover:opacity-90 transition"
                        title={`Bueno (7-8.9): ${item.bueno} alumnos (${pctBue}%)`}
                      />
                    )}
                    {pctReg > 0 && (
                      <div
                        style={{ width: `${pctReg}%` }}
                        className="bg-amber-400 hover:opacity-90 transition"
                        title={`Regular (6-6.9): ${item.regular} alumnos (${pctReg}%)`}
                      />
                    )}
                    {pctCri > 0 && (
                      <div
                        style={{ width: `${pctCri}%` }}
                        className="bg-red-500 hover:opacity-90 transition"
                        title={`Crítico (<6.0): ${item.critico} alumnos (${pctCri}%)`}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#475569] font-medium">
                    <span>🟢 Exc: {item.excelente}</span>
                    <span>🔵 Bueno: {item.bueno}</span>
                    <span>🟡 Reg: {item.regular}</span>
                    <span className="text-red-600 font-bold">🔴 Crítico: {item.critico}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Table and Pedagogical Insights */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-black text-sm text-[#1E293B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
              Resumen Métrico y Diagnóstico Pedagógico
            </h3>
            <p className="text-xs text-[#475569] font-medium mt-0.5">
              Análisis de dificultad para focalizar planes de refuerzo y nivelación.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead>
                <tr className="bg-[#2563EB] text-white font-black text-[11px] uppercase tracking-wider">
                  <th className="p-2.5">Actividad</th>
                  <th className="p-2.5 text-center">Peso</th>
                  <th className="p-2.5 text-center">Promedio</th>
                  <th className="p-2.5 text-center">Aprobación</th>
                  <th className="p-2.5 text-center">Dificultad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-[#1E293B]">
                {filteredMetrics.map((item) => {
                  const isHard = item.avg < 6.5;
                  const isNormal = item.avg >= 6.5 && item.avg < 8.5;

                  return (
                    <tr key={item.activity.id} className="hover:bg-blue-50/40 transition">
                      <td className="p-2.5 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{item.activity.name}</span>
                          {item.activity.isExam && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-[#1E3A8A] font-black rounded">
                              Examen
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold">{item.activity.percentage}%</td>
                      <td className="p-2.5 text-center font-mono font-black text-[#1E3A8A] text-sm">
                        {item.avg}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            item.passRate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.passRate >= 60
                              ? 'bg-blue-100 text-[#1E3A8A]'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.passRate}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isHard
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : isNormal
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isHard ? 'Alta' : isNormal ? 'Media' : 'Baja'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Students Needing Reinforcement List */}
          <div className="pt-2">
            <h4 className="text-xs font-black text-[#1E293B] mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Estudiantes con Notas Críticas (&lt; 6.0) en Actividades:
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredMetrics.flatMap((m) =>
                m.criticalStudents.map((cs) => (
                  <div
                    key={`${m.activity.id}-${cs.student.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900"
                  >
                    <span className="font-bold">{cs.student.fullName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#475569]">{m.activity.name}</span>
                      <span className="font-mono font-black text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        {cs.score} / 10
                      </span>
                    </div>
                  </div>
                ))
              )}
              {filteredMetrics.every((m) => m.criticalStudents.length === 0) && (
                <p className="text-xs text-emerald-700 font-semibold p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  ✓ Ningún estudiante tiene calificaciones críticas en las actividades filtradas.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Exportación de Calificaciones Académicas a PDF Profesional con Logo */}
      {isPDFExportOpen && currentPeriod && (
        <GradesPDFExportModal
          isOpen={isPDFExportOpen}
          onClose={() => setIsPDFExportOpen(false)}
          period={currentPeriod}
          students={gradeStudents}
          gradeName={
            activeInstitution?.gradeLevels.find((g) => g.id === gradeId)?.name || 'Primer Grado'
          }
          institution={activeInstitution}
          teacher={activeTeacher}
        />
      )}
    </div>
  );
};
