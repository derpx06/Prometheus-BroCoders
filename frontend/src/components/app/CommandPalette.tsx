import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, FileText, Layers, ListChecks, Search, Upload } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useApp } from '../../store/app'
import { useUpload } from '../../store/upload'
import { SUBJECTS } from '../../data/subjects'
import { cn } from '../../lib/cn'

interface Item {
  id: string
  label: string
  hint: string
  icon: typeof FileText
  run: () => void
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const navigate = useNavigate()
  const { packs } = useApp()
  const { openUpload } = useUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      navigate(to)
      onClose()
    }
    const base: Item[] = [
      {
        id: 'upload',
        label: 'Add study material',
        hint: 'Upload',
        icon: Upload,
        run: () => {
          onClose()
          openUpload()
        },
      },
    ]
    const packItems = packs.flatMap<Item>((p) => [
      {
        id: `${p.id}-notes`,
        label: p.title,
        hint: `Notes · ${SUBJECTS[p.subject].label}`,
        icon: FileText,
        run: go(`/app/notes/${p.id}`),
      },
      {
        id: `${p.id}-quiz`,
        label: `${p.title} — quiz`,
        hint: 'Quiz',
        icon: ListChecks,
        run: go(`/app/quiz/${p.id}`),
      },
      {
        id: `${p.id}-cards`,
        label: `${p.title} — flashcards`,
        hint: `${p.flashcards.length} cards`,
        icon: Layers,
        run: go(`/app/flashcards/${p.id}`),
      },
    ])
    const all = [...base, ...packItems]
    const q = query.trim().toLowerCase()
    if (!q) return all.slice(0, 8)
    return all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q)).slice(0, 10)
  }, [packs, query, navigate, onClose, openUpload])

  useEffect(() => setCursor(0), [query])

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-xl">
      <div
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setCursor((c) => Math.min(items.length - 1, c + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setCursor((c) => Math.max(0, c - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            items[cursor]?.run()
          }
        }}
      >
        <div className="-mx-5 -mt-8 flex items-center gap-2.5 border-b border-line px-5 pb-3 sm:-mx-6 sm:-mt-9 sm:px-6">
          <Search size={17} className="shrink-0 text-ink-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your material…"
            className="h-9 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-4"
          />
        </div>

        <ul className="-mx-2 mt-2 max-h-[46dvh] overflow-y-auto">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onMouseEnter={() => setCursor(i)}
                  onClick={item.run}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-100',
                    i === cursor ? 'bg-raised' : 'hover:bg-raised/60',
                  )}
                >
                  <Icon size={15.5} className="shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-4">{item.hint}</span>
                  {i === cursor && <CornerDownLeft size={13} className="shrink-0 text-ink-4" />}
                </button>
              </li>
            )
          })}
          {!items.length && (
            <li className="px-3 py-8 text-center text-[13.5px] text-ink-3">
              Nothing matches “{query}”.
            </li>
          )}
        </ul>
      </div>
    </Modal>
  )
}
