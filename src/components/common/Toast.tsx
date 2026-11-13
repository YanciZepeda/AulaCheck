import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useApp();

  if (!toastMessage) return null;

  const bgColors = {
    info: 'bg-slate-900 border-blue-500 text-white',
    alert: 'bg-amber-950 border-amber-500 text-amber-100',
    success: 'bg-emerald-950 border-emerald-500 text-emerald-100'
  };

  const icons = {
    info: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
    alert: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
  };

  const currentType = toastMessage.type || 'info';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce-short shadow-2xl">
      <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg ${bgColors[currentType]}`}>
        {icons[currentType]}
        <div className="flex-1 pr-2">
          <p className="font-semibold text-sm">{toastMessage.title}</p>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toastMessage.desc}</p>
        </div>
        <button
          onClick={clearToast}
          className="text-slate-400 hover:text-white p-1 rounded-md transition"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
