import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  FileCode,
  Download,
  Users,
  Sparkles,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  FileSpreadsheet,
  Upload,
  BookOpen,
  Key,
  HelpCircle,
  Layers,
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  Award,
  Eye,
  Brain,
  Wand2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student, FullCustomExam } from '../../types';
import {
  parseExamTopicsFile,
  DEFAULT_SUBJECT_TOPICS,
  generateCustomExam,
  generatePythonExamScript
} from '../../utils/examGenerator';
import { requestAIExamGeneration } from '../../utils/aiExamService';
import { ExamOMRPreviewModal } from './ExamOMRPreviewModal';

interface BubbleSheetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradeId: string;
  subjectName: string;
  activityName?: string;
  activityId?: string;
  teacherName?: string;
}

type ModalViewTab = 'config' | 'examen' | 'omr' | 'cuadernillo' | 'solucionario' | 'python';

export const BubbleSheetGeneratorModal: React.FC<BubbleSheetGeneratorModalProps> = ({
  isOpen,
  onClose,
  gradeId,
  subjectName,
  activityName = 'Examen de Periodo',
  activityId = 'act-3',
  teacherName
}) => {
  const { students, activeInstitution, showToast } = useApp();

  const gradeStudents = useMemo(() => {
    const list = students.filter(
      (s) => s.gradeId === gradeId && s.institutionCode === (activeInstitution?.institutionCode || 'ESC-PUB-2026')
    );
    return list.sort((a, b) => (a.listNumber || 0) - (b.listNumber || 0));
  }, [students, gradeId, activeInstitution]);

  const gradeName = activeInstitution?.gradeLevels.find((g) => g.id === gradeId)?.name || 'Primer Grado';

  // Active view tab in modal
  const [activeTab, setActiveTab] = useState<ModalViewTab>('config');

  // Exam generator parameters
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [numberOfKeys, setNumberOfKeys] = useState<number>(3); // 1, 2, 3, or 4 keys
  const [activeKeyId, setActiveKeyId] = useState<string>('A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');

  // Topics state
  const [topics, setTopics] = useState<string[]>(
    DEFAULT_SUBJECT_TOPICS[subjectName] || [
      'Conceptos Fundamentales',
      'Resolución de Problemas y Aplicación',
      'Análisis de Casos y Procedimientos'
    ]
  );
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [newTopicInput, setNewTopicInput] = useState<string>('');

  // Generated exam state
  const [customExam, setCustomExam] = useState<FullCustomExam | null>(null);

  // QR Codes map (studentId_keyId -> DataURL)
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [copiedPython, setCopiedPython] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initial exam generation or when switching grade/subject
  useEffect(() => {
    if (!isOpen) return;

    const initialTopics = DEFAULT_SUBJECT_TOPICS[subjectName] || [
      'Conceptos Fundamentales de ' + subjectName,
      'Procedimientos y Métodos',
      'Análisis y Solución de Problemas'
    ];
    setTopics(initialTopics);

    const generated = generateCustomExam({
      institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
      gradeName,
      gradeId,
      subjectName,
      examTitle: activityName,
      periodNum: 1,
      date: new Date().toISOString().split('T')[0],
      totalQuestions: 10,
      topics: initialTopics,
      keyCount: 3
    });
    setCustomExam(generated);
    setActiveKeyId('A');
    setActiveTab('config');
  }, [isOpen, subjectName, gradeId, gradeName, activityName, activeInstitution]);

  // AI generation states
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiGenerationStatus, setAiGenerationStatus] = useState<string>('');
  const [examDifficulty, setExamDifficulty] = useState<'básico' | 'intermedio' | 'avanzado'>('intermedio');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Real AI generation with Gemini 3.8 Flash
  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    setAiGenerationStatus('Consultando Gemini 3.8 Flash con los temas ingresados...');
    try {
      const result = await requestAIExamGeneration({
        institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
        gradeName,
        gradeId,
        subjectName,
        examTitle: activityName,
        periodNum: 1,
        totalQuestions,
        topics,
        keyCount: numberOfKeys,
        difficulty: examDifficulty,
        customInstructions,
        sourceFileName: uploadedFileName || undefined
      });

      setCustomExam(result.exam);
      if (!result.exam.keys[activeKeyId]) {
        setActiveKeyId('A');
      }
      showToast(
        result.isAIGenerated ? '¡Examen Diseñado con Inteligencia Artificial!' : 'Examen Generado con Éxito',
        result.message || 'Evaluación pedagógica y solucionario creados con éxito.',
        'success'
      );
      setActiveTab('examen');
    } catch (err: any) {
      showToast('Error de Generación', err.message || 'No se pudo generar el examen.', 'alert');
    } finally {
      setIsGeneratingAI(false);
      setAiGenerationStatus('');
    }
  };

  // Regenerate exam with local structured generator (secondary fallback)
  const handleRegenerateExam = () => {
    const generated = generateCustomExam({
      institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
      gradeName,
      gradeId,
      subjectName,
      examTitle: activityName,
      periodNum: 1,
      date: new Date().toISOString().split('T')[0],
      totalQuestions,
      topics,
      sourceFileName: uploadedFileName || undefined,
      keyCount: numberOfKeys
    });
    setCustomExam(generated);
    if (!generated.keys[activeKeyId]) {
      setActiveKeyId('A');
    }
  };

  // Handle file upload for syllabus / topics
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setParseError(null);

    try {
      const result = await parseExamTopicsFile(file);
      if (result.topics.length === 0) {
        setParseError('No se encontraron temas en el archivo. Por favor verifica el formato.');
      } else {
        setTopics(result.topics);
        setUploadedFileName(result.fileName);

        // Auto-regenerate custom exam with newly parsed topics
        const generated = generateCustomExam({
          institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
          gradeName,
          gradeId,
          subjectName,
          examTitle: activityName,
          periodNum: 1,
          date: new Date().toISOString().split('T')[0],
          totalQuestions,
          topics: result.topics,
          sourceFileName: result.fileName,
          keyCount: numberOfKeys
        });
        setCustomExam(generated);
        setActiveTab('examen'); // Jump to preview
      }
    } catch (err: any) {
      setParseError(err.message || 'Error al procesar el archivo');
    } finally {
      setIsParsingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // Add a topic manually
  const handleAddTopic = () => {
    if (!newTopicInput.trim()) return;
    setTopics((prev) => [...prev, newTopicInput.trim()]);
    setNewTopicInput('');
  };

  // Remove a topic
  const handleRemoveTopic = (indexToRemove: number) => {
    setTopics((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Reset topics to curriculum defaults
  const handleResetTopics = () => {
    const defaultList = DEFAULT_SUBJECT_TOPICS[subjectName] || [
      'Conceptos Fundamentales de ' + subjectName,
      'Procedimientos y Métodos',
      'Resolución de Problemas'
    ];
    setTopics(defaultList);
    setUploadedFileName('');
    setParseError(null);
  };

  // Generate QR codes for all students for the active key
  useEffect(() => {
    if (!isOpen || !customExam) return;

    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      const studentsToProcess = selectedStudentId === 'all' ? gradeStudents : gradeStudents.filter((s) => s.id === selectedStudentId);

      for (const st of studentsToProcess) {
        const payload = JSON.stringify({
          studentId: st.id,
          studentName: st.fullName,
          nie: st.nie || 'N/A',
          activityId: activityId,
          subject: subjectName,
          gradeId: gradeId,
          examTitle: activityName,
          totalQuestions: customExam.totalQuestions,
          keyId: activeKeyId,
          instCode: activeInstitution?.institutionCode || 'ESC-PUB-2026'
        });

        try {
          const url = await QRCode.toDataURL(payload, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 140
          });
          urls[`${st.id}_${activeKeyId}`] = url;
        } catch (err) {
          console.error('Error generando código QR:', err);
        }
      }
      setQrCodeDataUrls((prev) => ({ ...prev, ...urls }));
    };

    generateQRs();
  }, [isOpen, selectedStudentId, gradeStudents, activityId, activityName, subjectName, gradeId, customExam, activeKeyId, activeInstitution]);

  if (!isOpen || !customExam) return null;

  const currentKey = customExam.keys[activeKeyId] || customExam.keys['A'];
  const studentsToRender = selectedStudentId === 'all' ? gradeStudents : gradeStudents.filter((s) => s.id === selectedStudentId);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPythonScript = () => {
    const script = generatePythonExamScript(customExam, activeKeyId);
    navigator.clipboard.writeText(script);
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl max-w-5xl w-full border-2 border-slate-200 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 max-h-[95vh] flex flex-col">
        {/* Header - Azul Rey Institucional (no-print) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-between shrink-0 shadow-md no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl border border-white/30 shadow-xs">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                Generador de Exámenes y Hojas OMR
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-900 px-2 py-0.5 rounded-full">
                  Nuevo • Con Excel / Documento
                </span>
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                {subjectName} • {gradeName} • {activityName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs (no-print) */}
        <div className="bg-slate-100 px-4 pt-2.5 border-b-2 border-slate-200 flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-bold shrink-0 no-print">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-3 sm:px-4 rounded-t-xl flex items-center gap-1.5 transition ${
              activeTab === 'config'
                ? 'bg-white text-[#2563EB] border-t-2 border-x-2 border-slate-200 font-black shadow-xs'
                : 'text-[#475569] hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#2563EB]" />
            1. Temas & Archivo Excel
          </button>

          <button
            onClick={() => setActiveTab('examen')}
            className={`py-2 px-3 sm:px-4 rounded-t-xl flex items-center gap-1.5 transition ${
              activeTab === 'examen'
                ? 'bg-white text-[#2563EB] border-t-2 border-x-2 border-slate-200 font-black shadow-xs'
                : 'text-[#475569] hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            2. Examen Escrito (Preguntas)
          </button>

          <button
            onClick={() => setActiveTab('omr')}
            className={`py-2 px-3 sm:px-4 rounded-t-xl flex items-center gap-1.5 transition ${
              activeTab === 'omr'
                ? 'bg-white text-[#2563EB] border-t-2 border-x-2 border-slate-200 font-black shadow-xs'
                : 'text-[#475569] hover:bg-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            3. Hoja de Burbujas OMR (QR)
          </button>

          <button
            onClick={() => setActiveTab('cuadernillo')}
            className={`py-2 px-3 sm:px-4 rounded-t-xl flex items-center gap-1.5 transition ${
              activeTab === 'cuadernillo'
                ? 'bg-white text-[#2563EB] border-t-2 border-x-2 border-slate-200 font-black shadow-xs'
                : 'text-[#475569] hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            4. Cuadernillo Completo
          </button>

          <button
            onClick={() => setActiveTab('solucionario')}
            className={`py-2 px-3 sm:px-4 rounded-t-xl flex items-center gap-1.5 transition ${
              activeTab === 'solucionario'
                ? 'bg-white text-[#2563EB] border-t-2 border-x-2 border-slate-200 font-black shadow-xs'
                : 'text-[#475569] hover:bg-slate-200'
            }`}
          >
            <Key className="w-4 h-4 text-purple-600" />
            5. Solucionario Docente
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`py-2 px-3 sm:px-4 rounded-t-xl flex items-center gap-1.5 transition ${
              activeTab === 'python'
                ? 'bg-white text-[#2563EB] border-t-2 border-x-2 border-slate-200 font-black shadow-xs'
                : 'text-[#475569] hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4 text-slate-700" />
            Script Python
          </button>
        </div>

        {/* Global Action Toolbar (no-print) */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            {/* Clave activa selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300">
              <span className="text-[11px] font-black text-[#1E293B] px-1.5 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#2563EB]" />
                Clave Activa:
              </span>
              {Object.keys(customExam.keys).map((kId) => (
                <button
                  key={kId}
                  type="button"
                  onClick={() => setActiveKeyId(kId)}
                  className={`px-2.5 py-1 rounded-lg font-black transition ${
                    activeKeyId === kId
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-[#1E293B] hover:bg-slate-200'
                  }`}
                >
                  Clave {kId}
                </button>
              ))}
            </div>

            {/* Selector de estudiante para hojas OMR */}
            {(activeTab === 'omr' || activeTab === 'cuadernillo') && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-[#475569]">Destinatario:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#1E293B]"
                >
                  <option value="all">📁 Todos los Alumnos ({gradeStudents.length} Hojas)</option>
                  {gradeStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.listNumber ? `${st.listNumber}. ` : ''}{st.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
              title="Previsualizar el examen y las hojas OMR en formato PDF antes de descargar"
            >
              <Eye className="w-4 h-4" />
              Vista Previa PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar en PDF
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
          {/* =========================================================================
              TAB 1: CONFIGURAR EXAMEN Y SUBIR ARCHIVO (EXCEL / DOCUMENTO)
          ========================================================================= */}
          {activeTab === 'config' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Banner informativo */}
              <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-start gap-3 text-xs">
                <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-[#1E3A8A] text-sm">
                    Generación Automática de Examen y Hojas OMR
                  </h4>
                  <p className="text-[#334155] font-medium mt-0.5 leading-relaxed">
                    Sube un archivo de Excel (.xlsx, .xls), CSV o documento de texto con los contenidos vistos en el periodo. El sistema creará un examen personalizado con preguntas de opción múltiple (A, B, C, D), sus correspondientes hojas de burbujas OMR con códigos QR y los solucionarios oficiales para cada clave.
                  </p>
                </div>
              </div>

              {/* Parametros de Generación: Cantidad de Preguntas y Claves */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
                <h4 className="font-black text-sm text-[#1E293B] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#2563EB]" />
                  Parámetros del Examen
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Cantidad de Preguntas (Máximo 20) */}
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] mb-1.5">
                      Cantidad de Preguntas: <span className="text-[#2563EB] font-black font-mono text-sm">({totalQuestions} preguntas)</span>
                      <span className="text-[10px] text-[#64748B] block font-normal">Máximo permitido: 20 preguntas</span>
                    </label>

                    {/* Presets rápidos */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setTotalQuestions(num);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black transition ${
                            totalQuestions === num
                              ? 'bg-[#2563EB] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-[#1E293B] border border-slate-300'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    {/* Selector de número exacto 1 a 20 */}
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(Number(e.target.value))}
                        className="w-full accent-[#2563EB] cursor-pointer"
                      />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(Math.min(20, Math.max(1, Number(e.target.value))))}
                        className="w-14 px-2 py-1 rounded-lg border-2 border-slate-300 text-center font-mono font-black text-xs"
                      />
                    </div>
                  </div>

                  {/* Número de Claves Diferentes */}
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] mb-1.5">
                      Variación de Claves: <span className="text-[#2563EB] font-black font-mono text-sm">({numberOfKeys} Claves)</span>
                      <span className="text-[10px] text-[#64748B] block font-normal">Permuta preguntas y opciones para evitar copias</span>
                    </label>

                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { count: 1, label: '1 (A)' },
                        { count: 2, label: '2 (A, B)' },
                        { count: 3, label: '3 (A, B, C)' },
                        { count: 4, label: '4 (A-D)' }
                      ].map((item) => (
                        <button
                          key={item.count}
                          type="button"
                          onClick={() => setNumberOfKeys(item.count)}
                          className={`py-2 rounded-xl text-xs font-black transition ${
                            numberOfKeys === item.count
                              ? 'bg-[#2563EB] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-[#1E293B] border border-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dificultad e Instrucciones Especiales para la IA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-[#1E293B] mb-1">
                      Nivel de Dificultad Pedagógica:
                    </label>
                    <select
                      value={examDifficulty}
                      onChange={(e) => setExamDifficulty(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#1E293B] outline-none"
                    >
                      <option value="básico">Básico (Comprensión y Memoria)</option>
                      <option value="intermedio">Intermedio (Aplicación y Razonamiento)</option>
                      <option value="avanzado">Avanzado (Análisis Crítico y Casos)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#1E293B] mb-1">
                      Instrucciones Pedagógicas para la IA (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Contextualizar en situaciones cotidianas, incluir ejercicios de lógica, etc."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-[#1E293B] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Subir Archivo Excel o Documento */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-[#1E293B] flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Subir Temas del Periodo (Excel, CSV o Documento)
                  </h4>

                  {uploadedFileName && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {uploadedFileName}
                    </span>
                  )}
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 hover:border-[#2563EB] bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 text-center cursor-pointer transition space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .txt, .pdf, .docx, .doc"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-blue-200 flex items-center justify-center mx-auto text-[#2563EB]">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="text-xs font-black text-[#1E3A8A]">
                      Haz clic para seleccionar o arrastra tu archivo aquí
                    </span>
                    <p className="text-[11px] text-[#475569] font-medium">
                      Formatos soportados: Excel (.xlsx, .xls), CSV (.csv), Documento de texto (.txt)
                    </p>
                  </div>
                </div>

                {isParsingFile && (
                  <div className="p-3 bg-blue-50 text-[#1E3A8A] rounded-xl text-xs font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Leyendo contenidos del archivo...
                  </div>
                )}

                {parseError && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {parseError}
                  </div>
                )}

                {/* Lista de temas actuales */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#1E293B]">
                      Temas a evaluar en el examen ({topics.length} temas activos):
                    </label>

                    <button
                      type="button"
                      onClick={handleResetTopics}
                      className="text-[11px] text-[#2563EB] hover:underline font-bold"
                    >
                      Restablecer al Currículo Oficial
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {topics.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-[#1E293B] shadow-2xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(idx)}
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Eliminar tema"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Agregar tema manual */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Escribe un tema nuevo y presiona Enter o Agregar..."
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTopic();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-[#1E293B] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTopic}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1E293B] text-xs font-bold flex items-center gap-1 border border-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                </div>

                {/* Botones de Generación: IA Real Gemini 3.8 Flash vs Motor Local */}
                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">
                    {isGeneratingAI && (
                      <span className="flex items-center gap-2 text-purple-700 font-black animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {aiGenerationStatus || 'Generando con Gemini 3.8 Flash...'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                      type="button"
                      disabled={isGeneratingAI}
                      onClick={() => {
                        handleRegenerateExam();
                        setActiveTab('examen');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                      title="Generar preguntas con banco de plantillas pedagógicas locales"
                    >
                      Generación Rápida Local
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAI}
                      onClick={handleGenerateWithAI}
                      className="bg-gradient-to-r from-purple-600 via-[#2563EB] to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                      title="Diseñar el examen con Inteligencia Artificial real usando Google Gemini 3.8 Flash"
                    >
                      {isGeneratingAI ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Generando con Gemini 3.8 Flash...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 text-amber-300" />
                          <span>Generar Examen con Inteligencia Artificial (Gemini) →</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: EXAMEN ESCRITO DE OPCIÓN MÚLTIPLE (PREGUNTAS Y ALTERNATIVAS)
          ========================================================================= */}
          {activeTab === 'examen' && (
            <div className="space-y-6">
              {/* Contenedor del Examen Imprimible */}
              <div className="bg-white rounded-2xl p-6 sm:p-10 border-2 border-slate-300 shadow-md max-w-3xl mx-auto space-y-6 page-break-after print:shadow-none print:border-0 print:p-0">
                {/* Encabezado Escolar Oficial */}
                <div className="border-b-2 border-slate-300 pb-4 space-y-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {activeInstitution?.type === 'publica' ? 'Escuela Oficial MINED' : 'Colegio Privado'}
                      </span>
                      <h2 className="font-black text-lg sm:text-xl text-[#1E293B] uppercase mt-1">
                        {activeInstitution?.name || 'CENTRO ESCOLAR OFICIAL'}
                      </h2>
                    </div>

                    <div className="self-center sm:self-start bg-blue-50 border-2 border-[#2563EB] text-[#1E3A8A] px-3 py-1 rounded-xl text-center">
                      <span className="text-[10px] font-bold block uppercase tracking-wider">Tipo de Clave</span>
                      <span className="text-base font-black font-mono">[{currentKey.keyName.toUpperCase()}]</span>
                    </div>
                  </div>

                  <h3 className="font-black text-sm text-[#1E3A8A]">
                    {customExam.examTitle} • MATERIA: {customExam.subjectName.toUpperCase()}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 text-xs text-[#1E293B] font-semibold border-t border-slate-200 mt-2">
                    <div>
                      Grado: <strong>{gradeName}</strong>
                    </div>
                    <div>
                      Fecha: <strong>{customExam.date}</strong>
                    </div>
                    <div>
                      Total Preguntas: <strong>{customExam.totalQuestions}</strong>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-4 text-xs font-semibold">
                    <div className="flex-1 border-b border-slate-400 pb-0.5">
                      Nombre del Alumno(a): <span className="text-slate-400 italic font-normal">_______________________________________</span>
                    </div>
                    <div className="w-36 border-b border-slate-400 pb-0.5">
                      NIE: <span className="text-slate-400 italic font-normal">___________</span>
                    </div>
                  </div>
                </div>

                {/* Instrucciones para el Estudiante */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#334155] leading-relaxed">
                  <strong className="text-[#1E293B] block mb-0.5">Instrucciones Generales:</strong>
                  Lea cuidadosamente cada una de las siguientes preguntas y seleccione la respuesta correcta. Traslade sus respuestas a la <strong>Hoja de Burbujas OMR</strong> rellenando completamente el círculo correspondiente (A, B, C o D) con lápiz oscuro. No haga marcas fuera del espacio indicado.
                </div>

                {/* Lista de Preguntas */}
                <div className="space-y-5">
                  {currentKey.questions.map((q) => (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] font-black text-xs flex items-center justify-center shrink-0 border border-blue-200">
                            {q.questionNumber}
                          </span>
                          <p className="font-black text-xs sm:text-sm text-[#1E293B] leading-snug">
                            {q.questionText}
                          </p>
                        </div>

                        <span className="text-[10px] text-[#64748B] font-medium bg-slate-100 px-2 py-0.5 rounded shrink-0">
                          {q.topic}
                        </span>
                      </div>

                      {/* Opciones A, B, C, D */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 text-xs">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div
                            key={opt}
                            className="p-2 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 flex items-start gap-2 transition"
                          >
                            <span className="w-5 h-5 rounded-full border border-slate-400 bg-white text-[#1E293B] font-black text-[11px] flex items-center justify-center shrink-0">
                              {opt}
                            </span>
                            <span className="text-[#334155] font-medium leading-tight">
                              {q.options[opt]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pie de Examen con Firmas */}
                <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-6 text-center text-xs text-[#475569]">
                  <div>
                    <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
                    <span className="font-bold">Firma del Docente Responsable</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
                    <span className="font-bold">Calificación Obtenida (0 - 10)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: HOJA DE BURBUJAS OMR (PDF CON FIDUCIALES Y QR)
          ========================================================================= */}
          {activeTab === 'omr' && (
            <div className="space-y-8">
              {studentsToRender.map((student) => {
                const qrUrl = qrCodeDataUrls[`${student.id}_${activeKeyId}`];

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-slate-300 shadow-lg max-w-2xl mx-auto relative page-break-after print:shadow-none print:border-0 print:m-0 print:p-6"
                    style={{ minHeight: '680px' }}
                  >
                    {/* 1. 4 ESQUINAS: MARCADORES FIDUCIARIOS (Solid black squares) */}
                    <div className="absolute top-4 left-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario Superior Izquierdo" />
                    <div className="absolute top-4 right-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario Superior Derecho" />
                    <div className="absolute bottom-4 left-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario Inferior Izquierdo" />
                    <div className="absolute bottom-4 right-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario Inferior Derecho" />

                    {/* Content Container (Padded inside fiducials) */}
                    <div className="px-6 py-2 space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-4 border-b-2 border-slate-300 pb-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {activeInstitution?.type === 'publica' ? 'Escuela Oficial MINED' : 'Colegio Privado'}
                          </span>
                          <h4 className="font-black text-sm sm:text-base text-[#1E293B] leading-tight">
                            {activeInstitution?.name || 'Centro Escolar Oficial'}
                          </h4>
                          <p className="text-xs font-bold text-[#1E3A8A]">
                            {customExam.examTitle} • Materia: {customExam.subjectName}
                          </p>
                          <div className="text-[11px] text-[#334155] font-semibold flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
                            <span>Alumno: <strong className="text-[#1E293B]">{student.fullName}</strong></span>
                            <span>NIE: <strong className="font-mono text-[#1E293B]">{student.nie || 'N/A'}</strong></span>
                            <span>Grado: <strong className="text-[#1E293B]">{gradeName}</strong></span>
                            <span>Clave: <strong className="text-[#2563EB] font-black">[{currentKey.keyName.toUpperCase()}]</strong></span>
                          </div>
                        </div>

                        {/* QR Code with JSON Payload */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="p-1.5 bg-white border-2 border-slate-300 rounded-xl shadow-2xs">
                            {qrUrl ? (
                              <img
                                src={qrUrl}
                                alt="QR Code"
                                className="w-20 h-20 object-contain"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                                Generando QR...
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-mono font-bold text-[#64748B] mt-1">
                            ID: {student.id.slice(-6)}
                          </span>
                        </div>
                      </div>

                      {/* Student Instructions */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#334155]">
                        <span className="font-black text-[#1E293B] block mb-0.5">
                          Instrucciones de Llenado:
                        </span>
                        <p className="leading-relaxed">
                          Rellene completamente con lápiz oscuro o lapicero la burbuja de la opción elegida (A, B, C o D). No haga marcas fuera del círculo ni use corrector líquido sobre los cuadros fiduciarios de las esquinas.
                        </p>
                      </div>

                      {/* OMR Bubble Matrix (Questions 1 to N, up to 20) */}
                      <div className="p-4 bg-slate-50/70 rounded-2xl border-2 border-slate-200">
                        <div className="text-center font-black text-xs text-[#1E3A8A] uppercase tracking-wider mb-3">
                          Hoja de Respuestas (Evaluación Óptica {customExam.totalQuestions} Preguntas)
                        </div>

                        <div className={`grid ${customExam.totalQuestions > 10 ? 'grid-cols-2 gap-x-8' : 'grid-cols-1'} gap-y-2.5`}>
                          {Array.from({ length: customExam.totalQuestions }).map((_, qIdx) => {
                            const qNum = qIdx + 1;
                            return (
                              <div
                                key={qNum}
                                className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition"
                              >
                                <span className="font-mono font-black text-xs text-[#1E293B] w-8 text-right pr-2">
                                  {qNum < 10 ? `0${qNum}` : qNum}.
                                </span>

                                <div className="flex items-center gap-3">
                                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                    <div key={opt} className="flex flex-col items-center">
                                      <div className="w-6 h-6 rounded-full border-2 border-[#1E293B] bg-white flex items-center justify-center text-[11px] font-black text-[#1E293B] hover:bg-blue-100 transition cursor-pointer select-none">
                                        {opt}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer note */}
                      <div className="pt-2 text-center text-[10px] text-[#64748B] font-semibold border-t border-slate-200">
                        EduControl Pro OMR System • Hoja de Burbujas calibrada para escaneo con cámara OpenCV
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =========================================================================
              TAB 4: CUADERNILLO COMPLETO (PÁG 1: HOJA OMR, PÁG 2+: PREGUNTAS)
          ========================================================================= */}
          {activeTab === 'cuadernillo' && (
            <div className="space-y-12">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex flex-wrap items-center justify-between gap-2 no-print">
                <span>
                  <strong>Estructura Estricta de Impresión:</strong> La <strong>Página 1</strong> contiene la Hoja de Burbujas OMR (para rellenar y escanear), y las <strong>Páginas 2+</strong> contienen el cuestionario con las preguntas.
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir / Descargar Cuadernillo (PDF)
                </button>
              </div>

              {/* STRICT REQUIREMENT: PÁGINA 1: HOJA DE RESPUESTAS OMR (PRIMERA PÁGINA) */}
              {studentsToRender.slice(0, 1).map((student) => {
                const qrUrl = qrCodeDataUrls[`${student.id}_${activeKeyId}`];
                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-slate-300 shadow-lg max-w-2xl mx-auto relative page-break-after"
                    style={{ minHeight: '660px' }}
                  >
                    {/* 4 Marcadores Fiduciarios en las esquinas */}
                    <div className="absolute top-4 left-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario" />
                    <div className="absolute top-4 right-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario" />
                    <div className="absolute bottom-4 left-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario" />
                    <div className="absolute bottom-4 right-4 w-7 h-7 bg-black rounded-xs shadow-xs" title="Marcador Fiduciario" />

                    <div className="px-6 py-2 space-y-4">
                      <div className="flex items-start justify-between border-b-2 border-slate-300 pb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {activeInstitution?.type === 'publica' ? 'Escuela Oficial MINED' : 'Colegio Privado'}
                            </span>
                            <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              PÁGINA 1: HOJA DE RESPUESTAS OMR
                            </span>
                          </div>
                          <h4 className="font-black text-sm text-[#1E293B]">
                            {activeInstitution?.name || 'Centro Escolar Oficial'}
                          </h4>
                          <p className="text-xs font-bold text-[#1E3A8A]">
                            {customExam.examTitle} • {customExam.subjectName} • Clave [{currentKey.keyName.toUpperCase()}]
                          </p>
                          <p className="text-[11px] text-[#475569] mt-0.5">
                            Alumno: <strong className="text-slate-900">{student.fullName}</strong> | NIE: <strong className="font-mono">{student.nie || 'N/A'}</strong> | Grado: <strong>{gradeName}</strong>
                          </p>
                        </div>
                        {qrUrl && (
                          <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs">
                            <img src={qrUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                          </div>
                        )}
                      </div>

                      {/* Instrucciones de rellenado */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#334155]">
                        <strong className="text-slate-900 block mb-0.5">Instrucciones Estrictas para el Estudiante:</strong>
                        Rellene completamente con lápiz oscuro o lapicero negro el círculo correspondiente a su respuesta seleccionada en las preguntas de la Página 2. No doble la hoja ni marque sobre los 4 cuadros negros de las esquinas.
                      </div>

                      {/* Matriz de Burbujas */}
                      <div className={`grid ${customExam.totalQuestions > 10 ? 'grid-cols-2 gap-x-8' : 'grid-cols-1'} gap-y-2`}>
                        {Array.from({ length: customExam.totalQuestions }).map((_, qIdx) => {
                          const qNum = qIdx + 1;
                          return (
                            <div key={qNum} className="flex items-center justify-between p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                              <span className="font-mono font-black text-xs w-7 text-right text-slate-900">{qNum < 10 ? `0${qNum}` : qNum}.</span>
                              <div className="flex items-center gap-2.5">
                                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                  <div key={opt} className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-900">
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 text-center text-[9px] text-slate-500 font-mono border-t border-slate-200">
                        Página 1: Hoja OMR para escaneo • El cuestionario de preguntas se ubica a partir de la Página 2
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* STRICT REQUIREMENT: PÁGINAS SIGUIENTES: CUESTIONARIO DE PREGUNTAS Y OPCIONES */}
              <div className="bg-white rounded-2xl p-6 sm:p-10 border-2 border-slate-300 shadow-md max-w-3xl mx-auto space-y-6 page-break-after">
                <div className="border-b-2 border-slate-300 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      PÁGINA 2+: CUESTIONARIO DE PREGUNTAS
                    </span>
                    <h3 className="font-black text-lg text-[#1E293B] uppercase mt-1">
                      {activeInstitution?.name || 'CENTRO ESCOLAR'} • {customExam.subjectName}
                    </h3>
                    <p className="text-xs font-bold text-[#2563EB]">
                      {customExam.examTitle} • [{currentKey.keyName.toUpperCase()}]
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#475569] block">
                      {customExam.totalQuestions} Preguntas Totales
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-bold">
                      Clave [{currentKey.keyName}]
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentKey.questions.map((q) => (
                    <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] font-black text-xs flex items-center justify-center shrink-0 border border-blue-200">
                          {q.questionNumber}
                        </span>
                        <p className="font-black text-xs sm:text-sm text-[#1E293B] leading-snug">
                          {q.questionText}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 text-xs text-slate-700 font-medium">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div key={opt} className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full border border-slate-400 bg-white text-slate-900 font-black text-[10px] flex items-center justify-center shrink-0">
                              {opt}
                            </span>
                            <span className="leading-tight">{q.options[opt]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Firmas al pie */}
                <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-6 text-center text-xs text-[#475569]">
                  <div>
                    <div className="border-b border-slate-400 w-44 mx-auto mb-1" />
                    <span className="font-bold">Docente Evaluador</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 w-44 mx-auto mb-1" />
                    <span className="font-bold">Nota Obtenida</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 5: SOLUCIONARIO OFICIAL (RESPUESTAS POR CLAVE Y HOJA CONTESTADA)
          ========================================================================= */}
          {activeTab === 'solucionario' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                      Uso Exclusivo del Docente
                    </span>
                    <h4 className="font-black text-base text-[#1E293B] flex items-center gap-2 mt-1">
                      <Key className="w-5 h-5 text-purple-600" />
                      Solucionario Oficial y Hoja de Respuestas Contestada
                    </h4>
                    <p className="text-xs text-[#475569] font-medium mt-0.5">
                      Respuestas correctas configuradas para las {Object.keys(customExam.keys).length} claves generadas. El docente puede verificar cada respuesta y descargar el solucionario en PDF.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      Descargar Solucionario (PDF)
                    </button>
                  </div>
                </div>

                {/* Hoja de Respuestas Contestada (Visual Filled OMR Sheet for Teacher) */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-300 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                      <h4 className="font-black text-xs uppercase tracking-wider text-emerald-950">
                        Hoja de Respuestas Contestada Oficial • [{currentKey.keyName.toUpperCase()}]
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Burbuja Rellena = Respuesta Correcta
                    </span>
                  </div>

                  <div className={`grid ${customExam.totalQuestions > 10 ? 'grid-cols-2 gap-x-8' : 'grid-cols-1'} gap-y-2`}>
                    {Array.from({ length: customExam.totalQuestions }).map((_, qIdx) => {
                      const qNum = qIdx + 1;
                      const correctLetter = currentKey.answerKey[qNum] || 'A';
                      return (
                        <div
                          key={qNum}
                          className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-emerald-200 shadow-2xs"
                        >
                          <span className="font-mono font-black text-xs text-emerald-950 w-8 text-right pr-2">
                            {qNum < 10 ? `0${qNum}` : qNum}.
                          </span>

                          <div className="flex items-center gap-2.5">
                            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                              const isCorrect = opt === correctLetter;
                              return (
                                <div
                                  key={opt}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                                    isCorrect
                                      ? 'bg-slate-900 text-white border-2 border-slate-900 ring-2 ring-emerald-400 font-bold shadow-xs'
                                      : 'border-2 border-slate-300 text-slate-400 bg-slate-50'
                                  }`}
                                  title={isCorrect ? `Respuesta Correcta: ${opt}` : undefined}
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

                {/* Grid comparativo de respuestas por cada Clave */}
                <div>
                  <h4 className="font-black text-xs text-[#1E293B] uppercase tracking-wider mb-2">
                    Tabla Comparativa de Respuestas Correctas por Clave
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-[#1E3A8A] text-white font-black uppercase text-[11px]">
                          <th className="p-3 w-16 text-center border-r border-blue-400/40">N°</th>
                          <th className="p-3 border-r border-blue-400/40">Tema Evaluado</th>
                          {Object.keys(customExam.keys).map((kId) => (
                            <th key={kId} className="p-3 text-center border-r border-blue-400/40 last:border-r-0">
                              Clave {kId}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {Array.from({ length: customExam.totalQuestions }).map((_, qIdx) => {
                          const qNum = qIdx + 1;
                          const baseQ = customExam.keys['A'].questions[qIdx];

                          return (
                            <tr key={qNum} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center font-mono font-black text-[#1E3A8A] border-r border-slate-200">
                                {qNum < 10 ? `0${qNum}` : qNum}
                              </td>
                              <td className="p-3 font-semibold text-[#1E293B] border-r border-slate-200">
                                {baseQ?.topic || `Pregunta ${qNum}`}
                              </td>
                              {Object.keys(customExam.keys).map((kId) => {
                                const ans = customExam.keys[kId].answerKey[qNum];
                                return (
                                  <td key={kId} className="p-3 text-center font-black border-r border-slate-200 last:border-r-0">
                                    <span className="w-7 h-7 rounded-full bg-blue-100 text-[#1E3A8A] border-2 border-blue-300 font-mono text-xs flex items-center justify-center mx-auto shadow-2xs">
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

                {/* Explicaciones pedagógicas detalladas */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h4 className="font-black text-xs text-[#1E293B] uppercase tracking-wider">
                    Fundamentación Pedagógica de Preguntas [{currentKey.keyName.toUpperCase()}]
                  </h4>
                  <div className="space-y-2.5">
                    {currentKey.questions.map((q) => (
                      <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-black text-[#1E3A8A]">
                            Pregunta {q.questionNumber}: <span className="text-[#1E293B] font-semibold">{q.questionText}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black font-mono shrink-0">
                            Respuesta: [{q.correctAnswer}]
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569] pl-3 border-l-2 border-emerald-500">
                          <strong>Explicación:</strong> {q.explanation || `La opción ${q.correctAnswer} (${q.options[q.correctAnswer]}) es la respuesta correcta para el contenido de ${q.topic}.`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 6: SCRIPT PYTHON (GENERADOR REPORTLAB + OPENCV)
          ========================================================================= */}
          {activeTab === 'python' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border-2 border-slate-700 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="font-mono font-bold text-xs text-white">
                        scripts/generate_exam_and_omr.py
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Script completo en Python con ReportLab y QRCode para compilar el examen y la hoja OMR en PDF
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPythonScript}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold transition shadow-xs"
                  >
                    {copiedPython ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedPython ? '¡Código Copiado!' : 'Copiar Script'}
                  </button>
                </div>

                <pre className="p-4 bg-black/60 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-96 text-emerald-400">
                  {generatePythonExamScript(customExam, activeKeyId)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (no-print) */}
        <div className="p-4 bg-white border-t-2 border-slate-200 flex items-center justify-between shrink-0 no-print">
          <div className="text-xs text-[#475569] font-medium flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>
              Examen con <strong>{customExam.totalQuestions} preguntas</strong> y <strong>{Object.keys(customExam.keys).length} claves</strong> listo para {gradeStudents.length} estudiantes
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#475569] hover:text-[#1E293B] transition"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Vista Previa PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir {activeTab === 'examen' ? 'Examen' : activeTab === 'omr' ? 'Hojas OMR' : 'Documento'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Vista Previa PDF de Alta Fidelidad */}
      {isPreviewModalOpen && customExam && (
        <ExamOMRPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          exam={customExam}
          students={gradeStudents}
          initialKeyId={activeKeyId}
          initialMode={
            activeTab === 'examen'
              ? 'examen'
              : activeTab === 'omr'
              ? 'omr'
              : activeTab === 'solucionario'
              ? 'solucionario'
              : 'cuadernillo'
          }
          qrCodeDataUrls={qrCodeDataUrls}
        />
      )}
    </div>
  );
};
