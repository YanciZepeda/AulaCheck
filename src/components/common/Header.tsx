import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  School,
  GraduationCap,
  Users,
  Bell,
  Smartphone,
  Monitor,
  Copy,
  Check,
  HelpCircle,
  Gamepad2,
  PlusCircle
} from 'lucide-react';
import { NotificationDrawer } from './NotificationDrawer';

interface HeaderProps {
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth }) => {
  const {
    role,
    switchRole,
    activeInstitution,
    activeTeacher,
    activeParent,
    notifications,
    isMobileSimulated,
    setIsMobileSimulated,
    openHelpTutorial
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isParent = role === 'padre';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleCopyCode = () => {
    if (activeInstitution?.institutionCode) {
      navigator.clipboard.writeText(activeInstitution.institutionCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 backdrop-blur-md transition-colors border-b ${
          isParent
            ? 'bg-[#FFFBEB]/95 border-[#FED7AA]'
            : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Left: Brand & Active Institution */}
            <div className="flex items-center gap-3 min-w-0">
              {activeInstitution?.logoUrl ? (
                <img
                  src={activeInstitution.logoUrl}
                  alt="Logo Escuela"
                  className={`w-10 h-10 rounded-xl object-cover shadow-xs shrink-0 ring-2 ${
                    isParent ? 'ring-[#0EA5E9]/30' : 'ring-[#2563EB]/30'
                  }`}
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0 ${
                    isParent ? 'bg-[#0EA5E9]' : 'bg-[#2563EB]'
                  }`}
                >
                  <School className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1
                    className={`font-black text-sm sm:text-base tracking-tight truncate ${
                      isParent ? 'text-[#1F2937]' : 'text-[#1E293B]'
                    }`}
                  >
                    {activeInstitution?.name || 'EduControl Pro'}
                  </h1>
                  <span
                    className={`hidden md:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeInstitution?.type === 'publica'
                        ? isParent
                          ? 'bg-sky-100 text-[#0369A1] border border-sky-300'
                          : 'bg-blue-100 text-[#1E3A8A] border border-blue-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {activeInstitution?.type === 'publica' ? 'Escuela Pública (NIE)' : 'Colegio Privado'}
                  </span>
                </div>

                {/* Institution Code badge with copy action */}
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded flex items-center gap-1 font-semibold ${
                      isParent
                        ? 'bg-[#FFEDD5] text-[#1F2937] border border-[#FED7AA]'
                        : 'bg-slate-100 text-[#1E293B] border border-slate-300'
                    }`}
                  >
                    Cód:{' '}
                    <strong className={isParent ? 'text-[#0369A1]' : 'text-[#2563EB]'}>
                      {activeInstitution?.institutionCode}
                    </strong>
                  </span>
                  <button
                    onClick={handleCopyCode}
                    title="Copiar código de institución para padres y profesores"
                    className="p-1 hover:text-[#2563EB] text-[#1E293B] transition"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span className="hidden lg:inline text-[11px] text-[#475569] font-medium">
                    (MINED: {activeInstitution?.infrastructureCode})
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Quick Role Selector (Demo switcher) */}
            <div
              className={`hidden lg:flex items-center p-1 rounded-xl border ${
                isParent
                  ? 'bg-[#FEF3C7] border-[#FED7AA]'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => switchRole('escuela')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  role === 'escuela'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#1E293B] hover:bg-white/80'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                Director / Escuela
              </button>

              <button
                onClick={() => switchRole('profesor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  role === 'profesor'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#1E293B] hover:bg-white/80'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Profesor
              </button>

              <button
                onClick={() => switchRole('estudiante')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  role === 'estudiante'
                    ? 'bg-[#2563EB] text-white shadow-xs ring-2 ring-blue-300'
                    : 'text-[#1E293B] hover:bg-white/80'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 text-[#2563EB] group-hover:text-blue-700" />
                Estudiante (Examen Virtual)
              </button>

              <button
                onClick={() => switchRole('padre')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  role === 'padre'
                    ? 'bg-[#0EA5E9] text-white shadow-xs ring-2 ring-sky-300'
                    : 'text-[#1F2937] hover:bg-white/80'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Padre / Tutor
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile Simulator Toggle */}
              <button
                onClick={() => setIsMobileSimulated(!isMobileSimulated)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                  isMobileSimulated
                    ? isParent
                      ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                      : 'bg-[#2563EB] text-white border-[#2563EB]'
                    : isParent
                      ? 'bg-white border-[#FED7AA] text-[#1F2937] hover:bg-amber-100/50'
                      : 'bg-white border-slate-300 text-[#1E293B] hover:bg-slate-100'
                }`}
                title={isMobileSimulated ? 'Cambiar a vista de escritorio' : 'Ver simulador de dispositivo móvil'}
              >
                {isMobileSimulated ? (
                  <>
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vista Escritorio</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Simular Móvil</span>
                  </>
                )}
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => setIsNotifOpen(true)}
                className={`relative p-2 rounded-xl transition ${
                  isParent
                    ? 'text-[#1F2937] hover:bg-amber-200/50'
                    : 'text-[#1E293B] hover:bg-slate-100'
                }`}
                aria-label="Abrir notificaciones"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-black bg-red-600 text-white rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Botón en forma de pregunta (?) para activar el tutorial */}
              <button
                type="button"
                onClick={() => openHelpTutorial()}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black shadow-2xs border transition ${
                  isParent
                    ? 'bg-white hover:bg-amber-100 text-[#1F2937] border-[#FED7AA]'
                    : 'bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border-blue-200'
                }`}
                title="Abrir Tutorial Guiado y Centro de Preguntas Frecuentes (?)"
                aria-label="Ayuda y Tutorial"
              >
                <span
                  className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[11px] font-black shrink-0 ${
                    isParent ? 'bg-[#0EA5E9]' : 'bg-[#2563EB]'
                  }`}
                >
                  ?
                </span>
                <span className="hidden md:inline">Tutorial / Ayuda</span>
              </button>

              {/* Register / New Role Button */}
              <button
                onClick={onOpenAuth}
                className={`flex items-center gap-1.5 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition ${
                  isParent
                    ? 'bg-[#0EA5E9] hover:bg-[#0284C7]'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Registrar / Cambiar Rol</span>
                <span className="sm:hidden">Rol</span>
              </button>
            </div>
          </div>

          {/* Subheader / Mobile Role Switcher */}
          <div
            className={`lg:hidden py-2 border-t flex items-center justify-between text-xs overflow-x-auto gap-2 ${
              isParent ? 'border-[#FED7AA]' : 'border-slate-200'
            }`}
          >
            <span className={`font-bold shrink-0 ${isParent ? 'text-[#1F2937]' : 'text-[#1E293B]'}`}>
              Rol actual:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => switchRole('escuela')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  role === 'escuela'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white text-[#1E293B] border border-slate-300'
                }`}
              >
                Escuela
              </button>
              <button
                onClick={() => switchRole('profesor')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  role === 'profesor'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white text-[#1E293B] border border-slate-300'
                }`}
              >
                Profesor
              </button>
              <button
                onClick={() => switchRole('estudiante')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  role === 'estudiante'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white text-[#1E293B] border border-slate-300'
                }`}
              >
                Estudiante
              </button>
              <button
                onClick={() => switchRole('padre')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  role === 'padre'
                    ? 'bg-[#0EA5E9] text-white shadow-xs'
                    : 'bg-white text-[#1F2937] border border-amber-300'
                }`}
              >
                Padre
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Notification Drawer */}
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};
