import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, X, CheckCheck, AlertOctagon, Calendar, CheckCircle, Clock, BookOpen, AlertTriangle } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, role, activeParent } = useApp();
  const [filter, setFilter] = useState<'todas' | 'inasistencia' | 'alertas' | 'examen_recordatorio'>('todas');

  if (!isOpen) return null;

  // Filter relevant notifications
  const displayedNotifications = notifications.filter((n) => {
    // If logged in as parent, show parent's or child's notifications or school wide
    if (role === 'padre' && activeParent?.studentId && n.studentId && n.studentId !== activeParent.studentId) {
      return false;
    }
    if (filter === 'todas') return true;
    if (filter === 'alertas') return n.type === 'nota_critica' || n.type === 'asistencia_critica';
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inasistencia':
        return <AlertOctagon className="w-5 h-5 text-red-500" />;
      case 'nota_critica':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'asistencia_critica':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'examen_recordatorio':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
  };

  const isParent = role === 'padre';

  const getBorderColor = (type: string, read: boolean) => {
    if (read) {
      return isParent
        ? 'border-[#FED7AA] bg-white text-[#1F2937]'
        : 'border-slate-200 bg-white text-[#1E293B]';
    }
    switch (type) {
      case 'inasistencia':
        return 'border-red-300 bg-red-50/80 text-red-950';
      case 'nota_critica':
        return 'border-amber-300 bg-amber-50/90 text-amber-950';
      case 'asistencia_critica':
        return 'border-orange-300 bg-orange-50/90 text-orange-950';
      case 'examen_recordatorio':
        return isParent
          ? 'border-sky-300 bg-sky-50 text-sky-950'
          : 'border-blue-300 bg-blue-50 text-blue-950';
      default:
        return isParent
          ? 'border-[#FED7AA] bg-[#FFFBEB] text-[#1F2937]'
          : 'border-slate-200 bg-slate-50 text-[#1E293B]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white shadow-2xl h-full flex flex-col border-l-2 border-slate-200 transition-all duration-300 animate-in slide-in-from-right">
        {/* Drawer Header */}
        <div
          className={`p-4 border-b flex items-center justify-between text-white ${
            isParent
              ? 'bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] border-[#FED7AA]'
              : 'bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] border-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full animate-ping" />
              )}
            </div>
            <h2 className="font-black text-white text-base">
              Centro de Notificaciones en Vivo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Filters */}
        <div className="p-3 border-b border-slate-200 flex flex-col gap-2 bg-white">
          <div className="flex items-center justify-between text-xs text-[#475569] font-bold">
            <span>{displayedNotifications.length} notificaciones ({unreadCount} sin leer)</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className={`flex items-center gap-1 font-black hover:underline ${
                  isParent ? 'text-[#0369A1]' : 'text-[#2563EB]'
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-[#475569]">
            <button
              onClick={() => setFilter('todas')}
              className={`py-1.5 px-2 rounded-lg transition text-center truncate ${
                filter === 'todas'
                  ? isParent
                    ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
                    : 'bg-[#2563EB] text-white shadow-xs font-black'
                  : 'hover:text-[#1E293B]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('inasistencia')}
              className={`py-1.5 px-2 rounded-lg transition text-center truncate ${
                filter === 'inasistencia'
                  ? 'bg-red-600 text-white shadow-xs font-black'
                  : 'hover:text-red-600'
              }`}
            >
              Faltas
            </button>
            <button
              onClick={() => setFilter('alertas')}
              className={`py-1.5 px-2 rounded-lg transition text-center truncate ${
                filter === 'alertas'
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : 'hover:text-amber-700'
              }`}
            >
              Alertas
            </button>
            <button
              onClick={() => setFilter('examen_recordatorio')}
              className={`py-1.5 px-2 rounded-lg transition text-center truncate ${
                filter === 'examen_recordatorio'
                  ? isParent
                    ? 'bg-[#0EA5E9] text-white shadow-xs font-black'
                    : 'bg-[#2563EB] text-white shadow-xs font-black'
                  : 'hover:text-blue-700'
              }`}
            >
              Exámenes
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/60">
          {displayedNotifications.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-bold text-[#1E293B]">No hay notificaciones en este filtro</p>
              <p className="text-xs mt-1 text-[#475569]">Los avisos de inasistencias y notas aparecerán aquí en tiempo real.</p>
            </div>
          ) : (
            displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationRead(notif.id)}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer relative shadow-xs hover:shadow-md ${getBorderColor(
                  notif.type,
                  notif.read
                )}`}
              >
                {!notif.read && (
                  <span
                    className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                      isParent ? 'bg-[#0EA5E9]' : 'bg-[#2563EB]'
                    }`}
                  />
                )}
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1">
                    <h3 className="text-xs font-black text-[#1E293B] leading-tight">
                      {notif.title}
                    </h3>
                    <p className="text-xs text-[#334155] font-medium mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200 text-[11px] text-[#475569]">
                      {notif.subjectName && (
                        <span className="inline-flex items-center gap-1 bg-white border border-slate-300 px-2 py-0.5 rounded-md text-[#1E293B] font-bold">
                          <BookOpen className="w-3 h-3 text-[#2563EB]" />
                          {notif.subjectName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 font-mono font-bold">
                        <Clock className="w-3 h-3 text-[#64748B]" />
                        {notif.date} • {notif.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t-2 border-slate-200 bg-white text-center">
          <p className="text-[11px] text-[#475569] font-bold">
            Sincronización activa con padres y profesores • EduControl Pro
          </p>
        </div>
      </div>
    </div>
  );
};
