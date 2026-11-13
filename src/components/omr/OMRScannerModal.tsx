import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  ScanLine,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Camera,
  Sparkles,
  ChevronRight,
  FileCode,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { ExamAnswerKey } from '../../types';

interface OMRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodId: string;
  gradeId: string;
  subjectName: string;
}

type OptionLetter = 'A' | 'B' | 'C' | 'D';

export const OMRScannerModal: React.FC<OMRScannerModalProps> = ({
  isOpen,
  onClose,
  periodId,
  gradeId,
  subjectName
}) => {
  const { students, periodGrades, updateGrade } = useApp();

  const currentPeriod = periodGrades.find((p) => p.id === periodId);
  const eligibleStudents = students.filter(
    (s) => s.gradeId === gradeId && s.institutionCode === (currentPeriod?.institutionCode || 'ESC-PUB-2026')
  );

  // Workflow steps:
  // 1: Configure Keys count, question count, and export target column
  // 2: Fill answer keys (with "Pasar a la siguiente clave" button)
  // 3: Scan / grade student answer sheets with real optical bubble detector
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(1);

  // Configuration settings
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [numberOfKeys, setNumberOfKeys] = useState<number>(2);
  const [exportColumnTarget, setExportColumnTarget] = useState<string>('Examen de Periodo');

  // Keys answers
  const [keys, setKeys] = useState<ExamAnswerKey[]>([
    {
      id: 'key-1',
      keyNumber: 1,
      name: 'Clave 1 (Tipo A)',
      answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'A', 6: 'B', 7: 'C', 8: 'D', 9: 'A', 10: 'B' }
    },
    {
      id: 'key-2',
      keyNumber: 2,
      name: 'Clave 2 (Tipo B)',
      answers: { 1: 'B', 2: 'A', 3: 'D', 4: 'C', 5: 'B', 6: 'A', 7: 'D', 8: 'C', 9: 'B', 10: 'A' }
    }
  ]);
  const [currentConfiguringKeyIndex, setCurrentConfiguringKeyIndex] = useState<number>(0);

  // Scanning stage state
  const [activeKeyToEvaluate, setActiveKeyToEvaluate] = useState<number>(1);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, OptionLetter>>({});
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isScanningAnimation, setIsScanningAnimation] = useState<boolean>(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<{
    correctCount: number;
    score: number;
    studentName: string;
  } | null>(null);

  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [processedOverlayUrl, setProcessedOverlayUrl] = useState<string | null>(null);
  const [showPythonScript, setShowPythonScript] = useState<boolean>(false);
  const [copiedPython, setCopiedPython] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Camera stream handler
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraActive && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          setIsCameraActive(false);
          setScanStatusMessage('No se pudo acceder a la cámara. Verifica permisos o usa "Subir Foto".');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive]);

  if (!isOpen) return null;

  // =========================================================================
  // MOTOR REAL DE VISIÓN POR COMPUTADORA OMR (CANVAS + OTSU + QR DETECTOR)
  // =========================================================================
  const computeOtsuThreshold = (gray: Uint8Array): number => {
    const hist = new Int32Array(256);
    for (let i = 0; i < gray.length; i++) {
      hist[gray[i]]++;
    }
    const total = gray.length;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;

      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }
    return threshold;
  };

  const detectSheetBounds = (
    gray: Uint8Array,
    width: number,
    height: number,
    threshold: number
  ) => {
    // Busca marcadores fiduciarios oscuros en los cuadrantes exteriores
    const findCornerAnchor = (xStart: number, xEnd: number, yStart: number, yEnd: number) => {
      let sumX = 0;
      let sumY = 0;
      let darkCount = 0;
      for (let y = yStart; y < yEnd; y += 2) {
        for (let x = xStart; x < xEnd; x += 2) {
          if (gray[y * width + x] < threshold * 0.85) {
            sumX += x;
            sumY += y;
            darkCount++;
          }
        }
      }
      const area = ((xEnd - xStart) * (yEnd - yStart)) / 4;
      // Si hay una concentración clara de tinta (marcador de esquina), devuelve su centroide
      if (darkCount > 15 && darkCount < area * 0.35) {
        return { x: sumX / darkCount, y: sumY / darkCount, found: true };
      }
      return { x: (xStart + xEnd) / 2, y: (yStart + yEnd) / 2, found: false };
    };

    const marginX = Math.floor(width * 0.22);
    const marginY = Math.floor(height * 0.22);

    const tl = findCornerAnchor(10, marginX, 10, marginY);
    const tr = findCornerAnchor(width - marginX, width - 10, 10, marginY);
    const bl = findCornerAnchor(10, marginX, height - marginY, height - 10);
    const br = findCornerAnchor(width - marginX, width - 10, height - marginY, height - 10);

    const anchorsFound = [tl.found, tr.found, bl.found, br.found].filter(Boolean).length;

    if (anchorsFound >= 3) {
      const left = Math.min(tl.x, bl.x);
      const right = Math.max(tr.x, br.x);
      const top = Math.min(tl.y, tr.y);
      const bottom = Math.max(bl.y, br.y);
      if (right - left > width * 0.35 && bottom - top > height * 0.35) {
        return { left, right, top, bottom, calibrated: true };
      }
    }

    // Respaldo: encuadre estándar de hoja centrada dentro de la guía verde
    return {
      left: width * 0.14,
      right: width * 0.86,
      top: height * 0.14,
      bottom: height * 0.88,
      calibrated: false
    };
  };

  const processOpticalFrame = async (source: HTMLVideoElement | HTMLImageElement) => {
    const srcWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const srcHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

    if (!srcWidth || !srcHeight) {
      setScanStatusMessage('La imagen o cámara aún no está lista. Intenta de nuevo.');
      setIsScanningAnimation(false);
      return;
    }

    // Normalizar resolución para análisis rápido y preciso
    const targetW = 800;
    const targetH = Math.round((srcHeight / srcWidth) * targetW);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(source, 0, 0, targetW, targetH);

    // 1. Intentar leer Código QR nativo del navegador para auto-seleccionar estudiante/clave
    let qrDetectedInfo = '';
    if ('BarcodeDetector' in window) {
      try {
        const BarcodeDetectorClass = (window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => {
            detect: (img: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>>;
          };
        }).BarcodeDetector;
        const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        const codes = await detector.detect(canvas);
        if (codes.length > 0 && codes[0].rawValue) {
          try {
            const parsed = JSON.parse(codes[0].rawValue);
            if (parsed.studentId || parsed.nie) {
              const foundIdx = eligibleStudents.findIndex(
                (st) => st.id === parsed.studentId || st.nie === parsed.nie
              );
              if (foundIdx !== -1) {
                setSelectedStudentIndex(foundIdx);
                qrDetectedInfo = ` • QR: ${eligibleStudents[foundIdx].fullName}`;
              }
            }
            if (parsed.keyNumber && keys.some((k) => k.keyNumber === Number(parsed.keyNumber))) {
              setActiveKeyToEvaluate(Number(parsed.keyNumber));
            }
          } catch {
            // QR con texto plano
          }
        }
      } catch {
        // Navegador sin soporte QR activo, continúa con detección óptica de óvalos
      }
    }

    // 2. Convertir a escala de grises y calcular umbral adaptativo de Otsu
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;
    const gray = new Uint8Array(targetW * targetH);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    const threshold = computeOtsuThreshold(gray);
    const bounds = detectSheetBounds(gray, targetW, targetH, threshold);

    // 3. Evaluar densidad de píxeles oscuros en cada óvalo (A, B, C, D)
    const sheetW = bounds.right - bounds.left;
    const sheetH = bounds.bottom - bounds.top;

    // Zona de burbujas dentro de la hoja (debajo del encabezado/QR)
    const gridTop = bounds.top + sheetH * 0.28;
    const gridBottom = bounds.bottom - sheetH * 0.06;
    const gridHeight = gridBottom - gridTop;

    const useTwoColumns = totalQuestions > 10;
    const rowsPerCol = useTwoColumns ? Math.ceil(totalQuestions / 2) : totalQuestions;
    const rowStep = gridHeight / Math.max(rowsPerCol, 1);
    const bubbleRadius = Math.max(6, Math.min(14, Math.round(rowStep * 0.28)));

    const detectedAnswers: Record<number, OptionLetter> = {};
    const options: OptionLetter[] = ['A', 'B', 'C', 'D'];

    // Dibujar marco de calibración sobre el canvas de resultados
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(bounds.left, bounds.top, sheetW, sheetH);

    let markedCount = 0;

    for (let q = 1; q <= totalQuestions; q++) {
      const colIndex = useTwoColumns && q > rowsPerCol ? 1 : 0;
      const rowIndex = useTwoColumns && q > rowsPerCol ? q - rowsPerCol - 1 : q - 1;

      const colStartX = useTwoColumns
        ? bounds.left + (colIndex === 0 ? sheetW * 0.16 : sheetW * 0.60)
        : bounds.left + sheetW * 0.30;
      const colSpanX = useTwoColumns ? sheetW * 0.28 : sheetW * 0.48;
      const cy = Math.round(gridTop + rowStep * (rowIndex + 0.5));

      const fillRatios: number[] = [];
      const centersX: number[] = [];

      for (let optIdx = 0; optIdx < 4; optIdx++) {
        const cx = Math.round(colStartX + (colSpanX / 3) * optIdx);
        centersX.push(cx);

        let darkPixels = 0;
        let totalPixels = 0;
        const r2 = bubbleRadius * bubbleRadius;

        for (let dy = -bubbleRadius; dy <= bubbleRadius; dy++) {
          const py = cy + dy;
          if (py < 0 || py >= targetH) continue;
          for (let dx = -bubbleRadius; dx <= bubbleRadius; dx++) {
            if (dx * dx + dy * dy > r2) continue;
            const px = cx + dx;
            if (px < 0 || px >= targetW) continue;
            totalPixels++;
            if (gray[py * targetW + px] < threshold) {
              darkPixels++;
            }
          }
        }

        const ratio = totalPixels > 0 ? darkPixels / totalPixels : 0;
        fillRatios.push(ratio);
      }

      // Encontrar el óvalo más oscuro de la fila y compararlo contra el segundo más oscuro
      let bestIdx = 0;
      let bestRatio = fillRatios[0];
      let secondRatio = 0;

      for (let i = 1; i < 4; i++) {
        if (fillRatios[i] > bestRatio) {
          secondRatio = bestRatio;
          bestRatio = fillRatios[i];
          bestIdx = i;
        } else if (fillRatios[i] > secondRatio) {
          secondRatio = fillRatios[i];
        }
      }

      // Umbral real de relleno: al menos 36% del círculo oscuro y diferencia clara (>11%) respecto a óvalos vacíos
      const isMarked = bestRatio >= 0.36 && bestRatio - secondRatio >= 0.11;

      if (isMarked) {
        detectedAnswers[q] = options[bestIdx];
        markedCount++;
      }

      // Dibujar círculos de detección visual en la imagen analizada
      for (let optIdx = 0; optIdx < 4; optIdx++) {
        ctx.beginPath();
        ctx.arc(centersX[optIdx], cy, bubbleRadius, 0, Math.PI * 2);
        if (isMarked && optIdx === bestIdx) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();
      }
    }

    setStudentAnswers(detectedAnswers);
    setProcessedOverlayUrl(canvas.toDataURL('image/jpeg', 0.9));
    setIsCameraActive(false);
    setIsScanningAnimation(false);
    setScanStatusMessage(
      `Escaneo óptico completado: ${markedCount} de ${totalQuestions} respuestas marcadas detectadas${qrDetectedInfo}.`
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUploadedPhotoUrl(url);
    setProcessedOverlayUrl(null);
    setIsCameraActive(false);
    setScanStatusMessage(null);
    setIsScanningAnimation(true);

    const img = new Image();
    img.onload = () => {
      processOpticalFrame(img);
    };
    img.onerror = () => {
      setIsScanningAnimation(false);
      setScanStatusMessage('No se pudo leer la imagen seleccionada.');
    };
    img.src = url;
  };

  const handleTriggerOpticalScan = () => {
    setScanStatusMessage(null);

    if (isCameraActive && videoRef.current) {
      setIsScanningAnimation(true);
      processOpticalFrame(videoRef.current);
      return;
    }

    if (uploadedPhotoUrl) {
      setIsScanningAnimation(true);
      const img = new Image();
      img.onload = () => processOpticalFrame(img);
      img.src = uploadedPhotoUrl;
      return;
    }

    setScanStatusMessage('Activa la "Cámara Web" o presiona "Subir Foto" con la hoja del estudiante para escanear.');
  };

  // Initialize keys when numberOfKeys changes in step 1
  const handleProceedToKeyDefinition = () => {
    const initializedKeys: ExamAnswerKey[] = [];
    for (let k = 1; k <= numberOfKeys; k++) {
      const defaultAns: Record<number, OptionLetter> = {};
      const options: OptionLetter[] = ['A', 'B', 'C', 'D'];
      for (let q = 1; q <= totalQuestions; q++) {
        defaultAns[q] = options[(q + k - 2) % 4];
      }
      initializedKeys.push({
        id: `key-${k}`,
        keyNumber: k,
        name: `Clave ${k} (Tipo ${String.fromCharCode(64 + k)})`,
        answers: defaultAns
      });
    }
    setKeys(initializedKeys);
    setCurrentConfiguringKeyIndex(0);
    setWorkflowStep(2);
  };

  // Toggle answer bubble for key configuration
  const handleSetKeyAnswer = (questionNum: number, option: OptionLetter) => {
    setKeys((prev) => {
      const copy = [...prev];
      copy[currentConfiguringKeyIndex].answers[questionNum] = option;
      return copy;
    });
  };

  const handleNextKeyButton = () => {
    if (currentConfiguringKeyIndex < keys.length - 1) {
      setCurrentConfiguringKeyIndex((prev) => prev + 1);
    } else {
      setWorkflowStep(3);
    }
  };

  // Student bubble mark toggle in optical sheet (manual fine-tuning if needed)
  const handleSetStudentBubble = (questionNum: number, option: OptionLetter) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionNum]: option
    }));
  };

  // Calculate score: (10 / totalQuestions) * correctCount
  const currentKeyObj = keys.find((k) => k.keyNumber === activeKeyToEvaluate) || keys[0];
  const pointPerQuestion = 10 / totalQuestions;

  let correctCount = 0;
  for (let q = 1; q <= totalQuestions; q++) {
    if (studentAnswers[q] && studentAnswers[q] === currentKeyObj?.answers[q]) {
      correctCount++;
    }
  }
  const calculatedScore = Number((pointPerQuestion * correctCount).toFixed(1));

  // Export calculated grade to target column in period grades
  const handleExportGradeToExcel = () => {
    const student = eligibleStudents[selectedStudentIndex];
    if (!student || !currentPeriod) return;

    let targetAct = currentPeriod.activities.find(
      (a) => a.id === exportColumnTarget || a.name.trim().toLowerCase() === exportColumnTarget.trim().toLowerCase()
    );
    if (!targetAct) {
      targetAct = currentPeriod.activities.find((a) => a.isExam) || currentPeriod.activities[0];
    }

    if (targetAct) {
      updateGrade(currentPeriod.id, student.id, targetAct.id, calculatedScore);
      setLastScannedResult({
        correctCount,
        score: calculatedScore,
        studentName: student.fullName
      });

      // Limpiar captura anterior y avanzar al siguiente estudiante
      setStudentAnswers({});
      setProcessedOverlayUrl(null);
      setUploadedPhotoUrl(null);
      setScanStatusMessage(null);

      if (selectedStudentIndex < eligibleStudents.length - 1) {
        setSelectedStudentIndex((prev) => prev + 1);
      }
    }
  };

  const selectedStudent = eligibleStudents[selectedStudentIndex] || eligibleStudents[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <ScanLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Lector Óptico de Exámenes (OMR)</h2>
              <p className="text-xs text-emerald-100">
                {subjectName} • Calificación automática por escaneo de hoja de respuestas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPythonScript(true)}
              className="bg-white/15 hover:bg-white/25 text-white text-xs font-black px-3 py-1.5 rounded-xl border border-white/25 flex items-center gap-1.5 transition"
              title="Ver script alternativo en Python con OpenCV y pyzbar"
            >
              <FileCode className="w-3.5 h-3.5" />
              Script Python (OpenCV)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                workflowStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <span className={workflowStep === 1 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500'}>
              Configurar Claves y Destino
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                workflowStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span className={workflowStep === 2 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500'}>
              Clave de Respuestas ({keys.length})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                workflowStep === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span className={workflowStep === 3 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500'}>
              Escanear y Exportar al Excel
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Fórmula: (10 / {totalQuestions}) × Aciertos
          </span>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ================= STEP 1: PARÁMETROS INICIALES ================= */}
          {workflowStep === 1 && (
            <div className="space-y-5 max-w-xl mx-auto">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm mb-1">Configuración del Flujo de Examen</p>
                  <p className="leading-relaxed">
                    Indica cuántas claves de respuestas diferentes evaluarás (ej. Examen Tipo A y B), el número de preguntas y en qué columna del cuadro de Excel se registrarán las notas evaluadas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Claves de Examen <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={numberOfKeys}
                    onChange={(e) => setNumberOfKeys(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value={1}>1 Clave Única (Todos el mismo examen)</option>
                    <option value={2}>2 Claves (Tipo A y Tipo B)</option>
                    <option value={3}>3 Claves (Tipo A, B y C)</option>
                    <option value={4}>4 Claves</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cantidad de Preguntas (Óvalos) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  >
                    <option value={5}>5 Preguntas (2.0 pts c/u)</option>
                    <option value={10}>10 Preguntas (1.0 pt c/u)</option>
                    <option value={15}>15 Preguntas (0.67 pts c/u)</option>
                    <option value={20}>20 Preguntas (0.5 pts c/u)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  ¿En qué columna o espacio del Excel se exportarán las notas escaneadas? <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Selecciona la actividad de tu cuadro de notas que recibirá la calificación del examen:
                </p>
                <select
                  value={exportColumnTarget}
                  onChange={(e) => setExportColumnTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-indigo-700 dark:text-indigo-400"
                >
                  {currentPeriod?.activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      Columna: {act.name} ({act.percentage}%) {act.isExam ? '• Examen' : ''}
                    </option>
                  ))}
                  <option value="Examen de Periodo">Columna: Examen de Periodo</option>
                </select>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleProceedToKeyDefinition}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                >
                  Continuar a Ingreso de Claves
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: INGRESO DE CLAVES ================= */}
          {workflowStep === 2 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-xs text-slate-500">Configurando:</span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {keys[currentConfiguringKeyIndex]?.name}
                  </h3>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-full">
                  Clave {currentConfiguringKeyIndex + 1} de {keys.length}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Selecciona la respuesta correcta (A, B, C, D) para cada pregunta de esta clave.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-72 overflow-y-auto">
                {Array.from({ length: totalQuestions }).map((_, idx) => {
                  const qNum = idx + 1;
                  const activeVal = keys[currentConfiguringKeyIndex]?.answers[qNum];
                  return (
                    <div
                      key={qNum}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                    >
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-7">
                        {qNum < 10 ? `0${qNum}` : qNum}.
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSetKeyAnswer(qNum, opt)}
                            className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center transition ${
                              activeVal === opt
                                ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (currentConfiguringKeyIndex > 0) {
                      setCurrentConfiguringKeyIndex((prev) => prev - 1);
                    } else {
                      setWorkflowStep(1);
                    }
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Anterior
                </button>

                <button
                  type="button"
                  onClick={handleNextKeyButton}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                >
                  {currentConfiguringKeyIndex < keys.length - 1 ? (
                    <>
                      Pasar a la siguiente clave ({keys[currentConfiguringKeyIndex + 1]?.name})
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Finalizar Claves e Iniciar Escaneo OMR
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: ESCANEO REAL Y EVALUACIÓN OMR ================= */}
          {workflowStep === 3 && (
            <div className="space-y-4">
              {/* Row: Student selection & Key selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fila de Estudiante a Calificar:
                  </label>
                  <select
                    value={selectedStudentIndex}
                    onChange={(e) => setSelectedStudentIndex(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    {eligibleStudents.map((st, idx) => (
                      <option key={st.id} value={idx}>
                        N° {st.listNumber}: {st.fullName} (NIE: {st.nie || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clave a Comparar:
                  </label>
                  <select
                    value={activeKeyToEvaluate}
                    onChange={(e) => setActiveKeyToEvaluate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    {keys.map((k) => (
                      <option key={k.id} value={k.keyNumber}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Columna en Excel:
                  </label>
                  <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">
                    {exportColumnTarget}
                  </div>
                </div>
              </div>

              {/* Scanner Grid: Real Camera / Vision Preview on Left + Bubble Optical Sheet on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Real Camera View & Computer Vision Overlay */}
                <div className="bg-slate-900 rounded-xl p-4 text-white flex flex-col justify-between relative overflow-hidden min-h-[320px]">
                  <div className="absolute inset-0 border-2 border-emerald-400/40 m-6 rounded-lg pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between text-[10px] text-emerald-400 font-mono">
                      <span>[ALIGN_TOP_LEFT]</span>
                      <span>[ALIGN_TOP_RIGHT]</span>
                    </div>
                    {isScanningAnimation && (
                      <div className="h-0.5 bg-emerald-400 w-full animate-bounce shadow-[0_0_12px_#34d399]" />
                    )}
                    <div className="flex justify-between text-[10px] text-emerald-400 font-mono">
                      <span>[ALIGN_BOT_LEFT]</span>
                      <span>[ALIGN_BOT_RIGHT]</span>
                    </div>
                  </div>

                  {/* Header over camera */}
                  <div className="relative z-10 flex items-center justify-between text-xs">
                    <span className="bg-black/60 px-2 py-1 rounded text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <ScanLine className="w-3.5 h-3.5 animate-pulse" />
                      VISIÓN_OMR_REAL
                    </span>
                    <div className="flex items-center gap-1.5">
                      <label className="cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition text-white">
                        <Camera className="w-3 h-3 text-emerald-300" />
                        Subir Foto
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPhotoUrl(null);
                          setProcessedOverlayUrl(null);
                          setScanStatusMessage(null);
                          setIsCameraActive(!isCameraActive);
                        }}
                        className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-[11px] flex items-center gap-1 text-white transition"
                      >
                        <Camera className="w-3 h-3" />
                        {isCameraActive ? 'Detener' : 'Cámara Web'}
                      </button>
                    </div>
                  </div>

                  {/* Video or Analyzed Optical Overlay Image */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-3 text-center">
                    {isCameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-48 object-cover rounded-lg border border-emerald-400/40"
                      />
                    ) : processedOverlayUrl ? (
                      <div className="relative w-full h-48 flex items-center justify-center bg-black/50 rounded-lg overflow-hidden border border-emerald-400/60">
                        <img
                          src={processedOverlayUrl}
                          alt="Detección Óptica OMR"
                          className="max-h-full max-w-full object-contain"
                        />
                        <span className="absolute bottom-1 right-1 bg-emerald-950/90 text-[9px] text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/40">
                          Óvalos Analizados ✓
                        </span>
                      </div>
                    ) : uploadedPhotoUrl ? (
                      <div className="relative w-full h-48 flex items-center justify-center bg-black/40 rounded-lg overflow-hidden border border-emerald-400/40">
                        <img
                          src={uploadedPhotoUrl}
                          alt="Hoja OMR Cargada"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10 max-w-xs">
                        <ScanLine className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-semibold text-slate-200">
                          Escáner Óptico en Tiempo Real
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Enciende la <strong>Cámara Web</strong> o presiona <strong>Subir Foto</strong> con la hoja de respuestas del estudiante.
                        </p>
                      </div>
                    )}
                  </div>

                  {scanStatusMessage && (
                    <div className="relative z-10 mb-2 px-2.5 py-1.5 rounded-lg bg-black/70 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{scanStatusMessage}</span>
                    </div>
                  )}

                  {/* Capture & Analyze Button */}
                  <div className="relative z-10 flex gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerOpticalScan}
                      disabled={isScanningAnimation}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-60"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      {isScanningAnimation ? 'Analizando Píxeles...' : 'Capturar y Detectar Óvalos'}
                    </button>
                  </div>
                </div>

                {/* Right: Optical Answer Bubble Sheet (Student marks vs Answer Key) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Hoja de Óvalos del Estudiante
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {selectedStudent ? `${selectedStudent.fullName} (Lista #${selectedStudent.listNumber})` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Puntaje Obtenido:</span>
                        <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                          {calculatedScore} / 10.0
                        </span>
                      </div>
                    </div>

                    {/* Bubble List */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {Array.from({ length: totalQuestions }).map((_, idx) => {
                        const qNum = idx + 1;
                        const studentMark = studentAnswers[qNum];
                        const correctMark = currentKeyObj?.answers[qNum];
                        const isHit = Boolean(studentMark && studentMark === correctMark);

                        return (
                          <div
                            key={qNum}
                            className={`flex items-center justify-between p-1.5 px-2.5 rounded-lg border text-xs ${
                              isHit
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-5">
                                {qNum}.
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isHit
                                    ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
                                    : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                                }`}
                              >
                                {isHit
                                  ? 'Correcta'
                                  : studentMark
                                    ? `Error (Clave: ${correctMark})`
                                    : `Sin marcar (Clave: ${correctMark})`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleSetStudentBubble(qNum, opt)}
                                  className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center transition ${
                                    studentMark === opt
                                      ? isHit
                                        ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-300'
                                        : 'bg-red-600 text-white font-bold ring-2 ring-red-300'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Bar & Export to Excel action */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-400">
                        Aciertos: <strong className="text-emerald-600">{correctCount}</strong> / {totalQuestions}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Fórmula: (10 ÷ {totalQuestions}) × {correctCount} ={' '}
                        <strong className="text-indigo-600 font-mono text-sm">{calculatedScore}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportGradeToExcel}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Exportar Nota ({calculatedScore}) al Cuadro de Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Scanned toast feedback */}
              {lastScannedResult && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>
                      Nota de <strong>{lastScannedResult.score}/10.0</strong> guardada para{' '}
                      <strong>{lastScannedResult.studentName}</strong> en la columna "{exportColumnTarget}".
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700">Guardado en Excel ✓</span>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setWorkflowStep(2)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Reconfigurar Claves
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIndex < eligibleStudents.length - 1) {
                        setSelectedStudentIndex((prev) => prev + 1);
                      }
                    }}
                    disabled={selectedStudentIndex >= eligibleStudents.length - 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40"
                  >
                    Siguiente Estudiante →
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-black"
                  >
                    Cerrar Lector
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Ver / Copiar Script en Python OpenCV */}
      {showPythonScript && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 text-white rounded-3xl max-w-2xl w-full border-2 border-emerald-500/50 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">
                    Script Python: Visión por Computadora (OpenCV + pyzbar)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Archivo ubicado en <code>scripts/process_omr_exam.py</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPythonScript(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1">
                <p className="font-bold text-emerald-300">
                  Operaciones del Pipeline de Visión por Computadora:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li><strong>Lectura de Código QR:</strong> Identifica al estudiante y evaluación vía <code>pyzbar</code> o <code>cv2.QRCodeDetector</code>.</li>
                  <li><strong>Alineación y Perspectiva:</strong> Detecta los marcadores fiduciarios en las 4 esquinas y aplica <code>cv2.warpPerspective</code>.</li>
                  <li><strong>Detección de Burbujas:</strong> Evalúa los umbrales de píxeles oscuros (A, B, C, D) para calificar aciertos.</li>
                </ol>
              </div>

              <div>
                <span className="font-mono text-[11px] text-slate-400 block mb-1">
                  Comando para ejecutar:
                </span>
                <pre className="p-2.5 bg-black/60 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto border border-slate-800">
                  pip install opencv-python pyzbar numpy&#10;python scripts/process_omr_exam.py --image examen_estudiante.jpg --total 10
                </pre>
              </div>

              <div>
                <span className="font-mono text-[11px] text-slate-400 block mb-1">
                  Fragmento de código principal (scripts/process_omr_exam.py):
                </span>
                <pre className="p-3 bg-black/80 rounded-xl font-mono text-[10px] text-slate-300 overflow-x-auto border border-slate-800 leading-relaxed max-h-56">
{`# 1. Leer Código QR para saber a quién pertenece el examen
metadata, _ = decode_qr_code(image) # JSON: {"studentId": "...", "activityId": "..."}

# 2. Detectar marcadores de las esquinas y enderezar hoja
warped, success = find_fiducial_markers_and_warp(image, target_width=800, target_height=1100)

# 3. Detectar burbujas rellenadas por umbral de píxeles oscuros
gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

for question_num in range(1, total_questions + 1):
    bubble_pixels = [cv2.countNonZero(thresh[y1:y2, x1:x2]) for (x1,x2,y1,y2) in bubbles]
    selected_option = ['A', 'B', 'C', 'D'][np.argmax(bubble_pixels)]`}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Compatible con Webcams y Smartphones
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`python scripts/process_omr_exam.py --image examen.jpg`);
                    setCopiedPython(true);
                    setTimeout(() => setCopiedPython(false), 2000);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {copiedPython ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPython ? '¡Comando Copiado!' : 'Copiar Comando'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPythonScript(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};