import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  preventClose = false,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !preventClose) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, preventClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]"
            onClick={() => !preventClose && onClose?.()}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl',
              sizes[size]
            )}
          >
            {(title || !preventClose) && (
              <div className="no-print flex items-center justify-between border-b border-ink-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
                {!preventClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
            {footer && (
              <div className="no-print flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/80 px-5 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
