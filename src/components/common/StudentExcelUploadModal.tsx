import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  parseStudentsExcelFile,
  generateStudentExcelTemplate,
  ParseExcelResult,
  ParsedStudentRow
} from '../../utils/excelParser';

interface StudentExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetGradeId?: string;
}

export const StudentExcelUploadModal: React.FC<StudentExcelUploadModalProps> = ({
  isOpen,
  onClose,
  targetGradeId
}) => {
  const { activeInstitution, students, importStudents } = useApp();

  const [selectedGradeId, setSelectedGradeId] = useState<string>(
    targetGradeId || activeInstitution?.gradeLevels[0]?.id || '1-grado'
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !activeInstitution) return null;

  const handleFile = async (file: File) => {
    setErrorMsg('');
    setIsLoading(true);

    try {
      // Filter existing students in the institution
      const schoolStudents = students.filter(
        (s) => s.institutionCode === activeInstitution.institutionCode
      );

      const result = await parseStudentsExcelFile(file, schoolStudents);

      if (result.validStudents.length === 0) {
        setErrorMsg('El archivo no contiene filas válidas de estudiantes.');
        setParseResult(null);
      } else {
        setParseResult(result);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al procesar el archivo Excel.');
      setParseResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult) return;

    let studentsToImport = parseResult.validStudents;
    if (skipDuplicates) {
      studentsToImport = studentsToImport.filter(
        (s) => !s.isDuplicateInFile && !s.isDuplicateInSystem
      );
    }

    if (studentsToImport.length === 0) {
      setErrorMsg('No hay estudiantes nuevos para importar (todos los nombres detectados son duplicados).');
      return;
    }

    importStudents(
      activeInstitution.institutionCode,
      selectedGradeId,
      studentsToImport.map((s) => ({
        listNumber: s.listNumber,
        fullName: s.fullName,
        nie: s.nie,
        parentEmail: s.parentEmail
      }))
    );

    // Reset and close
    setParseResult(null);
    setErrorMsg('');
    onClose();
  };

  const totalDuplicates = (parseResult?.duplicatesInFile || 0) + (parseResult?.duplicatesInSystem || 0);
  const eligibleStudentsCount = parseResult
    ? skipDuplicates
      ? parseResult.validStudents.filter((s) => !s.isDuplicateInFile && !s.isDuplicateInSystem).length
      : parseResult.validStudents.length
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border-2 border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header - Azul Rey Institucional */}
        <div className="p-5 bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl border border-white/30 shadow-xs">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                Subir Lista de Estudiantes con Excel
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                Carga masiva sin escribir nombres con evaluación automática de duplicados
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

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* Target Grade Selector & Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
            <div className="flex-1">
              <label className="block text-xs font-black text-[#1E293B] mb-1">
                Grado al que se matricularán los estudiantes:
              </label>
              <select
                value={selectedGradeId}
                onChange={(e) => setSelectedGradeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#1E293B] outline-none"
              >
                {activeInstitution.gradeLevels.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:self-end">
              <button
                type="button"
                onClick={generateStudentExcelTemplate}
                className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] font-black hover:underline bg-white px-3.5 py-2 rounded-xl border-2 border-blue-200 shadow-2xs hover:bg-blue-50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Plantilla Excel
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          {!parseResult && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#2563EB] bg-blue-50 scale-[1.01]'
                  : 'border-slate-300 hover:border-[#2563EB] hover:bg-blue-50/40 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={onFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center mx-auto mb-3 border border-blue-200">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h4 className="font-black text-sm text-[#1E293B] mb-1">
                Haz clic para seleccionar tu archivo Excel o arrástralo aquí
              </h4>
              <p className="text-xs text-[#475569] max-w-sm mx-auto font-medium">
                Formatos soportados: <strong>.xlsx, .xls, .csv</strong>. El sistema leerá automáticamente las columnas de Nombre, NIE y Correo.
              </p>

              {isLoading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-black text-[#2563EB]">
                  <span className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                  Procesando y analizando duplicados...
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-2xl text-xs text-red-950 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Results & Duplicate Audit */}
          {parseResult && (
            <div className="space-y-4 animate-in fade-in">
              {/* File Info Bar with Reset */}
              <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl text-xs border border-slate-200">
                <div className="flex items-center gap-2 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span className="font-black text-[#1E293B] truncate">{parseResult.fileName}</span>
                  <span className="text-[#64748B] font-bold">
                    ({parseResult.validStudents.length} estudiantes detectados)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParseResult(null);
                    setErrorMsg('');
                  }}
                  className="flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] font-black"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Cambiar archivo
                </button>
              </div>

              {/* Duplicate Analysis Banner */}
              {totalDuplicates > 0 ? (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 space-y-2">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Evaluación de Duplicados: Se detectaron {totalDuplicates} nombres repetidos en el archivo o ya registrados en la escuela.
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                    El sistema previene que se matricule al mismo estudiante dos veces. Puedes optar por omitir los duplicados automáticamente para guardar únicamente registros únicos.
                  </p>

                  <label className="flex items-center gap-2 pt-1 font-black text-[#1E293B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded text-[#2563EB] accent-[#2563EB]"
                    />
                    <span>Omitir duplicados automáticamente (Recomendado)</span>
                  </label>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-xs text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong className="font-black">¡Excelente!</strong> No se detectó ningún nombre repetido en la lista ni en la base escolar. Todos los registros son únicos.
                  </span>
                </div>
              )}

              {/* Student Rows Preview Table - Pure White Card & Azul Rey Header */}
              <div className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs bg-white">
                    <thead className="sticky top-0 bg-[#2563EB] text-white font-black uppercase text-[11px] tracking-wider z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center text-white font-black">N°</th>
                        <th className="p-2.5 text-white font-black">Nombre del Estudiante</th>
                        <th className="p-2.5 w-28 text-white font-black">NIE</th>
                        <th className="p-2.5 text-white font-black">Correo del Tutor</th>
                        <th className="p-2.5 w-32 text-center text-white font-black">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {parseResult.validStudents.map((st, idx) => {
                        const isDup = st.isDuplicateInFile || st.isDuplicateInSystem;
                        return (
                          <tr
                            key={idx}
                            className={`transition ${
                              isDup
                                ? 'bg-amber-50/80 text-[#1E293B]'
                                : 'hover:bg-blue-50/40 text-[#1E293B]'
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono font-black text-[#1E3A8A]">
                              {st.listNumber || idx + 1}
                            </td>
                            <td className="p-2.5 font-bold text-[#1E293B]">
                              <span>{st.fullName}</span>
                              {st.duplicateReason && (
                                <span className="block text-[10px] text-amber-900 font-bold">
                                  {st.duplicateReason}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-[#1E293B]">
                              {st.nie || 'N/A'}
                            </td>
                            <td className="p-2.5 text-[#334155] font-medium truncate max-w-[140px]">
                              {st.parentEmail || 'Sin correo'}
                            </td>
                            <td className="p-2.5 text-center">
                              {isDup ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                  {skipDuplicates ? 'Se omitirá' : 'Duplicado'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                                  Válido
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t-2 border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#475569] hover:text-[#1E293B] transition"
          >
            Cancelar
          </button>

          {parseResult && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={eligibleStudentsCount === 0}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              Inscribir {eligibleStudentsCount} Estudiantes al Grado
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
