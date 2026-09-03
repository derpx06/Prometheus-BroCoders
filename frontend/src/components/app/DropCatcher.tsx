import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileDown } from 'lucide-react'
import { useUpload } from '../../store/upload'
import { DUR, EASE, SPRING } from '../../lib/motion'

/**
 * Whole-window drag target.
 *
 * A student dragging a lecture PDF should not have to aim. Anywhere on the page works,
 * and the interface says so the moment the file crosses the window edge — the scrim
 * pushes the rest of the UI back so there is exactly one thing to do.
 */
export function DropCatcher() {
  const { submitFile, open } = useUpload()
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  useEffect(() => {
    const carriesFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files')

    const onEnter = (e: DragEvent) => {
      if (!carriesFiles(e)) return
      depth.current += 1
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault()
    }
    const onLeave = (e: DragEvent) => {
      if (!carriesFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!carriesFiles(e)) return
      e.preventDefault()
      depth.current = 0
      setDragging(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) submitFile(file)
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [submitFile])

  const show = dragging && !open

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.base, ease: EASE.out }}
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-6"
        >
          <div className="absolute inset-0 bg-canvas/72 backdrop-blur-[3px]" />

          <motion.div
            initial={{ scale: 0.94, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 4 }}
            transition={SPRING}
            className="relative flex w-full max-w-md flex-col items-center rounded-[20px] border-2 border-dashed border-accent bg-surface/90 px-8 py-14 text-center shadow-lg"
          >
            <motion.span
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent text-white"
            >
              <FileDown size={22} />
            </motion.span>
            <p className="text-[18px] font-semibold text-ink">Drop to start learning</p>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              We'll read it, map the concepts and build your path.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
