import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useIsMobile, useKeyDown, useScrollLock } from '../../lib/hooks'
import { IconButton } from './Button'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  /** Hides the close affordance and backdrop dismissal — used while processing. */
  locked?: boolean
  size?: 'md' | 'lg'
  className?: string
}

/**
 * A dialog on desktop, a bottom sheet on mobile. One component, because it is one
 * concept — the difference is presentation, not behaviour.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  locked = false,
  size = 'md',
  className,
}: ModalProps) {
  const isMobile = useIsMobile()
  const panelRef = useRef<HTMLDivElement>(null)

  useScrollLock(open)
  useKeyDown('Escape', () => !locked && onClose(), open)

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => !locked && onClose()}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface outline-none',
              'rounded-t-[22px] shadow-lg sm:rounded-[20px]',
              size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
              className,
            )}
          >
            {/* Grab handle, mobile only */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-9 rounded-full bg-line-strong" />
            </div>

            {(title || !locked) && (
              <div className="flex items-start gap-4 px-5 pt-4 pb-1 sm:px-6 sm:pt-5">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="text-[17px] font-semibold text-ink">{title}</h2>}
                  {description && (
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{description}</p>
                  )}
                </div>
                {!locked && (
                  <IconButton label="Close" size="sm" onClick={onClose} className="-mr-1 -mt-0.5">
                    <X size={16} />
                  </IconButton>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
