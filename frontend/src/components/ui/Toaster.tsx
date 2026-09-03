import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useApp } from '../../store/app'

const ICON = {
  default: <Info size={16} className="text-ink-3" />,
  success: <CheckCircle2 size={16} className="text-good" />,
  error: <AlertCircle size={16} className="text-bad" />,
}

export function Toaster() {
  const { toasts, dismissToast } = useApp()

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:bottom-0 sm:items-end safe-b"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[12px] border border-line bg-surface p-3 shadow-lg"
          >
            <span className="mt-px shrink-0">{ICON[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="interactive -mt-0.5 -mr-0.5 rounded-[6px] p-1 text-ink-4 hover:bg-raised hover:text-ink-2"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
