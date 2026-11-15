import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (msg: string) => addToast('success', msg);
  const error = (msg: string) => addToast('error', msg);
  const info = (msg: string) => addToast('info', msg);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all transform translate-y-0 ${
              t.type === 'success'
                ? 'bg-forge-900/95 border-brand-500/40 text-brand-400 shadow-brand-500/10'
                : t.type === 'error'
                ? 'bg-forge-900/95 border-rose-500/40 text-rose-400 shadow-rose-500/10'
                : 'bg-forge-900/95 border-blue-500/40 text-blue-400 shadow-blue-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-500" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
              {t.type === 'info' && <Info className="w-4 h-4 shrink-0 text-blue-400" />}
              <span className="text-xs font-medium text-forge-100">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-forge-400 hover:text-forge-200 transition p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
