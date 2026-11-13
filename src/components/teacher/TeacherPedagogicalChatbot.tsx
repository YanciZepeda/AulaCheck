import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Bot,
  User,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Clock,
  Compass,
  ChevronDown
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  model?: string;
}

interface TeacherPedagogicalChatbotProps {
  currentSubject?: string;
  currentGradeName?: string;
  teacherName?: string;
  institutionName?: string;
}

export const TeacherPedagogicalChatbot: React.FC<TeacherPedagogicalChatbotProps> = ({
  currentSubject = 'Materia General',
  currentGradeName = 'Grado Escolar',
  teacherName = 'Docente',
  institutionName = 'Centro Educativo'
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initial welcome message (Pedagogical planning focus)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `¡Hola, colega! Soy tu **Co-piloto Pedagógico** con **Gemini IA en tiempo real**.\n\nEstoy conectado y listo para ayudarte a diseñar clases activas, dinámicas de aula y estrategias para **${currentSubject}** (${currentGradeName}).\n\nPuedes preguntarme cualquier cosa real de tu clase:\n• *"Dame una dinámica de 15 minutos para introducir el tema con materiales sencillos"*\n• *"¿Cómo explicar este concepto difícil con una analogía de la vida cotidiana?"*\n• *"Diseña una rúbrica formativa rápida de 3 criterios con porcentajes"*\n• *"¿Qué actividad diferenciada puedo aplicar con alumnos que aprenden a distinto ritmo?"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-flash'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Suggested prompt pills for classroom pedagogy
  const suggestedPrompts = [
    `¿Cómo explicar el tema central de ${currentSubject} con una analogía cotidiana?`,
    `Dame 3 dinámicas lúdicas de 15 minutos para ${currentGradeName}`,
    `Estructura una clase de 45 minutos (inicio, desarrollo y cierre reflexivo)`,
    `Crea una rúbrica formativa de 3 criterios para evaluar trabajo en clase`
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || inputMessage).trim();
    if (!promptText || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build history for backend (keep last 8 turns)
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        text: m.text
      }));

      const res = await fetch('/api/teacher-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: historyPayload,
          context: {
            subject: currentSubject,
            gradeName: currentGradeName,
            teacherName,
            institutionName
          }
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'He recibido tu consulta. ¿Deseas profundizar en algún punto específico para tu clase?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: data.model || 'gemini-flash'
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('Error sending message to teacher copilot:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: 'Hubo un inconveniente momentáneo al conectar con el motor de IA. Por favor, vuelve a presionar el botón de envío para reintentar tu consulta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Conversación reiniciada. ¿En qué tema o actividad de **${currentSubject}** para **${currentGradeName}** te gustaría trabajar ahora?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper to render text with markdown-like formatting
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-black text-blue-900 mt-2 mb-1 text-xs sm:text-sm">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
            const content = line.substring(2);
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>{renderInlineBold(content)}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const match = line.match(/^(\d+\.)\s(.*)$/);
            if (match) {
              return (
                <div key={idx} className="flex items-start gap-1.5 ml-2">
                  <span className="text-blue-700 font-black min-w-4">{match[1]}</span>
                  <span>{renderInlineBold(match[2])}</span>
                </div>
              );
            }
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx}>{renderInlineBold(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineBold = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-extrabold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Botón Flotante en la Esquina Inferior Derecha */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300 hover:scale-105 group border-2 border-white/30 cursor-pointer"
          title="Asistente Pedagógico IA para Profesores"
          aria-label="Abrir Asistente Pedagógico IA"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-black tracking-wide flex items-center gap-1">
              Asistente Pedagógico <Sparkles className="w-3 h-3 text-amber-300" />
            </span>
            <span className="text-[10px] text-blue-100 font-medium">Gemini 3.8 Flash • Ideas de clase</span>
          </div>
        </button>
      )}

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-50 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimized ? 'h-[62px]' : 'h-[580px] max-h-[calc(100vh-5rem)]'
          }`}
        >
          {/* Cabecera Estilo Azul Rey Institucional */}
          <header className="bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0 select-none">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="truncate">
                <h3 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  Co-piloto Pedagógico
                  <span className="bg-amber-400 text-slate-900 font-extrabold text-[9px] px-1.5 py-0.2 rounded-md">
                    IA Flash
                  </span>
                </h3>
                <p className="text-[10px] text-blue-100 truncate">
                  {currentSubject} • {currentGradeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                title="Limpiar conversación"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                title={isMinimized ? 'Maximizar chat' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                title="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Cuerpo del Chat (Visible cuando no está minimizado) */}
          {!isMinimized && (
            <>
              {/* Barra de Contexto Didáctico Activo */}
              <div className="bg-blue-50/80 border-b border-blue-100 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-blue-800">
                <span className="flex items-center gap-1.5 font-bold truncate">
                  <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  Materia activa: {currentSubject}
                </span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-blue-200 font-semibold text-slate-600 shrink-0">
                  {currentGradeName}
                </span>
              </div>

              {/* Lista Scrollable de Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 border border-blue-300">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                        msg.role === 'user'
                          ? 'bg-[#1d4ed8] text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        renderFormattedText(msg.text)
                      )}
                      <div
                        className={`text-[9px] mt-1.5 flex items-center justify-between gap-2 font-medium ${
                          msg.role === 'user' ? 'text-blue-200 justify-end' : 'text-slate-400'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                            {msg.model?.includes('3.8')
                              ? 'Gemini 3.8 Flash'
                              : msg.model?.includes('3.6')
                              ? 'Gemini 3.6 Flash'
                              : msg.model?.includes('3.5')
                              ? 'Gemini 3.5 Flash'
                              : 'Gemini IA'}
                          </span>
                        )}
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Indicador de pensamiento */}
                {isLoading && (
                  <div className="flex items-start gap-2.5 justify-start">
                    <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-blue-200 text-slate-600 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-xs flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                      <span className="text-xs text-blue-800 font-semibold">Gemini está preparando ideas didácticas...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Píldoras de sugerencias rápidas pedagógicas */}
              <div className="bg-white border-t border-slate-200 px-3 py-2 shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  Sugerencias para tu clase:
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(prompt)}
                      className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 font-medium transition shrink-0 disabled:opacity-50 text-left cursor-pointer"
                    >
                      {prompt.length > 36 ? prompt.slice(0, 36) + '...' : prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulario de Entrada */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="bg-white border-t border-slate-200 p-3 flex items-center gap-2 shrink-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Pregunta sobre cómo enseñar ${currentSubject}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-slate-300 text-white p-2.5 rounded-xl shadow-xs transition flex items-center justify-center shrink-0 cursor-pointer"
                  title="Enviar consulta pedagógica"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
