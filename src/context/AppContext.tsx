import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Institution,
  Student,
  AttendanceRecord,
  PeriodGrades,
  CalendarEvent,
  CustomTag,
  NotificationItem,
  UserRole,
  ParentProfile,
  TeacherProfile,
  TeacherAssignment,
  ActivityWeight,
  ParentThresholdConfig,
  GradeLevel,
  ScheduleSlot,
  VirtualOnlineExam,
  StudentExamSession
} from '../types';
import {
  INITIAL_INSTITUTIONS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_PERIOD_GRADES,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_CUSTOM_TAGS
} from '../data/mockData';
import {
  DEFAULT_SCHEDULE_SLOTS,
  DEFAULT_VIRTUAL_EXAMS
} from '../data/scheduleAndExamDefaults';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  institutions: Institution[];
  students: Student[];
  attendance: AttendanceRecord[];
  periodGrades: PeriodGrades[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  customTags: CustomTag[];
  isMobileSimulated: boolean;
  setIsMobileSimulated: (val: boolean) => void;

  activeInstitution: Institution | null;
  activeTeacher: TeacherProfile | null;
  activeParent: ParentProfile | null;
  selectedChild: Student | null;

  switchRole: (role: UserRole, profileData?: any) => void;
  updateActiveTeacher: (updates: Partial<TeacherProfile>) => void;
  updateActiveParent: (updates: Partial<ParentProfile>) => void;
  registerInstitution: (data: {
    name: string;
    type: 'publica' | 'privada';
    infrastructureCode: string;
    contactEmail: string;
    logoUrl?: string;
    gradeLevels: { name: string; subjects: string[] }[];
  }) => Institution;
  verifyInfrastructureCode: (code: string) => boolean;
  addTeacherAssignment: (institutionCode: string, assignment: Omit<TeacherAssignment, 'id'>) => void;
  updateTeacherAssignmentSchedule: (institutionCode: string, teacherAssignmentId: string, scheduleTime: string) => void;
  updateTeacherAssignmentDetails: (institutionCode: string, gradeId: string, subjectName: string, updates: Partial<TeacherAssignment>) => void;
  registerTeacher: (profile: TeacherProfile) => void;
  registerParent: (profile: ParentProfile) => void;
  importStudents: (
    institutionCode: string,
    gradeId: string,
    newStudents: { listNumber?: number; fullName: string; nie?: string; parentEmail?: string }[]
  ) => { added: number; skippedDuplicates: number; duplicateNames: string[] };
  recordAttendanceList: (
    items: { studentId: string; status: 'presente' | 'ausente' | 'tardanza' | 'justificado'; notes?: string }[],
    subjectName: string,
    gradeId: string,
    time: string,
    date: string
  ) => void;
  updateGrade: (periodId: string, studentId: string, activityId: string, score: number) => void;
  addActivity: (periodId: string, activity: Omit<ActivityWeight, 'id'>) => boolean;
  updateActivity: (periodId: string, activityId: string, updated: Partial<ActivityWeight>) => boolean;
  deleteActivity: (periodId: string, activityId: string) => boolean;
  batchUpdateExamGrades: (periodId: string, updates: { studentId: string; score: number }[], activityNameTarget?: string) => void;
  markStudentCriticalAlert: (studentId: string, subjectName: string, average: number) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  addCustomTag: (tag: Omit<CustomTag, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  exportPeriodGradesCSV: (periodId: string) => void;
  exportAttendanceCSV: (subjectName: string, gradeId: string) => void;
  setSingleAttendance: (
    studentId: string,
    subjectName: string,
    gradeId: string,
    date: string,
    status: 'presente' | 'ausente' | 'tardanza' | 'justificado'
  ) => void;
  markAllPresentForDate: (
    studentIds: string[],
    subjectName: string,
    gradeId: string,
    date: string
  ) => void;
  cleanAllDuplicates: () => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (val: boolean) => void;
  openHelpTutorial: (tab?: 'tutorial' | 'faq') => void;
  parentThresholds: ParentThresholdConfig;
  updateParentThresholds: (thresholds: Partial<ParentThresholdConfig>) => void;
  evaluateParentThresholdsNow: () => void;
  triggerSimulatedThresholdAlert: (type: 'nota' | 'asistencia') => void;

  scheduleSlots: ScheduleSlot[];
  addScheduleSlot: (slot: Omit<ScheduleSlot, 'id'>) => void;
  updateScheduleSlot: (id: string, updates: Partial<ScheduleSlot>) => void;
  deleteScheduleSlot: (id: string) => void;
  resetDefaultSchedule: () => void;

  virtualExams: VirtualOnlineExam[];
  createVirtualOnlineExam: (exam: Omit<VirtualOnlineExam, 'id' | 'createdAt' | 'studentSessions' | 'teacherAlerts'>) => VirtualOnlineExam;
  joinVirtualExam: (pin: string, studentEmail: string, nie: string) => {
    success: boolean;
    error?: string;
    exam?: VirtualOnlineExam;
    session?: StudentExamSession;
    student?: Student;
  };
  recordStudentTabSwitch: (examId: string, studentId: string) => void;
  reEnableStudentExam: (examId: string, studentId: string) => void;
  denyStudentExam: (examId: string, studentId: string) => void;
  submitStudentOnlineExam: (
    examId: string,
    studentId: string,
    answers: Record<number, 'A' | 'B' | 'C' | 'D'>
  ) => { score: number; total: number; correctCount: number };

  toastMessage: { title: string; desc: string; type?: 'info' | 'alert' | 'success' } | null;
  clearToast: () => void;
  showToast: (title: string, desc: string, type?: 'info' | 'alert' | 'success') => void;
}

export const sanitizeAndDeduplicateStudents = (studentList: Student[]): Student[] => {
  const seenIds = new Set<string>();
  const seenNies = new Set<string>();
  const seenNormalizedNames = new Set<string>();
  const deduplicated: Student[] = [];

  for (const st of studentList) {
    if (!st || !st.fullName || !st.fullName.trim()) continue;

    const normName = st.fullName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

    const cleanNie = (st.nie || '').trim().toUpperCase();

    if (seenIds.has(st.id)) continue;
    if (cleanNie && cleanNie !== 'N/A' && cleanNie !== '-' && seenNies.has(cleanNie)) continue;
    if (seenNormalizedNames.has(normName)) continue;

    seenIds.add(st.id);
    if (cleanNie && cleanNie !== 'N/A' && cleanNie !== '-') {
      seenNies.add(cleanNie);
    }
    seenNormalizedNames.add(normName);

    deduplicated.push({
      ...st,
      fullName: st.fullName.trim(),
      nie: cleanNie && cleanNie !== 'N/A' && cleanNie !== '-' ? cleanNie : (st.nie ? st.nie.trim() : undefined)
    });
  }

  const gradeCount: Record<string, number> = {};
  return deduplicated.map((s) => {
    gradeCount[s.gradeId] = (gradeCount[s.gradeId] || 0) + 1;
    return {
      ...s,
      listNumber: gradeCount[s.gradeId]
    };
  });
};

export const DEFAULT_PARENT_THRESHOLDS: ParentThresholdConfig = {
  minGradeAverage: 6.0,
  minAttendancePercentage: 80,
  notifyOnSingleAbsence: true,
  notifyOnGradeBelowThreshold: true,
  notifyOnAttendanceBelowThreshold: true,
};

// Helper para guardar en Firestore limpiando valores "undefined"
const saveToFirestore = async (docKey: string, data: any) => {
  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, 'aulacheck_sync', docKey), {
      items: cleanData,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error(`Error sincronizando ${docKey} con Firebase:`, error);
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estados base con respaldo en localStorage
  const [institutions, setInstitutionsState] = useState<Institution[]>(() => {
    const saved = localStorage.getItem('edu_institutions');
    return saved ? JSON.parse(saved) : INITIAL_INSTITUTIONS;
  });

  const [students, setStudentsState] = useState<Student[]>(() => {
    const saved = localStorage.getItem('edu_students');
    const raw = saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    return sanitizeAndDeduplicateStudents(raw);
  });

  const [attendance, setAttendanceState] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('edu_attendance');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
  });

  const [periodGrades, setPeriodGradesState] = useState<PeriodGrades[]>(() => {
    const saved = localStorage.getItem('edu_periodGrades');
    return saved ? JSON.parse(saved) : INITIAL_PERIOD_GRADES;
  });

  const [calendarEvents, setCalendarEventsState] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('edu_calendarEvents');
    return saved ? JSON.parse(saved) : INITIAL_CALENDAR_EVENTS;
  });

  const [notifications, setNotificationsState] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('edu_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [customTags, setCustomTagsState] = useState<CustomTag[]>(() => {
    const saved = localStorage.getItem('edu_customTags');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOM_TAGS;
  });

  const [scheduleSlots, setScheduleSlotsState] = useState<ScheduleSlot[]>(() => {
    const saved = localStorage.getItem('edu_schedule_slots');
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE_SLOTS;
  });

  const [virtualExams, setVirtualExamsState] = useState<VirtualOnlineExam[]>(() => {
    const saved = localStorage.getItem('edu_virtual_exams');
    return saved ? JSON.parse(saved) : DEFAULT_VIRTUAL_EXAMS;
  });

  // Setters sincronizados: actualizan pantalla, caché local y Firestore en tiempo real
  const createSyncedSetter = <T,>(
    rawSetter: React.Dispatch<React.SetStateAction<T>>,
    localKey: string,
    firestoreKey: string
  ): React.Dispatch<React.SetStateAction<T>> => {
    return (action) => {
      rawSetter((prev) => {
        const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action;
        localStorage.setItem(localKey, JSON.stringify(next));
        saveToFirestore(firestoreKey, next);
        return next;
      });
    };
  };

  const setInstitutions = createSyncedSetter(setInstitutionsState, 'edu_institutions', 'institutions');
  const setStudents = createSyncedSetter(setStudentsState, 'edu_students', 'students');
  const setAttendance = createSyncedSetter(setAttendanceState, 'edu_attendance', 'attendance');
  const setPeriodGrades = createSyncedSetter(setPeriodGradesState, 'edu_periodGrades', 'periodGrades');
  const setCalendarEvents = createSyncedSetter(setCalendarEventsState, 'edu_calendarEvents', 'calendarEvents');
  const setNotifications = createSyncedSetter(setNotificationsState, 'edu_notifications', 'notifications');
  const setCustomTags = createSyncedSetter(setCustomTagsState, 'edu_customTags', 'customTags');
  const setScheduleSlots = createSyncedSetter(setScheduleSlotsState, 'edu_schedule_slots', 'scheduleSlots');
  const setVirtualExams = createSyncedSetter(setVirtualExamsState, 'edu_virtual_exams', 'virtualExams');

  // Escuchadores en tiempo real de Firestore (recibe cambios hechos en otros dispositivos)
  useEffect(() => {
    const subscriptions: Array<{
      key: string;
      localKey: string;
      rawSetter: React.Dispatch<React.SetStateAction<any>>;
      currentVal: any;
      transform?: (data: any) => any;
    }> = [
      { key: 'institutions', localKey: 'edu_institutions', rawSetter: setInstitutionsState, currentVal: institutions },
      { key: 'students', localKey: 'edu_students', rawSetter: setStudentsState, currentVal: students, transform: sanitizeAndDeduplicateStudents },
      { key: 'attendance', localKey: 'edu_attendance', rawSetter: setAttendanceState, currentVal: attendance },
      { key: 'periodGrades', localKey: 'edu_periodGrades', rawSetter: setPeriodGradesState, currentVal: periodGrades },
      { key: 'calendarEvents', localKey: 'edu_calendarEvents', rawSetter: setCalendarEventsState, currentVal: calendarEvents },
      { key: 'notifications', localKey: 'edu_notifications', rawSetter: setNotificationsState, currentVal: notifications },
      { key: 'customTags', localKey: 'edu_customTags', rawSetter: setCustomTagsState, currentVal: customTags },
      { key: 'scheduleSlots', localKey: 'edu_schedule_slots', rawSetter: setScheduleSlotsState, currentVal: scheduleSlots },
      { key: 'virtualExams', localKey: 'edu_virtual_exams', rawSetter: setVirtualExamsState, currentVal: virtualExams }
    ];

    const unsubscribers = subscriptions.map(({ key, localKey, rawSetter, currentVal, transform }) => {
      const docRef = doc(db, 'aulacheck_sync', key);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          if (!snapshot.metadata.hasPendingWrites) {
            const incoming = snapshot.data().items;
            if (incoming !== undefined) {
              const finalData = transform ? transform(incoming) : incoming;
              rawSetter(finalData);
              localStorage.setItem(localKey, JSON.stringify(finalData));
            }
          }
        } else {
          // Si la base de datos está vacía al iniciar por primera vez, sube los datos iniciales
          saveToFirestore(key, currentVal);
        }
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Perfil y rol local por dispositivo (para poder usar 3 dispositivos con distintos perfiles a la vez)
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('edu_active_role');
    return (saved as UserRole) || 'profesor';
  });

  const [isMobileSimulated, setIsMobileSimulated] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type?: 'info' | 'alert' | 'success' } | null>(null);

  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const tutorialDone = localStorage.getItem('edu_tutorial_completed');
    if (!tutorialDone) {
      setIsHelpModalOpen(true);
    }
  }, []);

  const openHelpTutorial = (_tab?: 'tutorial' | 'faq') => {
    setIsHelpModalOpen(true);
  };

  const clearToast = () => setToastMessage(null);

  const showToast = (title: string, desc: string, type: 'info' | 'alert' | 'success' = 'info') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.title === title ? null : prev));
    }, 4500);
  };

  const [activeInstitution, setActiveInstitution] = useState<Institution | null>(() => {
    const saved = localStorage.getItem('edu_active_institution');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return institutions[0] || null;
  });

  // Mantener activeInstitution sincronizada si la escuela actualiza materias o docentes desde otro dispositivo
  useEffect(() => {
    if (activeInstitution) {
      const updatedMatch = institutions.find((i) => i.institutionCode === activeInstitution.institutionCode);
      if (updatedMatch && JSON.stringify(updatedMatch) !== JSON.stringify(activeInstitution)) {
        setActiveInstitution(updatedMatch);
        localStorage.setItem('edu_active_institution', JSON.stringify(updatedMatch));
      }
    }
  }, [institutions]);

  const [activeTeacher, setActiveTeacher] = useState<TeacherProfile | null>(() => {
    const saved = localStorage.getItem('edu_active_teacher');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      teacherEmail: 'carlos.mendoza@cedusansalvador.edu.sv',
      teacherName: 'Prof. Carlos Mendoza',
      institutionCode: 'ESC-PUB-2026',
      assignedGradeId: '1-grado',
      assignedSubject: 'Matemáticas'
    };
  });

  const [parentThresholds, setParentThresholds] = useState<ParentThresholdConfig>(() => {
    const saved = localStorage.getItem('edu_parent_thresholds');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_PARENT_THRESHOLDS;
  });

  const [activeParent, setActiveParent] = useState<ParentProfile | null>(() => {
    const saved = localStorage.getItem('edu_active_parent');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      parentEmail: 'diego.tutor@hotmail.com',
      parentName: 'Lic. Roberto Carranza (Padre)',
      childName: 'Diego Alexander Carranza Mejía',
      institutionType: 'publica',
      nie: '18882848',
      studentId: 'stud-3',
      institutionName: 'Complejo Educativo San Salvador',
      institutionCode: 'ESC-PUB-2026',
      thresholds: DEFAULT_PARENT_THRESHOLDS
    };
  });

  useEffect(() => {
    if (activeTeacher) {
      localStorage.setItem('edu_active_teacher', JSON.stringify(activeTeacher));
    }
  }, [activeTeacher]);

  useEffect(() => {
    if (activeParent) {
      localStorage.setItem('edu_active_parent', JSON.stringify(activeParent));
    }
  }, [activeParent]);

  useEffect(() => {
    if (activeInstitution) {
      localStorage.setItem('edu_active_institution', JSON.stringify(activeInstitution));
    }
  }, [activeInstitution]);

  useEffect(() => {
    localStorage.setItem('edu_active_role', role);
  }, [role]);

  const updateActiveTeacher = (updates: Partial<TeacherProfile>) => {
    setActiveTeacher((prev) => {
      const next = prev ? { ...prev, ...updates } : (updates as TeacherProfile);
      localStorage.setItem('edu_active_teacher', JSON.stringify(next));
      return next;
    });
    showToast('Perfil de Profesor Actualizado', 'Tus datos fueron guardados permanentemente.', 'success');
  };

  const updateActiveParent = (updates: Partial<ParentProfile>) => {
    setActiveParent((prev) => {
      const base = prev || {
        parentEmail: 'diego.tutor@hotmail.com',
        parentName: 'Lic. Roberto Carranza (Padre)',
        childName: 'Diego Alexander Carranza Mejía',
        institutionType: 'publica',
        nie: '18882848',
        studentId: 'stud-3',
        institutionName: 'Complejo Educativo San Salvador',
        institutionCode: 'ESC-PUB-2026',
        thresholds: DEFAULT_PARENT_THRESHOLDS
      };

      const nextChildName = (updates.childName !== undefined ? updates.childName : base.childName).trim();
      const nextNie = updates.nie !== undefined ? updates.nie.trim() : (base.nie || '').trim();
      const nextParentEmail = updates.parentEmail !== undefined ? updates.parentEmail.trim() : base.parentEmail;
      const nextParentName = updates.parentName !== undefined ? updates.parentName.trim() : base.parentName;
      const targetInstCode = updates.institutionCode || base.institutionCode || 'ESC-PUB-2026';

      let resolvedStudentId = updates.studentId || base.studentId;

      setStudents((prevStudents) => {
        let targetIdx = prevStudents.findIndex((s) => s.id === resolvedStudentId);

        if (targetIdx < 0 || (nextChildName && prevStudents[targetIdx]?.fullName.toLowerCase() !== nextChildName.toLowerCase())) {
          const normSearch = nextChildName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const byNameIdx = prevStudents.findIndex((s) => {
            const sNorm = s.fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return sNorm === normSearch || sNorm.includes(normSearch) || normSearch.includes(sNorm);
          });
          if (byNameIdx >= 0) {
            targetIdx = byNameIdx;
            resolvedStudentId = prevStudents[targetIdx].id;
          }
        }

        if (targetIdx < 0 && nextNie) {
          const byNieIdx = prevStudents.findIndex(
            (s) => (s.nie || '').trim().toUpperCase() === nextNie.toUpperCase()
          );
          if (byNieIdx >= 0) {
            targetIdx = byNieIdx;
            resolvedStudentId = prevStudents[targetIdx].id;
          }
        }

        if (targetIdx >= 0) {
          const copy = [...prevStudents];
          copy[targetIdx] = {
            ...copy[targetIdx],
            fullName: nextChildName || copy[targetIdx].fullName,
            nie: nextNie || copy[targetIdx].nie,
            parentEmail: nextParentEmail || copy[targetIdx].parentEmail,
            institutionCode: targetInstCode
          };
          return copy;
        } else {
          const newStudId = `stud-custom-${Date.now()}`;
          resolvedStudentId = newStudId;
          const newStudent: Student = {
            id: newStudId,
            listNumber: prevStudents.length + 1,
            fullName: nextChildName || 'Nuevo Estudiante',
            nie: nextNie || undefined,
            gradeId: '1-grado',
            institutionCode: targetInstCode,
            parentEmail: nextParentEmail
          };
          const updatedList = sanitizeAndDeduplicateStudents([...prevStudents, newStudent]);

          setPeriodGrades((prevGrades) => {
            return prevGrades.map((pg) => {
              if (pg.institutionCode === targetInstCode) {
                const newGrades = [...pg.grades];
                pg.activities.forEach((act, aIdx) => {
                  const sampleScores = [8.5, 9.0, 7.5, 8.0, 9.5];
                  newGrades.push({
                    studentId: newStudId,
                    activityId: act.id,
                    score: sampleScores[aIdx % sampleScores.length]
                  });
                });
                return { ...pg, grades: newGrades };
              }
              return pg;
            });
          });

          const now = new Date();
          const dateStr = now.toISOString().split('T')[0];
          setAttendance((prevAtt) => [
            {
              id: `att-seed-${Date.now()}-1`,
              date: dateStr,
              time: '08:00 AM',
              subjectName: 'Matemáticas',
              gradeId: '1-grado',
              institutionCode: targetInstCode,
              studentId: newStudId,
              status: 'presente'
            },
            ...prevAtt
          ]);

          return updatedList;
        }
      });

      const nextProfile: ParentProfile = {
        ...base,
        ...updates,
        parentName: nextParentName,
        childName: nextChildName,
        nie: nextNie,
        parentEmail: nextParentEmail,
        studentId: resolvedStudentId,
        institutionCode: targetInstCode
      };

      localStorage.setItem('edu_active_parent', JSON.stringify(nextProfile));
      return nextProfile;
    });

    showToast('Perfil de Padre Sincronizado', 'Los datos del hijo fueron guardados y vinculados en tiempo real con la escuela.', 'success');
  };

  const selectedChild = React.useMemo(() => {
    if (!activeParent) return students[0] || null;

    let found = students.find((s) => s.id === activeParent.studentId);

    const parentChildName = (activeParent.childName || '').trim().toLowerCase();
    if (!found || (parentChildName && !found.fullName.toLowerCase().includes(parentChildName) && !parentChildName.includes(found.fullName.toLowerCase()))) {
      const byName = students.find((s) => s.fullName.toLowerCase() === parentChildName)
        || students.find((s) => s.fullName.toLowerCase().includes(parentChildName) || parentChildName.includes(s.fullName.toLowerCase()));
      if (byName) {
        found = byName;
      }
    }

    if (!found && activeParent.nie) {
      const searchNie = activeParent.nie.trim().toUpperCase();
      const byNie = students.find((s) => (s.nie || '').trim().toUpperCase() === searchNie);
      if (byNie) {
        found = byNie;
      }
    }

    return found || students.find((s) => s.institutionCode === activeParent.institutionCode) || students[0] || null;
  }, [students, activeParent]);

  const cleanAllDuplicates = () => {
    setStudents((prev) => sanitizeAndDeduplicateStudents(prev));

    setInstitutions((prev) =>
      prev.map((inst) => {
        const seen = new Set<string>();
        const uniqueGrades: GradeLevel[] = [];
        inst.gradeLevels.forEach((g) => {
          const key = g.name.trim().toLowerCase();
          if (!seen.has(key) && !seen.has(g.id)) {
            seen.add(key);
            seen.add(g.id);
            uniqueGrades.push(g);
          }
        });
        return { ...inst, gradeLevels: uniqueGrades };
      })
    );

    setActiveInstitution((prev) => {
      if (!prev) return prev;
      const seen = new Set<string>();
      const uniqueGrades: GradeLevel[] = [];
      prev.gradeLevels.forEach((g) => {
        const key = g.name.trim().toLowerCase();
        if (!seen.has(key) && !seen.has(g.id)) {
          seen.add(key);
          seen.add(g.id);
          uniqueGrades.push(g);
        }
      });
      const updated = { ...prev, gradeLevels: uniqueGrades };
      localStorage.setItem('edu_active_institution', JSON.stringify(updated));
      return updated;
    });

    showToast('Matrícula Auditada', 'Se verificó que ningún estudiante esté matriculado en dos grados o duplicado en la escuela.', 'success');
  };

  const verifyInfrastructureCode = (code: string): boolean => {
    const cleaned = code.trim().toUpperCase();
    return cleaned.length >= 4 && (cleaned.startsWith('INF') || /^[A-Z0-9-]{4,12}$/.test(cleaned));
  };

  const registerInstitution = (data: {
    name: string;
    type: 'publica' | 'privada';
    infrastructureCode: string;
    contactEmail: string;
    logoUrl?: string;
    gradeLevels: { name: string; subjects: string[] }[];
  }): Institution => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = data.type === 'publica' ? 'ESC-PUB' : 'ESC-PRI';
    const institutionCode = `${prefix}-${randomSuffix}`;

    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      name: data.name,
      type: data.type,
      infrastructureCode: data.infrastructureCode.toUpperCase(),
      institutionCode,
      contactEmail: data.contactEmail,
      logoUrl: data.logoUrl || (data.type === 'publica'
        ? 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=160&q=80'
        : 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=160&q=80'),
      gradeLevels: data.gradeLevels.map((gl, idx) => ({
        id: `grade-${idx + 1}-${Date.now()}`,
        name: gl.name,
        subjects: gl.subjects
      })),
      teachers: []
    };

    setInstitutions((prev) => [newInst, ...prev]);
    setActiveInstitution(newInst);
    localStorage.setItem('edu_active_institution', JSON.stringify(newInst));
    showToast('¡Institución Registrada!', `Código generado para padres y profesores: ${institutionCode}`, 'success');
    return newInst;
  };

  const addTeacherAssignment = (institutionCode: string, assignment: Omit<TeacherAssignment, 'id'>) => {
    const newTeach: TeacherAssignment = {
      id: `teach-${Date.now()}`,
      ...assignment
    };

    setInstitutions((prev) =>
      prev.map((inst) => {
        if (inst.institutionCode === institutionCode) {
          return {
            ...inst,
            teachers: [...inst.teachers, newTeach]
          };
        }
        return inst;
      })
    );

    if (activeInstitution?.institutionCode === institutionCode) {
      setActiveInstitution((prev) => {
        const next = prev ? { ...prev, teachers: [...prev.teachers, newTeach] } : null;
        if (next) localStorage.setItem('edu_active_institution', JSON.stringify(next));
        return next;
      });
    }

    const existing = periodGrades.find(
      (p) => p.institutionCode === institutionCode && p.gradeId === assignment.gradeId && p.subjectName === assignment.subjectName
    );

    if (!existing) {
      const newPeriodGrade: PeriodGrades = {
        id: `period-${Date.now()}`,
        institutionCode,
        gradeId: assignment.gradeId,
        subjectName: assignment.subjectName,
        period: 1,
        criticalThreshold: 6.0,
        activities: [
          { id: `act-${Date.now()}-1`, name: 'Actividad Evaluada 1', percentage: 25, dueDate: '2026-10-25' },
          { id: `act-${Date.now()}-2`, name: 'Tareas y Laboratorios', percentage: 35, dueDate: '2026-11-02' },
          { id: `act-${Date.now()}-3`, name: 'Examen de Periodo', percentage: 40, dueDate: '2026-11-12', isExam: true }
        ],
        grades: []
      };
      setPeriodGrades((prev) => [...prev, newPeriodGrade]);
    }

    showToast('Profesor Asignado', `${assignment.teacherName} ha sido asignado(a) a ${assignment.subjectName}`, 'success');
  };

  const updateTeacherAssignmentSchedule = (institutionCode: string, teacherAssignmentId: string, scheduleTime: string) => {
    setInstitutions((prev) =>
      prev.map((inst) => {
        if (inst.institutionCode === institutionCode) {
          return {
            ...inst,
            teachers: inst.teachers.map((t) => (t.id === teacherAssignmentId ? { ...t, scheduleTime } : t))
          };
        }
        return inst;
      })
    );

    setActiveInstitution((prev) => {
      if (!prev || prev.institutionCode !== institutionCode) return prev;
      const next = {
        ...prev,
        teachers: prev.teachers.map((t) => (t.id === teacherAssignmentId ? { ...t, scheduleTime } : t))
      };
      localStorage.setItem('edu_active_institution', JSON.stringify(next));
      return next;
    });

    setActiveTeacher((prev) => {
      if (prev && prev.institutionCode === institutionCode) {
        return { ...prev, scheduleTime };
      }
      return prev;
    });

    showToast('Horario Actualizado', `Hora asignada para la clase: ${scheduleTime}`, 'success');
  };

  const updateTeacherAssignmentDetails = (
    institutionCode: string,
    gradeId: string,
    subjectName: string,
    updates: Partial<TeacherAssignment>
  ) => {
    setInstitutions((prev) =>
      prev.map((inst) => {
        if (inst.institutionCode !== institutionCode) return inst;
        const exists = inst.teachers.some((t) => t.gradeId === gradeId && t.subjectName.toLowerCase() === subjectName.toLowerCase());
        let updatedTeachers: TeacherAssignment[];

        if (exists) {
          updatedTeachers = inst.teachers.map((t) => {
            if (t.gradeId === gradeId && t.subjectName.toLowerCase() === subjectName.toLowerCase()) {
              return { ...t, ...updates };
            }
            return t;
          });
        } else {
          const newTeach: TeacherAssignment = {
            id: `teach-${Date.now()}`,
            teacherName: updates.teacherName || 'Docente Asignado',
            teacherEmail: updates.teacherEmail || 'docente@escuela.edu.sv',
            subjectName,
            gradeId,
            scheduleTime: updates.scheduleTime || '07:30 - 08:30 AM',
            ...updates
          };
          updatedTeachers = [...inst.teachers, newTeach];
        }

        return { ...inst, teachers: updatedTeachers };
      })
    );

    setActiveInstitution((prev) => {
      if (!prev || prev.institutionCode !== institutionCode) return prev;
      const exists = prev.teachers.some((t) => t.gradeId === gradeId && t.subjectName.toLowerCase() === subjectName.toLowerCase());
      let updatedTeachers: TeacherAssignment[];

      if (exists) {
        updatedTeachers = prev.teachers.map((t) => {
          if (t.gradeId === gradeId && t.subjectName.toLowerCase() === subjectName.toLowerCase()) {
            return { ...t, ...updates };
          }
          return t;
        });
      } else {
        const newTeach: TeacherAssignment = {
          id: `teach-${Date.now()}`,
          teacherName: updates.teacherName || 'Docente Asignado',
          teacherEmail: updates.teacherEmail || 'docente@escuela.edu.sv',
          subjectName,
          gradeId,
          scheduleTime: updates.scheduleTime || '07:30 - 08:30 AM',
          ...updates
        };
        updatedTeachers = [...prev.teachers, newTeach];
      }

      const next = { ...prev, teachers: updatedTeachers };
      localStorage.setItem('edu_active_institution', JSON.stringify(next));
      return next;
    });

    showToast('Docente de Materia Actualizado', `Datos guardados para ${subjectName} (${updates.teacherName || 'Docente'})`, 'success');
  };

  const registerTeacher = (profile: TeacherProfile) => {
    setActiveTeacher(profile);
    localStorage.setItem('edu_active_teacher', JSON.stringify(profile));
    const inst = institutions.find((i) => i.institutionCode === profile.institutionCode);
    if (inst) {
      setActiveInstitution(inst);
      localStorage.setItem('edu_active_institution', JSON.stringify(inst));
    }
    setRole('profesor');
    localStorage.setItem('edu_active_role', 'profesor');
    showToast('Perfil de Profesor Guardado', `Registrado permanentemente como ${profile.teacherName}`, 'success');
  };

  const registerParent = (profile: ParentProfile) => {
    setActiveParent(profile);
    localStorage.setItem('edu_active_parent', JSON.stringify(profile));
    const inst = institutions.find((i) => i.institutionCode === profile.institutionCode);
    if (inst) {
      setActiveInstitution(inst);
      localStorage.setItem('edu_active_institution', JSON.stringify(inst));
    }
    setRole('padre');
    localStorage.setItem('edu_active_role', 'padre');
    showToast('Perfil de Padre Guardado', `Registrado permanentemente monitoreando a ${profile.childName}`, 'success');
  };

  const importStudents = (
    institutionCode: string,
    gradeId: string,
    newStudents: { listNumber?: number; fullName: string; nie?: string; parentEmail?: string }[]
  ): { added: number; skippedDuplicates: number; duplicateNames: string[] } => {
    const normalize = (str: string) =>
      str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

    const existingInGrade = students.filter(
      (s) => s.institutionCode === institutionCode && s.gradeId === gradeId
    );
    const existingInSchool = students.filter(
      (s) => s.institutionCode === institutionCode
    );

    const existingNamesSet = new Set(existingInSchool.map((s) => normalize(s.fullName)));
    const existingNiesSet = new Set(
      existingInSchool.filter((s) => s.nie && s.nie.trim()).map((s) => s.nie!.trim().toUpperCase())
    );

    const seenInBatchSet = new Set<string>();
    const duplicateNames: string[] = [];
    const uniqueStudentsToAdd: Student[] = [];

    let currentMaxListNumber = existingInGrade.reduce((max, s) => Math.max(max, s.listNumber || 0), 0);

    newStudents.forEach((rawStudent) => {
      const cleanName = rawStudent.fullName.trim();
      if (!cleanName) return;

      const normName = normalize(cleanName);
      const cleanNie = rawStudent.nie?.trim().toUpperCase();

      if (seenInBatchSet.has(normName)) {
        duplicateNames.push(`${cleanName} (repetido en el archivo)`);
        return;
      }

      if (existingNamesSet.has(normName)) {
        duplicateNames.push(`${cleanName} (ya inscrito en la escuela)`);
        return;
      }

      if (cleanNie && existingNiesSet.has(cleanNie)) {
        duplicateNames.push(`${cleanName} (NIE ${cleanNie} ya registrado)`);
        return;
      }

      seenInBatchSet.add(normName);
      existingNamesSet.add(normName);
      if (cleanNie) existingNiesSet.add(cleanNie);

      currentMaxListNumber += 1;

      uniqueStudentsToAdd.push({
        id: `stud-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        listNumber: rawStudent.listNumber || currentMaxListNumber,
        fullName: cleanName,
        nie: rawStudent.nie?.trim() || undefined,
        gradeId,
        institutionCode,
        parentEmail: rawStudent.parentEmail?.trim() || undefined
      });
    });

    if (uniqueStudentsToAdd.length > 0) {
      setStudents((prev) => [...prev, ...uniqueStudentsToAdd]);
    }

    const skippedDuplicates = duplicateNames.length;
    const added = uniqueStudentsToAdd.length;

    if (skippedDuplicates > 0) {
      showToast(
        'Importación con Detección de Duplicados',
        `Se inscribieron ${added} estudiantes nuevos. Se detectaron y omitieron ${skippedDuplicates} nombres repetidos para evitar duplicidad.`,
        'alert'
      );
    } else {
      showToast(
        'Lista de Estudiantes Importada',
        `Se inscribieron exitosamente ${added} estudiantes sin duplicados.`,
        'success'
      );
    }

    return { added, skippedDuplicates, duplicateNames };
  };

  const recordAttendanceList = (
    items: { studentId: string; status: 'presente' | 'ausente' | 'tardanza' | 'justificado'; notes?: string }[],
    subjectName: string,
    gradeId: string,
    time: string,
    date: string
  ) => {
    const now = new Date();
    const currentTimeStr = time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentDateStr = date || now.toISOString().split('T')[0];

    const newAttendanceRecords: AttendanceRecord[] = items.map((item) => ({
      id: `att-${Date.now()}-${item.studentId}`,
      date: currentDateStr,
      time: currentTimeStr,
      subjectName,
      gradeId,
      institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
      studentId: item.studentId,
      status: item.status,
      notes: item.notes
    }));

    setAttendance((prev) => [...newAttendanceRecords, ...prev]);

    const absentItems = items.filter((i) => i.status === 'ausente');
    const newNotifications: NotificationItem[] = [];

    absentItems.forEach((absent) => {
      const student = students.find((s) => s.id === absent.studentId);
      if (student) {
        if (parentThresholds.notifyOnSingleAbsence) {
          const notif: NotificationItem = {
            id: `notif-abs-${Date.now()}-${student.id}`,
            type: 'inasistencia',
            title: '⚠️ Alerta de Inasistencia a Clases',
            message: `Su hijo(a) ${student.fullName} NO asistió a la clase de ${subjectName} el día ${currentDateStr} a las ${currentTimeStr}.`,
            date: currentDateStr,
            time: currentTimeStr,
            subjectName,
            studentName: student.fullName,
            studentId: student.id,
            parentEmail: student.parentEmail,
            institutionCode: student.institutionCode,
            read: false,
            priority: 'alta'
          };
          newNotifications.push(notif);
        }

        if (parentThresholds.notifyOnAttendanceBelowThreshold) {
          const studentAllRecords = [
            ...attendance.filter((a) => a.studentId === student.id && a.subjectName === subjectName),
            ...newAttendanceRecords.filter((a) => a.studentId === student.id && a.subjectName === subjectName)
          ];
          const totalPast = studentAllRecords.length;
          if (totalPast > 0) {
            const presentPoints = studentAllRecords.reduce((acc, r) => {
              if (r.status === 'presente') return acc + 1;
              if (r.status === 'tardanza') return acc + 0.5;
              if (r.status === 'justificado') return acc + 1;
              return acc;
            }, 0);
            const currentPct = Math.round((presentPoints / totalPast) * 100);
            if (currentPct < parentThresholds.minAttendancePercentage) {
              const absentCount = studentAllRecords.filter((r) => r.status === 'ausente').length;
              const attNotif: NotificationItem = {
                id: `notif-crit-att-${Date.now()}-${student.id}`,
                type: 'asistencia_critica',
                title: `🚨 Alerta de Asistencia Crítica (< ${parentThresholds.minAttendancePercentage}%)`,
                message: `El porcentaje de asistencia de ${student.fullName} en ${subjectName} ha caído a ${currentPct}% (${absentCount} inasistencias), por debajo del umbral mínimo configurado (${parentThresholds.minAttendancePercentage}%).`,
                date: currentDateStr,
                time: currentTimeStr,
                subjectName,
                studentName: student.fullName,
                studentId: student.id,
                parentEmail: student.parentEmail,
                institutionCode: student.institutionCode,
                read: false,
                priority: 'urgente'
              };
              newNotifications.push(attNotif);
            }
          }
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
      showToast(
        'Lista de Asistencia Registrada',
        `Se enviaron ${newNotifications.length} notificaciones de asistencia/umbral a los padres en tiempo real.`,
        'alert'
      );
    } else {
      showToast('Asistencia Guardada', 'Todos los estudiantes asistieron puntualmente.', 'success');
    }
  };

  const setSingleAttendance = (
    studentId: string,
    subjectName: string,
    gradeId: string,
    date: string,
    status: 'presente' | 'ausente' | 'tardanza' | 'justificado'
  ) => {
    const instCode = activeInstitution?.institutionCode || 'ESC-PUB-2026';
    setAttendance((prev) => {
      const existingIdx = prev.findIndex(
        (a) => a.studentId === studentId && a.date === date && a.subjectName === subjectName
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], status };
        return copy;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${studentId}-${date}`,
          date,
          time: '08:00 AM',
          subjectName,
          gradeId,
          institutionCode: instCode,
          studentId,
          status
        };
        return [newRecord, ...prev];
      }
    });

    if (status === 'ausente') {
      const student = students.find((s) => s.id === studentId);
      if (student && parentThresholds.notifyOnSingleAbsence) {
        const notif: NotificationItem = {
          id: `notif-abs-${Date.now()}-${student.id}`,
          type: 'inasistencia',
          title: '⚠️ Alerta de Inasistencia a Clases',
          message: `Su hijo(a) ${student.fullName} fue marcado(a) AUSENTE en la materia de ${subjectName} el día ${date}.`,
          date,
          time: '08:00 AM',
          subjectName,
          studentName: student.fullName,
          studentId: student.id,
          parentEmail: student.parentEmail,
          institutionCode: student.institutionCode,
          read: false,
          priority: 'alta'
        };
        setNotifications((prev) => [notif, ...prev]);
        showToast('Inasistencia Registrada', `Se notificó a los padres de ${student.fullName}`, 'alert');
      }
    }
  };

  const markAllPresentForDate = (
    studentIds: string[],
    subjectName: string,
    gradeId: string,
    date: string
  ) => {
    const instCode = activeInstitution?.institutionCode || 'ESC-PUB-2026';
    setAttendance((prev) => {
      const copy = [...prev];
      studentIds.forEach((sId) => {
        const idx = copy.findIndex((a) => a.studentId === sId && a.date === date && a.subjectName === subjectName);
        if (idx >= 0) {
          copy[idx] = { ...copy[idx], status: 'presente' };
        } else {
          copy.push({
            id: `att-${Date.now()}-${sId}-${date}`,
            date,
            time: '08:00 AM',
            subjectName,
            gradeId,
            institutionCode: instCode,
            studentId: sId,
            status: 'presente'
          });
        }
      });
      return copy;
    });
    showToast('Asistencia Masiva', `Se marcaron presentes todos los alumnos para la fecha ${date}`, 'success');
  };

  const updateGrade = (periodId: string, studentId: string, activityId: string, score: number) => {
    setPeriodGrades((prev) => {
      let targetPeriodId = periodId;
      const directExists = prev.some((p) => p.id === periodId);
      if (!directExists) {
        const byAct = prev.find((p) => p.activities.some((a) => a.id === activityId));
        if (byAct) {
          targetPeriodId = byAct.id;
        } else {
          const student = students.find((s) => s.id === studentId);
          if (student) {
            const byGrade = prev.find((p) => p.gradeId === student.gradeId);
            if (byGrade) targetPeriodId = byGrade.id;
          }
        }
      }

      return prev.map((period) => {
        if (period.id !== targetPeriodId) return period;

        let effectiveActId = activityId;
        const actExists = period.activities.some((a) => a.id === activityId);
        if (!actExists) {
          const examAct = period.activities.find((a) => a.isExam);
          if (examAct) {
            effectiveActId = examAct.id;
          } else if (period.activities.length > 0) {
            effectiveActId = period.activities[period.activities.length - 1].id;
          }
        }

        const existingIdx = period.grades.findIndex((g) => g.studentId === studentId && g.activityId === effectiveActId);
        let updatedGrades = [...period.grades];

        if (existingIdx >= 0) {
          updatedGrades[existingIdx] = { ...updatedGrades[existingIdx], score };
        } else {
          updatedGrades.push({ studentId, activityId: effectiveActId, score });
        }

        let totalWeight = 0;
        let weightedSum = 0;
        period.activities.forEach((act) => {
          const g = updatedGrades.find((gr) => gr.studentId === studentId && gr.activityId === act.id);
          if (g !== undefined) {
            weightedSum += g.score * (act.percentage / 100);
            totalWeight += act.percentage;
          }
        });

        const currentAvg = totalWeight > 0 ? (weightedSum / (totalWeight / 100)) : 10;

        const targetThreshold = (parentThresholds.notifyOnGradeBelowThreshold && parentThresholds.minGradeAverage)
          ? parentThresholds.minGradeAverage
          : period.criticalThreshold;

        if (currentAvg < targetThreshold) {
          const student = students.find((s) => s.id === studentId);
          if (student) {
            setTimeout(() => {
              markStudentCriticalAlert(studentId, period.subjectName, Number(currentAvg.toFixed(1)), targetThreshold);
            }, 100);
          }
        }

        return { ...period, grades: updatedGrades };
      });
    });
  };

  const markStudentCriticalAlert = (studentId: string, subjectName: string, average: number, customThreshold?: number) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const thresholdUsed = customThreshold || parentThresholds.minGradeAverage || 6.0;

    const notif: NotificationItem = {
      id: `notif-crit-${Date.now()}-${studentId}`,
      type: 'nota_critica',
      title: `🚨 Advertencia: Nota por Debajo de Umbral Crítico (< ${thresholdUsed.toFixed(1)})`,
      message: `El estudiante ${student.fullName} presenta un promedio de ${average.toFixed(1)}/10.0 en ${subjectName}, situándose por debajo del umbral de ${thresholdUsed.toFixed(1)}/10.0 configurado en el perfil del padre.`,
      date: today,
      time: timeNow,
      subjectName,
      studentName: student.fullName,
      studentId: student.id,
      parentEmail: student.parentEmail,
      institutionCode: student.institutionCode,
      read: false,
      priority: 'urgente'
    };

    setNotifications((prev) => [notif, ...prev]);
    showToast('Alerta de Umbral Académico', `Notificación de estado crítico enviada al padre de ${student.fullName}`, 'alert');
  };

  const updateParentThresholds = (newConfig: Partial<ParentThresholdConfig>) => {
    const updated = { ...parentThresholds, ...newConfig };
    setParentThresholds(updated);
    localStorage.setItem('edu_parent_thresholds', JSON.stringify(updated));

    if (activeParent) {
      setActiveParent((p) => (p ? { ...p, thresholds: updated } : null));
    }

    showToast('Umbrales Actualizados', 'Nueva configuración de umbrales guardada exitosamente.', 'success');
  };

  const evaluateParentThresholdsNow = () => {
    if (!selectedChild || !activeParent) return;

    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const generatedNotifs: NotificationItem[] = [];

    if (parentThresholds.notifyOnGradeBelowThreshold) {
      const childPeriods = periodGrades.filter(
        (p) => p.institutionCode === activeParent.institutionCode
      );

      childPeriods.forEach((period) => {
        let weightedSum = 0;
        let totalWeight = 0;
        period.activities.forEach((act) => {
          const g = period.grades.find((gr) => gr.studentId === selectedChild.id && gr.activityId === act.id);
          if (g !== undefined) {
            weightedSum += g.score * (act.percentage / 100);
            totalWeight += act.percentage;
          }
        });

        if (totalWeight > 0) {
          const currentAvg = weightedSum / (totalWeight / 100);
          const threshold = parentThresholds.minGradeAverage;
          if (currentAvg < threshold) {
            generatedNotifs.push({
              id: `notif-thresh-grade-${Date.now()}-${period.id}`,
              type: 'nota_critica',
              title: `🚨 Alerta de Nota Crítica (Umbral < ${threshold.toFixed(1)})`,
              message: `El promedio de ${selectedChild.fullName} en ${period.subjectName} es ${currentAvg.toFixed(1)}/10.0, inferior al umbral mínimo de alerta (${threshold.toFixed(1)}/10.0).`,
              date: today,
              time: timeNow,
              subjectName: period.subjectName,
              studentName: selectedChild.fullName,
              studentId: selectedChild.id,
              parentEmail: selectedChild.parentEmail,
              institutionCode: selectedChild.institutionCode,
              read: false,
              priority: 'urgente'
            });
          }
        }
      });
    }

    if (parentThresholds.notifyOnAttendanceBelowThreshold) {
      const studentAttendance = attendance.filter((a) => a.studentId === selectedChild.id);
      const subjects = Array.from(new Set(studentAttendance.map((a) => a.subjectName)));

      subjects.forEach((subj) => {
        const records = studentAttendance.filter((a) => a.subjectName === subj);
        if (records.length > 0) {
          const presentPoints = records.reduce((acc, r) => {
            if (r.status === 'presente') return acc + 1;
            if (r.status === 'tardanza') return acc + 0.5;
            if (r.status === 'justificado') return acc + 1;
            return acc;
          }, 0);
          const pct = Math.round((presentPoints / records.length) * 100);
          const minPct = parentThresholds.minAttendancePercentage;

          if (pct < minPct) {
            const absentCount = records.filter((r) => r.status === 'ausente').length;
            generatedNotifs.push({
              id: `notif-thresh-att-${Date.now()}-${subj}`,
              type: 'asistencia_critica',
              title: `⚠️ Alerta de Asistencia Crítica (Umbral < ${minPct}%)`,
              message: `El porcentaje de asistencia de ${selectedChild.fullName} en ${subj} ha descendido al ${pct}% (${absentCount} inasistencias), por debajo del umbral mínimo (${minPct}%).`,
              date: today,
              time: timeNow,
              subjectName: subj,
              studentName: selectedChild.fullName,
              studentId: selectedChild.id,
              parentEmail: selectedChild.parentEmail,
              institutionCode: selectedChild.institutionCode,
              read: false,
              priority: 'alta'
            });
          }
        }
      });
    }

    if (generatedNotifs.length > 0) {
      setNotifications((prev) => [...generatedNotifs, ...prev]);
      showToast(
        'Diagnóstico de Umbrales',
        `Se detectaron ${generatedNotifs.length} alertas críticas según tus umbrales personalizados.`,
        'alert'
      );
    } else {
      showToast(
        'Diagnóstico de Umbrales',
        'Tu hijo cumple con todas las notas y asistencias mínimas configuradas.',
        'success'
      );
    }
  };

  const triggerSimulatedThresholdAlert = (type: 'nota' | 'asistencia') => {
    if (!selectedChild) return;
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (type === 'nota') {
      const threshold = parentThresholds.minGradeAverage;
      const testScore = Math.max(1.0, threshold - 0.7).toFixed(1);
      const notif: NotificationItem = {
        id: `sim-notif-nota-${Date.now()}`,
        type: 'nota_critica',
        title: `🚨 [Prueba] Alerta de Nota Crítica (< ${threshold.toFixed(1)})`,
        message: `El promedio de ${selectedChild.fullName} en Matemáticas (${testScore}/10.0) cayó por debajo de su umbral de ${threshold.toFixed(1)}. Se recomienda comunicarse con el docente.`,
        date: today,
        time: timeNow,
        subjectName: 'Matemáticas',
        studentName: selectedChild.fullName,
        studentId: selectedChild.id,
        parentEmail: activeParent?.parentEmail,
        institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
        read: false,
        priority: 'urgente'
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast('Simulación Enviada', `Alerta de nota crítica (< ${threshold.toFixed(1)}) generada con éxito.`, 'alert');
    } else {
      const minPct = parentThresholds.minAttendancePercentage;
      const testPct = Math.max(40, minPct - 15);
      const notif: NotificationItem = {
        id: `sim-notif-att-${Date.now()}`,
        type: 'asistencia_critica',
        title: `⚠️ [Prueba] Alerta de Asistencia Crítica (< ${minPct}%)`,
        message: `El porcentaje de asistencia de ${selectedChild.fullName} en Ciencias Naturales ha descendido a ${testPct}%, por debajo de su umbral configurado de ${minPct}%.`,
        date: today,
        time: timeNow,
        subjectName: 'Ciencias Naturales',
        studentName: selectedChild.fullName,
        studentId: selectedChild.id,
        parentEmail: activeParent?.parentEmail,
        institutionCode: activeInstitution?.institutionCode || 'ESC-PUB-2026',
        read: false,
        priority: 'alta'
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast('Simulación Enviada', `Alerta de asistencia crítica (< ${minPct}%) generada con éxito.`, 'alert');
    }
  };

  const addActivity = (periodId: string, activity: Omit<ActivityWeight, 'id'>): boolean => {
    const targetPeriod = periodGrades.find((p) => p.id === periodId);
    if (!targetPeriod) return false;

    const currentTotalWeight = targetPeriod.activities.reduce((sum, a) => sum + a.percentage, 0);
    const proposedTotal = currentTotalWeight + activity.percentage;

    if (proposedTotal > 100) {
      showToast(
        'Acción Inválida: Supera el 100%',
        `No es posible agregar "${activity.name}". La suma actual es ${currentTotalWeight}% y al sumar ${activity.percentage}% totalizaría ${proposedTotal}%. Ajusta los porcentajes para que la suma no supere el límite del 100% (disponible: ${Math.max(0, 100 - currentTotalWeight)}%).`,
        'alert'
      );
      return false;
    }

    const newAct: ActivityWeight = {
      id: `act-${Date.now()}`,
      ...activity
    };

    setPeriodGrades((prev) =>
      prev.map((period) => {
        if (period.id === periodId) {
          return {
            ...period,
            activities: [...period.activities, newAct]
          };
        }
        return period;
      })
    );

    if (activity.dueDate) {
      addCalendarEvent({
        title: activity.name,
        description: `Entrega o evaluación de ${targetPeriod.subjectName} (${activity.percentage}% de nota).`,
        date: activity.dueDate,
        subjectName: targetPeriod.subjectName,
        gradeId: targetPeriod.gradeId,
        institutionCode: targetPeriod.institutionCode,
        type: activity.isExam ? 'examen' : 'entrega',
        tagId: activity.tagId
      });
    }

    showToast('Actividad Creada', `${activity.name} agregada con ponderación del ${activity.percentage}%`, 'success');
    return true;
  };

  const updateActivity = (periodId: string, activityId: string, updated: Partial<ActivityWeight>): boolean => {
    const targetPeriod = periodGrades.find((p) => p.id === periodId);
    if (!targetPeriod) return false;

    if (updated.percentage !== undefined) {
      const otherTotal = targetPeriod.activities
        .filter((a) => a.id !== activityId)
        .reduce((sum, a) => sum + a.percentage, 0);
      const newTotal = otherTotal + updated.percentage;
      if (newTotal > 100) {
        showToast(
          'Acción Inválida: Supera el 100%',
          `El porcentaje (${updated.percentage}%) causaría que las evaluaciones sumen ${newTotal}%. El máximo disponible es ${100 - otherTotal}%.`,
          'alert'
        );
        return false;
      }
    }

    setPeriodGrades((prev) =>
      prev.map((period) => {
        if (period.id !== periodId) return period;
        return {
          ...period,
          activities: period.activities.map((a) => (a.id === activityId ? { ...a, ...updated } : a))
        };
      })
    );

    showToast('Evaluación Modificada', 'Los cambios en la evaluación fueron guardados.', 'success');
    return true;
  };

  const deleteActivity = (periodId: string, activityId: string): boolean => {
    const targetPeriod = periodGrades.find((p) => p.id === periodId);
    if (!targetPeriod) return false;

    const targetAct = targetPeriod.activities.find((a) => a.id === activityId);
    const actName = targetAct?.name || 'Evaluación';

    setPeriodGrades((prev) =>
      prev.map((period) => {
        if (period.id !== periodId) return period;
        return {
          ...period,
          activities: period.activities.filter((a) => a.id !== activityId),
          grades: period.grades.filter((g) => g.activityId !== activityId)
        };
      })
    );

    setCalendarEvents((prev) =>
      prev.filter((c) => !(c.subjectName === targetPeriod.subjectName && c.title === actName))
    );

    showToast('Evaluación Eliminada', `"${actName}" ha sido eliminada del cuadro de notas.`, 'info');
    return true;
  };

  const batchUpdateExamGrades = (periodId: string, updates: { studentId: string; score: number }[], activityNameTarget: string = 'Examen') => {
    setPeriodGrades((prev) =>
      prev.map((period) => {
        if (period.id !== periodId) return period;

        let targetAct = period.activities.find((a) => a.name.toLowerCase().includes(activityNameTarget.toLowerCase()) || a.isExam);
        if (!targetAct && period.activities.length > 0) {
          targetAct = period.activities[period.activities.length - 1];
        }

        if (!targetAct) return period;

        const updatedGrades = [...period.grades];
        updates.forEach((u) => {
          const idx = updatedGrades.findIndex((g) => g.studentId === u.studentId && g.activityId === targetAct!.id);
          if (idx >= 0) {
            updatedGrades[idx] = { ...updatedGrades[idx], score: u.score };
          } else {
            updatedGrades.push({ studentId: u.studentId, activityId: targetAct!.id, score: u.score });
          }
        });

        return { ...period, grades: updatedGrades };
      })
    );

    showToast('Notas de Escaneo Exportadas', `Se exportaron las notas de ${updates.length} exámenes al cuadro de Excel`, 'success');
  };

  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      id: `cal-${Date.now()}`,
      ...event
    };
    setCalendarEvents((prev) => [...prev, newEvent]);

    const notif: NotificationItem = {
      id: `notif-cal-${Date.now()}`,
      type: event.type === 'examen' ? 'examen_recordatorio' : 'aviso_general',
      title: event.type === 'examen' ? `📅 Examen Programado: ${event.title}` : `📌 Recordatorio: ${event.title}`,
      message: `${event.description} Fecha programada: ${event.date}`,
      date: event.date,
      time: event.time || '08:00 AM',
      subjectName: event.subjectName,
      institutionCode: event.institutionCode,
      read: false,
      priority: event.type === 'examen' ? 'alta' : 'media'
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const addCustomTag = (tag: Omit<CustomTag, 'id'>) => {
    const newTag: CustomTag = {
      id: `tag-${Date.now()}`,
      ...tag
    };
    setCustomTags((prev) => [...prev, newTag]);
    showToast('Etiqueta Creada', `Categoría "${tag.name}" guardada`, 'success');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('Notificaciones Leídas', 'Todas las notificaciones marcadas como leídas', 'info');
  };

  const switchRole = (newRole: UserRole, profileData?: any) => {
    setRole(newRole);
    localStorage.setItem('edu_active_role', newRole);

    if (profileData) {
      if (newRole === 'escuela') {
        setActiveInstitution(profileData);
        localStorage.setItem('edu_active_institution', JSON.stringify(profileData));
      } else if (newRole === 'profesor') {
        setActiveTeacher(profileData);
        localStorage.setItem('edu_active_teacher', JSON.stringify(profileData));
      } else if (newRole === 'padre') {
        setActiveParent(profileData);
        localStorage.setItem('edu_active_parent', JSON.stringify(profileData));
      }
    }

    showToast(
      'Rol Cambiado',
      `Ahora interactúas como: ${newRole === 'escuela' ? 'Director / Escuela' : newRole === 'profesor' ? 'Profesor' : 'Padre de Familia'}`,
      'info'
    );
  };

  const exportPeriodGradesCSV = (periodId: string) => {
    const period = periodGrades.find((p) => p.id === periodId);
    if (!period) return;

    const gradeStudents = students.filter(
      (s) => s.gradeId === period.gradeId && s.institutionCode === period.institutionCode
    );

    const headers = ['N° Lista', 'Nombre Completo', 'NIE'];
    period.activities.forEach((act) => {
      headers.push(`"${act.name} (${act.percentage}%)"`);
    });
    headers.push('Promedio Periodo', 'Estado Académico');

    const rows = gradeStudents.map((st) => {
      let weightedSum = 0;
      let totalWeight = 0;
      const actScores = period.activities.map((act) => {
        const g = period.grades.find((gr) => gr.studentId === st.id && gr.activityId === act.id);
        const score = g !== undefined ? g.score : 0;
        if (g !== undefined) {
          weightedSum += score * (act.percentage / 100);
          totalWeight += act.percentage;
        }
        return score.toFixed(1);
      });

      const avg = totalWeight > 0 ? (weightedSum / (totalWeight / 100)).toFixed(1) : '0.0';
      const status = Number(avg) >= 8.5 ? 'Excelente' : Number(avg) >= 6.0 ? 'Aprobado' : 'Crítico / Nivel Bajo';

      return [
        st.listNumber,
        `"${st.fullName}"`,
        `"${st.nie || 'N/A'}"`,
        ...actScores,
        avg,
        `"${status}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cuadro_Notas_${period.subjectName}_Periodo_${period.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Descarga Exitosa', 'Cuadro de notas exportado en formato Excel compatible', 'success');
  };

  const exportAttendanceCSV = (subjectName: string, gradeId: string) => {
    const gradeStudents = students.filter(
      (s) => s.gradeId === gradeId && s.institutionCode === activeInstitution?.institutionCode
    );

    const relevantAtt = attendance.filter((a) => a.subjectName === subjectName && a.gradeId === gradeId);
    const dates = Array.from(new Set(relevantAtt.map((a) => a.date))).sort();

    const headers = ['N°', 'Estudiante', 'NIE', ...dates, 'Total Asistencias', '% Asistencia'];

    const rows = gradeStudents.map((st) => {
      let presentCount = 0;
      const dateCols = dates.map((d) => {
        const record = relevantAtt.find((a) => a.studentId === st.id && a.date === d);
        if (!record) return '-';
        if (record.status === 'presente') {
          presentCount++;
          return 'P';
        }
        if (record.status === 'tardanza') {
          presentCount += 0.5;
          return 'T';
        }
        if (record.status === 'justificado') return 'J';
        return 'F';
      });

      const pct = dates.length > 0 ? Math.round((presentCount / dates.length) * 100) : 100;
      return [
        st.listNumber,
        `"${st.fullName}"`,
        `"${st.nie || 'N/A'}"`,
        ...dateCols,
        presentCount,
        `${pct}%`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Asistencia_${subjectName}_${gradeId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Descarga Exitosa', 'Cuadro de asistencia exportado en formato Excel compatible', 'success');
  };

  const addScheduleSlot = (slot: Omit<ScheduleSlot, 'id'>) => {
    const newSlot: ScheduleSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...slot
    };
    setScheduleSlots((prev) => [...prev, newSlot]);
    showToast('Horario Agregado', `${slot.subjectName} agregado para el día seleccionado`, 'success');
  };

  const updateScheduleSlot = (id: string, updates: Partial<ScheduleSlot>) => {
    setScheduleSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    showToast('Horario Actualizado', 'Bloque de clase modificado exitosamente', 'success');
  };

  const deleteScheduleSlot = (id: string) => {
    setScheduleSlots((prev) => prev.filter((s) => s.id !== id));
    showToast('Horario Eliminado', 'El bloque de clase ha sido removido del calendario', 'info');
  };

  const resetDefaultSchedule = () => {
    setScheduleSlots(DEFAULT_SCHEDULE_SLOTS);
    showToast('Horario Restablecido', 'Plantilla semanal predeterminada cargada', 'info');
  };

  const createVirtualOnlineExam = (
    examData: Omit<VirtualOnlineExam, 'id' | 'createdAt' | 'studentSessions' | 'teacherAlerts'>
  ): VirtualOnlineExam => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const newExam: VirtualOnlineExam = {
      ...examData,
      id: `vexam-${Date.now()}`,
      pin: examData.pin || randomPin,
      createdAt: new Date().toISOString(),
      studentSessions: {},
      teacherAlerts: []
    };

    setVirtualExams((prev) => [newExam, ...prev]);
    showToast(
      '¡Examen Virtual Creado!',
      `PIN de Sala: ${newExam.pin}. Calificaciones asignadas a la columna "${newExam.targetActivityName}".`,
      'success'
    );
    return newExam;
  };

  const joinVirtualExam = (pin: string, studentEmail: string, nie: string) => {
    const cleanPin = pin.trim().replace(/[\s-]/g, '');
    const cleanNie = nie.trim().toLowerCase();
    const cleanEmail = studentEmail.trim().toLowerCase();

    const targetExam = virtualExams.find(
      (e) => e.pin.replace(/[\s-]/g, '') === cleanPin && e.isActive
    );

    if (!targetExam) {
      return { success: false, error: 'Código PIN no válido o examen inactivo. Verifica con tu profesor.' };
    }

    const matchedStudent =
      students.find((s) => {
        const sNie = (s.nie || '').trim().toLowerCase();
        const sParentEmail = (s.parentEmail || '').trim().toLowerCase();
        const sFullName = s.fullName.trim().toLowerCase();
        return (
          (cleanNie && sNie === cleanNie) ||
          (cleanEmail && sParentEmail === cleanEmail) ||
          (cleanEmail && cleanEmail.includes(sFullName.split(' ')[0]))
        );
      }) ||
      students.find((s) => s.gradeId === targetExam.gradeId) ||
      students[0];

    if (!matchedStudent) {
      return { success: false, error: 'No se encontró un estudiante matriculado con el NIE o correo proporcionado.' };
    }

    const existingSession = targetExam.studentSessions[matchedStudent.id];
    let assignedKey = 'A';
    if (existingSession) {
      assignedKey = existingSession.keyId;
    } else {
      const availableKeyIds = Object.keys(targetExam.keys);
      const sessionCount = Object.keys(targetExam.studentSessions).length;
      assignedKey = availableKeyIds[sessionCount % availableKeyIds.length] || 'A';
    }

    const currentSession: StudentExamSession = existingSession || {
      studentId: matchedStudent.id,
      studentName: matchedStudent.fullName,
      nie: matchedStudent.nie || 'N/A',
      email: studentEmail,
      keyId: assignedKey,
      status: 'in_progress',
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      answers: {},
      hasLeftPage: false,
      leftPageCount: 0
    };

    setVirtualExams((prev) =>
      prev.map((ex) => {
        if (ex.id !== targetExam.id) return ex;
        return {
          ...ex,
          studentSessions: {
            ...ex.studentSessions,
            [matchedStudent.id]: currentSession
          }
        };
      })
    );

    return {
      success: true,
      exam: targetExam,
      session: currentSession,
      student: matchedStudent
    };
  };

  const recordStudentTabSwitch = (examId: string, studentId: string) => {
    let studentName = 'Un estudiante';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setVirtualExams((prev) =>
      prev.map((ex) => {
        if (ex.id !== examId) return ex;
        const currentSession = ex.studentSessions[studentId];
        if (!currentSession) return ex;

        studentName = currentSession.studentName;
        const updatedSession: StudentExamSession = {
          ...currentSession,
          hasLeftPage: true,
          status: 'blocked',
          leftPageCount: (currentSession.leftPageCount || 0) + 1,
          lastLeftPageAt: timestamp,
          isReEnabledByTeacher: false
        };

        const newAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          studentId,
          studentName,
          message: `${studentName} ha salido de la página`,
          timestamp,
          type: 'tab_switched' as const
        };

        return {
          ...ex,
          studentSessions: {
            ...ex.studentSessions,
            [studentId]: updatedSession
          },
          teacherAlerts: [newAlert, ...ex.teacherAlerts]
        };
      })
    );

    showToast(
      '⚠️ Alerta de Seguridad de Examen',
      `${studentName} ha salido de la página. El examen fue bloqueado automáticamente.`,
      'alert'
    );
  };

  const reEnableStudentExam = (examId: string, studentId: string) => {
    let studentName = 'Estudiante';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setVirtualExams((prev) =>
      prev.map((ex) => {
        if (ex.id !== examId) return ex;
        const currentSession = ex.studentSessions[studentId];
        if (!currentSession) return ex;

        studentName = currentSession.studentName;
        const updatedSession: StudentExamSession = {
          ...currentSession,
          hasLeftPage: false,
          status: 'in_progress',
          isReEnabledByTeacher: true
        };

        const reEnabledAlert = {
          id: `alert-reenable-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          studentId,
          studentName,
          message: `El docente volvió a habilitar el examen para ${studentName}.`,
          timestamp,
          type: 'reenabled' as const
        };

        return {
          ...ex,
          studentSessions: {
            ...ex.studentSessions,
            [studentId]: updatedSession
          },
          teacherAlerts: [reEnabledAlert, ...ex.teacherAlerts]
        };
      })
    );

    showToast('Examen Habilitado', `Has vuelto a habilitar el examen para ${studentName}`, 'success');
  };

  const denyStudentExam = (examId: string, studentId: string) => {
    let studentName = 'El estudiante';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetExam = virtualExams.find((e) => e.id === examId);

    setVirtualExams((prev) =>
      prev.map((ex) => {
        if (ex.id !== examId) return ex;
        const currentSession = ex.studentSessions[studentId];
        if (!currentSession) return ex;

        studentName = currentSession.studentName;
        const updatedSession: StudentExamSession = {
          ...currentSession,
          status: 'submitted',
          score: 0.0,
          hasLeftPage: true,
          deniedByTeacher: true,
          submittedAt: timestamp
        };

        const deniedAlert = {
          id: `alert-deny-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          studentId,
          studentName,
          message: `Permiso denegado a ${studentName} por salir de la prueba. Calificación asignada: 0.0 (Registrada en cuadro de notas).`,
          timestamp,
          type: 'denied' as const
        };

        return {
          ...ex,
          studentSessions: {
            ...ex.studentSessions,
            [studentId]: updatedSession
          },
          teacherAlerts: [deniedAlert, ...ex.teacherAlerts]
        };
      })
    );

    if (targetExam) {
      updateGrade(targetExam.periodId, studentId, targetExam.targetActivityId, 0.0);
    }

    showToast(
      'Permiso Denegado',
      `Se denegó el reingreso a ${studentName} y se registró calificación de 0.0 en el cuadro de notas.`,
      'alert'
    );
  };

  const submitStudentOnlineExam = (
    examId: string,
    studentId: string,
    answers: Record<number, 'A' | 'B' | 'C' | 'D'>
  ) => {
    const targetExam = virtualExams.find((e) => e.id === examId);
    if (!targetExam) return { score: 0, total: 0, correctCount: 0 };

    const currentSession = targetExam.studentSessions[studentId];
    const keyId = currentSession?.keyId || 'A';
    const keyData = targetExam.keys[keyId] || targetExam.keys['A'];

    let correctCount = 0;
    const total = targetExam.totalQuestions || keyData.questions.length || 5;

    keyData.questions.forEach((q) => {
      const studentAns = answers[q.questionNumber];
      if (studentAns && studentAns === q.correctAnswer) {
        correctCount++;
      }
    });

    const calculatedScore = total > 0 ? Math.round((correctCount / total) * 100) / 10 : 0;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setVirtualExams((prev) =>
      prev.map((ex) => {
        if (ex.id !== examId) return ex;
        const sess = ex.studentSessions[studentId];
        if (!sess) return ex;

        const updatedSession: StudentExamSession = {
          ...sess,
          status: 'submitted',
          score: calculatedScore,
          submittedAt: timestamp,
          answers
        };

        const alertItem = {
          id: `submit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          studentId,
          studentName: sess.studentName,
          message: `${sess.studentName} finalizó el examen con calificación ${calculatedScore}/10. Guardada en la columna "${ex.targetActivityName}".`,
          timestamp,
          type: 'submitted' as const
        };

        return {
          ...ex,
          studentSessions: {
            ...ex.studentSessions,
            [studentId]: updatedSession
          },
          teacherAlerts: [alertItem, ...ex.teacherAlerts]
        };
      })
    );

    if (targetExam.periodId && targetExam.targetActivityId) {
      updateGrade(targetExam.periodId, studentId, targetExam.targetActivityId, calculatedScore);
    }

    showToast(
      'Examen Calificado',
      `Calificación: ${calculatedScore}/10 agregada en el cuadro de notas en la columna "${targetExam.targetActivityName}".`,
      'success'
    );

    return { score: calculatedScore, total, correctCount };
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        institutions,
        students,
        attendance,
        periodGrades,
        calendarEvents,
        notifications,
        customTags,
        isMobileSimulated,
        setIsMobileSimulated,
        activeInstitution,
        activeTeacher,
        activeParent,
        selectedChild,
        switchRole,
        updateActiveTeacher,
        updateActiveParent,
        registerInstitution,
        verifyInfrastructureCode,
        addTeacherAssignment,
        updateTeacherAssignmentSchedule,
        updateTeacherAssignmentDetails,
        registerTeacher,
        registerParent,
        importStudents,
        recordAttendanceList,
        updateGrade,
        addActivity,
        updateActivity,
        deleteActivity,
        batchUpdateExamGrades,
        markStudentCriticalAlert,
        addCalendarEvent,
        addCustomTag,
        markNotificationRead,
        markAllNotificationsRead,
        exportPeriodGradesCSV,
        exportAttendanceCSV,
        setSingleAttendance,
        markAllPresentForDate,
        cleanAllDuplicates,
        isHelpModalOpen,
        setIsHelpModalOpen,
        openHelpTutorial,
        parentThresholds,
        updateParentThresholds,
        evaluateParentThresholdsNow,
        triggerSimulatedThresholdAlert,
        scheduleSlots,
        addScheduleSlot,
        updateScheduleSlot,
        deleteScheduleSlot,
        resetDefaultSchedule,
        virtualExams,
        createVirtualOnlineExam,
        joinVirtualExam,
        recordStudentTabSwitch,
        reEnableStudentExam,
        denyStudentExam,
        submitStudentOnlineExam,
        toastMessage,
        clearToast,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};