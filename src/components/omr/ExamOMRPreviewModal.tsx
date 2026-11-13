import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
// @ts-ignore - Ignoramos la advertencia de TypeScript por falta de @types/html2pdf.js
import html2pdf from 'html2pdf.js';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  QrCode,
  Key,
  Layers,
  Users,
  CheckCircle2,
  BookOpen,
  Info,
  Sparkles,
  Eye,
  FileCheck,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Student, FullCustomExam } from '../../types';

interface ExamOMRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: FullCustomExam;
  students: Student[];
  initialKeyId?: string;
  initialMode?: 'cuadernillo' | 'examen' | 'omr' | 'solucionario';
  qrCodeDataUrls?: Record<string, string>;
}

type PreviewDocMode = 'cuadernillo' | 'examen' | 'omr' | 'solucionario';

export const ExamOMRPreviewModal = ({
  isOpen,
  onClose,
  exam,
  students,
  initialKeyId = 'A',
  initialMode = 'cuadernillo',
  qrCodeDataUrls: initialQRs = {}
}: ExamOMRPreviewModalProps) => {
  const [docMode, setDocMode] = useState<PreviewDocMode>(initialMode);
  const [activeKeyId, setActiveKeyId] = useState<string>(initialKeyId);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students && students.length > 0 ? students[0].id : 'all');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [qrMap, setQrMap] = useState<Record<string, string>>(initialQRs);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const exportContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDocMode(initialMode);
      setActiveKeyId(initialKeyId);
      setCurrentPage(1);
    }
  }, [isOpen, initialMode, initialKeyId]);

  useEffect(() => {
    if (!isOpen || !exam || !students || students.length === 0) return;

    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      const studentsToProcess = selectedStudentId === 'all' ? students : students.filter((s) => s.id === selectedStudentId);

      for (const st of studentsToProcess) {
        const key = `${st.id}_${activeKeyId}`;
        if (!qrMap[key]) {
          const payload = JSON.stringify({
            studentId: st.id,
            studentName: st.fullName,
            nie: st.nie || 'N/A',
            subject: exam.subjectName,
            gradeId: exam.gradeId,
            examTitle: exam.examTitle,
            totalQuestions: exam.totalQuestions,
            keyId: activeKeyId
          });

          try {
            const url = await QRCode.toDataURL(payload, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 140
            });
            urls[key] = url;
          } catch (err) {
            console.error('Error generating QR for preview:', err);
          }
        }
      }

      if (Object.keys(urls).length > 0) {
        setQrMap((prev) => ({ ...prev, ...urls }));
      }
    };

    generateQRs();
  }, [isOpen, selectedStudentId, students, exam, activeKeyId, qrMap]);

  // Accesos seguros por si exam viene vacío en el primer milisegundo
  const currentKey = exam?.keys?.[activeKeyId] || exam?.keys?.['A'];

  const previewStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    if (selectedStudentId === 'all') return students;
    const found = students.find((s) => s.id === selectedStudentId);
    return found ? [found] : students.slice(0, 1);
  }, [students, selectedStudentId]);

  const pages = useMemo(() => {
    if (!exam || !currentKey) return [];
    
    const list: { type: 'examen' | 'omr' | 'solucionario'; student?: Student; title: string; }[] = [];

    if (docMode === 'examen') {
      list.push({ type: 'examen', title: `Examen Escrito - [${currentKey.keyName}]` });
    } else if (docMode === 'omr') {
      previewStudents.forEach((st) => {
        list.push({
          type: 'omr',
          student: st,
          title: `Hoja OMR - ${st.fullName} [${currentKey.keyName}]`
        });
      });
    } else if (docMode === 'cuadernillo') {
      previewStudents.forEach((st) => {
        list.push({
          type: 'omr',
          student: st,
          title: `Pág. 1: Hoja de Respuestas OMR - ${st.fullName} [${currentKey.keyName}]`
        });
        list.push({
          type: 'examen',
          student: st,
          title: `Pág. 2+: Cuestionario de Preguntas - [${currentKey.keyName}]`
        });
      });
    } else if (docMode === 'solucionario') {
      list.push({
        type: 'solucionario',
        title: `Solucionario Oficial - Todas las Claves`
      });
    }

    return list;
  }, [docMode, previewStudents, currentKey, exam]);

  const activePageIndex = Math.max(0, Math.min(currentPage - 1, pages.length > 0 ? pages.length - 1 : 0));
  const activePage = pages[activePageIndex];

  if (!isOpen || !exam) return null;

  const handleDownloadPDF = async () => {
    if (!exportContainerRef.current) return;
    setIsGeneratingPDF(true);

    const filename = `${exam.subjectName.replace(/\s+/g, '_')}_${docMode}_Clave_${currentKey?.keyName || 'A'}.pdf`;

    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      const opt: any = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(exportContainerRef.current).save();
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(pages.length, prev + 1));

  const renderDocumentPage = (page: typeof activePage, isExport = false) => {
    if (!page || !currentKey) return null;

    const containerClass = isExport
      ? "w-[816px] min-h-[1056px] relative p-12 bg-white text-slate-900 mx-auto"
      : "bg-white text-slate-900 rounded-xl p-8 sm:p-12 shadow-2xl border-2 border-slate-300 relative min-h-[960px] page-break-after print:shadow-none print:border-0 print:p-0";

    if (page.type === 'examen') {
      return (
        <div className={containerClass}>
          <div className="border-b-2 border-slate-300 pb-4 space-y-1.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {exam.institutionName}
                </span>
                <h1 className="font-black text-xl text-[#1E293B] uppercase mt-1 leading-tight">
                  {exam.examTitle}
                </h1>
                <p className="text-xs font-bold text-[#1E3A8A]">
                  Materia: {exam.subjectName} - Grado: {exam.gradeName} - Periodo {exam.periodNum}
                </p>
              </div>

              <div className="text-center bg-blue-50 border-2 border-[#2563EB] px-3.5 py-1.5 rounded-xl">
                <span className="text-[10px] font-bold text-[#1E3A8A] block uppercase tracking-wider">
                  Clave Asignada
                </span>
                <span className="text-lg font-black font-mono text-[#2563EB]">
                  [{currentKey.keyName.toUpperCase()}]
                </span>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold border-t border-slate-200">
              <div className="border-b border-slate-400 pb-0.5">
                Alumno(a): <strong>{page.student?.fullName || '_______________________________________'}</strong>
              </div>
              <div className="border-b border-slate-400 pb-0.5">
                NIE: <strong className="font-mono">{page.student?.nie || '___________'}</strong>
              </div>
            </div>
          </div>

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#334155] leading-relaxed">
            <strong className="text-[#1E293B]">Instrucciones:</strong> Lea cuidadosamente cada una de las siguientes {exam.totalQuestions} preguntas. Rellene la opción correcta en la Hoja OMR adjunta correspondiente a la <strong>[{currentKey.keyName}]</strong>.
          </div>

          <div className="space-y-4">
            {currentKey.questions.map((q) => (
              <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-[#1E3A8A] font-black text-xs flex items-center justify-center shrink-0">
                      {q.questionNumber}
                    </span>
                    <span className="font-bold text-[#1E293B] leading-snug">
                      {q.questionText}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-medium bg-slate-100 px-2 py-0.5 rounded shrink-0">
                    {q.topic}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div key={opt} className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full border border-slate-400 bg-white text-[#1E293B] font-black text-[10px] flex items-center justify-center shrink-0">
                        {opt}
                      </span>
                      <span className="text-[#334155] font-medium leading-tight">
                        {q.options[opt as keyof typeof q.options]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 mt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-6 text-center text-xs text-[#475569]">
            <div>
              <div className="border-b border-slate-400 w-44 mx-auto mb-1" />
              <span className="font-bold">Firma del Docente</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-44 mx-auto mb-1" />
              <span className="font-bold">Nota Obtenida</span>
            </div>
          </div>
        </div>
      );
    }

    if (page.type === 'omr') {
      return (
        <div className={containerClass}>
          <div
            onMouseEnter={() => !isExport && setHoveredFeature('Marcador Fiduciario Superior Izquierdo: Cuadro negro de 12mm x 12mm')}
            onMouseLeave={() => !isExport && setHoveredFeature(null)}
            className="absolute top-5 left-5 w-7 h-7 bg-black rounded-xs shadow-xs cursor-help hover:ring-2 hover:ring-blue-500 transition" />
          <div className="absolute top-5 right-5 w-7 h-7 bg-black rounded-xs shadow-xs cursor-help hover:ring-2 hover:ring-blue-500 transition" />
          <div className="absolute bottom-5 left-5 w-7 h-7 bg-black rounded-xs shadow-xs cursor-help hover:ring-2 hover:ring-blue-500 transition" />
          <div className="absolute bottom-5 right-5 w-7 h-7 bg-black rounded-xs shadow-xs cursor-help hover:ring-2 hover:ring-blue-500 transition" />

          <div className="px-6 py-2 space-y-4">
            <div className="flex items-start justify-between border-b-2 border-slate-300 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {exam.institutionName}
                </span>
                <h2 className="font-black text-base text-[#1E293B]">
                  HOJA DE RESPUESTAS ÓPTICAS (OMR)
                </h2>
                <p className="text-xs font-bold text-[#1E3A8A]">
                  {exam.subjectName} - {exam.gradeName} [{currentKey.keyName.toUpperCase()}]
                </p>
                <div className="text-[11px] text-[#334155] font-semibold pt-1">
                  Alumno: <strong>{page.student?.fullName || 'Estudiante General'}</strong> | NIE: <strong>{page.student?.nie || 'N/A'}</strong>
                </div>
              </div>

              <div
                onMouseEnter={() => !isExport && setHoveredFeature(`Código QR Único: Contiene JSON con ID de estudiante (${page.student?.id || 'ID'})`)}
                onMouseLeave={() => !isExport && setHoveredFeature(null)}
                className="p-1.5 bg-white border-2 border-slate-300 rounded-xl shadow-xs shrink-0 cursor-help hover:border-blue-500 transition"
              >
                {page.student && qrMap[`${page.student.id}_${activeKeyId}`] ? (
                  <img src={qrMap[`${page.student.id}_${activeKeyId}`]} alt="QR Code" className="w-20 h-20 object-contain" />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                    QR...
                  </div>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#334155]">
              <strong>Instrucciones OMR:</strong> Rellene completamente con lápiz oscuro la burbuja correspondiente [●]. No doble la hoja ni marque sobre las 4 esquinas negras.
            </div>

            <div className="p-5 bg-slate-50/70 rounded-2xl border-2 border-slate-200">
              <div className="text-center font-black text-xs text-[#1E3A8A] uppercase tracking-wider mb-4">
                Matriz de Burbujas • {exam.totalQuestions} Preguntas (A - D)
              </div>
              <div className={`grid ${exam.totalQuestions > 10 ? 'grid-cols-2 gap-x-10' : 'grid-cols-1'} gap-y-3`}>
                {Array.from({ length: exam.totalQuestions }).map((_, qIdx) => {
                  const qNum = qIdx + 1;
                  return (
                    <div key={qNum} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition">
                      <span className="font-mono font-black text-xs text-[#1E293B] w-8 text-right pr-2">
                        {qNum < 10 ? `0${qNum}` : qNum}.
                      </span>
                      <div className="flex items-center gap-3">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div key={opt} className="w-6 h-6 rounded-full border-2 border-[#1E293B] bg-white flex items-center justify-center text-[11px] font-black text-[#1E293B] hover:bg-blue-100 transition cursor-pointer select-none">
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-2 text-center text-[10px] text-[#64748B] font-semibold border-t border-slate-200">
              EduControl Pro OMR System • Hoja con marcadores fiduciarios y QR para calibración de cámara web / móvil
            </div>
          </div>
        </div>
      );
    }

    if (page.type === 'solucionario') {
      return (
        <div className={containerClass}>
          <div className="border-b-2 border-slate-300 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                Uso Exclusivo del Docente
              </span>
              <h1 className="font-black text-lg text-[#1E293B] uppercase mt-1">
                SOLUCIONARIO OFICIAL Y HOJA CONTESTADA • {exam.subjectName}
              </h1>
              <p className="text-xs font-bold text-[#2563EB]">
                {exam.examTitle} - Periodo {exam.periodNum} - {exam.gradeName} - Clave Visualizada: [{currentKey.keyName.toUpperCase()}]
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 px-3 py-1 rounded-xl">
                {Object.keys(exam.keys).length} Claves
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border-2 border-emerald-300 my-4">
            <div className="flex items-center justify-between mb-3 border-b border-emerald-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
                <h3 className="font-black text-xs uppercase tracking-wider text-emerald-950">
                  Hoja de Respuestas Contestada Oficial • [{currentKey.keyName.toUpperCase()}]
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Burbuja Rellena = Respuesta Correcta
              </span>
            </div>
            <div className={`grid ${exam.totalQuestions > 10 ? 'grid-cols-2 gap-x-8' : 'grid-cols-1'} gap-y-2`}>
              {Array.from({ length: exam.totalQuestions }).map((_, qIdx) => {
                const qNum = qIdx + 1;
                const correctLetter = currentKey.answerKey[qNum] || 'A';
                return (
                  <div key={qNum} className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="font-mono font-black text-xs text-emerald-950 w-8 text-right pr-2">
                      {qNum < 10 ? `0${qNum}` : qNum}.
                    </span>
                    <div className="flex items-center gap-2.5">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const isCorrect = opt === correctLetter;
                        return (
                          <div
                            key={opt}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition ${isCorrect
                                ? 'bg-slate-900 text-white border-2 border-slate-900 ring-2 ring-emerald-400 font-bold shadow-xs'
                                : 'border-2 border-slate-300 text-slate-400 bg-slate-50'}`}
                          >
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-black text-xs text-[#1E293B] uppercase tracking-wider mb-2">
              Tabla Comparativa de Respuestas Correctas por Clave
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#1E3A8A] text-white font-black uppercase text-[11px]">
                    <th className="p-2.5 w-14 text-center border-r border-blue-400/40">N°</th>
                    <th className="p-2.5 border-r border-blue-400/40">Tema Evaluado</th>
                    {Object.keys(exam.keys).map((kId) => (
                      <th key={kId} className="p-2.5 text-center border-r border-blue-400/40 last:border-r-0">
                        Clave {kId}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {Array.from({ length: exam.totalQuestions }).map((_, qIdx) => {
                    const qNum = qIdx + 1;
                    const baseQ = currentKey.questions[qIdx] || exam.keys['A']?.questions[qIdx];
                    return (
                      <tr key={qNum} className="hover:bg-slate-50 transition">
                        <td className="p-2 text-center font-mono font-black text-[#1E3A8A] border-r border-slate-200">
                          {qNum < 10 ? `0${qNum}` : qNum}
                        </td>
                        <td className="p-2 font-semibold text-[#1E293B] border-r border-slate-200">
                          {baseQ?.topic || `Pregunta ${qNum}`}
                        </td>
                        {Object.keys(exam.keys).map((kId) => {
                          const ans = exam.keys[kId].answerKey[qNum];
                          return (
                            <td key={kId} className="p-2 text-center font-black border-r border-slate-200 last:border-r-0">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-[#1E3A8A] border border-blue-300 font-mono text-[11px] flex items-center justify-center mx-auto shadow-2xs">
                                {ans}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in-90">

      {/* Contenedor Oculto para exportación del PDF completo */}
      <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0 z-[-1]" aria-hidden="true">
        <div ref={exportContainerRef}>
          {pages.map((p, idx) => (
            <div key={idx} style={{ pageBreakAfter: 'always' }}>
              {renderDocumentPage(p, true)}
            </div>
          ))}
        </div>
      </div>

      <header className="bg-slate-900 border-b border-slate-700 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2563EB] rounded-xl text-white shadow-xs">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              Vista Previa de Impresión y Descarga PDF
              <span className="text-[10px] font-mono font-bold bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md">
                100% Escala OMR
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {exam.subjectName} - {exam.gradeName} - {exam.examTitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => { setDocMode('cuadernillo'); setCurrentPage(1); } } className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${docMode === 'cuadernillo' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}>
              <Layers className="w-3.5 h-3.5" /> Todo
            </button>
            <button onClick={() => { setDocMode('examen'); setCurrentPage(1); } } className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${docMode === 'examen' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}>
              <FileText className="w-3.5 h-3.5" /> Examen
            </button>
            <button onClick={() => { setDocMode('omr'); setCurrentPage(1); } } className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${docMode === 'omr' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}>
              <QrCode className="w-3.5 h-3.5" /> OMR
            </button>
            <button onClick={() => { setDocMode('solucionario'); setCurrentPage(1); } } className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${docMode === 'solucionario' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}>
              <Key className="w-3.5 h-3.5" /> Solucionario
            </button>
          </div>

          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 font-bold px-1.5">Clave:</span>
            {Object.keys(exam.keys).map((kId) => (
              <button key={kId} onClick={() => setActiveKeyId(kId)} className={`px-2 py-0.5 rounded-lg font-black transition ${activeKeyId === kId ? 'bg-amber-500 text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'}`}>
                {kId}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => setZoomLevel((z) => Math.max(60, z - 15))} className="p-1 rounded-md text-slate-300 hover:text-white transition">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-200 min-w-11 text-center">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel((z) => Math.min(150, z + 15))} className="p-1 rounded-md text-slate-300 hover:text-white transition">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoomLevel(100)} className="p-1 rounded-md text-slate-400 hover:text-white transition ml-0.5">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            title="Generar y descargar el PDF localmente"
          >
            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-48 bg-slate-900/90 border-r border-slate-800 p-3 overflow-y-auto space-y-3 shrink-0 hidden md:block no-print">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Páginas ({pages.length})</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">Carta</span>
          </div>

          {pages.map((p, idx) => {
            const pageNum = idx + 1;

            return (
              <div
                key={idx}
                onClick={() => setCurrentPage(pageNum)}
                className={`group cursor-pointer rounded-xl p-2 border-2 transition ${currentPage === pageNum ? 'border-[#2563EB] bg-blue-950/40 shadow-md' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'}`}
              >
                <div className="aspect-[8.5/11] bg-white rounded-md shadow-xs p-1.5 flex flex-col justify-between text-[6px] text-slate-700 overflow-hidden relative border border-slate-300">
                  {p.type === 'omr' && (
                    <>
                      <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-black" />
                      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-black" />
                      <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 bg-black" />
                      <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-black" />
                    </>
                  )}
                  <div className="font-bold border-b border-slate-200 pb-0.5 truncate text-slate-900">
                    {p.type === 'examen' ? 'EXAMEN' : p.type === 'omr' ? 'HOJA OMR' : 'SOLUCIONARIO'}
                  </div>
                  <div className="space-y-0.5 my-auto">
                    <div className="h-0.5 bg-slate-300 rounded w-full" />
                    <div className="h-0.5 bg-slate-200 rounded w-4/5" />
                    <div className="h-0.5 bg-slate-200 rounded w-3/5" />
                  </div>
                  <div className="text-[5px] text-slate-400 font-mono text-center">
                    Pág. {pageNum}
                  </div>
                </div>

                <div className="mt-1.5 text-center">
                  <span className={`text-[10px] font-bold block truncate ${currentPage === pageNum ? 'text-blue-300' : 'text-slate-400'}`}>
                    {pageNum}. {p.type === 'examen' ? 'Examen' : p.type === 'omr' ? 'Hoja OMR' : 'Clave'}
                  </span>
                  {p.student && (
                    <span className="text-[9px] text-slate-500 block truncate">
                      {p.student.fullName.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </aside>

        <main
          ref={previewContainerRef}
          className="flex-1 bg-slate-950/80 p-4 sm:p-8 overflow-y-auto flex flex-col items-center space-y-6"
        >
          {hoveredFeature && (
            <div className="fixed top-18 z-40 bg-[#1E293B] text-white border-2 border-blue-400/80 px-4 py-2 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-top-2 no-print">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>{hoveredFeature}</span>
            </div>
          )}

          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }} className="w-full max-w-3xl">
            {renderDocumentPage(activePage, false)}
          </div>
        </main>
      </div>

      <footer className="bg-slate-900 border-t border-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs shrink-0 no-print">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span>{activePage?.title || `Página ${currentPage} de ${pages.length}`}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrevPage} disabled={currentPage <= 1} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono font-bold text-slate-200 px-2">
            Página {currentPage} / {pages.length}
          </span>
          <button onClick={handleNextPage} disabled={currentPage >= pages.length} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm">
            {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isGeneratingPDF ? 'Generando...' : 'Descargar Todo'}
          </button>
        </div>
      </footer>
    </div>
  );
};