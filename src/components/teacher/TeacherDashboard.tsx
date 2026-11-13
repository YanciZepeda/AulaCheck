import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClipboardCheck,
  FileSpreadsheet,
  ScanLine,
  UploadCloud,
  Download,
  AlertTriangle,
  Plus,
  Save,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  UserX,
  UserCheck,
  Send,
  HelpCircle,
  FileDown,
  Trash2,
  Edit3,
  AlertOctagon,
  X,
  ShieldAlert,
  User
} from 'lucide-react';
import { OMRScannerModal } from '../omr/OMRScannerModal';
import { BubbleSheetGeneratorModal } from '../omr/BubbleSheetGeneratorModal';
import { ExamOMRPreviewModal } from '../omr/ExamOMRPreviewModal';
import { GradesPDFExportModal } from './GradesPDFExportModal';
import { StudentExcelUploadModal } from '../common/StudentExcelUploadModal';
import { MonthlyAttendanceSpreadsheet } from './MonthlyAttendanceSpreadsheet';
import { RealTimeAttendanceVisualizer } from './RealTimeAttendanceVisualizer';
import { TeacherPerformanceAnalytics } from './TeacherPerformanceAnalytics';
import { TeacherPedagogicalChatbot } from './TeacherPedagogicalChatbot';
import { TeacherScheduleManager } from './TeacherScheduleManager';
import { OnlineExamManagerModal } from './OnlineExamManagerModal';
import { ActivityWeight, Student } from '../../types';
import { generateCustomExam } from '../../utils/examGenerator';
import { BarChart3, QrCode, BookOpen, Eye, Printer, FileText, Gamepad2 } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const {
    activeTeacher,
    updateActiveTeacher,
    activeInstitution,
    students,
    periodGrades,
    attendance,
    recordAttendanceList,
    updateGrade,
    addActivity,
    updateActivity,
    deleteActivity,
    markStudentCriticalAlert,
    exportPeriodGradesCSV,
    exportAttendanceCSV,
    importStudents,
    updateTeacherAssignmentDetails,
    virtualExams,
    reEnableStudentExam,
    denyStudentExam
  } = useApp();

  // Active tab inside Teacher View
  const [activeTab, setActiveTab] = useState<'asistencia' | 'asistencia_meses' | 'horario' | 'notas_excel' | 'rendimiento_actividad' | 'gestor_excel'>('asistencia');

  // Active Subject & Grade selector
  const availableGrades = activeInstitution?.gradeLevels || [{ id: '1-grado', name: 'Primer Grado', subjects: ['Matemáticas'] }];
  const [selectedGradeId, setSelectedGradeId] = useState<string>(activeTeacher?.assignedGradeId || '1-grado');
  const [selectedSubject, setSelectedSubject] = useState<string>(activeTeacher?.assignedSubject || 'Matemáticas');
  const [selectedPeriodNum, setSelectedPeriodNum] = useState<number>(1);

  // Available subjects for the currently selected grade
  const currentGradeSubjects = React.useMemo(() => {
    return availableGrades.find((g) => g.id === selectedGradeId)?.subjects || ['Matemáticas'];
  }, [availableGrades, selectedGradeId]);

  // Keep selectedSubject in sync with available subjects when grade changes
  React.useEffect(() => {
    if (currentGradeSubjects.length > 0 && !currentGradeSubjects.includes(selectedSubject)) {
      setSelectedSubject(currentGradeSubjects[0]);
    }
  }, [currentGradeSubjects, selectedSubject]);

  // Dynamically resolve the teacher assigned to the selected subject and grade
  const currentAssignedTeacher = React.useMemo(() => {
    if (activeInstitution?.teachers && activeInstitution.teachers.length > 0) {
      const match = activeInstitution.teachers.find(
        (t) =>
          t.gradeId === selectedGradeId &&
          (t.subjectName.trim().toLowerCase() === selectedSubject.trim().toLowerCase() ||
           t.subjectName.trim().toLowerCase().includes(selectedSubject.trim().toLowerCase()) ||
           selectedSubject.trim().toLowerCase().includes(t.subjectName.trim().toLowerCase()))
      );
      if (match) {
        return {
          id: match.id,
          teacherName: match.teacherName,
          teacherEmail: match.teacherEmail,
          subjectName: match.subjectName,
          gradeId: match.gradeId,
          scheduleTime: match.scheduleTime || '07:30 - 08:30 AM',
          institutionCode: activeInstitution.institutionCode,
          assignedGradeId: selectedGradeId,
          assignedSubject: selectedSubject,
          isExplicitlyAssigned: true
        };
      }
    }

    return {
      id: activeTeacher ? 'active-t' : 'fallback-t',
      teacherName: activeTeacher?.teacherName || 'Docente Responsable',
      teacherEmail: activeTeacher?.teacherEmail || 'docente@escuela.edu.sv',
      subjectName: selectedSubject,
      gradeId: selectedGradeId,
      scheduleTime: activeTeacher?.scheduleTime || '07:30 - 08:30 AM',
      institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
      assignedGradeId: selectedGradeId,
      assignedSubject: selectedSubject,
      isExplicitlyAssigned: false
    };
  }, [activeInstitution, selectedGradeId, selectedSubject, activeTeacher]);

  // OMR Scanner Modal state
  const [isOMRScannerOpen, setIsOMRScannerOpen] = useState<boolean>(false);

  // Bubble Sheet Generator Modal state
  const [isBubbleSheetOpen, setIsBubbleSheetOpen] = useState<boolean>(false);
  const [isDirectPreviewOpen, setIsDirectPreviewOpen] = useState<boolean>(false);
  const [isGradesPDFModalOpen, setIsGradesPDFModalOpen] = useState<boolean>(false);
  const [isOnlineExamModalOpen, setIsOnlineExamModalOpen] = useState<boolean>(false);

  // Student Excel Upload Modal state
  const [isStudentUploadOpen, setIsStudentUploadOpen] = useState<boolean>(false);

  // New Activity Modal state
  const [isNewActivityOpen, setIsNewActivityOpen] = useState<boolean>(false);
  const [newActivityName, setNewActivityName] = useState<string>('');
  const [newActivityWeight, setNewActivityWeight] = useState<number>(20);
  const [newActivityDate, setNewActivityDate] = useState<string>('2026-10-30');
  const [newActivityIsExam, setNewActivityIsExam] = useState<boolean>(false);

  // Delete Activity Modal state
  const [isDeleteActivityOpen, setIsDeleteActivityOpen] = useState<boolean>(false);
  const [activityIdToDelete, setActivityIdToDelete] = useState<string>('');

  // Edit Activity Modal state
  const [isEditActivityOpen, setIsEditActivityOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<ActivityWeight | null>(null);
  const [editActivityName, setEditActivityName] = useState<string>('');
  const [editActivityWeight, setEditActivityWeight] = useState<number>(20);
  const [editActivityDate, setEditActivityDate] = useState<string>('2026-10-30');
  const [editActivityIsExam, setEditActivityIsExam] = useState<boolean>(false);

  // Warning when exceeding 100% total weight
  const [percentageLimitWarning, setPercentageLimitWarning] = useState<{
    isOpen: boolean;
    currentSum: number;
    proposedWeight: number;
    available: number;
  } | null>(null);

  // Edit Teacher Profile Modal state
  const [isEditTeacherProfileOpen, setIsEditTeacherProfileOpen] = useState<boolean>(false);
  const [tempTeacherName, setTempTeacherName] = useState<string>(activeTeacher?.teacherName || '');
  const [tempTeacherEmail, setTempTeacherEmail] = useState<string>(activeTeacher?.teacherEmail || '');

  // Attendance Checklist state
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceTime, setAttendanceTime] = useState<string>('07:30 AM');
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<
    Record<string, 'presente' | 'ausente' | 'tardanza' | 'justificado'>
  >({});
  const [attendanceNotesMap, setAttendanceNotesMap] = useState<Record<string, string>>({});

  // Excel Manager Upload state
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [excelAssignedRole, setExcelAssignedRole] = useState<'notas' | 'asistencia'>('notas');
  const [excelPreviewData, setExcelPreviewData] = useState<any[] | null>(null);

  // Students in selected grade
  const gradeStudents = students.filter(
    (s) => s.gradeId === selectedGradeId && s.institutionCode === (activeInstitution?.institutionCode || 'ESC-PUB-2026')
  );

  // Current period grades matching grade & subject (guarantees student enrolment across every subject)
  const currentPeriod = React.useMemo(() => {
    const found = periodGrades.find(
      (p) =>
        p.gradeId === selectedGradeId &&
        p.subjectName === selectedSubject &&
        p.period === selectedPeriodNum &&
        p.institutionCode === (activeInstitution?.institutionCode || 'ESC-PUB-2026')
    );
    if (found) return found;

    // Check if there is a record for this subject & grade in another period
    const bySubject = periodGrades.find(
      (p) => p.subjectName === selectedSubject && p.gradeId === selectedGradeId
    );
    if (bySubject) {
      return {
        ...bySubject,
        period: selectedPeriodNum,
        id: `period-${selectedGradeId}-${selectedSubject}-${selectedPeriodNum}`
      };
    }

    // Default template so every subject has activities and enrolled students
    return {
      id: `period-${selectedGradeId}-${selectedSubject}-${selectedPeriodNum}`,
      institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
      gradeId: selectedGradeId,
      subjectName: selectedSubject,
      period: selectedPeriodNum,
      criticalThreshold: 6.0,
      activities: [
        { id: `act-${selectedSubject}-1`, name: 'Actividad Evaluada 1', percentage: 25, dueDate: '2026-10-25' },
        { id: `act-${selectedSubject}-2`, name: 'Tareas y Laboratorios', percentage: 35, dueDate: '2026-11-02' },
        { id: `act-${selectedSubject}-3`, name: 'Examen de Periodo', percentage: 40, dueDate: '2026-11-12', isExam: true }
      ],
      grades: []
    };
  }, [periodGrades, selectedGradeId, selectedSubject, selectedPeriodNum, activeInstitution]);

  // Initialize attendance checklist if empty
  const handleMarkAllPresent = () => {
    const updated: Record<string, 'presente' | 'ausente' | 'tardanza' | 'justificado'> = {};
    gradeStudents.forEach((st) => {
      updated[st.id] = 'presente';
    });
    setAttendanceStatusMap(updated);
  };

  const handleSetAttendanceStatus = (studentId: string, status: 'presente' | 'ausente' | 'tardanza' | 'justificado') => {
    setAttendanceStatusMap((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Submit attendance and trigger notifications to parents for absent students
  const handleSaveAttendance = () => {
    const records = gradeStudents.map((st) => ({
      studentId: st.id,
      status: attendanceStatusMap[st.id] || 'presente',
      notes: attendanceNotesMap[st.id] || ''
    }));

    recordAttendanceList(records, selectedSubject, selectedGradeId, attendanceTime, attendanceDate);
  };

  // Add new activity with 100% weight limit validation
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim() || !currentPeriod) return;

    const currentSum = currentPeriod.activities.reduce((acc, a) => acc + a.percentage, 0);
    const weightNum = Number(newActivityWeight);
    const proposedTotal = currentSum + weightNum;

    // Requirement: Alert if teacher adds evaluations exceeding 100%
    if (proposedTotal > 100) {
      setPercentageLimitWarning({
        isOpen: true,
        currentSum,
        proposedWeight: weightNum,
        available: Math.max(0, 100 - currentSum)
      });
      return;
    }

    const success = addActivity(currentPeriod.id, {
      name: newActivityName,
      percentage: weightNum,
      dueDate: newActivityDate,
      isExam: newActivityIsExam
    });

    if (success) {
      setNewActivityName('');
      setIsNewActivityOpen(false);
    }
  };

  // Update existing activity
  const handleUpdateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !currentPeriod || !editActivityName.trim()) return;

    const otherSum = currentPeriod.activities
      .filter((a) => a.id !== editingActivity.id)
      .reduce((acc, a) => acc + a.percentage, 0);
    const weightNum = Number(editActivityWeight);
    const proposedTotal = otherSum + weightNum;

    if (proposedTotal > 100) {
      setPercentageLimitWarning({
        isOpen: true,
        currentSum: otherSum,
        proposedWeight: weightNum,
        available: Math.max(0, 100 - otherSum)
      });
      return;
    }

    const success = updateActivity(currentPeriod.id, editingActivity.id, {
      name: editActivityName,
      percentage: weightNum,
      dueDate: editActivityDate,
      isExam: editActivityIsExam
    });

    if (success) {
      setIsEditActivityOpen(false);
      setEditingActivity(null);
    }
  };

  // Delete selected activity
  const handleConfirmDeleteActivity = () => {
    if (!currentPeriod || !activityIdToDelete) return;
    deleteActivity(currentPeriod.id, activityIdToDelete);
    setIsDeleteActivityOpen(false);
    setActivityIdToDelete('');
  };

  // Persist updated teacher profile for the current subject and grade
  const handleSaveTeacherProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempTeacherName.trim()) return;

    // Save in institution assignments for current grade and subject
    updateTeacherAssignmentDetails(
      activeInstitution?.institutionCode || 'ESC-PUB-2026',
      selectedGradeId,
      selectedSubject,
      {
        teacherName: tempTeacherName.trim(),
        teacherEmail: tempTeacherEmail.trim()
      }
    );

    // Also update global activeTeacher
    updateActiveTeacher({
      teacherName: tempTeacherName.trim(),
      teacherEmail: tempTeacherEmail.trim(),
      assignedSubject: selectedSubject,
      assignedGradeId: selectedGradeId
    });
    setIsEditTeacherProfileOpen(false);
  };

  // Handle mock file upload for Excel manager
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      // Generate preview rows
      setExcelPreviewData([
        { id: 1, col1: 'Alejandro Aguilar', col2: '2026-48912', col3: '9.0', col4: '8.5' },
        { id: 2, col1: 'Camila Benítez', col2: '2026-48913', col3: '9.5', col4: '10.0' },
        { id: 3, col1: 'Diego Carranza', col2: '2026-48914', col3: '4.8', col4: '5.2' }
      ]);
    }
  };

  // Pending Anti-Cheat alerts from active online exams where a student has left the page
  const pendingAntiCheatAlerts = React.useMemo(() => {
    const list: Array<{
      examId: string;
      studentId: string;
      studentName: string;
      subjectName: string;
      gradeName: string;
      leftPageCount: number;
    }> = [];

    virtualExams.forEach((ex) => {
      if (!ex.isActive) return;
      Object.values(ex.studentSessions).forEach((sess) => {
        if (sess.hasLeftPage && sess.status === 'blocked' && !sess.deniedByTeacher) {
          list.push({
            examId: ex.id,
            studentId: sess.studentId,
            studentName: sess.studentName,
            subjectName: ex.subjectName,
            gradeName: ex.gradeName,
            leftPageCount: sess.leftPageCount || 1
          });
        }
      });
    });

    return list;
  }, [virtualExams]);

  return (
    <div className="space-y-6">
      {/* Notificación de Seguridad en Tiempo Real (Anti-Cheat): Alumnos que salieron de la prueba */}
      {pendingAntiCheatAlerts.length > 0 && (
        <div className="space-y-3">
          {pendingAntiCheatAlerts.map((alert) => (
            <div
              key={`${alert.examId}-${alert.studentId}`}
              className="bg-white border-2 border-red-500 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black shadow-md shrink-0 animate-pulse">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-red-100 text-red-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-md border border-red-300">
                      Alerta Anti-Copia en Vivo
                    </span>
                    <span className="text-xs font-bold text-red-600">
                      {alert.leftPageCount} salida(s) de pestaña detectada(s)
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#1E293B] mt-1">
                    {alert.studentName} ha salido de la página del examen virtual
                  </h3>
                  <p className="text-xs text-[#475569] font-medium">
                    Materia: <strong>{alert.subjectName}</strong> • {alert.gradeName} • El alumno se encuentra bloqueado esperando tu decisión.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Conceder Permiso o Denegar (Nota 0.0) */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => reEnableStudentExam(alert.examId, alert.studentId)}
                  className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5"
                  title="Permitir que el alumno continúe su examen"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Permitir Continuar
                </button>
                <button
                  type="button"
                  onClick={() => denyStudentExam(alert.examId, alert.studentId)}
                  className="flex-1 md:flex-initial bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5"
                  title="Denegar permiso y calificar automáticamente con 0.0 en el cuadro de notas"
                >
                  <AlertOctagon className="w-4 h-4" />
                  Denegar Permiso (Nota 0.0)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Teacher Profile Banner - Azul Rey Institucional y Blanco Puro */}
      <div className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-white/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black px-3 py-1 bg-white/20 text-white rounded-full uppercase tracking-wider border border-white/30 shadow-xs">
              Módulo Docente Institucional
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {currentAssignedTeacher.scheduleTime}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-emerald-300 shrink-0" />
              <span>{currentAssignedTeacher.teacherName}</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setTempTeacherName(currentAssignedTeacher.teacherName);
                setTempTeacherEmail(currentAssignedTeacher.teacherEmail);
                setIsEditTeacherProfileOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs bg-white text-[#1E3A8A] hover:bg-blue-50 px-3 py-1 rounded-xl transition shadow-xs font-black border border-white"
              title="Editar los datos del docente asignado a esta materia"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar Docente
            </button>
          </div>
          <p className="text-xs sm:text-sm text-blue-100 font-medium mt-1">
            Materia: <strong className="text-white font-bold">{selectedSubject}</strong> • Grado:{' '}
            <strong className="text-white font-bold">
              {availableGrades.find((g) => g.id === selectedGradeId)?.name || 'Primer Grado'}
            </strong>{' '}
            • Correo: <span className="font-mono text-blue-200 font-semibold">{currentAssignedTeacher.teacherEmail}</span>{' '}
            • Código Escuela: <span className="font-mono text-amber-300 font-black">{activeInstitution?.institutionCode}</span>
          </p>
        </div>

        {/* Quick controls: Change grade / subject / period */}
        <div className="flex flex-wrap items-center gap-2 bg-[#1E3A8A]/90 p-3 rounded-2xl border-2 border-white/30 text-xs shadow-md">
          <div>
            <label className="block text-[11px] text-blue-100 font-bold mb-0.5">Grado:</label>
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="bg-white text-[#1E293B] font-black rounded-lg px-2.5 py-1.5 outline-none border border-slate-300"
            >
              {availableGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-blue-100 font-bold mb-0.5">Materia:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-white text-[#1E293B] font-black rounded-lg px-2.5 py-1.5 outline-none border border-slate-300"
            >
              {availableGrades
                .find((g) => g.id === selectedGradeId)
                ?.subjects.map((sub, i) => (
                  <option key={i} value={sub}>
                    {sub}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-blue-100 font-bold mb-0.5">Periodo:</label>
            <select
              value={selectedPeriodNum}
              onChange={(e) => setSelectedPeriodNum(Number(e.target.value))}
              className="bg-white text-[#1E293B] font-black rounded-lg px-2.5 py-1.5 outline-none border border-slate-300"
            >
              <option value={1}>Periodo 1</option>
              <option value={2}>Periodo 2</option>
              <option value={3}>Periodo 3</option>
              <option value={4}>Periodo 4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs with Azul Rey Accent */}
      <div className="flex border-b-2 border-slate-200 space-x-1 sm:space-x-3 overflow-x-auto text-sm font-bold bg-white p-1 rounded-2xl shadow-2xs">
        <button
          onClick={() => setActiveTab('asistencia')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'asistencia'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Visualizador de Asistencia (En Vivo)
        </button>

        <button
          onClick={() => setActiveTab('asistencia_meses')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'asistencia_meses'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Cuadro Asistencia Meses (Periodo)
        </button>

        <button
          onClick={() => setActiveTab('horario')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'horario'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <Clock className="w-4 h-4" />
          Horario Semanal
        </button>

        <button
          onClick={() => setActiveTab('notas_excel')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'notas_excel'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Cuadro de Notas (Hoja de Periodo)
        </button>

        <button
          onClick={() => setActiveTab('rendimiento_actividad')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'rendimiento_actividad'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Rendimiento por Actividad (Gráficas)
        </button>

        <button
          onClick={() => setActiveTab('gestor_excel')}
          className={`py-2.5 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'gestor_excel'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Gestor de Archivos Excel
        </button>
      </div>

      {/* =========================================================================
          TAB 1: VISUALIZADOR DE ASISTENCIA EN TIEMPO REAL (#7D8FAF & #F9DE9D)
      ========================================================================= */}
      {activeTab === 'asistencia' && (
        <RealTimeAttendanceVisualizer
          gradeId={selectedGradeId}
          subjectName={selectedSubject}
        />
      )}

      {/* =========================================================================
          TAB: CUADRO DE ASISTENCIA MENSUAL (DIVIDIDO POR MESES Y DÍAS DE SEMANA)
      ========================================================================= */}
      {activeTab === 'asistencia_meses' && (
        <MonthlyAttendanceSpreadsheet
          gradeId={selectedGradeId}
          subjectName={selectedSubject}
          periodNum={selectedPeriodNum}
        />
      )}

      {/* =========================================================================
          TAB: HORARIO ESCOLAR SEMANAL
      ========================================================================= */}
      {activeTab === 'horario' && (
        <TeacherScheduleManager
          currentSubject={selectedSubject}
          currentGradeId={selectedGradeId}
        />
      )}

      {/* =========================================================================
          TAB: RENDIMIENTO DE LOS ESTUDIANTES POR ACTIVIDAD (GRÁFICAS)
      ========================================================================= */}
      {activeTab === 'rendimiento_actividad' && (
        <TeacherPerformanceAnalytics
          gradeId={selectedGradeId}
          subjectName={selectedSubject}
          periodNum={selectedPeriodNum}
        />
      )}

      {/* =========================================================================
          TAB 2: INGRESO DE NOTAS (CUADRO EXCEL DE PERIODO CON ESCÁNER OMR)
      ========================================================================= */}
      {activeTab === 'notas_excel' && currentPeriod && (
        <div className="space-y-4">
          {/* Top action toolbar - Pure White Container */}
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-[#1E293B] text-base">
                Cuadro Oficial de Notas • Periodo {currentPeriod.period} ({selectedSubject})
              </h3>
              <p className="text-xs text-[#475569] font-medium mt-0.5">
                Edita calificaciones directamente en las celdas, administra evaluaciones con límite del 100% o usa el lector óptico OMR.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Botón Examen Virtual en Vivo */}
              <button
                type="button"
                onClick={() => setIsOnlineExamModalOpen(true)}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
                title="Crear o monitorear Examen Virtual en Vivo con IA, claves únicas y anti-copia"
              >
                <Gamepad2 className="w-4 h-4 text-white" />
                Examen Virtual
              </button>

              {/* Botón Generador de Examen y Hojas de Burbujas OMR en PDF con QR */}
              <button
                type="button"
                onClick={() => setIsBubbleSheetOpen(true)}
                className="bg-[#1E3A8A] hover:bg-[#1E40AF] text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
                title="Generar examen personalizado con Excel/documento y hojas de burbujas OMR con QR y claves múltiples"
              >
                <BookOpen className="w-4 h-4 text-white" />
                Generar Examen & OMR
              </button>

              {/* Botón Lector Óptico de Examen OMR */}
              <button
                type="button"
                onClick={() => setIsOMRScannerOpen(true)}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5"
                title="Escanear examen físico con hoja de burbujas (OMR)"
              >
                <ScanLine className="w-4 h-4 text-white" />
                Escanear Examen (OMR)
              </button>

              {/* Botón Vista Previa PDF de Examen y Hojas OMR */}
              <button
                type="button"
                onClick={() => setIsDirectPreviewOpen(true)}
                className="bg-white hover:bg-blue-50 text-[#1E3A8A] border-2 border-slate-300 hover:border-[#2563EB] px-3.5 py-2 rounded-xl text-xs font-black shadow-2xs transition flex items-center gap-1.5"
                title="Previsualizar las hojas OMR y exámenes antes de descargarlos como PDF"
              >
                <Eye className="w-4 h-4 text-[#2563EB]" />
                Vista Previa PDF
              </button>

              {/* Botón agregar actividad y ponderación */}
              <button
                type="button"
                onClick={() => {
                  const currentSum = currentPeriod.activities.reduce((acc, a) => acc + a.percentage, 0);
                  const rem = Math.max(0, 100 - currentSum);
                  setNewActivityWeight(rem > 0 ? (rem >= 20 ? 20 : rem) : 10);
                  setIsNewActivityOpen(true);
                }}
                className="bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] px-3.5 py-2 rounded-xl text-xs font-black shadow-2xs transition flex items-center gap-1.5 border-2 border-[#2563EB]/40"
              >
                <Plus className="w-4 h-4 text-[#2563EB]" />
                Nueva Actividad (%)
              </button>

              {/* Botón eliminar evaluación y seleccionar cuál eliminar */}
              <button
                type="button"
                onClick={() => {
                  if (currentPeriod.activities.length > 0) {
                    setActivityIdToDelete(currentPeriod.activities[0].id);
                  }
                  setIsDeleteActivityOpen(true);
                }}
                disabled={currentPeriod.activities.length === 0}
                className="border-2 border-red-400 bg-red-50 hover:bg-red-100 text-red-950 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
                title="Seleccionar y eliminar una evaluación del cuadro de notas"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                Eliminar Evaluación
              </button>

              {/* Botón Inscribir Estudiantes con Excel directo sin escribir */}
              <button
                type="button"
                onClick={() => setIsStudentUploadOpen(true)}
                className="border-2 border-slate-300 hover:bg-slate-50 text-[#1E293B] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Cargar lista de estudiantes mediante archivo Excel sin escribir nombres"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Inscribir con Excel
              </button>

              {/* Botón Descargar Excel */}
              <button
                type="button"
                onClick={() => exportPeriodGradesCSV(currentPeriod.id)}
                className="border-2 border-slate-300 bg-white hover:bg-slate-50 text-[#1E293B] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Descargar cuadro en formato CSV compatible con Microsoft Excel"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Descargar Excel
              </button>

              {/* Botón Exportar PDF Oficial Profesional con Logo */}
              <button
                type="button"
                onClick={() => setIsGradesPDFModalOpen(true)}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5"
                title="Exportar cuadro de notas oficial en PDF profesional con el logo de la institución"
              >
                <Printer className="w-4 h-4" />
                Exportar PDF Oficial (Con Logo)
              </button>
            </div>
          </div>

          {/* Interactive Spreadsheet Grid - Pure White Container & Azul Rey Header */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs bg-white">
                <thead>
                  <tr className="bg-[#2563EB] text-white border-b-2 border-[#1D4ED8] font-black uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-10 text-center border-r border-blue-400/40 text-white font-black">N°</th>
                    <th className="p-3 min-w-[190px] border-r border-blue-400/40 text-white font-black">Estudiante</th>
                    <th className="p-3 w-28 border-r border-blue-400/40 text-white font-black">NIE</th>

                    {/* Columns for activities with edit and delete controls */}
                    {currentPeriod.activities.map((act) => (
                      <th
                        key={act.id}
                        className="p-2.5 text-center border-r border-blue-400/40 min-w-[135px] group relative bg-[#1D4ED8] text-white font-black"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-black text-white truncate text-center flex-1" title={act.name}>
                            {act.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingActivity(act);
                                setEditActivityName(act.name);
                                setEditActivityWeight(act.percentage);
                                setEditActivityDate(act.dueDate || '2026-10-30');
                                setEditActivityIsExam(!!act.isExam);
                                setIsEditActivityOpen(true);
                              }}
                              className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-[#1E3A8A] transition"
                              title="Editar esta evaluación"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActivityIdToDelete(act.id);
                                setIsDeleteActivityOpen(true);
                              }}
                              className="p-1 rounded bg-red-600 hover:bg-red-700 text-white transition"
                              title="Eliminar esta evaluación del cuadro"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#1E3A8A] bg-white font-black px-2 py-0.5 rounded-full inline-block shadow-2xs">
                          {act.percentage}% {act.isExam && '📝'}
                        </span>
                      </th>
                    ))}

                    <th className="p-3 text-center bg-[#1E3A8A] text-white border-r border-blue-900 font-black w-28">
                      Promedio
                    </th>
                    <th className="p-3 text-center bg-[#2563EB] text-white font-black w-36">Estado / Alerta</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 font-mono bg-white">
                  {gradeStudents.map((st) => {
                    // Compute weighted average
                    let weightedSum = 0;
                    let totalWeight = 0;
                    currentPeriod.activities.forEach((act) => {
                      const g = currentPeriod.grades.find(
                        (gr) => gr.studentId === st.id && gr.activityId === act.id
                      );
                      if (g !== undefined) {
                        weightedSum += g.score * (act.percentage / 100);
                        totalWeight += act.percentage;
                      }
                    });

                    const avg = totalWeight > 0 ? weightedSum / (totalWeight / 100) : 0;
                    const isCritical = avg < currentPeriod.criticalThreshold && totalWeight > 0;

                    return (
                      <tr
                        key={st.id}
                        className={`hover:bg-blue-50/50 transition ${
                          isCritical ? 'bg-red-50/50' : ''
                        }`}
                      >
                        <td className="p-3 text-center font-black text-[#1E3A8A] border-r border-slate-200 text-sm">
                          {st.listNumber}
                        </td>
                        <td className="p-3 font-sans font-bold text-[#1E293B] border-r border-slate-200 text-sm">
                          {st.fullName}
                        </td>
                        <td className="p-3 font-bold text-[#1E293B] border-r border-slate-200">
                          {st.nie || 'N/A'}
                        </td>

                        {/* Editable grade cells */}
                        {currentPeriod.activities.map((act) => {
                          const currentScore = currentPeriod.grades.find(
                            (g) => g.studentId === st.id && g.activityId === act.id
                          )?.score;

                          return (
                            <td
                              key={act.id}
                              className="p-2 text-center border-r border-slate-200"
                            >
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                value={currentScore !== undefined ? currentScore : ''}
                                placeholder="0.0"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  updateGrade(
                                    currentPeriod.id,
                                    st.id,
                                    act.id,
                                    isNaN(val) ? 0 : Math.min(10, Math.max(0, val))
                                  );
                                }}
                                className={`w-16 px-2 py-1 text-center font-black rounded-lg border-2 text-xs outline-none transition focus:border-[#2563EB] ${
                                  (currentScore || 0) < 6.0
                                    ? 'border-red-500 bg-red-50 text-red-950 font-black'
                                    : 'border-slate-300 bg-white text-[#1E293B] font-black'
                                }`}
                              />
                            </td>
                          );
                        })}

                        {/* Auto-calculated Weighted Average */}
                        <td className="p-3 text-center font-black text-sm border-r border-slate-200 bg-blue-50/30">
                          <span
                            className={`inline-block font-black text-xs px-2.5 py-1 rounded-lg border shadow-2xs ${
                              avg < 6.0
                                ? 'text-red-600 bg-red-50 border-red-300'
                                : 'text-[#2563EB] bg-blue-50 border-blue-200'
                            }`}
                          >
                            {avg.toFixed(1)}
                          </span>
                        </td>

                        {/* Status / Critical warning button to alert parents */}
                        <td className="p-3 font-sans text-center">
                          {isCritical ? (
                            <button
                              type="button"
                              onClick={() => markStudentCriticalAlert(st.id, selectedSubject, avg)}
                              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-xs transition"
                              title="Enviar notificación de estado crítico / nivel bajo al padre"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Notificar Crítico
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-900 bg-emerald-100 border border-emerald-300 font-black text-xs px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {avg >= 8.5 ? 'Excelente' : 'Aprobado'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Excel footer bar */}
            <div className="p-3.5 bg-slate-100 dark:bg-slate-850 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>
                Ponderación acumulada de actividades:{' '}
                <strong className="text-slate-950 dark:text-white font-black text-sm">
                  {currentPeriod.activities.reduce((acc, a) => acc + a.percentage, 0)}%
                </strong>{' '}
                de 100%
              </span>
              <span className="italic text-slate-700 dark:text-slate-300">
                Los cambios se sincronizan en tiempo real con el panel de los padres.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: GESTOR DE ARCHIVOS EXCEL (SUBIR Y ASIGNAR ROL O DESCARGAR)
      ========================================================================= */}
      {activeTab === 'gestor_excel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Subir Archivo Excel y Asignar Rol */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-black text-sm text-[#1E293B]">
                  Subir Cuadro de Excel y Asignar Rol
                </h3>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed font-medium">
                Sube tu plantilla de Excel al inicio del periodo para cargar actividades, ponderaciones o asistencia de estudiantes.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1">
                  1. Rol Asignado al Cuadro de Excel:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExcelAssignedRole('notas')}
                    className={`p-2.5 rounded-xl border-2 text-xs font-black text-center transition ${
                      excelAssignedRole === 'notas'
                        ? 'border-[#2563EB] bg-blue-50 text-[#1E3A8A]'
                        : 'border-slate-200 text-[#1E293B] hover:bg-slate-50'
                    }`}
                  >
                    📊 Notas por Periodo
                  </button>

                  <button
                    type="button"
                    onClick={() => setExcelAssignedRole('asistencia')}
                    className={`p-2.5 rounded-xl border-2 text-xs font-black text-center transition ${
                      excelAssignedRole === 'asistencia'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-[#1E293B] hover:bg-slate-50'
                    }`}
                  >
                    📅 Asistencia Diaria
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1">
                  2. Seleccionar Archivo (.xlsx / .csv):
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-8 h-8 text-[#2563EB] mx-auto mb-1.5" />
                  <span className="text-xs font-bold text-[#1E293B] block">
                    {uploadedFileName || 'Haz clic para seleccionar o arrastra el archivo'}
                  </span>
                  <span className="text-[11px] text-[#64748B]">Archivos Excel compatibles (.csv, .xlsx)</span>
                </div>
              </div>

              {uploadedFileName && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between font-bold">
                  <span>
                    Archivo: <strong>{uploadedFileName}</strong> asignado como{' '}
                    <strong>{excelAssignedRole === 'notas' ? 'Notas por Periodo' : 'Asistencia'}</strong>.
                  </span>
                  <span className="font-black text-emerald-700">✓ Listo</span>
                </div>
              )}
            </div>

            {/* Box 2: Descargar Cuadros Llenos con Datos */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-[#1E293B]">
                  Descargar Cuadros Oficiales con Datos
                </h3>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed font-medium">
                Exporta al instante los cuadros completos con todos los datos de estudiantes, NIE, asistencias acumuladas y notas con fórmulas compatibles con Excel.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[#1E293B]">
                      Cuadro de Notas por Periodo ({selectedSubject})
                    </h4>
                    <p className="text-[11px] text-[#64748B] font-medium">
                      Incluye actividades ({currentPeriod?.activities.length}), ponderaciones y promedios finales.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGradesPDFModalOpen(true)}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      title="Exportar cuadro oficial en formato PDF con logo institucional"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Exportar PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => currentPeriod && exportPeriodGradesCSV(currentPeriod.id)}
                      className="border border-slate-300 hover:bg-slate-100 text-[#1E293B] px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Descargar archivo CSV compatible con Excel"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      Excel
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Cuadro de Asistencia Acumulada por Periodo
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Registra presentes, faltas, tardanzas y porcentaje de asistencia por estudiante.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportAttendanceCSV(selectedSubject, selectedGradeId)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Actividad con Ponderación */}
      {isNewActivityOpen && currentPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Agregar Actividad Evaluada al Cuadro de Notas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Indica el nombre y el valor porcentual que tendrá en el Periodo {currentPeriod.period}.
              </p>
            </div>

            {/* Current weighting status bar */}
            {(() => {
              const currentTotal = currentPeriod.activities.reduce((acc, a) => acc + a.percentage, 0);
              const remaining = Math.max(0, 100 - currentTotal);
              const wouldBe = currentTotal + Number(newActivityWeight || 0);
              const exceeds = wouldBe > 100;
              return (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  exceeds
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-800 dark:text-red-300'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <div className="flex justify-between font-semibold">
                    <span>Ponderación acumulada actual:</span>
                    <span>{currentTotal}% / 100%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Porcentaje disponible:</span>
                    <span className="font-bold">{remaining}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${exceeds ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, wouldBe)}%` }}
                    />
                  </div>
                  {exceeds && (
                    <p className="text-[11px] font-bold text-red-600 dark:text-red-400 pt-0.5">
                      ⚠️ Con esta actividad sumaría {wouldBe}%, sobrepasando el 100%. Debes reducir el porcentaje.
                    </p>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleCreateActivity} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Actividad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Tarea 2: Fracciones o Laboratorio"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ponderación (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newActivityWeight}
                    onChange={(e) => setNewActivityWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    required
                    value={newActivityDate}
                    onChange={(e) => setNewActivityDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isExamCheck"
                  checked={newActivityIsExam}
                  onChange={(e) => setNewActivityIsExam(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="isExamCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Es un <strong>Examen</strong> (Se sincronizará con el escáner OMR y calendario de padres)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewActivityOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Advertencia cuando sobrepasa el límite del 100% */}
      {percentageLimitWarning && percentageLimitWarning.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border-2 border-red-500 dark:border-red-600 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/60 rounded-xl">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Acción Inválida: Límite del 100% Superado
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                  La suma de las evaluaciones no puede sobrepasar el 100%
                </p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 p-3.5 rounded-xl border border-red-200 dark:border-red-900 text-xs text-slate-800 dark:text-slate-200 space-y-2.5">
              <p className="leading-relaxed">
                Has ingresado una ponderación de <strong>{percentageLimitWarning.proposedWeight}%</strong>.
              </p>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-red-200/60 dark:border-red-800/60 font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Suma actual de evaluaciones:</span>
                  <span className="font-bold">{percentageLimitWarning.currentSum}%</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Ponderación a agregar/modificar:</span>
                  <span className="font-bold">+{percentageLimitWarning.proposedWeight}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-bold text-red-700 dark:text-red-300">
                  <span>Total resultante:</span>
                  <span>
                    {percentageLimitWarning.currentSum + percentageLimitWarning.proposedWeight}% (Excede por {percentageLimitWarning.currentSum + percentageLimitWarning.proposedWeight - 100}%)
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong>Ejemplo explicativo:</strong> Si agregas cuatro evaluaciones de 30% (30% x 4 = 120%), la acción es inválida porque supera el 100%. Tienes que ajustar los porcentajes para que la suma de todas las evaluaciones quede con el límite de exactamente o máximo 100%.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {percentageLimitWarning.available > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setNewActivityWeight(percentageLimitWarning.available);
                    setPercentageLimitWarning(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs text-center"
                >
                  Ajustar al disponible ({percentageLimitWarning.available}%)
                </button>
              )}
              <button
                type="button"
                onClick={() => setPercentageLimitWarning(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition text-center"
              >
                Entendido, voy a corregirlo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Evaluación y Seleccionar Cuál Eliminar */}
      {isDeleteActivityOpen && currentPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Eliminar Evaluación del Cuadro de Notas
                </h3>
              </div>
              <button
                onClick={() => setIsDeleteActivityOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Selecciona la evaluación que deseas eliminar del Periodo {currentPeriod.period} ({selectedSubject}).
            </p>

            {currentPeriod.activities.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-xs text-slate-500">
                No hay evaluaciones registradas en este periodo.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Seleccionar Evaluación a Eliminar:
                  </label>
                  <select
                    value={activityIdToDelete || currentPeriod.activities[0]?.id}
                    onChange={(e) => setActivityIdToDelete(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    {currentPeriod.activities.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.name} ({act.percentage}%) {act.isExam ? '• Examen' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Details of selected activity */}
                {(() => {
                  const targetId = activityIdToDelete || currentPeriod.activities[0]?.id;
                  const selectedAct = currentPeriod.activities.find((a) => a.id === targetId);
                  if (!selectedAct) return null;
                  return (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs space-y-1.5 text-red-900 dark:text-red-200">
                      <div className="font-bold flex items-center justify-between">
                        <span>{selectedAct.name}</span>
                        <span className="font-mono bg-red-200/60 dark:bg-red-900/60 px-2 py-0.5 rounded text-[11px]">
                          {selectedAct.percentage}% de nota
                        </span>
                      </div>
                      <p className="text-[11px] text-red-700 dark:text-red-300">
                        Fecha programada: {selectedAct.dueDate || 'Sin fecha'} {selectedAct.isExam ? '• Evaluado con OMR' : ''}
                      </p>
                      <p className="text-[11px] font-semibold text-red-800 dark:text-red-300 pt-1">
                        ⚠️ Al eliminar esta evaluación, se removerán todas las calificaciones registradas en esta columna y se liberará un {selectedAct.percentage}% de ponderación para nuevas actividades.
                      </p>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsDeleteActivityOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = activityIdToDelete || currentPeriod.activities[0]?.id;
                      if (id) {
                        deleteActivity(currentPeriod.id, id);
                        setIsDeleteActivityOpen(false);
                        setActivityIdToDelete('');
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirmar y Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Editar Evaluación Seleccionada */}
      {isEditActivityOpen && editingActivity && currentPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Editar Evaluación del Cuadro
                </h3>
              </div>
              <button
                onClick={() => setIsEditActivityOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateActivity} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Actividad
                </label>
                <input
                  type="text"
                  required
                  value={editActivityName}
                  onChange={(e) => setEditActivityName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ponderación (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={editActivityWeight}
                    onChange={(e) => setEditActivityWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    required
                    value={editActivityDate}
                    onChange={(e) => setEditActivityDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsExamCheck"
                  checked={editActivityIsExam}
                  onChange={(e) => setEditActivityIsExam(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="editIsExamCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Es un <strong>Examen</strong>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditActivityOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Perfil de Profesor Persistente */}
      {isEditTeacherProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <User className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Editar Datos del Profesor
                </h3>
              </div>
              <button
                onClick={() => setIsEditTeacherProfileOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Completo del Profesor
                </label>
                <input
                  type="text"
                  required
                  value={tempTeacherName}
                  onChange={(e) => setTempTeacherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={tempTeacherEmail}
                  onChange={(e) => setTempTeacherEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditTeacherProfileOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
                >
                  Guardar Perfil Permanentemente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Subir Estudiantes con Excel */}
      <StudentExcelUploadModal
        isOpen={isStudentUploadOpen}
        onClose={() => setIsStudentUploadOpen(false)}
        targetGradeId={selectedGradeId}
      />

      {/* Modal: Lector Óptico de Examen (OMR) */}
      {isOMRScannerOpen && currentPeriod && (
        <OMRScannerModal
          isOpen={isOMRScannerOpen}
          onClose={() => setIsOMRScannerOpen(false)}
          periodId={currentPeriod.id}
          gradeId={selectedGradeId}
          subjectName={selectedSubject}
        />
      )}

      {/* Modal: Generador de Hojas OMR en PDF con QR y Marcadores Fiduciarios */}
      <BubbleSheetGeneratorModal
        isOpen={isBubbleSheetOpen}
        onClose={() => setIsBubbleSheetOpen(false)}
        gradeId={selectedGradeId}
        subjectName={selectedSubject}
        activityName={currentPeriod?.activities.find((a) => a.isExam)?.name || 'Examen de Periodo'}
        activityId={currentPeriod?.activities.find((a) => a.isExam)?.id || 'act-exam'}
        teacherName={currentAssignedTeacher.teacherName}
      />

      {/* Modal: Vista Previa PDF de Alta Fidelidad para Exámenes y Hojas OMR */}
      {isDirectPreviewOpen && (
        <ExamOMRPreviewModal
          isOpen={isDirectPreviewOpen}
          onClose={() => setIsDirectPreviewOpen(false)}
          exam={generateCustomExam({
            institutionName: activeInstitution?.name || 'Centro Escolar Oficial',
            gradeName: availableGrades.find((g) => g.id === selectedGradeId)?.name || 'Primer Grado',
            gradeId: selectedGradeId,
            subjectName: selectedSubject,
            examTitle: currentPeriod?.activities.find((a) => a.isExam)?.name || 'Examen de Periodo',
            periodNum: selectedPeriodNum,
            date: new Date().toISOString().split('T')[0],
            totalQuestions: 10,
            topics: [],
            keyCount: 3
          })}
          students={gradeStudents}
        />
      )}

      {/* Modal: Exportación de Calificaciones Académicas a PDF Profesional con Logo */}
      {isGradesPDFModalOpen && currentPeriod && (
        <GradesPDFExportModal
          isOpen={isGradesPDFModalOpen}
          onClose={() => setIsGradesPDFModalOpen(false)}
          period={currentPeriod}
          students={gradeStudents}
          gradeName={availableGrades.find((g) => g.id === selectedGradeId)?.name || 'Primer Grado'}
          institution={activeInstitution}
          teacher={currentAssignedTeacher}
        />
      )}

      {/* Modal: Examen Virtual con IA, Multi-Clave, Anti-Copia y Calificación Automática */}
      {isOnlineExamModalOpen && (
        <OnlineExamManagerModal
          isOpen={isOnlineExamModalOpen}
          onClose={() => setIsOnlineExamModalOpen(false)}
          gradeId={selectedGradeId}
          gradeName={availableGrades.find((g) => g.id === selectedGradeId)?.name || 'Primer Grado'}
          subjectName={selectedSubject}
          periodId={currentPeriod?.id || 'period-1'}
          activities={currentPeriod?.activities || []}
        />
      )}

      {/* Chatbot Pedagógico con Gemini 3.8 Flash en la esquina inferior derecha */}
      <TeacherPedagogicalChatbot
        currentSubject={selectedSubject}
        currentGradeName={availableGrades.find((g) => g.id === selectedGradeId)?.name || 'Primer Grado'}
        teacherName={currentAssignedTeacher.teacherName}
        institutionName={activeInstitution?.name || 'Centro Educativo'}
      />
    </div>
  );
};
