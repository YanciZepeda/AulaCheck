/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { SchoolAdminView } from './components/school/SchoolAdminView';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { StudentExamView } from './components/student/StudentExamView';
import { AuthRegistrationModal } from './components/auth/AuthRegistrationModal';
import { HelpTutorialModal } from './components/common/HelpTutorialModal';
import { DeviceFrame } from './components/common/DeviceFrame';
import { Toast } from './components/common/Toast';
import {
  School,
  GraduationCap,
  Users,
  ShieldCheck,
  Sparkles,
  Smartphone,
  CheckCircle2,
  BellRing,
  Gamepad2
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { role, activeInstitution, switchRole, isHelpModalOpen, setIsHelpModalOpen } = useApp();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const isParentRole = role === 'padre';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isParentRole
          ? 'bg-[#FFFBEB] text-[#1F2937]'
          : 'bg-[#F8FAFC] text-[#1E293B]'
      }`}
    >
      {/* Navigation Header */}
      <Header onOpenAuth={() => setIsAuthOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Active View based on selected role */}
        {role === 'escuela' && <SchoolAdminView />}
        {role === 'profesor' && <TeacherDashboard />}
        {role === 'padre' && <ParentDashboard />}
        {role === 'estudiante' && <StudentExamView />}
      </main>

      {/* Quick Demo Role Switcher Floating Footer for easy testing */}
      <div
        className={`border-t py-3 px-4 text-xs transition-colors ${
          isParentRole
            ? 'bg-[#FEF3C7]/90 border-[#FED7AA] text-[#78350F]'
            : 'bg-white/95 border-slate-200 text-slate-700'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isParentRole
                  ? 'bg-[#0284C7] animate-pulse'
                  : role === 'estudiante'
                  ? 'bg-purple-600 animate-pulse'
                  : 'bg-[#2563EB] animate-pulse'
              }`}
            />
            <span className="font-semibold">
              <strong className={isParentRole ? 'text-[#0C4A6E]' : 'text-[#1E3A8A]'}>EduControl Pro</strong> •{' '}
              {isParentRole
                ? 'Portal Familiar • Vista Cálida y Amigable'
                : role === 'estudiante'
                ? 'Portal de Estudiante • Examen Virtual en Vivo con IA'
                : 'Portal Institucional • Vista Oficial y Académica'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <span className="text-[11px] font-bold opacity-80 mr-1">Probar perfil demo:</span>
            <button
              onClick={() => switchRole('escuela')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs ${
                role === 'escuela'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              <School className="w-3 h-3" />
              Director Escuela
            </button>
            <button
              onClick={() => switchRole('profesor')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs ${
                role === 'profesor'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              Profesor (Matemáticas)
            </button>
            <button
              onClick={() => switchRole('estudiante')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs ${
                role === 'estudiante'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              <Gamepad2 className="w-3 h-3 text-[#2563EB]" />
              Estudiante (Examen Virtual)
            </button>
            <button
              onClick={() => switchRole('padre')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs ${
                role === 'padre'
                  ? 'bg-[#0284C7] text-white shadow-sm ring-2 ring-sky-300'
                  : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <Users className="w-3 h-3" />
              Padre de Familia
            </button>
          </div>
        </div>
      </div>

      {/* Global Modals & Notifications */}
      <AuthRegistrationModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <HelpTutorialModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DeviceFrame>
        <AppContent />
      </DeviceFrame>
    </AppProvider>
  );
}
