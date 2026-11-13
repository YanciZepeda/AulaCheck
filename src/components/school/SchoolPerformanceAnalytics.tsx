import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  BookOpen,
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  Filter,
  ShieldCheck,
  Percent
} from 'lucide-react';

export const SchoolPerformanceAnalytics: React.FC = () => {
  const { activeInstitution, students, periodGrades } = useApp();

  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedPeriodNum, setSelectedPeriodNum] = useState<number>(1);

  const gradeLevels = activeInstitution?.gradeLevels || [];

  // Filtered students by school and optionally by grade
  const schoolStudents = useMemo(() => {
    if (!activeInstitution) return [];
    return students.filter(
      (s) =>
        s.institutionCode === activeInstitution.institutionCode &&
        (selectedGradeFilter === 'all' || s.gradeId === selectedGradeFilter)
    );
  }, [students, activeInstitution, selectedGradeFilter]);

  // Aggregate all unique subjects in the school (or filtered grade)
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    const gradesToScan =
      selectedGradeFilter === 'all'
        ? gradeLevels
        : gradeLevels.filter((g) => g.id === selectedGradeFilter);

    gradesToScan.forEach((g) => {
      g.subjects.forEach((sub) => set.add(sub));
    });

    return Array.from(set);
  }, [gradeLevels, selectedGradeFilter]);

  // Calculate subject analytics
  const subjectAnalytics = useMemo(() => {
    if (!activeInstitution) return [];

    return allSubjects.map((subName) => {
      // Find all periods matching this subject
      const matchingPeriods = periodGrades.filter(
        (p) =>
          p.institutionCode === activeInstitution.institutionCode &&
          p.subjectName === subName &&
          (selectedGradeFilter === 'all' || p.gradeId === selectedGradeFilter) &&
          p.period === selectedPeriodNum
      );

      // Assigned teachers for this subject
      const assignedTeachers = activeInstitution.teachers.filter(
        (t) =>
          t.subjectName === subName &&
          (selectedGradeFilter === 'all' || t.gradeId === selectedGradeFilter)
      );

      // Gather student averages in this subject
      const studentAverages: { studentId: string; studentName: string; average: number }[] = [];

      schoolStudents.forEach((st) => {
        // Find matching period for this student's grade and this subject
        const p = matchingPeriods.find((item) => item.gradeId === st.gradeId);
        if (!p || p.activities.length === 0) return;

        let weightedSum = 0;
        let totalWeight = 0;

        p.activities.forEach((act) => {
          const g = p.grades.find(
            (item) => item.studentId === st.id && item.activityId === act.id
          );
          if (g !== undefined) {
            weightedSum += g.score * (act.percentage / 100);
            totalWeight += act.percentage;
          }
        });

        if (totalWeight > 0) {
          const avg = Number((weightedSum / (totalWeight / 100)).toFixed(1));
          studentAverages.push({
            studentId: st.id,
            studentName: st.fullName,
            average: avg
          });
        }
      });

      const totalEvaluated = studentAverages.length;
      const sumAvgs = studentAverages.reduce((acc, s) => acc + s.average, 0);
      const subjectAverage =
        totalEvaluated > 0 ? Number((sumAvgs / totalEvaluated).toFixed(1)) : 0;

      const passingCount = studentAverages.filter((s) => s.average >= 6.0).length;
      const failingCount = studentAverages.filter((s) => s.average < 6.0).length;
      const passRate =
        totalEvaluated > 0 ? Math.round((passingCount / totalEvaluated) * 100) : 0;

      const maxScore =
        totalEvaluated > 0 ? Math.max(...studentAverages.map((s) => s.average)) : 0;
      const minScore =
        totalEvaluated > 0 ? Math.min(...studentAverages.map((s) => s.average)) : 0;

      const isCritical = subjectAverage < 6.0 || (totalEvaluated > 0 && passRate < 70);

      return {
        subjectName: subName,
        subjectAverage,
        totalEvaluated,
        passingCount,
        failingCount,
        passRate,
        maxScore,
        minScore,
        isCritical,
        assignedTeachers,
        studentAverages
      };
    });
  }, [allSubjects, activeInstitution, periodGrades, selectedGradeFilter, selectedPeriodNum, schoolStudents]);

  // Overall school average across all subjects
  const overallSchoolAverage = useMemo(() => {
    if (subjectAnalytics.length === 0) return 0;
    const evaluated = subjectAnalytics.filter((s) => s.totalEvaluated > 0);
    if (evaluated.length === 0) return 0;
    const sum = evaluated.reduce((acc, s) => acc + s.subjectAverage, 0);
    return Number((sum / evaluated.length).toFixed(1));
  }, [subjectAnalytics]);

  const bestSubject = useMemo(() => {
    const list = subjectAnalytics.filter((s) => s.totalEvaluated > 0);
    if (list.length === 0) return null;
    return [...list].sort((a, b) => b.subjectAverage - a.subjectAverage)[0];
  }, [subjectAnalytics]);

  const criticalSubjects = useMemo(() => {
    return subjectAnalytics.filter((s) => s.isCritical && s.totalEvaluated > 0);
  }, [subjectAnalytics]);

  if (!activeInstitution) return null;

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[#1E293B] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            Analíticas de Rendimiento Institucional por Materia
          </h2>
          <p className="text-xs text-[#475569] font-medium mt-0.5">
            Diagnóstico académico comparativo de todas las asignaturas impartidas en el centro escolar.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569]">
            <Filter className="w-3.5 h-3.5" />
            <span>Grado:</span>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="bg-white border-2 border-slate-200 text-[#1E293B] font-bold text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-[#2563EB]"
            >
              <option value="all">Todos los Grados ({gradeLevels.length})</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569]">
            <span>Periodo:</span>
            <select
              value={selectedPeriodNum}
              onChange={(e) => setSelectedPeriodNum(Number(e.target.value))}
              className="bg-white border-2 border-slate-200 text-[#1E293B] font-bold text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-[#2563EB]"
            >
              <option value={1}>Periodo 1</option>
              <option value={2}>Periodo 2</option>
              <option value={3}>Periodo 3</option>
              <option value={4}>Periodo 4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Promedio Institucional</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#1E293B] font-mono">
              {overallSchoolAverage}
            </span>
            <span className="text-xs font-semibold text-[#475569]">/ 10.0</span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            Promedio global de todas las materias
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Total de Materias</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#1E293B] font-mono">{allSubjects.length}</span>
            <span className="text-xs font-semibold text-[#2563EB]">Asignaturas</span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            Con profesores y horarios asignados
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Materia Más Destacada</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-[#1E293B] line-clamp-1">
              {bestSubject ? bestSubject.subjectName : 'N/A'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600">
              Promedio: {bestSubject ? bestSubject.subjectAverage : 0} / 10
            </span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            {bestSubject ? `${bestSubject.passRate}% de alumnos aprobados` : 'Sin datos'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#475569]">Materias en Alerta (&lt;6.0)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                criticalSubjects.length > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {criticalSubjects.length}
            </span>
            <span className="text-xs font-semibold text-[#475569]">Asignatura(s)</span>
          </div>
          <p className="text-[11px] text-[#475569] mt-1 font-medium">
            {criticalSubjects.length > 0 ? 'Requieren plan de nivelación' : 'Rendimiento saludable'}
          </p>
        </div>
      </div>

      {/* Main Bar Chart: Comparativa de Promedios por Materia */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-black text-base text-[#1E293B] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2563EB]" />
              Gráfica Comparativa de Rendimiento por Asignatura
            </h3>
            <p className="text-xs text-[#475569] font-medium mt-0.5">
              Promedio general obtenido por los alumnos en cada materia (escala de 0 a 10).
            </p>
          </div>

          <span className="text-[11px] font-black text-[#1E3A8A] bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg self-start sm:self-auto">
            Periodo {selectedPeriodNum} Oficial
          </span>
        </div>

        {/* SVG Interactive Chart */}
        <div className="pt-4 pb-2">
          <div className="relative h-64 sm:h-76 w-full flex items-end justify-around gap-2 sm:gap-6 px-2 sm:px-6 border-b-2 border-slate-300">
            {/* Minimum passing guideline (6.0 = 60%) */}
            <div className="absolute inset-x-0 bottom-[60%] border-b-2 border-dashed border-amber-400 z-10 pointer-events-none flex items-center justify-end pr-2">
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shadow-2xs">
                Umbral MINED: 6.0
              </span>
            </div>

            {/* School overall average guideline */}
            {overallSchoolAverage > 0 && (
              <div
                style={{ bottom: `${(overallSchoolAverage / 10) * 100}%` }}
                className="absolute inset-x-0 border-b border-dashed border-blue-500 z-10 pointer-events-none flex items-center justify-start pl-2"
              >
                <span className="text-[10px] font-black text-[#1E3A8A] bg-blue-100/90 px-1.5 py-0.5 rounded">
                  Promedio Escuela: {overallSchoolAverage}
                </span>
              </div>
            )}

            {/* Subject Bars */}
            {subjectAnalytics.map((sub) => {
              const heightPct = Math.min(100, Math.max(10, (sub.subjectAverage / 10) * 100));
              const isPassing = sub.subjectAverage >= 6.0;
              const isTop = sub.subjectAverage >= 8.5;

              return (
                <div
                  key={sub.subjectName}
                  className="flex-1 max-w-[130px] flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-16 bg-[#1E293B] text-white text-[11px] p-2 rounded-xl shadow-xl z-30 whitespace-nowrap text-center">
                    <p className="font-black">{sub.subjectName}</p>
                    <p className="text-blue-200 font-mono">
                      Promedio: {sub.subjectAverage} | Aprobados: {sub.passRate}%
                    </p>
                    <p className="text-[10px] text-slate-300">
                      Evaluados: {sub.totalEvaluated} alumnos
                    </p>
                  </div>

                  {/* Score label */}
                  <span className="font-mono text-xs font-black mb-1.5 text-[#1E293B] group-hover:scale-110 transition">
                    {sub.subjectAverage > 0 ? sub.subjectAverage : 'S/N'}
                  </span>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-xl transition-all duration-500 shadow-md flex flex-col justify-between p-1 relative overflow-hidden ${
                      isTop
                        ? 'bg-gradient-to-t from-[#1D4ED8] to-[#60A5FA] border-t-2 border-x-2 border-blue-400'
                        : isPassing
                        ? 'bg-gradient-to-t from-[#2563EB] to-[#3B82F6] border-t-2 border-x-2 border-blue-400'
                        : 'bg-gradient-to-t from-red-600 to-amber-500 border-t-2 border-x-2 border-red-400'
                    }`}
                  >
                    <div className="w-full h-1 bg-white/40 rounded-full" />
                  </div>

                  {/* Subject Title below bar */}
                  <div className="mt-2 text-center w-full">
                    <span className="text-[11px] font-black text-[#1E293B] block truncate" title={sub.subjectName}>
                      {sub.subjectName}
                    </span>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-1.5 py-0.2 rounded">
                      {sub.passRate}% Aprob.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Institutional Table: Materias, Profesores Asignados, Horarios y Métricas */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <h3 className="font-black text-sm text-[#1E293B] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2563EB]" />
              Matriz Institucional por Materia: Docentes, Horarios y Rendimiento
            </h3>
            <p className="text-xs text-[#475569] font-medium mt-0.5">
              Control de horarios de impartición, cobertura de matrícula y resultados por asignatura.
            </p>
          </div>
          <span className="text-xs font-bold text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded-lg">
            Estándar Oficial WCAG AA
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse bg-white">
            <thead>
              <tr className="bg-[#2563EB] text-white font-black text-[11px] uppercase tracking-wider">
                <th className="p-3">Materia</th>
                <th className="p-3">Docente(s) Asignado(s)</th>
                <th className="p-3">Horario Asignado</th>
                <th className="p-3 text-center">Alumnos</th>
                <th className="p-3 text-center">Promedio</th>
                <th className="p-3 text-center">Tasa Aprobación</th>
                <th className="p-3 text-center">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-[#1E293B]">
              {subjectAnalytics.map((sub) => {
                const teacher = sub.assignedTeachers[0];

                return (
                  <tr key={sub.subjectName} className="hover:bg-blue-50/40 transition">
                    <td className="p-3 font-bold text-sm text-[#1E293B]">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#2563EB]" />
                        <span>{sub.subjectName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      {sub.assignedTeachers.length > 0 ? (
                        <div className="space-y-0.5">
                          {sub.assignedTeachers.map((t) => (
                            <span key={t.id} className="block font-bold text-[#1E293B]">
                              {t.teacherName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-600 font-semibold italic">Sin profesor asignado</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {teacher?.scheduleTime ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          <Clock className="w-3 h-3 text-[#2563EB]" />
                          {teacher.scheduleTime}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No asignado</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">{sub.totalEvaluated}</td>
                    <td className="p-3 text-center font-mono font-black text-sm text-[#1E3A8A]">
                      {sub.subjectAverage > 0 ? sub.subjectAverage : '-'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          sub.passRate >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.passRate >= 60
                            ? 'bg-blue-100 text-[#1E3A8A]'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sub.passRate}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          sub.isCritical
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : sub.subjectAverage >= 8.5
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {sub.isCritical ? 'Requiere Refuerzo' : sub.subjectAverage >= 8.5 ? 'Excelente' : 'Satisfactorio'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
