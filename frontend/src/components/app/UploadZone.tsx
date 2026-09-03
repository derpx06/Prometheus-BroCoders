import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { UploadCloud } from 'lucide-react'
import { cn } from '../../lib/cn'

export const ACCEPT = '.pdf,.txt,.md,.docx,.doc,.ppt,.pptx,.png,.jpg,.jpeg'

/**
 * The drop target. Deliberately a single large affordance — the whole surface is the
 * button, so there is never a question of where to aim.
 */
export function UploadZone({
  onFile,
  size = 'md',
  children,
  className,
}: {
  onFile: (file: File) => void
  size?: 'md' | 'lg'
  children?: ReactNode
  className?: string
}) {
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Add study material"
      onClick={() => input.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          input.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setDragging(false)
      }}
      onDrop={onDrop}
      className={cn(
        'interactive group relative flex cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed text-center',
        size === 'lg' ? 'px-6 py-10 sm:py-12' : 'px-5 py-8',
        dragging
          ? 'border-accent bg-accent-tint'
          : 'border-line-strong bg-surface hover:border-ink-4 hover:bg-raised/50',
        className,
      )}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />

      <div
        className={cn(
          'interactive mb-3 flex items-center justify-center rounded-[12px]',
          size === 'lg' ? 'h-11 w-11' : 'h-10 w-10',
          dragging
            ? 'scale-105 bg-accent text-white'
            : 'bg-raised text-ink-3 group-hover:bg-sunken group-hover:text-ink-2',
        )}
      >
        <UploadCloud size={size === 'lg' ? 21 : 19} />
      </div>

      {children ?? (
        <>
          <p className="text-[14.5px] font-medium text-ink">
            {dragging ? 'Drop it anywhere here' : 'Drag and drop your file here'}
          </p>
          <p className="mt-1 text-[13px] text-ink-3">
            or <span className="font-medium text-accent">browse files</span>
          </p>
        </>
      )}
    </div>
  )
}

export function SupportedFormats({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-[12px] text-ink-4', className)}>
      PDF · DOCX · PPT · TXT · Images — up to 20 MB
    </p>
  )
}
