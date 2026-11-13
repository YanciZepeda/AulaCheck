import React from 'react';
import { useApp } from '../../context/AppContext';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { isMobileSimulated, setIsMobileSimulated } = useApp();

  if (!isMobileSimulated) {
    return <>{children}</>;
  }

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 flex flex-col items-center justify-center">
      {/* Simulator Control Bar */}
      <div className="mb-4 flex items-center gap-3 bg-slate-800/90 text-white px-4 py-2 rounded-full border border-slate-700 shadow-xl text-xs">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold">Simulador de Dispositivo Móvil Activo (iPhone / Android)</span>
        <button
          onClick={() => setIsMobileSimulated(false)}
          className="ml-2 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-full text-[11px] font-bold transition shadow-xs"
        >
          <Monitor className="w-3 h-3" />
          Volver a Pantalla Completa
        </button>
      </div>

      {/* Realistic Phone Outer Case */}
      <div className="relative w-full max-w-[420px] h-[860px] bg-slate-900 rounded-[50px] p-3 shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[6px] border-slate-700 flex flex-col overflow-hidden ring-1 ring-white/10">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 ml-auto mr-3 ring-1 ring-slate-700" />
        </div>

        {/* Status Bar */}
        <div className="h-8 bg-white dark:bg-slate-900 px-6 flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0 z-40 select-none">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Screen Content Wrapper */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-[36px] scrollbar-none">
          {children}
        </div>

        {/* Home Indicator Bar */}
        <div className="h-4 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
