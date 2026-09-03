import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { DUR, EASE } from '../../lib/motion'

/**
 * Hover/focus tooltip. Positioned relative to its trigger rather than portalled —
 * every use in this product sits inside a container that can afford the overflow.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'top' ? 2 : -2, scale: 0.98 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            className={cn(
              'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap',
              'rounded-[8px] bg-ink px-2.5 py-1.5 text-[11.5px] leading-tight font-medium text-white shadow-md',
              side === 'top' ? 'bottom-[calc(100%+7px)]' : 'top-[calc(100%+7px)]',
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
