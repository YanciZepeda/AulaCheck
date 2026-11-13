import * as XLSX from 'xlsx';
import { Student, AttendanceRecord } from '../types';

export interface MonthOption {
  year: number;
  month: number; // 0-indexed: 0 = Enero, 1 = Febrero, ..., 10 = Noviembre, 11 = Diciembre
  name: string; // ej. "Febrero 2026"
  shortName: string; // ej. "Feb"
}

export interface DayInfo {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number; // 1, 2, 3...
  dayOfWeekName: string; // "Lunes", "Martes", etc.
  dayOfWeekShort: string; // "Lun", "Mar", "Mié", "Jue", "Vie"
  isWeekend: boolean;
}

export interface PeriodPreset {
  id: string;
  name: string;
  shortLabel: string;
  monthIndices: number[]; // 1-based index (1 = Febrero, ..., 10 = Noviembre)
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAY_SHORTS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Retorna la lista oficial del año lectivo MINED que abarca desde Febrero hasta Noviembre (meses 1 a 10).
 */
export function getDefaultSchoolMonths(startYear = 2026): MonthOption[] {
  const months: MonthOption[] = [];
  // Año escolar oficial: Febrero (1) a Noviembre (10)
  for (let m = 1; m <= 10; m++) {
    months.push({
      year: startYear,
      month: m,
      name: `${MONTH_NAMES[m]} ${startYear}`,
      shortName: MONTH_NAMES[m].substring(0, 3)
    });
  }
  return months;
}

/**
 * Presets de distribución por Trimestres (3 trimestres en el año escolar hasta Noviembre)
 */
export const TRIMESTRE_PRESETS: PeriodPreset[] = [
  { id: 'trim-1', name: '1er Trimestre (Febrero - Abril)', shortLabel: 'Trimestre 1', monthIndices: [1, 2, 3] },
  { id: 'trim-2', name: '2do Trimestre (Mayo - Julio)', shortLabel: 'Trimestre 2', monthIndices: [4, 5, 6] },
  { id: 'trim-3', name: '3er Trimestre (Agosto - Noviembre)', shortLabel: 'Trimestre 3', monthIndices: [7, 8, 9, 10] }
];

/**
 * Presets de distribución por Periodos (4 periodos oficiales en el año lectivo hasta Noviembre)
 */
export const PERIODO_PRESETS: PeriodPreset[] = [
  { id: 'per-1', name: 'Periodo 1 (Febrero - Marzo)', shortLabel: 'Periodo 1', monthIndices: [1, 2] },
  { id: 'per-2', name: 'Periodo 2 (Abril - Mayo)', shortLabel: 'Periodo 2', monthIndices: [3, 4] },
  { id: 'per-3', name: 'Periodo 3 (Junio - Agosto)', shortLabel: 'Periodo 3', monthIndices: [5, 6, 7] },
  { id: 'per-4', name: 'Periodo 4 (Septiembre - Noviembre)', shortLabel: 'Periodo 4', monthIndices: [8, 9, 10] }
];

/**
 * Retorna todos los días lectivos (Lunes a Viernes) para un año y mes dados.
 */
export function getMonthSchoolDays(year: number, month: number): DayInfo[] {
  const days: DayInfo[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sáb

    // Filtrar solo días de lunes a viernes
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const monthPadded = String(month + 1).padStart(2, '0');
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;

      days.push({
        dateStr,
        dayOfMonth: d,
        dayOfWeekName: WEEKDAY_NAMES[dayOfWeek],
        dayOfWeekShort: WEEKDAY_SHORTS[dayOfWeek],
        isWeekend: false
      });
    }
  }

  return days;
}

/**
 * Construye la matriz de celdas para un mes específico con el conteo de:
 * Asistencias (P), Faltas (F), Faltas Justificadas (FJ), Tardanzas (T) y % Asistencia.
 */
export function buildMonthSpreadsheetAOA(params: {
  institutionName: string;
  institutionCode: string;
  teacherName: string;
  subjectName: string;
  gradeName: string;
  periodLabel: string;
  monthName: string;
  schoolDays: DayInfo[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}): { aoa: any[][]; studentTotals: Map<string, { present: number; absent: number; justified: number; tardy: number; pct: number }> } {
  const {
    institutionName,
    institutionCode,
    teacherName,
    subjectName,
    gradeName,
    periodLabel,
    monthName,
    schoolDays,
    students,
    attendanceRecords
  } = params;

  const aoa: any[][] = [];
  const studentTotals = new Map<string, { present: number; absent: number; justified: number; tardy: number; pct: number }>();

  // Encabezado institucional
  aoa.push([`INSTITUCIÓN: ${institutionName.toUpperCase()} (${institutionCode})`]);
  aoa.push([`CUADRO OFICIAL DE ASISTENCIA MENSUAL - ${monthName.toUpperCase()}`]);
  aoa.push([
    `Docente: ${teacherName}`,
    `Materia: ${subjectName}`,
    `Grado: ${gradeName}`,
    `Distribución: ${periodLabel}`
  ]);
  aoa.push([]);

  // Fila 1 de encabezados de columnas
  const dayNamesRow: any[] = ['N°', 'Nombre Completo del Estudiante', 'NIE'];
  schoolDays.forEach((day) => {
    dayNamesRow.push(day.dayOfWeekShort);
  });
  dayNamesRow.push('Asistencias (P)', 'Faltas (F)', 'Faltas Justif. (FJ)', 'Tardanzas (T)', '% Asistencia');
  aoa.push(dayNamesRow);

  // Fila 2 de encabezados (Días numéricos)
  const dayNumbersRow: any[] = ['', '', 'Día:'];
  schoolDays.forEach((day) => {
    dayNumbersRow.push(day.dayOfMonth);
  });
  dayNumbersRow.push('Presentes', 'Inasistencias', 'Justificadas', 'Tardanzas', 'Efectividad');
  aoa.push(dayNumbersRow);

  // Filas por cada estudiante
  students.forEach((st) => {
    let presentCount = 0;
    let absentCount = 0;
    let tardyCount = 0;
    let justifiedCount = 0;

    const studentRow: any[] = [
      st.listNumber || '-',
      st.fullName,
      st.nie || 'N/A'
    ];

    schoolDays.forEach((day) => {
      const record = attendanceRecords.find(
        (a) => a.studentId === st.id && a.date === day.dateStr && a.subjectName === subjectName
      );

      if (!record) {
        studentRow.push('-');
      } else if (record.status === 'presente') {
        presentCount++;
        studentRow.push('P');
      } else if (record.status === 'ausente') {
        absentCount++;
        studentRow.push('F');
      } else if (record.status === 'tardanza') {
        tardyCount++;
        studentRow.push('T');
      } else if (record.status === 'justificado') {
        justifiedCount++;
        studentRow.push('FJ');
      } else {
        studentRow.push('-');
      }
    });

    const totalDaysRecorded = presentCount + absentCount + tardyCount + justifiedCount;
    const effectivePresent = presentCount + justifiedCount + tardyCount * 0.5;
    const pct = totalDaysRecorded > 0 ? Math.round((effectivePresent / totalDaysRecorded) * 100) : 100;

    // Agregar conteos claros por estudiante
    studentRow.push(presentCount, absentCount, justifiedCount, tardyCount, `${pct}%`);
    aoa.push(studentRow);

    studentTotals.set(st.id, {
      present: presentCount,
      absent: absentCount,
      justified: justifiedCount,
      tardy: tardyCount,
      pct
    });
  });

  // Fila de Totales del Grupo
  const summaryRow: any[] = ['TOTAL', 'Asistencias del Día', ''];
  schoolDays.forEach((day) => {
    const dayRecords = attendanceRecords.filter(
      (a) => a.date === day.dateStr && a.subjectName === subjectName && a.status === 'presente'
    );
    summaryRow.push(dayRecords.length);
  });
  summaryRow.push('', '', '', '', '');
  aoa.push([]);
  aoa.push(summaryRow);

  return { aoa, studentTotals };
}

/**
 * 1. Exporta el Cuadro del Mes Seleccionado a Excel (.xlsx) con conteo de faltas, asistencias y justificaciones
 */
export function exportMonthlyAttendanceToExcel(params: {
  institutionName: string;
  institutionCode: string;
  teacherName: string;
  subjectName: string;
  gradeName: string;
  periodNum: number | string;
  monthName: string;
  schoolDays: DayInfo[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}) {
  const { aoa } = buildMonthSpreadsheetAOA({
    ...params,
    periodLabel: typeof params.periodNum === 'number' ? `Periodo ${params.periodNum}` : params.periodNum
  });

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Ajuste de anchos de columna
  const colWidths = [
    { wch: 5 }, // N°
    { wch: 34 }, // Nombre
    { wch: 15 }, // NIE
  ];
  params.schoolDays.forEach(() => colWidths.push({ wch: 5 }));
  colWidths.push({ wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  const cleanSheetName = params.monthName.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

  const filename = `Asistencia_${params.monthName.replace(/\s+/g, '_')}_${params.subjectName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * 2. Exporta el Periodo o Trimestre Completo a Excel con todas sus hojas mensuales
 * y una pestaña de Resumen Acumulado con el conteo de faltas, asistencias y justificaciones por estudiante.
 */
export function exportPeriodAttendanceToExcel(params: {
  institutionName: string;
  institutionCode: string;
  teacherName: string;
  subjectName: string;
  gradeName: string;
  periodLabel: string;
  months: MonthOption[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}) {
  const {
    institutionName,
    institutionCode,
    teacherName,
    subjectName,
    gradeName,
    periodLabel,
    months,
    students,
    attendanceRecords
  } = params;

  const workbook = XLSX.utils.book_new();

  // Acumuladores del periodo para cada estudiante
  const periodAccumulator = new Map<string, { present: number; absent: number; justified: number; tardy: number }>();
  students.forEach((s) => {
    periodAccumulator.set(s.id, { present: 0, absent: 0, justified: 0, tardy: 0 });
  });

  // Crear una hoja por cada mes del periodo/trimestre
  months.forEach((m) => {
    const schoolDays = getMonthSchoolDays(m.year, m.month);
    const { aoa, studentTotals } = buildMonthSpreadsheetAOA({
      institutionName,
      institutionCode,
      teacherName,
      subjectName,
      gradeName,
      periodLabel,
      monthName: m.name,
      schoolDays,
      students,
      attendanceRecords
    });

    // Sumar al acumulador
    studentTotals.forEach((totals, sId) => {
      const acc = periodAccumulator.get(sId);
      if (acc) {
        acc.present += totals.present;
        acc.absent += totals.absent;
        acc.justified += totals.justified;
        acc.tardy += totals.tardy;
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = [{ wch: 5 }, { wch: 34 }, { wch: 15 }];
    schoolDays.forEach(() => colWidths.push({ wch: 5 }));
    colWidths.push({ wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 });
    ws['!cols'] = colWidths;

    const sheetName = m.name.substring(0, 31).replace(/[^a-zA-Z0-9 ]/g, '');
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  });

  // Hoja de Resumen y Conteo del Periodo / Trimestre
  const summaryAoa: any[][] = [
    [`RESUMEN CONSOLIDADO DE ASISTENCIA: ${periodLabel.toUpperCase()}`],
    [`Institución: ${institutionName} (${institutionCode})`],
    [`Docente: ${teacherName} | Materia: ${subjectName} | Grado: ${gradeName}`],
    [`Meses incluidos: ${months.map((m) => m.name).join(', ')}`],
    [],
    ['N°', 'Nombre del Estudiante', 'NIE Oficial', 'Total Asistencias (P)', 'Total Faltas (F)', 'Faltas Justificadas (FJ)', 'Total Tardanzas (T)', '% Efectividad Acumulada']
  ];

  students.forEach((st) => {
    const acc = periodAccumulator.get(st.id) || { present: 0, absent: 0, justified: 0, tardy: 0 };
    const totalRecorded = acc.present + acc.absent + acc.justified + acc.tardy;
    const effectivePresent = acc.present + acc.justified + acc.tardy * 0.5;
    const pct = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 100) : 100;

    summaryAoa.push([
      st.listNumber || '-',
      st.fullName,
      st.nie || 'N/A',
      acc.present,
      acc.absent,
      acc.justified,
      acc.tardy,
      `${pct}%`
    ]);
  });

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa);
  summaryWs['!cols'] = [
    { wch: 5 },
    { wch: 34 },
    { wch: 15 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWs, 'Resumen_Periodo');

  const filename = `Asistencia_${periodLabel.replace(/\s+/g, '_')}_${subjectName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * 3. Exporta Toda la Asistencia del Año Escolar Completo (Febrero a Noviembre)
 * en un libro Excel completo con una hoja por mes más la hoja de Consolidado Anual.
 */
export function exportAnnualAttendanceToExcel(params: {
  institutionName: string;
  institutionCode: string;
  teacherName: string;
  subjectName: string;
  gradeName: string;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}) {
  const {
    institutionName,
    institutionCode,
    teacherName,
    subjectName,
    gradeName,
    students,
    attendanceRecords
  } = params;

  const allMonths = getDefaultSchoolMonths(2026); // Febrero a Noviembre
  const workbook = XLSX.utils.book_new();

  const annualAccumulator = new Map<string, { present: number; absent: number; justified: number; tardy: number }>();
  students.forEach((s) => {
    annualAccumulator.set(s.id, { present: 0, absent: 0, justified: 0, tardy: 0 });
  });

  // Hojas mensuales
  allMonths.forEach((m) => {
    const schoolDays = getMonthSchoolDays(m.year, m.month);
    const { aoa, studentTotals } = buildMonthSpreadsheetAOA({
      institutionName,
      institutionCode,
      teacherName,
      subjectName,
      gradeName,
      periodLabel: 'Año Lectivo 2026',
      monthName: m.name,
      schoolDays,
      students,
      attendanceRecords
    });

    studentTotals.forEach((totals, sId) => {
      const acc = annualAccumulator.get(sId);
      if (acc) {
        acc.present += totals.present;
        acc.absent += totals.absent;
        acc.justified += totals.justified;
        acc.tardy += totals.tardy;
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = [{ wch: 5 }, { wch: 34 }, { wch: 15 }];
    schoolDays.forEach(() => colWidths.push({ wch: 5 }));
    colWidths.push({ wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 });
    ws['!cols'] = colWidths;

    const sheetName = m.name.substring(0, 31).replace(/[^a-zA-Z0-9 ]/g, '');
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  });

  // Hoja de Consolidado Anual con Conteo de Faltas, Asistencias y Faltas Justificadas
  const annualAoa: any[][] = [
    [`CONSOLIDADO ANUAL DE ASISTENCIA ESCOLAR 2026 (FEBRERO - NOVIEMBRE)`],
    [`Institución: ${institutionName} (${institutionCode})`],
    [`Docente: ${teacherName} | Materia: ${subjectName} | Grado: ${gradeName}`],
    [`Cobertura: 10 Meses (Febrero a Noviembre 2026)`],
    [],
    ['N°', 'Nombre del Estudiante', 'NIE Oficial MINED', 'Total Asistencias (P)', 'Total Faltas (F)', 'Faltas Justificadas (FJ)', 'Total Tardanzas (T)', '% Asistencia Anual']
  ];

  students.forEach((st) => {
    const acc = annualAccumulator.get(st.id) || { present: 0, absent: 0, justified: 0, tardy: 0 };
    const totalRecorded = acc.present + acc.absent + acc.justified + acc.tardy;
    const effectivePresent = acc.present + acc.justified + acc.tardy * 0.5;
    const pct = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 100) : 100;

    annualAoa.push([
      st.listNumber || '-',
      st.fullName,
      st.nie || 'N/A',
      acc.present,
      acc.absent,
      acc.justified,
      acc.tardy,
      `${pct}%`
    ]);
  });

  const annualWs = XLSX.utils.aoa_to_sheet(annualAoa);
  annualWs['!cols'] = [
    { wch: 5 },
    { wch: 34 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, annualWs, 'Consolidado_Anual');

  const filename = `Asistencia_Anual_2026_${subjectName.replace(/\s+/g, '_')}_${gradeName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
