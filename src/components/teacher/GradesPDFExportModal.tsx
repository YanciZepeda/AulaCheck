import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  School,
  Award,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileText,
  Calendar,
  User,
  Sliders,
  Check
} from 'lucide-react';
import { Institution, Student, PeriodGrades, TeacherProfile } from '../../types';

interface GradesPDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: PeriodGrades;
  students: Student[];
  gradeName: string;
  institution?: Institution | null;
  teacher?: TeacherProfile | null;
}

export const GradesPDFExportModal: React.FC<GradesPDFExportModalProps> = ({
  isOpen,
  onClose,
  period,
  students,
  gradeName,
  institution,
  teacher
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showObservationColumn, setShowObservationColumn] = useState<boolean>(true);
  const [showStatisticsSummary, setShowStatisticsSummary] = useState<boolean>(true);
  const [customNotes, setCustomNotes] = useState<string>(
    'Documento oficial emitido conforme a las directrices ministeriales de evaluación de los aprendizajes. Las calificaciones expresadas en escala de 0.0 a 10.0 reflejan las ponderaciones oficiales aprobadas.'
  );

  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  // Institution Branding Info
  const institutionName = institution?.name || 'Complejo Educativo San Salvador';
  const institutionTypeLabel =
    institution?.type === 'publica' ? 'Institución Oficial MINED' : 'Colegio Privado Autorizado';
  const infrastructureCode = institution?.infrastructureCode || 'INF-06123';
  const institutionCode = institution?.institutionCode || 'ESC-PUB-2026';
  const logoUrl = institution?.logoUrl;

  const teacherName = teacher?.teacherName || 'Docente Responsable de Asignatura';
  const teacherEmail = teacher?.teacherEmail || institution?.contactEmail || 'contacto@escuela.edu';
  const subjectName = period.subjectName;
  const periodNum = period.period;
  const criticalThreshold = period.criticalThreshold || 6.0;

  // Calculation per student
  const studentRows = students.map((st) => {
    let weightedSum = 0;
    let totalWeight = 0;

    const scores = period.activities.map((act) => {
      const g = period.grades.find((gr) => gr.studentId === st.id && gr.activityId === act.id);
      const score = g !== undefined ? g.score : 0;
      if (g !== undefined) {
        weightedSum += score * (act.percentage / 100);
        totalWeight += act.percentage;
      }
      return {
        activityId: act.id,
        score,
        hasScore: g !== undefined
      };
    });

    const average = totalWeight > 0 ? Number((weightedSum / (totalWeight / 100)).toFixed(1)) : 0;
    const isApproved = average >= criticalThreshold;
    const isHonors = average >= 9.0;
    const isCritical = average < criticalThreshold;

    let statusText = 'Regular';
    if (isHonors) statusText = 'Excelente (Honor)';
    else if (average >= 7.5) statusText = 'Muy Bueno';
    else if (isApproved) statusText = 'Aprobado';
    else statusText = 'Crítico / Refuerzo';

    return {
      student: st,
      scores,
      average,
      isApproved,
      isHonors,
      isCritical,
      statusText
    };
  });

  // Global Statistics
  const totalStudents = studentRows.length;
  const approvedCount = studentRows.filter((r) => r.isApproved).length;
  const criticalCount = studentRows.filter((r) => r.isCritical).length;
  const honorsCount = studentRows.filter((r) => r.isHonors).length;
  const approvalRate = totalStudents > 0 ? Math.round((approvedCount / totalStudents) * 100) : 0;

  const averageSum = studentRows.reduce((acc, r) => acc + r.average, 0);
  const groupAverage = totalStudents > 0 ? Number((averageSum / totalStudents).toFixed(2)) : 0;
  const highestAverage = totalStudents > 0 ? Math.max(...studentRows.map((r) => r.average)) : 0;
  const lowestAverage = totalStudents > 0 ? Math.min(...studentRows.map((r) => r.average)) : 0;

  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in-90">
      {/* Top Professional Toolbar (no-print) */}
      <header className="bg-slate-900 border-b border-slate-700 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg no-print">
        {/* Left: Document Info */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2563EB] rounded-2xl text-white shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              Reporte Oficial de Calificaciones en PDF
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                Con Logo Institucional
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {subjectName} • {gradeName} • Periodo {periodNum} • {institutionName}
            </p>
          </div>
        </div>

        {/* Center: Controls (Zoom & Customization) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              className="p-1 rounded-md text-slate-300 hover:text-white transition"
              title="Reducir zoom (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-200 min-w-11 text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="p-1 rounded-md text-slate-300 hover:text-white transition"
              title="Aumentar zoom (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 rounded-md text-slate-400 hover:text-white transition ml-0.5"
              title="Restablecer escala al 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Switches */}
          <button
            onClick={() => setShowStatisticsSummary(!showStatisticsSummary)}
            className={`px-3 py-1.5 rounded-xl font-bold border transition flex items-center gap-1.5 ${
              showStatisticsSummary
                ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Estadísticas
          </button>

          <button
            onClick={() => setShowSignatures(!showSignatures)}
            className={`px-3 py-1.5 rounded-xl font-bold border transition flex items-center gap-1.5 ${
              showSignatures
                ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            Firmas Oficiales
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
            title="Abrir ventana de impresión y guardar en formato PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Descargar PDF</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 bg-slate-950/80 p-4 sm:p-8 overflow-y-auto flex flex-col items-center">
        {/* Printable Sheet (Letter Landscape or Portrait) */}
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="w-full max-w-4xl"
        >
          <div
            ref={printAreaRef}
            className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 shadow-2xl border-2 border-slate-300 relative min-h-[1050px] space-y-6 print:shadow-none print:border-0 print:m-0 print:p-6 print:rounded-none page-break-after"
          >
            {/* =========================================================================
                1. ENCABEZADO INSTITUCIONAL CON LOGO DE LA INSTITUCIÓN
            ========================================================================= */}
            <div className="border-b-2 border-slate-300 pb-5 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Logo & Institution Details */}
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo Oficial Institucional"
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#1E3A8A]/20 shadow-md shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] text-white flex items-center justify-center shadow-md shrink-0 ring-2 ring-blue-200">
                      <School className="w-10 h-10 text-white" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 inline-block">
                      {institutionTypeLabel}
                    </span>
                    <h1 className="font-black text-xl sm:text-2xl text-[#1E293B] uppercase tracking-tight leading-tight">
                      {institutionName}
                    </h1>
                    <p className="text-xs text-[#475569] font-semibold">
                      Cód. Infraestructura MINED: <strong className="font-mono text-[#1E293B]">{infrastructureCode}</strong> • Código Oficial:{' '}
                      <strong className="font-mono text-[#2563EB]">{institutionCode}</strong>
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Contacto Oficial: {institution?.contactEmail || 'direccion@institucion.edu'}
                    </p>
                  </div>
                </div>

                {/* Badge Oficial de Evaluación */}
                <div className="bg-slate-50 border-2 border-[#1E3A8A] rounded-2xl p-3 text-center shrink-0 self-stretch sm:self-auto min-w-44 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1E3A8A] block">
                    Reporte Académico Oficial
                  </span>
                  <span className="text-lg font-black font-mono text-[#2563EB] block">
                    Periodo {periodNum}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                    Año Escolar 2026
                  </span>
                </div>
              </div>

              {/* Title & Course Metadata Row */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[#64748B] block text-[11px] font-bold">Asignatura:</span>
                  <span className="font-black text-[#1E3A8A] text-sm">{subjectName}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px] font-bold">Grado y Sección:</span>
                  <span className="font-black text-[#1E293B] text-sm">{gradeName}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px] font-bold">Docente Responsable:</span>
                  <span className="font-black text-[#1E293B] truncate block">{teacherName}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px] font-bold">Fecha de Emisión:</span>
                  <span className="font-bold text-[#1E293B]">{currentDate}</span>
                </div>
              </div>
            </div>

            {/* =========================================================================
                2. TABLA PRINCIPAL DE NOTAS ACADÉMICAS
            ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[#1E293B] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  Nómina de Calificaciones del Curso ({studentRows.length} Estudiantes Evaluados)
                </h3>
                <span className="text-[11px] font-bold text-[#1E3A8A] bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-lg">
                  Umbral Mínimo Aprobatorio: {criticalThreshold.toFixed(1)}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border-2 border-slate-300">
                <table className="w-full text-left text-xs border-collapse bg-white">
                  <thead>
                    <tr className="bg-[#1E3A8A] text-white border-b-2 border-blue-900 font-black uppercase text-[11px]">
                      <th className="p-2.5 w-10 text-center border-r border-blue-400/40 text-white font-black">
                        N°
                      </th>
                      <th className="p-2.5 min-w-[200px] border-r border-blue-400/40 text-white font-black">
                        Nombre Completo del Estudiante
                      </th>
                      <th className="p-2.5 w-24 border-r border-blue-400/40 text-white font-black">
                        NIE
                      </th>

                      {/* Columnas de actividades evaluadas */}
                      {period.activities.map((act) => (
                        <th
                          key={act.id}
                          className="p-2 text-center border-r border-blue-400/40 min-w-[95px] text-white font-black bg-[#2563EB]"
                        >
                          <span className="block truncate text-[11px]" title={act.name}>
                            {act.name}
                          </span>
                          <span className="text-[9px] text-blue-100 font-bold block">
                            {act.percentage}% {act.isExam && '• Examen'}
                          </span>
                        </th>
                      ))}

                      {/* Promedio Final */}
                      <th className="p-2.5 text-center bg-[#1E293B] text-white border-r border-slate-900 font-black w-24">
                        Promedio
                      </th>

                      {/* Estado */}
                      {showObservationColumn && (
                        <th className="p-2.5 text-center bg-[#2563EB] text-white font-black w-36">
                          Estado Académico
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 font-mono bg-white">
                    {studentRows.map((row) => (
                      <tr
                        key={row.student.id}
                        className={`hover:bg-blue-50/40 transition ${
                          row.isCritical ? 'bg-red-50/50' : row.isHonors ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center font-black text-[#1E3A8A] border-r border-slate-200">
                          {row.student.listNumber < 10
                            ? `0${row.student.listNumber}`
                            : row.student.listNumber}
                        </td>
                        <td className="p-2.5 font-sans font-bold text-[#1E293B] border-r border-slate-200">
                          {row.student.fullName}
                        </td>
                        <td className="p-2.5 font-bold text-[#475569] border-r border-slate-200">
                          {row.student.nie || 'N/A'}
                        </td>

                        {/* Notas por actividad */}
                        {row.scores.map((sc, sIdx) => (
                          <td
                            key={sIdx}
                            className={`p-2 text-center font-bold border-r border-slate-200 ${
                              sc.score < criticalThreshold
                                ? 'text-red-700 bg-red-50/60 font-black'
                                : sc.score >= 9.0
                                ? 'text-emerald-700 font-black'
                                : 'text-[#1E293B]'
                            }`}
                          >
                            {sc.hasScore ? sc.score.toFixed(1) : '-'}
                          </td>
                        ))}

                        {/* Promedio */}
                        <td
                          className={`p-2.5 text-center font-black border-r border-slate-200 text-sm ${
                            row.isCritical
                              ? 'text-red-700 bg-red-100/70 font-black'
                              : row.isHonors
                              ? 'text-emerald-700 bg-emerald-50 font-black'
                              : 'text-[#1E3A8A]'
                          }`}
                        >
                          {row.average.toFixed(1)}
                        </td>

                        {/* Estado */}
                        {showObservationColumn && (
                          <td className="p-2.5 text-center font-sans">
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block ${
                                row.isCritical
                                  ? 'bg-red-100 text-red-900 border border-red-300'
                                  : row.isHonors
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {row.statusText}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* =========================================================================
                3. RESUMEN ESTADÍSTICO DE RENDIMIENTO DEL CURSO
            ========================================================================= */}
            {showStatisticsSummary && (
              <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-black text-xs text-[#1E3A8A] uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#2563EB]" />
                    Resumen Estadístico y Diagnóstico Institucional
                  </h4>
                  <span className="text-[11px] font-bold text-[#475569]">
                    Total Alumnos: <strong>{totalStudents}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[#64748B] block text-[10px] font-bold">Promedio Grupal</span>
                    <span className="text-base font-black font-mono text-[#1E3A8A]">
                      {groupAverage.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[#64748B] block text-[10px] font-bold">Tasa de Aprobación</span>
                    <span className="text-base font-black font-mono text-emerald-700">
                      {approvalRate}% ({approvedCount}/{totalStudents})
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[#64748B] block text-[10px] font-bold">Cuadro de Honor (≥9.0)</span>
                    <span className="text-base font-black font-mono text-amber-600">
                      {honorsCount} estudiantes
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[#64748B] block text-[10px] font-bold">Alumnos en Refuerzo (&lt;6.0)</span>
                    <span
                      className={`text-base font-black font-mono ${
                        criticalCount > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {criticalCount} estudiantes
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[#64748B] block text-[10px] font-bold">Rango de Calificación</span>
                    <span className="text-base font-black font-mono text-[#1E293B]">
                      {lowestAverage.toFixed(1)} - {highestAverage.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                4. NOTAS LEGALES Y DIRECTRICES MINED
            ========================================================================= */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-[#334155] leading-relaxed">
              <strong className="text-[#1E3A8A] block mb-0.5">Disposiciones y Observaciones Oficiales:</strong>
              <p>{customNotes}</p>
            </div>

            {/* =========================================================================
                5. FIRMAS OFICIALES DE CONFORMIDAD
            ========================================================================= */}
            {showSignatures && (
              <div className="pt-10 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs text-[#475569]">
                <div>
                  <div className="border-b border-slate-400 w-44 mx-auto mb-1.5" />
                  <span className="font-black text-[#1E293B] block">{teacherName}</span>
                  <span className="text-[11px] text-[#64748B]">Firma del Docente de Asignatura</span>
                </div>

                <div>
                  <div className="border-b border-slate-400 w-44 mx-auto mb-1.5" />
                  <span className="font-black text-[#1E293B] block">Dirección Institucional</span>
                  <span className="text-[11px] text-[#64748B]">Sello y Firma de la Dirección</span>
                </div>

                <div>
                  <div className="border-b border-slate-400 w-44 mx-auto mb-1.5" />
                  <span className="font-black text-[#1E293B] block">Registro Académico</span>
                  <span className="text-[11px] text-[#64748B]">Validación y Archivo Escolar</span>
                </div>
              </div>
            )}

            {/* Footer Legal */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-[#64748B] font-semibold flex items-center justify-between">
              <span>{institutionName} • Sistema de Gestión Escolar Oficial EduControl Pro</span>
              <span>Página 1 de 1 • Registro Certificado</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Actions Bar (no-print) */}
      <footer className="bg-slate-900 border-t border-slate-800 text-white px-4 sm:px-6 py-3 flex items-center justify-between text-xs shrink-0 no-print">
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          <span>
            Documento listo para imprimir o guardar como PDF • {studentRows.length} alumnos matriculados
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-black transition flex items-center gap-2 shadow-md"
          >
            <Printer className="w-4 h-4" />
            Descargar PDF Ahora
          </button>
        </div>
      </footer>
    </div>
  );
};
