import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'border-success-500/30 bg-white text-success-700',
  error: 'border-danger-500/30 bg-white text-danger-700',
  warning: 'border-warning-500/30 bg-white text-warning-600',
  info: 'border-brand-400/30 bg-white text-ink-800',
};

const iconStyles = {
  success: 'text-success-500',
  error: 'text-danger-500',
  warning: 'text-warning-500',
  info: 'text-brand-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (msg, d) => addToast(msg, 'success', d),
    error: (msg, d) => addToast(msg, 'error', d),
    warning: (msg, d) => addToast(msg, 'warning', d),
    info: (msg, d) => addToast(msg, 'info', d),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-ink-900/10 ${styles[t.type]}`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconStyles[t.type]}`} />
                <p className="flex-1 text-sm font-medium leading-snug text-ink-800">{t.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="rounded-md p-0.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
