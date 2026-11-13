import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  School,
  Plus,
  Users,
  GraduationCap,
  BookOpen,
  Copy,
  Check,
  Building,
  KeyRound,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  Download,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { TeacherAssignment } from '../../types';
import { StudentExcelUploadModal } from '../common/StudentExcelUploadModal';
import { SchoolPerformanceAnalytics } from './SchoolPerformanceAnalytics';
import { Clock, BarChart3, Settings2 } from 'lucide-react';

export const SchoolAdminView: React.FC = () => {
  const {
    activeInstitution,
    students,
    addTeacherAssignment,
    updateTeacherAssignmentSchedule,
    importStudents,
    cleanAllDuplicates
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'gestion' | 'rendimiento'>('gestion');
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal "+" to assign teacher by subject and grade
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState(
    activeInstitution?.gradeLevels[0]?.id || '1-grado'
  );
  const [subjectName, setSubjectName] = useState('Matemáticas');
  const [scheduleTime, setScheduleTime] = useState('07:30 - 08:30 AM');

  // Quick edit schedule modal
  const [editingTeacherAssignment, setEditingTeacherAssignment] = useState<TeacherAssignment | null>(null);
  const [editScheduleTime, setEditScheduleTime] = useState('');

  // View subject students modal
  const [viewingSubjectRoster, setViewingSubjectRoster] = useState<{
    subjectName: string;
    gradeName: string;
    gradeId: string;
    teacherName?: string;
    scheduleTime?: string;
  } | null>(null);

  // Modal for Excel student file upload
  const [isStudentUploadOpen, setIsStudentUploadOpen] = useState(false);
  const [uploadGradeId, setUploadGradeId] = useState(
    activeInstitution?.gradeLevels[0]?.id || '1-grado'
  );

  // Deduplicate grade levels so no grade is ever repeated
  const uniqueGradeLevels = useMemo(() => {
    if (!activeInstitution) return [];
    const seen = new Set<string>();
    return activeInstitution.gradeLevels.filter((g) => {
      const key = g.name.trim().toLowerCase();
      if (seen.has(key) || seen.has(g.id)) return false;
      seen.add(key);
      seen.add(g.id);
      return true;
    });
  }, [activeInstitution]);

  // Guarantee 100% deduplication: each student is registered ONLY ONCE in the school and in ONE single grade
  const schoolStudents = useMemo(() => {
    if (!activeInstitution) return [];
    const rawList = students.filter(
      (s) => s.institutionCode === activeInstitution.institutionCode
    );
    const seenNames = new Set<string>();
    const seenNies = new Set<string>();
    const unique: typeof rawList = [];

    for (const st of rawList) {
      if (!st || !st.fullName) continue;
      const norm = st.fullName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nie = (st.nie || '').trim().toUpperCase();

      if (seenNames.has(norm)) continue;
      if (nie && nie !== 'N/A' && nie !== '-' && seenNies.has(nie)) continue;

      seenNames.add(norm);
      if (nie && nie !== 'N/A' && nie !== '-') seenNies.add(nie);
      unique.push(st);
    }
    return unique;
  }, [students, activeInstitution?.institutionCode]);

  if (!activeInstitution) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeInstitution.institutionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveTeacherAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !subjectName.trim()) return;

    addTeacherAssignment(activeInstitution.institutionCode, {
      teacherName,
      teacherEmail: teacherEmail || `${teacherName.toLowerCase().replace(/\s+/g, '.')}@escuela.edu`,
      subjectName,
      gradeId: selectedGradeId,
      scheduleTime: scheduleTime.trim() || '07:30 - 08:30 AM'
    });

    setTeacherName('');
    setTeacherEmail('');
    setScheduleTime('07:30 - 08:30 AM');
    setIsAssignModalOpen(false);
  };

  const handleSaveScheduleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacherAssignment || !editScheduleTime.trim()) return;

    updateTeacherAssignmentSchedule(
      activeInstitution.institutionCode,
      editingTeacherAssignment.id,
      editScheduleTime.trim()
    );
    setEditingTeacherAssignment(null);
  };

  return (
    <div className="space-y-6">
      {/* Institution Banner - Azul Rey Institucional */}
      <div className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            {activeInstitution.logoUrl ? (
              <img
                src={activeInstitution.logoUrl}
                alt="Logo Escuela"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-white/20 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0 border border-white/30">
                <School className="w-8 h-8 text-white" />
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {activeInstitution.name}
                </h2>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    activeInstitution.type === 'publica'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/40'
                  }`}
                >
                  {activeInstitution.type === 'publica'
                    ? 'Institución Pública (Aplica NIE)'
                    : 'Colegio Privado'}
                </span>
              </div>

              <p className="text-xs text-blue-100 font-semibold mt-1">
                Infraestructura MINED: <strong>{activeInstitution.infrastructureCode}</strong> • Contacto:{' '}
                {activeInstitution.contactEmail}
              </p>
            </div>
          </div>

          {/* Generated Code Share Card */}
          <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/30 text-center w-full md:w-auto shadow-md">
            <span className="text-[11px] uppercase tracking-wider text-blue-100 font-bold block">
              Código Único de la Institución
            </span>
            <div className="flex items-center justify-center gap-2 my-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
                {activeInstitution.institutionCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                title="Copiar código para profesores y padres"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-blue-100 font-medium">
              Comparte este código para vincular a maestros y padres
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20 text-xs">
          <div>
            <span className="text-blue-100 font-bold block">Grados Registrados</span>
            <span className="text-xl font-black font-mono text-white">{uniqueGradeLevels.length}</span>
          </div>
          <div>
            <span className="text-blue-100 font-bold block">Profesores Asignados</span>
            <span className="text-xl font-black font-mono text-white">{activeInstitution.teachers.length}</span>
          </div>
          <div>
            <span className="text-blue-100 font-bold block">Estudiantes Matriculados</span>
            <span className="text-xl font-black font-mono text-white">{schoolStudents.length}</span>
          </div>
          <div>
            <span className="text-blue-100 font-bold block">Sincronización en Vivo</span>
            <span className="text-xl font-black text-emerald-300 flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Activa
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Estilo Institucional Azul Rey */}
      <div className="flex border-b-2 border-slate-200 space-x-2 text-sm font-bold bg-white p-1 rounded-2xl shadow-2xs">
        <button
          onClick={() => setActiveAdminTab('gestion')}
          className={`py-2.5 px-4 rounded-xl flex items-center gap-2 transition ${
            activeAdminTab === 'gestion'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Gestión de Grados, Horarios y Matrícula
        </button>

        <button
          onClick={() => setActiveAdminTab('rendimiento')}
          className={`py-2.5 px-4 rounded-xl flex items-center gap-2 transition ${
            activeAdminTab === 'rendimiento'
              ? 'bg-[#2563EB] text-white shadow-xs font-black'
              : 'text-[#1E293B] hover:bg-slate-100 font-bold'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Rendimiento por Materia (Gráficas)
        </button>
      </div>

      {/* TAB RENDIMIENTO POR MATERIA */}
      {activeAdminTab === 'rendimiento' && <SchoolPerformanceAnalytics />}

      {/* TAB GESTION ESCOLAR, HORARIOS Y MATRICULA */}
      {activeAdminTab === 'gestion' && (
        <>
          {/* Main Section: Grados, Aulas/Materias y Profesores Asignados */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-black text-base text-[#1E293B] flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#2563EB]" />
                  Grados, Aulas, Horarios y Asignación de Profesores
                </h3>
                <p className="text-xs text-[#475569] font-medium mt-0.5">
                  Administra los grados, asigna docentes con su horario de clase y verifica los alumnos matriculados en cada materia.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón interactivo con signo más (+) según requerimiento */}
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  Asignar Profesor y Horario (+)
                </button>

                {/* Botón Auditar Matrícula y Limpiar Duplicados */}
                <button
                  type="button"
                  onClick={cleanAllDuplicates}
                  className="flex items-center gap-1.5 border-2 border-blue-200 bg-blue-50/70 text-[#1E3A8A] hover:bg-blue-100 px-3 py-2 rounded-xl text-xs font-bold transition"
                  title="Audita la base de datos y garantiza que ningún estudiante esté registrado dos veces o en dos grados"
                >
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  Auditar Matrícula
                </button>

                <button
                  onClick={() => setIsStudentUploadOpen(true)}
                  className="flex items-center gap-1.5 border-2 border-slate-200 hover:bg-slate-50 text-[#1E293B] px-3.5 py-2 rounded-xl text-xs font-bold transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Subir Estudiantes (Excel)
                </button>
              </div>
            </div>

            {/* Grados Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {uniqueGradeLevels.map((grade) => {
                const teachersInGrade = activeInstitution.teachers.filter(
                  (t) => t.gradeId === grade.id
                );
                const studentsInGrade = schoolStudents.filter(
                  (s) => s.gradeId === grade.id
                );

                return (
                  <div
                    key={grade.id}
                    className="p-5 rounded-2xl border-2 border-slate-200 bg-white flex flex-col justify-between space-y-4 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-sm text-[#1E3A8A]">
                          {grade.name}
                        </h4>
                        <span className="text-[11px] font-mono font-bold text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {studentsInGrade.length} alumnos matriculados
                        </span>
                      </div>

                      <p className="text-xs text-[#475569] font-medium mb-3">
                        Materias ({grade.subjects.length}): {grade.subjects.join(' • ')}
                      </p>

                      {/* List of subjects with assigned teachers and schedule times */}
                      <div className="space-y-2.5">
                        {grade.subjects.map((sub, sIdx) => {
                          const teacher = teachersInGrade.find((t) => t.subjectName === sub);

                          return (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                                  <span className="font-black text-[#1E293B]">{sub}</span>
                                </div>

                                {teacher ? (
                                  <span className="font-bold text-[#1E3A8A] bg-blue-100/70 border border-blue-200 px-2.5 py-0.5 rounded-lg text-[11px]">
                                    {teacher.teacherName}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedGradeId(grade.id);
                                      setSubjectName(sub);
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="text-[11px] text-[#2563EB] font-black hover:underline flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200"
                                  >
                                    <Plus className="w-3 h-3" /> Asignar Maestro y Horario
                                  </button>
                                )}
                              </div>

                              {/* Schedule and Roster Row */}
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                                  {teacher?.scheduleTime ? (
                                    <span className="font-bold text-[#1E293B]">
                                      Horario: <strong>{teacher.scheduleTime}</strong>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Horario pendiente</span>
                                  )}
                                  {teacher && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingTeacherAssignment(teacher);
                                        setEditScheduleTime(teacher.scheduleTime || '07:30 - 08:30 AM');
                                      }}
                                      className="text-[10px] text-[#2563EB] hover:underline font-bold ml-1"
                                    >
                                      [Editar Hora]
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingSubjectRoster({
                                      subjectName: sub,
                                      gradeName: grade.name,
                                      gradeId: grade.id,
                                      teacherName: teacher?.teacherName,
                                      scheduleTime: teacher?.scheduleTime
                                    })
                                  }
                                  className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                                >
                                  <Users className="w-3 h-3" />
                                  {studentsInGrade.length} en lista →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-[11px] text-[#475569] flex items-center justify-between">
                      <span className="font-medium">Todos los alumnos del grado cursan cada materia</span>
                      <button
                        onClick={() => {
                          setSelectedGradeId(grade.id);
                          setIsAssignModalOpen(true);
                        }}
                        className="text-[#2563EB] font-black hover:underline"
                      >
                        + Asignar Profesor a este grado
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

      {/* Matriculated Students Table - Pure White Card & Azul Rey Header */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <h3 className="font-black text-base text-[#1E293B] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2563EB]" />
              Matrícula de Estudiantes Registrados ({schoolStudents.length})
            </h3>
            <p className="text-xs text-[#475569] font-medium">
              Lista oficial con número de orden, nombre completo, NIE y correo del acudiente vinculado.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#1E3A8A] bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg self-start sm:self-auto">
            100% Legibilidad • Formato Oficial
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse bg-white">
            <thead>
              <tr className="bg-[#2563EB] text-white border-b-2 border-[#1D4ED8] font-black uppercase tracking-wider text-[11px]">
                <th className="p-3 w-12 text-center text-white font-black border-r border-blue-400/40">N°</th>
                <th className="p-3 text-white font-black border-r border-blue-400/40">Nombre Completo del Estudiante</th>
                <th className="p-3 text-white font-black border-r border-blue-400/40">NIE (Identificación Estudiantil)</th>
                <th className="p-3 text-white font-black border-r border-blue-400/40">Grado</th>
                <th className="p-3 text-white font-black">Correo del Padre / Tutor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {schoolStudents.map((st) => (
                <tr key={st.id} className="hover:bg-blue-50/50 transition">
                  <td className="p-3 text-center font-mono font-black text-[#1E3A8A] border-r border-slate-200">
                    {st.listNumber}
                  </td>
                  <td className="p-3 font-bold text-sm text-[#1E293B] border-r border-slate-200">
                    {st.fullName}
                  </td>
                  <td className="p-3 font-mono font-bold text-[#1E293B] border-r border-slate-200">
                    {st.nie || 'N/A'}
                  </td>
                  <td className="p-3 font-semibold text-[#1E293B] border-r border-slate-200">
                    {uniqueGradeLevels.find((g) => g.id === st.gradeId)?.name || '1° Grado'}
                  </td>
                  <td className="p-3 font-medium text-[#1E293B]">
                    {st.parentEmail ? (
                      <span className="text-[#1E293B] font-semibold">{st.parentEmail}</span>
                    ) : (
                      <span className="text-[#64748B] italic">Pendiente de vinculación</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

      {/* Modal "+" Asignar Profesor con Horario (Requerimiento explícito del usuario) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border-2 border-slate-200 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black text-base text-[#1E293B] mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2563EB]" />
              Asignar Profesor y Horario de Materia
            </h3>
            <p className="text-xs text-[#475569] mb-4 font-medium">
              Ingresa los datos del docente encargado y define el horario oficial de la clase.
            </p>

            <form onSubmit={handleSaveTeacherAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1">
                  Nombre Completo del Profesor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Prof. Fernando Alvarado"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#1E293B] outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1">
                  Correo Electrónico del Profesor
                </label>
                <input
                  type="email"
                  placeholder="profesor@escuela.edu"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-[#1E293B] outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1">
                    Grado Asignado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedGradeId}
                    onChange={(e) => setSelectedGradeId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#1E293B]"
                  >
                    {uniqueGradeLevels.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1">
                    Materia Asignada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Matemáticas"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#1E293B]"
                  />
                </div>
              </div>

              {/* Requirement: Horario de la materia del profesor */}
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                  Hora / Horario de la Materia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  placeholder="ej. 07:30 - 08:30 AM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-[#1E3A8A] outline-none focus:border-[#2563EB]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['07:30 - 08:30 AM', '08:30 - 09:30 AM', '09:45 - 10:45 AM', '10:45 - 11:45 AM', '01:00 - 02:00 PM'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setScheduleTime(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 font-bold transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs text-[#475569] hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-xl text-xs font-black shadow-md transition"
                >
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Horario de Materia */}
      {editingTeacherAssignment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border-2 border-slate-200 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-black text-sm text-[#1E293B] mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              Modificar Horario de Materia
            </h3>
            <p className="text-xs text-[#475569] mb-4 font-medium">
              {editingTeacherAssignment.subjectName} • {editingTeacherAssignment.teacherName}
            </p>

            <form onSubmit={handleSaveScheduleEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1E293B] mb-1">
                  Nuevo Horario Asignado:
                </label>
                <input
                  type="text"
                  required
                  value={editScheduleTime}
                  onChange={(e) => setEditScheduleTime(e.target.value)}
                  placeholder="07:30 - 08:30 AM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-[#1E3A8A]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['07:30 - 08:30 AM', '08:30 - 09:30 AM', '09:45 - 10:45 AM', '10:45 - 11:45 AM', '01:00 - 02:00 PM'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditScheduleTime(p)}
                      className="text-[10px] px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 font-bold"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTeacherAssignment(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#475569] font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-xs"
                >
                  Guardar Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Lista de Alumnos Matriculados en la Materia */}
      {viewingSubjectRoster && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border-2 border-slate-200 shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-base text-[#1E293B] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                  Alumnos Matriculados en {viewingSubjectRoster.subjectName}
                </h3>
                <p className="text-xs text-[#475569] font-medium mt-0.5">
                  {viewingSubjectRoster.gradeName} • Docente:{' '}
                  <strong>{viewingSubjectRoster.teacherName || 'Docente Pendiente'}</strong>{' '}
                  {viewingSubjectRoster.scheduleTime && `(${viewingSubjectRoster.scheduleTime})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSubjectRoster(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              <p className="text-xs text-[#1E3A8A] font-semibold bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                ✓ Todo alumno matriculado por la institución en {viewingSubjectRoster.gradeName} está registrado oficialmente en esta asignatura y en la lista del docente.
              </p>

              <div className="divide-y divide-slate-100">
                {schoolStudents
                  .filter((s) => s.gradeId === viewingSubjectRoster.gradeId)
                  .map((st) => (
                    <div
                      key={st.id}
                      className="py-2 px-1 flex items-center justify-between text-xs hover:bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-[#1E3A8A] font-mono font-black flex items-center justify-center text-[11px]">
                          {st.listNumber}
                        </span>
                        <div>
                          <span className="font-black text-[#1E293B] block">{st.fullName}</span>
                          <span className="text-[10px] text-[#475569] font-mono">
                            NIE: {st.nie || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Matriculado Oficial
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingSubjectRoster(null)}
                className="bg-[#2563EB] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#1D4ED8]"
              >
                Cerrar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subir Estudiantes con Excel (Lector automático sin escribir nombres) */}
      <StudentExcelUploadModal
        isOpen={isStudentUploadOpen}
        onClose={() => setIsStudentUploadOpen(false)}
        targetGradeId={uploadGradeId}
      />
    </div>
  );
};
