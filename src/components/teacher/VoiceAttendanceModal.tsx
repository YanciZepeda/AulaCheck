import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Sparkles,
  Volume2,
  AlertCircle,
  Info,
  Users,
  X,
  Radio,
  FileCheck2,
  Check,
  Search,
  VolumeX,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Lock,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ListFilter,
  LayoutGrid,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { normalizeSpanishText, fuzzyMatchName } from '../../utils/levenshtein';

interface VoiceAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  realStudents: Student[];
  gradeId?: string;
  gradeName?: string;
  subjectName?: string;
  selectedDate?: string;
  onSaveAttendance?: (records: Array<{ studentId: string; studentName: string; status: 'presente' | 'ausente' }>) => void;
}

interface AttendanceStudentState {
  id: string;
  listNumber?: number;
  fullName: string;
  nie?: string;
  status: 'presente' | 'ausente';
  matchedAt?: string;
  detectedWord?: string; // Palabra clave escrita: "Presente" o "Ausente"
  isHighlighted?: boolean;
}

// Alumnos de prueba con NIE oficial MINED de 8 dígitos continuos (ej. 18882846)
const TEST_STUDENTS_LIST: Array<{ id: string; listNumber: number; fullName: string; nie: string }> = [
  { id: 'test-1', listNumber: 1, fullName: 'Juan Pérez', nie: '18882846' },
  { id: 'test-2', listNumber: 2, fullName: 'María López', nie: '18882847' },
  { id: 'test-3', listNumber: 3, fullName: 'Carlos Díaz', nie: '18882848' },
  { id: 'test-4', listNumber: 4, fullName: 'Ana Rodríguez', nie: '18882849' },
  { id: 'test-5', listNumber: 5, fullName: 'Mateo Hernández', nie: '18882850' },
  { id: 'test-6', listNumber: 6, fullName: 'Lucía Morales', nie: '18882851' },
  { id: 'test-7', listNumber: 7, fullName: 'Diego Flores', nie: '18882852' },
  { id: 'test-8', listNumber: 8, fullName: 'Sofía Martínez', nie: '18882853' }
];

export const VoiceAttendanceModal: React.FC<VoiceAttendanceModalProps> = ({
  isOpen,
  onClose,
  realStudents,
  gradeId = '1-grado',
  gradeName = 'Primer Grado',
  subjectName = 'Matemáticas',
  selectedDate = new Date().toISOString().split('T')[0],
  onSaveAttendance
}) => {
  const { attendance, setSingleAttendance, showToast } = useApp();

  // Source selection: default strictly to REAL enrolled students from the school database
  const [useTestStudents, setUseTestStudents] = useState<boolean>(false);

  // Student attendance states
  const [studentStates, setStudentStates] = useState<AttendanceStudentState[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'presente' | 'ausente'>('all');
  const [viewMode, setViewMode] = useState<'lines' | 'grid'>('lines'); // Vista en Líneas por defecto

  // Explicit Microphone Permission States: 'prompt' | 'requesting' | 'granted' | 'denied'
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'requesting' | 'granted' | 'denied'>('prompt');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMicConnected, setIsMicConnected] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [isGeminiTranscribing, setIsGeminiTranscribing] = useState<boolean>(false);

  // Two-phase Voice Detection: Name detected -> Waiting for Keyword ("Presente" or "Ausente")
  const [pendingStudent, setPendingStudent] = useState<{
    id: string;
    fullName: string;
    listNumber?: number;
    detectedAt: number;
  } | null>(null);

  // Feedback banner for last voice action
  const [lastVoiceAction, setLastVoiceAction] = useState<{
    studentName: string;
    status: 'presente' | 'ausente';
    time: string;
    keyword: string;
  } | null>(null);

  // Quick simulator test input
  const [simulatedInput, setSimulatedInput] = useState<string>('');

  // Refs for audio and recognition cleanup
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        setIsSupported(false);
      }
    }
  }, []);

  // Initialize or reset students list when modal opens or roster changes
  useEffect(() => {
    if (!isOpen) return;

    const shouldUseReal = !useTestStudents && realStudents && realStudents.length > 0;
    const baseList = shouldUseReal
      ? realStudents.map((s, idx) => ({
          id: s.id,
          listNumber: s.listNumber || idx + 1,
          fullName: s.fullName,
          nie: s.nie || '18882846'
        }))
      : TEST_STUDENTS_LIST;

    const initial: AttendanceStudentState[] = baseList.map((st) => {
      const existingRec = attendance.find(
        (a) => a.studentId === st.id && a.date === selectedDate && a.subjectName === subjectName
      );
      const currentStatus: 'presente' | 'ausente' = existingRec?.status === 'presente' ? 'presente' : 'ausente';

      return {
        id: st.id,
        listNumber: st.listNumber,
        fullName: st.fullName,
        nie: st.nie,
        status: currentStatus,
        detectedWord: existingRec?.status === 'presente' ? 'Presente' : 'Sin dictar',
        matchedAt: existingRec?.status === 'presente' ? 'En registro' : undefined
      };
    });

    setStudentStates(initial);
    setPendingStudent(null);
    setTranscriptHistory([]);
    setInterimTranscript('');
    setSavedSuccess(false);
    setLastVoiceAction(null);
  }, [isOpen, useTestStudents, realStudents, attendance, selectedDate, subjectName]);

  // Clean up pending student timeout
  useEffect(() => {
    if (pendingStudent) {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      // Wait 10 seconds for the keyword ("Presente" or "Ausente")
      pendingTimeoutRef.current = setTimeout(() => {
        setPendingStudent(null);
      }, 10000);
    }
    return () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, [pendingStudent]);

  // Live audio level analyser cleanup
  const stopAudioAnalyser = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setIsMicConnected(false);
  };

  /**
   * ACTUALIZACIÓN DE ESTADO Y ESCRITURA DE PALABRA CLAVE EN LA LÍNEA DEL ALUMNO
   * Escucha el nombre del alumno y en esa línea escribe la palabra clave "Presente" o "Ausente"
   */
  const updateStudentStatus = (
    studentId: string,
    newStatus: 'presente' | 'ausente',
    detectedKeywordLabel: string = newStatus === 'presente' ? 'Presente' : 'Ausente'
  ) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const keywordCapitalized = newStatus === 'presente' ? 'Presente' : 'Ausente';

    setStudentStates((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              status: newStatus,
              matchedAt: timeNow,
              detectedWord: keywordCapitalized, // Escribe en esa línea la palabra clave
              isHighlighted: true
            }
          : { ...s, isHighlighted: false }
      )
    );

    // Persist immediately in the teacher's gradebook and monthly sheet
    setSingleAttendance(studentId, subjectName, gradeId, selectedDate, newStatus);

    const studentObj = studentStates.find((s) => s.id === studentId);
    if (studentObj) {
      setLastVoiceAction({
        studentName: studentObj.fullName,
        status: newStatus,
        time: timeNow,
        keyword: keywordCapitalized
      });
    }

    // Retirar resalte visual después de 3.5 segundos
    setTimeout(() => {
      setStudentStates((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, isHighlighted: false } : s))
      );
    }, 3500);
  };

  // Check keywords for presence and absence
  const detectKeywordInText = (textNorm: string): 'presente' | 'ausente' | null => {
    const presentKeywords = [
      'presente',
      'presentes',
      'aqui',
      'aqui estoy',
      'vino',
      'asistio',
      'si vino',
      'esta presente',
      'present',
      'conectado'
    ];

    const absentKeywords = [
      'ausente',
      'ausentes',
      'falta',
      'faltante',
      'no vino',
      'no esta',
      'no asistio',
      'inasistencia',
      'no se encuentra',
      'ausencia'
    ];

    for (const kw of presentKeywords) {
      if (textNorm.includes(kw)) return 'presente';
    }
    for (const kw of absentKeywords) {
      if (textNorm.includes(kw)) return 'ausente';
    }
    return null;
  };

  // Find student matching spoken text
  const matchStudentFromText = (spokenText: string): AttendanceStudentState | null => {
    const normSpoken = normalizeSpanishText(spokenText);
    if (normSpoken.length < 3) return null;

    // 1. Exact or substring match of full name
    for (const st of studentStates) {
      const normName = normalizeSpanishText(st.fullName);
      if (normSpoken.includes(normName)) {
        return st;
      }
    }

    // 2. Fuzzy match with Levenshtein distance
    for (const st of studentStates) {
      if (fuzzyMatchName(normSpoken, st.fullName, 2)) {
        return st;
      }
    }

    // 3. Match by individual first name and last name
    for (const st of studentStates) {
      const parts = normalizeSpanishText(st.fullName).split(' ');
      const first = parts[0] || '';
      const last = parts[1] || '';

      if (first.length >= 3 && normSpoken.includes(first)) {
        if (last.length >= 3 && normSpoken.includes(last)) {
          return st;
        }
      }
    }

    return null;
  };

  // Core Speech Processing: detects student name, waits for keyword ("Presente" / "Ausente")
  const processCapturedSpeech = (rawText: string) => {
    if (!rawText.trim()) return;
    const textNorm = normalizeSpanishText(rawText);

    const keyword = detectKeywordInText(textNorm);

    // Caso 1: Hay un alumno pendiente y se escucha la palabra clave
    if (pendingStudent && keyword) {
      updateStudentStatus(pendingStudent.id, keyword, keyword === 'presente' ? 'Presente' : 'Ausente');
      setPendingStudent(null);
      return;
    }

    // Caso 2: El discurso menciona el nombre de un alumno
    const matched = matchStudentFromText(rawText);

    if (matched) {
      if (keyword) {
        // El docente dijo el nombre y la palabra clave juntos (ej: "Juan Pérez presente")
        updateStudentStatus(matched.id, keyword, keyword === 'presente' ? 'Presente' : 'Ausente');
        setPendingStudent(null);
      } else {
        // El docente solo dijo el nombre: poner su línea en espera de palabra clave
        setPendingStudent({
          id: matched.id,
          fullName: matched.fullName,
          listNumber: matched.listNumber,
          detectedAt: Date.now()
        });
      }
      return;
    }

    // Caso 3: No se detectó un nuevo nombre, pero hay un alumno en espera y se escuchó "presente" o "ausente"
    if (pendingStudent && keyword) {
      updateStudentStatus(pendingStudent.id, keyword, keyword === 'presente' ? 'Presente' : 'Ausente');
      setPendingStudent(null);
    }
  };

  // Setup Web Audio Analyser once real media stream is obtained
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolumeLoop = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 120) * 100));
          setAudioLevel(level);
          animFrameRef.current = requestAnimationFrame(updateVolumeLoop);
        };
        updateVolumeLoop();
      }
    } catch (audioErr) {
      console.warn('Audio analyser optional warning:', audioErr);
    }
  };

  // Initialize SpeechRecognition (Web Speech API)
  const initSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setRecognitionError(
        'Tu navegador no soporta webkitSpeechRecognition de forma nativa (Recomendado: Google Chrome o Microsoft Edge). Puedes usar el simulador de voz abajo para probar.'
      );
      setIsListening(true);
      isListeningRef.current = true;
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-SV'; // Español de El Salvador / Internacional

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcriptPiece = item[0]?.transcript || '';

          if (item.isFinal) {
            finalChunk += transcriptPiece + ' ';
            setTranscriptHistory((prev) => [transcriptPiece.trim(), ...prev.slice(0, 10)]);
            processCapturedSpeech(transcriptPiece);
          } else {
            interim += transcriptPiece;
          }
        }

        setInterimTranscript(interim);
        if (interim.length > 3) {
          processCapturedSpeech(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          setRecognitionError('Acceso al reconocimiento de voz bloqueado por permisos del navegador.');
          setMicPermissionState('denied');
          stopListening();
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
    } catch (err: any) {
      console.error('Error starting recognition:', err);
      setRecognitionError('No se pudo iniciar el servicio de voz.');
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  /**
   * FUNCIÓN NATIVA EXACTA DE SOLICITUD DE MICRÓFONO
   * navigator.mediaDevices.getUserMedia({ audio: true })
   */
  const solicitarPermisoMicrofono = async (mantenerActivo: boolean = true) => {
    setMicPermissionState('requesting');
    setRecognitionError(null);
    setSavedSuccess(false);

    // 1. Verificación de compatibilidad con MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermissionState('denied');
      setRecognitionError('Tu navegador no soporta la API nativa getUserMedia o estás en un entorno no seguro (requiere HTTPS o localhost).');
      return null;
    }

    try {
      // 2. Invocación nativa del diálogo de permiso del navegador
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicPermissionState('granted');
      setIsMicConnected(true);

      // Conectar analizador de volumen en decibeles
      setupAudioAnalyser(stream);

      // Iniciar reconocimiento de voz continuo
      initSpeechRecognition();

      if (!mantenerActivo) {
        stream.getTracks().forEach((track) => track.stop());
      }

      return stream;
    } catch (error: any) {
      console.error('Error al solicitar permiso de micrófono:', error);
      setMicPermissionState('denied');

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setRecognitionError(
          'Permiso Denegado: Has bloqueado el acceso al micrófono. Para habilitarlo: haz clic en el ícono del candado/micrófono en la barra de direcciones de tu navegador, cambia el permiso a "Permitir" y pulsa "Reintentar Conexión".'
        );
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setRecognitionError('Micrófono No Encontrado: No se detectó ningún dispositivo de entrada de audio conectado a este equipo.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setRecognitionError('Dispositivo Ocupado: El micrófono está siendo utilizado por otra aplicación o pestaña.');
      } else {
        setRecognitionError(`Error al acceder al micrófono: ${error.message || error.name}`);
      }

      return null;
    }
  };

  // Stop Speech Recognition & Disconnect Microphone
  const stopListening = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    stopAudioAnalyser();
    setIsListening(false);
    setInterimTranscript('');
  };

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      stopListening();
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, []);

  // Transcribir snippet de audio con modelo gemini-3.5-transcribe
  const handleTranscribeWithGemini = async () => {
    if (!mediaStreamRef.current) {
      showToast('Micrófono requerido', 'Activa el micrófono primero para transcribir con IA.', 'alert');
      return;
    }

    setIsGeminiTranscribing(true);
    try {
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;

          try {
            const res = await fetch('/api/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/webm'
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.transcript) {
                setTranscriptHistory((prev) => [data.transcript, ...prev.slice(0, 10)]);
                processCapturedSpeech(data.transcript);
                showToast('Transcripción Gemini', `Escuchado: "${data.transcript}"`, 'info');
              }
            }
          } catch (err) {
            console.error('Error llamando a /api/transcribe-audio:', err);
          } finally {
            setIsGeminiTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      // Grabar 3 segundos de dicción del docente
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 3000);
    } catch (e) {
      console.error('Error grabando con MediaRecorder:', e);
      setIsGeminiTranscribing(false);
    }
  };

  // Confirm and Save Attendance in batch
  const handleConfirmAndSave = () => {
    stopListening();
    setSavedSuccess(true);

    if (onSaveAttendance) {
      const records = studentStates.map((s) => ({
        studentId: s.id,
        studentName: s.fullName,
        status: s.status
      }));
      onSaveAttendance(records);
    }

    showToast(
      'Asistencia Sincronizada',
      `Lista actualizada con éxito: ${presentCount} presentes y ${absentCount} ausentes guardados en el cuadro.`,
      'success'
    );

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Reset all to absent
  const handleResetAttendance = () => {
    setStudentStates((prev) =>
      prev.map((s) => {
        setSingleAttendance(s.id, subjectName, gradeId, selectedDate, 'ausente');
        return {
          ...s,
          status: 'ausente',
          detectedWord: 'Ausente (Reiniciado)',
          matchedAt: undefined,
          isHighlighted: false
        };
      })
    );
    setPendingStudent(null);
    setTranscriptHistory([]);
    setInterimTranscript('');
    setSavedSuccess(false);
    setLastVoiceAction(null);
  };

  // Statistics
  const totalCount = studentStates.length;
  const presentCount = studentStates.filter((s) => s.status === 'presente').length;
  const absentCount = totalCount - presentCount;
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Filtered students for display
  const displayedStudents = useMemo(() => {
    return studentStates.filter((st) => {
      if (statusFilter !== 'all' && st.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = normalizeSpanishText(searchQuery);
        const nameNorm = normalizeSpanishText(st.fullName);
        const nieMatch = st.nie ? st.nie.toLowerCase().includes(searchQuery.toLowerCase()) : false;
        return nameNorm.includes(q) || nieMatch;
      }
      return true;
    });
  }, [studentStates, statusFilter, searchQuery]);

  // Handle manual simulated speech
  const handleSimulateSpeech = (phrase: string) => {
    if (!phrase.trim()) return;
    setTranscriptHistory((prev) => [phrase.trim(), ...prev.slice(0, 10)]);
    processCapturedSpeech(phrase);
    setSimulatedInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-7xl rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Cabecera Principal - Azul Rey Institucional, Blanco Puro y Gris Claro */}
        <header className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-inner shrink-0">
              <Mic className={`w-5 h-5 ${isListening ? 'text-amber-300 animate-pulse' : 'text-white'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Pase de Asistencia por Voz con Inteligencia Artificial
                </h2>
                <span className="text-[10px] font-mono font-black bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md shadow-2xs">
                  Reconocimiento Fonético Levenshtein
                </span>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-md border border-white/30">
                  Escritura de Palabra Clave en Línea
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Materia: <strong className="text-white font-bold">{subjectName}</strong> • {gradeName} • Fecha: <strong className="text-white font-bold">{selectedDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopListening();
                onClose();
              }}
              className="p-2 text-blue-100 hover:text-white hover:bg-white/15 rounded-xl transition cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* =========================================================================
            PANEL DE PERMISO NATIVO DEL MICRÓFONO (SOLICITUD REAL)
           ========================================================================= */}
        {micPermissionState !== 'granted' && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b-2 border-blue-300 p-4 sm:p-5 shrink-0">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#1E3A8A] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Mic className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1E3A8A] flex items-center gap-2">
                    Acceso al Micrófono Requerido
                    <span className="text-[10px] bg-blue-200 text-blue-900 font-extrabold px-2 py-0.5 rounded-md">
                      API Nativa
                    </span>
                  </h3>
                  <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                    Para capturar el pase de asistencia, presiona el botón. Tu navegador solicitará permiso oficial: selecciona <strong className="text-[#1E3A8A]">"Permitir"</strong>. Al dictar el nombre del estudiante y la palabra clave, el sistema escribirá <strong>"Presente"</strong> o <strong>"Ausente"</strong> en su fila correspondiente.
                  </p>
                  {micPermissionState === 'denied' && (
                    <div className="mt-2 text-xs font-bold text-red-700 bg-red-100/90 border border-red-300 p-2 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{recognitionError || 'Permiso bloqueado. Habilita el micrófono en los ajustes del navegador.'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de Invocación Interactiva */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-activar-mic"
                  type="button"
                  onClick={() => solicitarPermisoMicrofono(true)}
                  disabled={micPermissionState === 'requesting'}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-lg flex items-center gap-2.5 transition cursor-pointer border-2 border-white/40 animate-pulse hover:animate-none"
                >
                  {micPermissionState === 'requesting' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Solicitando al navegador...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-amber-300" />
                      <span>Activar Micrófono</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            BARRA DE CONTROL, ESTADÍSTICAS Y MODO DE VISTA
           ========================================================================= */}
        <div className="bg-[#F8FAFC] border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Controles de Micrófono y Visualizador de Decibeles */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {micPermissionState === 'granted' ? (
              <button
                type="button"
                onClick={isListening ? stopListening : initSpeechRecognition}
                className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Detener Micrófono</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-amber-300" />
                    <span>Reanudar Micrófono</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => solicitarPermisoMicrofono(true)}
                className="px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 bg-[#1E3A8A] text-white shadow-xs hover:bg-[#2563EB] transition cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-amber-300" />
                <span>Activar Micrófono</span>
              </button>
            )}

            {/* Medidor de audio en vivo */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                {isListening ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
                Voz:
              </span>
              <div className="flex items-end gap-0.5 h-3.5 w-12">
                {[20, 40, 60, 80].map((thresh, i) => (
                  <span
                    key={i}
                    style={{ height: `${25 + i * 25}%` }}
                    className={`w-2 rounded-xs transition-all duration-75 ${
                      isListening && audioLevel >= thresh ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-600">
                {isListening ? `${audioLevel}%` : '0%'}
              </span>
            </div>

            {/* Botón de transcripción rápida con Gemini 3.5 Transcribe */}
            {isListening && (
              <button
                type="button"
                onClick={handleTranscribeWithGemini}
                disabled={isGeminiTranscribing}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Transcribe una ráfaga de 3s con el modelo Gemini 3.5 Transcribe"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isGeminiTranscribing ? 'Transcribiendo...' : 'Gemini 3.5 Transcribe'}</span>
              </button>
            )}

            {/* Selector de Nómina (Oficial vs Demo) */}
            <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-xl text-xs font-black">
              <button
                type="button"
                onClick={() => setUseTestStudents(false)}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer ${
                  !useTestStudents ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Users className="w-3 h-3" />
                Oficial ({realStudents?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setUseTestStudents(true)}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer ${
                  useTestStudents ? 'bg-[#2563EB] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Demo ({TEST_STUDENTS_LIST.length})
              </button>
            </div>
          </div>

          {/* Alternador de Vista (Líneas vs Malla) y Acciones */}
          <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
            {/* Switch de Modo de Vista */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewMode('lines')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'lines' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Ver cada alumno en una línea detallada"
              >
                <ListFilter className="w-3 h-3" />
                Vista en Líneas
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Ver todos en cuadrícula panorámica"
              >
                <LayoutGrid className="w-3 h-3" />
                Cuadrícula
              </button>
            </div>

            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl shadow-2xs text-slate-700">
              Total: <strong className="text-[#2563EB] font-black">{totalCount}</strong>
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900">
              Presentes: <strong className="font-black text-emerald-700">{presentCount}</strong>
            </span>
            <span className="px-2.5 py-1 bg-red-50 border border-red-300 rounded-xl text-red-900">
              Ausentes: <strong className="font-black text-red-700">{absentCount}</strong>
            </span>

            {/* Botón rápido reiniciar */}
            <button
              type="button"
              onClick={handleResetAttendance}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 transition flex items-center gap-1 cursor-pointer"
              title="Marcar todos ausentes"
            >
              <RotateCcw className="w-3 h-3" />
              Reiniciar
            </button>

            {/* Botón Guardar Asistencia */}
            <button
              type="button"
              onClick={handleConfirmAndSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Confirmar y Guardar
            </button>
          </div>
        </div>

        {/* Tira Activa de Reconocimiento de Voz */}
        <div className="bg-[#1E293B] text-white px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Radio className={`w-3.5 h-3.5 shrink-0 ${isListening ? 'text-red-400 animate-ping' : 'text-slate-400'}`} />
            <span className="font-mono text-slate-300 text-[11px] truncate">
              {interimTranscript ? (
                <strong className="text-amber-300 font-bold">{interimTranscript}</strong>
              ) : transcriptHistory.length > 0 ? (
                <>
                  <span className="text-slate-400">Escuchado:</span> <span className="text-emerald-300 font-bold">"{transcriptHistory[0]}"</span>
                </>
              ) : isListening ? (
                <span className="text-slate-300">Escuchando... Di el nombre del alumno y luego "Presente" o "Ausente"</span>
              ) : (
                <span className="text-slate-400">Micrófono inactivo. Haz clic en "Activar Micrófono" para dictar.</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pendingStudent && (
              <span className="bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded text-[10px] animate-pulse">
                🎤 Alumno detectado: {pendingStudent.fullName} • Di "Presente" o "Ausente"
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSimulator(!showSimulator)}
              className="text-[11px] text-blue-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              {showSimulator ? 'Ocultar Simulador' : 'Simulador de Prueba'}
              {showSimulator ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Notificación de última acción en línea */}
        {lastVoiceAction && (
          <div className="bg-emerald-50 border-b border-emerald-300 px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                Línea actualizada: <strong className="font-black text-slate-900">{lastVoiceAction.studentName}</strong> &rarr; Se escribió la palabra clave <strong className={lastVoiceAction.status === 'presente' ? 'text-emerald-700 uppercase font-black' : 'text-red-700 uppercase font-black'}>"{lastVoiceAction.keyword}"</strong> a las {lastVoiceAction.time}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastVoiceAction(null)}
              className="text-emerald-700 hover:text-emerald-950 text-[10px] font-bold p-1 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Simulador desplegable de dictado */}
        {showSimulator && (
          <div className="bg-slate-100 border-b border-slate-300 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-600 font-bold text-[11px]">Probar frase:</span>
              {studentStates.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSimulateSpeech(`${s.fullName} presente`)}
                  className="bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-2 py-0.5 rounded border border-slate-300 text-[10px] font-bold cursor-pointer"
                >
                  "{s.fullName} presente"
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSimulateSpeech(simulatedInput);
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                placeholder="Escribe comando (ej: Juan Pérez presente)..."
                value={simulatedInput}
                onChange={(e) => setSimulatedInput(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-800 outline-none w-56 font-mono"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-950 text-white px-2.5 py-1 rounded text-xs font-bold cursor-pointer"
              >
                Simular
              </button>
            </form>
          </div>
        )}

        {/* Barra de Filtro y Búsqueda */}
        <div className="px-4 sm:px-6 py-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o NIE (ej. 18882846)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-slate-600 mr-1 text-[11px]">Filtrar:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                statusFilter === 'all'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              Todos ({studentStates.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('presente')}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                statusFilter === 'presente'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
              }`}
            >
              Presentes ({presentCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ausente')}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                statusFilter === 'ausente'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-red-800 hover:bg-red-50 border border-red-300'
              }`}
            >
              Ausentes ({absentCount})
            </button>
          </div>
        </div>

        {/* =========================================================================
            CONTENEDOR PRINCIPAL: VISTA EN LÍNEAS / TABLA O VISTA EN CUADRÍCULA
            Aquí cada alumno tiene su línea con la palabra clave escrita
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/70">
          {displayedStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-sm">No se encontraron estudiantes con ese criterio</p>
              <p className="text-xs">Verifica el término de búsqueda o cambia el filtro de estado.</p>
            </div>
          ) : viewMode === 'lines' ? (
            /* =======================================================
               VISTA EN LÍNEAS: Cada estudiante en su línea horizontal
               donde se escribe la palabra clave escuchada
               ======================================================= */
            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1E3A8A] text-white font-black text-[11px] uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3 w-12 text-center">N°</th>
                    <th className="py-2.5 px-4">Estudiante</th>
                    <th className="py-2.5 px-3 w-28">NIE Oficial</th>
                    <th className="py-2.5 px-4 text-center bg-blue-900/60 w-44">
                      Palabra Clave Escrita
                    </th>
                    <th className="py-2.5 px-3 text-center w-32">Estado Actual</th>
                    <th className="py-2.5 px-3 text-center w-28">Registro</th>
                    <th className="py-2.5 px-3 text-center w-36">Acción Directa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {displayedStudents.map((st) => {
                    const isPresent = st.status === 'presente';
                    const isPendingThis = pendingStudent?.id === st.id;
                    const isRowHighlighted = st.isHighlighted;

                    return (
                      <tr
                        key={st.id}
                        className={`transition-all duration-200 ${
                          isPendingThis
                            ? 'bg-amber-100/90 ring-2 ring-amber-400 font-bold'
                            : isRowHighlighted
                            ? isPresent
                              ? 'bg-emerald-100 ring-2 ring-emerald-400 animate-pulse'
                              : 'bg-red-100 ring-2 ring-red-400 animate-pulse'
                            : isPresent
                            ? 'bg-emerald-50/40 hover:bg-emerald-50/80'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* N° Correlativo */}
                        <td className="py-2 px-3 text-center font-bold text-slate-500">
                          #{st.listNumber || '•'}
                        </td>

                        {/* Nombre del Estudiante */}
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                              {st.fullName}
                            </span>
                            {isPendingThis && (
                              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded animate-pulse">
                                Esperando palabra clave...
                              </span>
                            )}
                          </div>
                        </td>

                        {/* NIE Oficial MINED */}
                        <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-600">
                          {st.nie || '18882846'}
                        </td>

                        {/* PALABRA CLAVE ESCRITA EN ESTA LÍNEA */}
                        <td className="py-2 px-4 text-center">
                          {isPendingThis ? (
                            <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-950 font-black px-3 py-1 rounded-xl text-xs border border-amber-400 animate-pulse">
                              <Mic className="w-3.5 h-3.5 text-amber-800" />
                              Escuchando palabra...
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-2xs border ${
                                isPresent
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : st.detectedWord && st.detectedWord.includes('Ausente')
                                  ? 'bg-red-600 text-white border-red-700'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                              }`}
                            >
                              <FileText className="w-3 h-3" />
                              {st.detectedWord || (isPresent ? 'Presente' : 'Ausente')}
                            </span>
                          )}
                        </td>

                        {/* Estado Actual (Badge) */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              isPresent
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-red-100 text-red-900 border border-red-300'
                            }`}
                          >
                            {isPresent ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                <span>Presente</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-red-700" />
                                <span>Ausente</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Hora / Timestamp */}
                        <td className="py-2 px-3 text-center text-[10px] text-slate-400 font-mono">
                          {st.matchedAt ? `✓ ${st.matchedAt}` : 'Sin marcar'}
                        </td>

                        {/* Acciones Rápidas (1 clic) */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateStudentStatus(st.id, 'presente', 'Presente')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                              }`}
                              title="Escribir Presente en esta línea"
                            >
                              <Check className="w-3 h-3" />
                              Presente
                            </button>

                            <button
                              type="button"
                              onClick={() => updateStudentStatus(st.id, 'ausente', 'Ausente')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                                !isPresent
                                  ? 'bg-red-600 text-white shadow-2xs'
                                  : 'bg-white hover:bg-red-50 text-red-800 border border-red-300'
                              }`}
                              title="Escribir Ausente en esta línea"
                            >
                              <X className="w-3 h-3" />
                              Ausente
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* =======================================================
               VISTA EN CUADRÍCULA PANORÁMICA
               ======================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {displayedStudents.map((st) => {
                const isPresent = st.status === 'presente';
                const isPendingThis = pendingStudent?.id === st.id;
                const isHighlighted = st.isHighlighted;

                return (
                  <div
                    key={st.id}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2 shadow-xs ${
                      isPendingThis
                        ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-300/40 animate-pulse'
                        : isHighlighted
                        ? isPresent
                          ? 'border-emerald-500 bg-emerald-100 ring-4 ring-emerald-300/40 animate-pulse'
                          : 'border-red-500 bg-red-100 ring-4 ring-red-300/40 animate-pulse'
                        : isPresent
                        ? 'border-emerald-300 bg-emerald-50/60 hover:border-emerald-400'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Fila Superior: Número, Nombre, NIE y Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            isPendingThis
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : isPresent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          #{st.listNumber || '•'}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-black text-xs sm:text-sm text-slate-900 leading-snug truncate" title={st.fullName}>
                            {st.fullName}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIE: <span className="font-bold text-slate-700">{st.nie || '18882846'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Badge de Estado Actual */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0 ${
                          isPresent
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-red-100 text-red-900 border border-red-300'
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            <span>Presente</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-2.5 h-2.5 text-red-600" />
                            <span>Ausente</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Fila Central: Palabra clave escrita en esta tarjeta */}
                    <div className="bg-slate-100 p-1.5 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-500" /> Palabra:
                      </span>
                      <span
                        className={`font-black text-[11px] px-2 py-0.5 rounded-md ${
                          isPendingThis
                            ? 'bg-amber-300 text-slate-950 animate-pulse'
                            : isPresent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {isPendingThis ? 'Escuchando...' : st.detectedWord || (isPresent ? 'Presente' : 'Ausente')}
                      </span>
                    </div>

                    {/* Botones de Acción Directa */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => updateStudentStatus(st.id, 'presente', 'Presente')}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                          isPresent
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        Presente
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStudentStatus(st.id, 'ausente', 'Ausente')}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                          !isPresent
                            ? 'bg-red-600 text-white shadow-2xs'
                            : 'bg-white hover:bg-red-50 text-red-800 border border-red-300'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        Ausente
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span>
              <strong>Detección y Escritura en Línea:</strong> Al escuchar el nombre y la palabra clave, el sistema escribe "Presente" o "Ausente" en la línea del alumno y sincroniza el cuadro.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" /> Asistencia guardada con éxito
              </span>
            )}

            <button
              type="button"
              onClick={handleConfirmAndSave}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Confirmar y Guardar Asistencia</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
