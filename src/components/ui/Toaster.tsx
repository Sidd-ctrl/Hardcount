import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToasts } from '@/store/toasts';

const ICONS = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
};

const TONE_BORDER = {
  neutral: 'border-white/10',
  success: 'border-emerald-400/30',
  warning: 'border-amber-glow/35',
};

export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="hc-no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-graphite-850/95 p-3 shadow-raised backdrop-blur-xl ${TONE_BORDER[toast.tone]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-graphite-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium leading-tight text-graphite-100">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-2xs leading-snug text-graphite-400">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 text-graphite-500 transition-colors hover:text-graphite-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
