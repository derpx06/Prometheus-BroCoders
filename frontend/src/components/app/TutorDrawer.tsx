import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Pack } from '../../lib/types'
import { AIChat } from './AIChat'
import { IconButton } from '../ui/Button'
import { useIsMobile, useKeyDown } from '../../lib/hooks'

export function TutorDrawer({
  pack,
  open,
  onClose,
  seed,
}: {
  pack: Pack
  open: boolean
  onClose: () => void
  seed?: string
}) {
  const isMobile = useIsMobile()
  useKeyDown('Escape', onClose, open)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] lg:hidden"
          />
          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[82dvh] flex-col overflow-hidden rounded-t-[20px] border border-line bg-surface shadow-lg sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:w-[400px] sm:rounded-none sm:border-y-0 sm:border-r-0"
          >
            <div className="flex justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-9 rounded-full bg-line-strong" />
            </div>
            <div className="absolute top-3 right-3 z-10 sm:top-2.5">
              <IconButton label="Close assistant" size="sm" onClick={onClose}>
                <X size={15} />
              </IconButton>
            </div>
            <AIChat pack={pack} compact seed={seed} className="min-h-0 flex-1" />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
