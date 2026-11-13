import * as XLSX from 'xlsx';
import { Student } from '../types';

export interface ParsedStudentRow {
  listNumber?: number;
  fullName: string;
  nie?: string;
  parentEmail?: string;
  isDuplicateInFile?: boolean;
  isDuplicateInSystem?: boolean;
  duplicateReason?: string;
}

export interface ParseExcelResult {
  fileName: string;
  totalRows: number;
  validStudents: ParsedStudentRow[];
  duplicatesInFile: number;
  duplicatesInSystem: number;
  errors: string[];
}

/**
 * Normalizes a student name for accurate comparison:
 * lowercase, removes accents, collapses whitespace.
 */
export function normalizeStudentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file and checks for duplicates
 * both within the file and against existing students in the system.
 */
export async function parseStudentsExcelFile(
  file: File,
  existingStudentsInGradeOrSchool: Student[]
): Promise<ParseExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('No se pudo leer el archivo.');
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('El archivo Excel no contiene hojas de trabajo.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        // Parse as raw 2D array
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) {
          throw new Error('El archivo Excel está vacío.');
        }

        // Determine if first row is header
        let startIndex = 0;
        let colIndexName = 0;
        let colIndexNie = 1;
        let colIndexEmail = 2;
        let colIndexListNum = -1;

        const firstRow = rows[0].map((c) => String(c).trim().toLowerCase());
        const hasHeader = firstRow.some((cell) =>
          cell.includes('nombre') ||
          cell.includes('alumno') ||
          cell.includes('estudiante') ||
          cell.includes('nie') ||
          cell.includes('correo') ||
          cell.includes('lista') ||
          cell.includes('n°')
        );

        if (hasHeader) {
          startIndex = 1;
          firstRow.forEach((cell, idx) => {
            if (cell.includes('nombre') || cell.includes('alumno') || cell.includes('estudiante')) {
              colIndexName = idx;
            } else if (cell.includes('nie') || cell.includes('identificacion') || cell.includes('código')) {
              colIndexNie = idx;
            } else if (cell.includes('correo') || cell.includes('email') || cell.includes('padre') || cell.includes('tutor')) {
              colIndexEmail = idx;
            } else if (cell.includes('n°') || cell.includes('lista') || cell.includes('numero') || cell.includes('num')) {
              colIndexListNum = idx;
            }
          });
        }

        const existingNamesMap = new Map<string, Student>();
        const existingNieMap = new Map<string, Student>();

        existingStudentsInGradeOrSchool.forEach((st) => {
          existingNamesMap.set(normalizeStudentName(st.fullName), st);
          if (st.nie && st.nie.trim()) {
            existingNieMap.set(st.nie.trim().toUpperCase(), st);
          }
        });

        const seenNamesInThisFile = new Set<string>();
        const parsedRows: ParsedStudentRow[] = [];
        let duplicatesInFile = 0;
        let duplicatesInSystem = 0;

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Extract candidate values
          const rawName = String(row[colIndexName] ?? '').trim();
          if (!rawName || rawName.length < 2) continue; // Skip blank rows

          // Clean up name
          const fullName = rawName;
          const normalized = normalizeStudentName(fullName);

          let nie = colIndexNie >= 0 && row[colIndexNie] !== undefined ? String(row[colIndexNie]).trim() : '';
          let email = colIndexEmail >= 0 && row[colIndexEmail] !== undefined ? String(row[colIndexEmail]).trim() : '';
          let listNumber = colIndexListNum >= 0 && row[colIndexListNum] ? parseInt(String(row[colIndexListNum]), 10) : undefined;

          // Check duplicate in file
          let isDupInFile = false;
          let isDupInSystem = false;
          let reason = '';

          if (seenNamesInThisFile.has(normalized)) {
            isDupInFile = true;
            duplicatesInFile++;
            reason = 'Nombre repetido en este mismo archivo Excel';
          } else {
            seenNamesInThisFile.add(normalized);
          }

          // Check duplicate in system
          if (existingNamesMap.has(normalized)) {
            isDupInSystem = true;
            duplicatesInSystem++;
            reason = reason ? `${reason} y ya registrado en la escuela` : 'Estudiante con este nombre ya está registrado en la escuela';
          } else if (nie && existingNieMap.has(nie.toUpperCase())) {
            isDupInSystem = true;
            duplicatesInSystem++;
            reason = reason ? `${reason} (NIE duplicado)` : `NIE ${nie} ya está registrado a otro alumno`;
          }

          parsedRows.push({
            listNumber,
            fullName,
            nie: nie || undefined,
            parentEmail: email || undefined,
            isDuplicateInFile: isDupInFile,
            isDuplicateInSystem: isDupInSystem,
            duplicateReason: reason || undefined
          });
        }

        resolve({
          fileName: file.name,
          totalRows: parsedRows.length,
          validStudents: parsedRows,
          duplicatesInFile,
          duplicatesInSystem,
          errors: []
        });
      } catch (err: any) {
        reject(new Error(err?.message || 'Error al procesar el archivo Excel.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error de lectura del archivo en el navegador.'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Generates an empty Excel template for the user to download.
 */
export function generateStudentExcelTemplate(): void {
  const sampleData = [
    ['N° Lista', 'Nombre Completo', 'NIE', 'Correo del Padre o Tutor'],
    [1, 'Carlos Eduardo Rivera Morales', '2026-10451', 'padre.carlos@gmail.com'],
    [2, 'Valeria Sofía Hernández Castro', '2026-10452', 'madre.valeria@gmail.com'],
    [3, 'Mateo Alejandro Gómez Quintanilla', '2026-10453', 'tutor.mateo@hotmail.com']
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
  XLSX.writeFile(wb, 'plantilla_estudiantes.xlsx');
}
