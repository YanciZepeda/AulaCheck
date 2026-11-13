import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  School,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import { InstitutionType, UserRole } from '../../types';
import { parseStudentsExcelFile, ParseExcelResult } from '../../utils/excelParser';

interface AuthRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthRegistrationModal: React.FC<AuthRegistrationModalProps> = ({ isOpen, onClose }) => {
  const {
    institutions,
    students,
    registerInstitution,
    verifyInfrastructureCode,
    registerTeacher,
    registerParent,
    importStudents
  } = useApp();

  // Step flow: 1: Email & Role selection -> 2: Specific role details
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('escuela');

  // School registration state
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState<InstitutionType>('publica');
  const [infraCode, setInfraCode] = useState('INF-06123');
  const [isInfraVerified, setIsInfraVerified] = useState(false);
  const [infraError, setInfraError] = useState('');
  const [logoOption, setLogoOption] = useState<string>(
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=160&q=80'
  );
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [gradeCount, setGradeCount] = useState<number>(2); // 1° a 2° grado inicial
  const [gradeLevelsData, setGradeLevelsData] = useState<
    { name: string; subjects: string[] }[]
  >([
    {
      name: 'Primer Grado',
      subjects: ['Matemáticas', 'Lenguaje y Literatura', 'Ciencias Naturales', 'Estudios Sociales']
    },
    {
      name: 'Segundo Grado',
      subjects: ['Matemáticas', 'Lenguaje y Literatura', 'Ciencias Naturales', 'Estudios Sociales']
    }
  ]);
  const [assignedTeachers, setAssignedTeachers] = useState<
    { teacherName: string; teacherEmail: string; subjectName: string; gradeName: string }[]
  >([]);

  // Modal "+" to assign teacher in school creation
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [newTeachName, setNewTeachName] = useState('');
  const [newTeachEmail, setNewTeachEmail] = useState('');
  const [newTeachGrade, setNewTeachGrade] = useState('Primer Grado');
  const [newTeachSubject, setNewTeachSubject] = useState('Matemáticas');

  // Parent registration state
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [parentInstType, setParentInstType] = useState<InstitutionType>('publica');
  const [nie, setNie] = useState('');
  const [parentInstName, setParentInstName] = useState('');
  const [parentInstCode, setParentInstCode] = useState('ESC-PUB-2026');

  // Teacher registration state
  const [teacherName, setTeacherName] = useState('');
  const [teacherInstCode, setTeacherInstCode] = useState('ESC-PUB-2026');
  const [teacherGrade, setTeacherGrade] = useState('1-grado');
  const [teacherSubject, setTeacherSubject] = useState('Matemáticas');
  const [uploadedTeacherExcel, setUploadedTeacherExcel] = useState<ParseExcelResult | null>(null);
  const [isProcessingTeacherExcel, setIsProcessingTeacherExcel] = useState(false);
  const [teacherExcelError, setTeacherExcelError] = useState('');

  if (!isOpen) return null;

  const handleVerifyInfra = () => {
    if (!infraCode.trim()) {
      setInfraError('Debe ingresar el código de infraestructura.');
      return;
    }
    const valid = verifyInfrastructureCode(infraCode);
    if (valid) {
      setIsInfraVerified(true);
      setInfraError('');
    } else {
      setIsInfraVerified(false);
      setInfraError('Código de infraestructura inválido. Debe tener al menos 4 caracteres (ej. INF-06123).');
    }
  };

  const handleGradeCountChange = (count: number) => {
    setGradeCount(count);
    const newGrades = [];
    const defaultSubjects = ['Matemáticas', 'Lenguaje y Literatura', 'Ciencias Naturales', 'Estudios Sociales'];
    for (let i = 1; i <= count; i++) {
      newGrades.push({
        name: i === 1 ? 'Primer Grado' : i === 2 ? 'Segundo Grado' : `${i}° Grado`,
        subjects: [...defaultSubjects]
      });
    }
    setGradeLevelsData(newGrades);
  };

  const handleAddSubjectToGrade = (gradeIndex: number, subjectName: string) => {
    if (!subjectName.trim()) return;
    setGradeLevelsData((prev) => {
      const copy = [...prev];
      if (!copy[gradeIndex].subjects.includes(subjectName)) {
        copy[gradeIndex].subjects.push(subjectName);
      }
      return copy;
    });
  };

  const handleAddTeacherAssignment = () => {
    if (!newTeachName || !newTeachSubject) return;
    setAssignedTeachers((prev) => [
      ...prev,
      {
        teacherName: newTeachName,
        teacherEmail: newTeachEmail || `${newTeachName.toLowerCase().replace(/\s+/g, '.')}@escuela.edu`,
        subjectName: newTeachSubject,
        gradeName: newTeachGrade
      }
    ]);
    setNewTeachName('');
    setNewTeachEmail('');
    setIsTeacherModalOpen(false);
  };

  const handleSubmitSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInfraVerified) {
      setInfraError('Por favor verifica el código de infraestructura primero.');
      return;
    }
    if (!schoolName.trim()) {
      alert('Ingresa el nombre de la institución');
      return;
    }

    const created = registerInstitution({
      name: schoolName,
      type: schoolType,
      infrastructureCode: infraCode,
      contactEmail: email,
      logoUrl: customLogoUrl || logoOption,
      gradeLevels: gradeLevelsData
    });

    onClose();
  };

  const handleSubmitParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim() || !parentInstCode.trim()) {
      alert('Completa los campos obligatorios del estudiante y código de institución');
      return;
    }

    registerParent({
      parentEmail: email,
      parentName: parentName || 'Padre de Familia',
      childName,
      institutionType: parentInstType,
      nie: parentInstType === 'publica' ? nie : undefined,
      institutionName: parentInstName || 'Institución Educativa',
      institutionCode: parentInstCode.toUpperCase()
    });

    onClose();
  };

  const handleTeacherExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTeacherExcelError('');
    setIsProcessingTeacherExcel(true);

    try {
      const schoolStudents = students.filter(
        (s) => s.institutionCode === teacherInstCode.toUpperCase()
      );
      const res = await parseStudentsExcelFile(file, schoolStudents);
      setUploadedTeacherExcel(res);
    } catch (err: any) {
      setTeacherExcelError(err?.message || 'Error al procesar el archivo Excel.');
      setUploadedTeacherExcel(null);
    } finally {
      setIsProcessingTeacherExcel(false);
    }
  };

  const handleSubmitTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherInstCode.trim()) {
      alert('Completa tu nombre y el código de la institución');
      return;
    }

    registerTeacher({
      teacherEmail: email,
      teacherName,
      institutionCode: teacherInstCode.toUpperCase(),
      assignedGradeId: teacherGrade,
      assignedSubject: teacherSubject
    });

    // If teacher selected an Excel file, import unique students
    if (uploadedTeacherExcel && uploadedTeacherExcel.validStudents.length > 0) {
      const unique = uploadedTeacherExcel.validStudents.filter(
        (s) => !s.isDuplicateInFile && !s.isDuplicateInSystem
      );
      if (unique.length > 0) {
        importStudents(teacherInstCode.toUpperCase(), teacherGrade, unique);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
          <div>
            <h2 className="text-lg font-bold">Portal de Registro e Ingreso Escolar</h2>
            <p className="text-xs text-indigo-100">
              {step === 1 ? 'Paso 1: Identificación y Selección de Rol' : `Paso 2: Configuración de ${selectedRole === 'escuela' ? 'Institución' : selectedRole === 'profesor' ? 'Profesor' : 'Padre de Familia'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Step 1: Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  1. Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Ingresa tu correo para guardar registro y sincronizar notificaciones en tiempo real.
                </p>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@educacion.gob.sv o correo@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              {/* Step 1: Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  2. ¿Qué tipo de perfil deseas registrar o utilizar? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Escuela */}
                  <div
                    onClick={() => setSelectedRole('escuela')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                      selectedRole === 'escuela'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mb-2">
                      <School className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm">Escuela / Institución</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Directores, código de infraestructura, creación de grados y materias.
                    </span>
                  </div>

                  {/* Profesor */}
                  <div
                    onClick={() => setSelectedRole('profesor')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                      selectedRole === 'profesor'
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-2">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm">Profesor / Maestro</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Pase de lista, cuadro de notas Excel, escáner óptico OMR de exámenes.
                    </span>
                  </div>

                  {/* Padre */}
                  <div
                    onClick={() => setSelectedRole('padre')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                      selectedRole === 'padre'
                        ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 flex items-center justify-center mb-2">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-sm">Padre de Familia</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Monitoreo de notas por materia, faltas en tiempo real y calendario.
                    </span>
                  </div>
                </div>
              </div>

              {/* Continue button */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!email) {
                      alert('Por favor ingresa tu correo electrónico');
                      return;
                    }
                    setStep(2);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-md"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* STEP 2: ESPECÍFICO SEGÚN ROL */}

              {/* ================= A. REGISTRO ESCUELA ================= */}
              {selectedRole === 'escuela' && (
                <form onSubmit={handleSubmitSchool} className="space-y-5">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Al verificar el código de infraestructura, se generará el <strong>Código de Institución</strong> para vincular a padres y profesores.
                    </span>
                  </div>

                  {/* Nombre y Tipo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nombre de la Institución <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej. Complejo Educativo Manuel Arce"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tipo de Institución <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={schoolType}
                        onChange={(e) => setSchoolType(e.target.value as InstitutionType)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      >
                        <option value="publica">Institución Pública (Mined / NIE aplica)</option>
                        <option value="privada">Colegio Privado</option>
                      </select>
                    </div>
                  </div>

                  {/* Verificación de Código de Infraestructura */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Código de Infraestructura <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Se pedirá un código de infraestructura y se verificará su validez en el sistema.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={infraCode}
                        onChange={(e) => {
                          setInfraCode(e.target.value);
                          setIsInfraVerified(false);
                        }}
                        placeholder="ej. INF-06123"
                        className="flex-1 px-3 py-2 uppercase font-mono tracking-wider rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyInfra}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          isInfraVerified
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isInfraVerified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verificado
                          </>
                        ) : (
                          'Verificar Código'
                        )}
                      </button>
                    </div>

                    {infraError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {infraError}
                      </p>
                    )}

                    {isInfraVerified && (
                      <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>¡Código Verificado con Éxito!</strong> Se autogenerará el código de vinculación para padres y docentes.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Logo de la institución */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Logo o Insignia Institucional
                    </label>
                    <div className="flex items-center gap-3">
                      <img
                        src={customLogoUrl || logoOption}
                        alt="Logo preview"
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/20"
                      />
                      <input
                        type="url"
                        placeholder="URL de imagen del logo (opcional)"
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  {/* Cantidad de Grados y Aulas / Materias */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                          Cantidad de Grados y Aulas/Materias
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Ejemplo: 1° y 2° grado con sus 4 materias básicas asignadas.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Grados:</span>
                        <select
                          value={gradeCount}
                          onChange={(e) => handleGradeCountChange(Number(e.target.value))}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                        >
                          <option value={1}>1 Grado (1°)</option>
                          <option value={2}>2 Grados (1° a 2°)</option>
                          <option value={3}>3 Grados</option>
                          <option value={6}>6 Grados (Primaria Completa)</option>
                          <option value={9}>9 Grados (1° a 9°)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {gradeLevelsData.map((gl, gIdx) => (
                        <div
                          key={gIdx}
                          className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-indigo-700 dark:text-indigo-400">
                              {gl.name} ({gl.subjects.length} materias/aulas)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const sub = prompt('Nombre de la nueva materia para este grado:');
                                if (sub) handleAddSubjectToGrade(gIdx, sub);
                              }}
                              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> Agregar Materia
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {gl.subjects.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded text-[11px]"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Asignar Profesores con botón [+] */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                          Profesores Encargados por Materia
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Presiona el signo más (+) para asignar profesor por materia y grado.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTeacherModalOpen(true)}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
                      >
                        <Plus className="w-4 h-4" /> Asignar Profesor
                      </button>
                    </div>

                    {assignedTeachers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No hay profesores asignados aún. Puedes agregarlos ahora o desde el panel escolar.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {assignedTeachers.map((t, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{t.teacherName}</span>
                              <span className="text-slate-400 ml-2">({t.gradeName} - {t.subjectName})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAssignedTeachers((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Volver
                    </button>
                    <button
                      type="submit"
                      disabled={!isInfraVerified}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition"
                    >
                      Guardar y Generar Código de Escuela
                    </button>
                  </div>
                </form>
              )}

              {/* ================= B. REGISTRO PADRE ================= */}
              {selectedRole === 'padre' && (
                <form onSubmit={handleSubmitParent} className="space-y-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                    Registra la información de tu hijo para recibir alertas de inasistencia en tiempo real y progreso académico.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre Completo del Padre / Tutor
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Lic. Roberto Carranza"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre del Hijo(a) Estudiante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Diego Alexander Carranza Mejía"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ¿Institución Pública o Privada? <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={parentInstType}
                        onChange={(e) => setParentInstType(e.target.value as InstitutionType)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      >
                        <option value="publica">Pública</option>
                        <option value="privada">Privada</option>
                      </select>
                    </div>

                    {parentInstType === 'publica' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          NIE (Número de Identificación Estudiantil) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ej. 2026-48914"
                          value={nie}
                          onChange={(e) => setNie(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nombre de la Institución
                      </label>
                      <input
                        type="text"
                        placeholder="ej. Complejo Educativo San Salvador"
                        value={parentInstName}
                        onChange={(e) => setParentInstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Código de la Institución <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej. ESC-PUB-2026"
                        value={parentInstCode}
                        onChange={(e) => setParentInstCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Volver
                    </button>
                    <button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition"
                    >
                      Ingresar como Padre de Familia
                    </button>
                  </div>
                </form>
              )}

              {/* ================= C. REGISTRO PROFESOR ================= */}
              {selectedRole === 'profesor' && (
                <form onSubmit={handleSubmitTeacher} className="space-y-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200">
                    Ingresa con el código de tu escuela para gestionar tus clases, pasar lista y calificar exámenes con escaneo óptico.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nombre Completo del Profesor <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej. Prof. Carlos Mendoza"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Código de la Institución <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej. ESC-PUB-2026"
                        value={teacherInstCode}
                        onChange={(e) => setTeacherInstCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Grado Asignado <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={teacherGrade}
                        onChange={(e) => setTeacherGrade(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      >
                        <option value="1-grado">Primer Grado</option>
                        <option value="2-grado">Segundo Grado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Materia Asignada <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej. Matemáticas"
                        value={teacherSubject}
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  {/* Subir lista de estudiantes estilo Excel */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cargar Lista de Estudiantes con Excel (Opcional)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Sube tu archivo .xlsx, .xls o .csv directamente sin tener que escribir o pegar nombres:
                    </p>

                    <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60">
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleTeacherExcelFileChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                      />

                      {isProcessingTeacherExcel && (
                        <p className="text-xs text-emerald-600 mt-2 font-medium">
                          Analizando archivo y evaluando duplicados...
                        </p>
                      )}

                      {teacherExcelError && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ {teacherExcelError}
                        </p>
                      )}

                      {uploadedTeacherExcel && (
                        <div className="mt-2.5 p-2 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {uploadedTeacherExcel.validStudents.length} estudiantes detectados en "{uploadedTeacherExcel.fileName}"
                          </p>
                          {(uploadedTeacherExcel.duplicatesInFile > 0 || uploadedTeacherExcel.duplicatesInSystem > 0) && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-300">
                              ⚠️ Se detectaron {uploadedTeacherExcel.duplicatesInFile + uploadedTeacherExcel.duplicatesInSystem} nombres duplicados (se omitirán automáticamente para no repetir alumnos).
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Volver
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition"
                    >
                      Ingresar como Profesor
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal "+" asignación rápida de profesor */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Asignar Profesor a Materia y Grado
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nombre del Profesor
                </label>
                <input
                  type="text"
                  placeholder="ej. Profa. Ana Lucía Flores"
                  value={newTeachName}
                  onChange={(e) => setNewTeachName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="profesor@cedu.edu.sv"
                  value={newTeachEmail}
                  onChange={(e) => setNewTeachEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Grado
                  </label>
                  <select
                    value={newTeachGrade}
                    onChange={(e) => setNewTeachGrade(e.target.value)}
                    className="w-full px-2 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    {gradeLevelsData.map((g, i) => (
                      <option key={i} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Materia
                  </label>
                  <input
                    type="text"
                    value={newTeachSubject}
                    onChange={(e) => setNewTeachSubject(e.target.value)}
                    placeholder="Matemáticas"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddTeacherAssignment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs font-bold"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
