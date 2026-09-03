import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ------------------------------------------------------------------ Card */

export function Card({
  as: As = 'div',
  hover = false,
  className,
  children,
  ...rest
}: {
  as?: 'div' | 'section' | 'article' | 'li'
  hover?: boolean
  className?: string
  children: ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        'card',
        hover && 'interactive hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  )
}

/* ------------------------------------------------------------- ProgressBar */

export function ProgressBar({
  value,
  className,
  tone = 'accent',
  height = 6,
}: {
  value: number
  className?: string
  tone?: 'accent' | 'ink' | 'good'
  height?: number
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const bg = tone === 'accent' ? 'bg-accent' : tone === 'good' ? 'bg-good' : 'bg-ink'
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height }}
      className={cn('w-full overflow-hidden rounded-full bg-sunken', className)}
    >
      <motion.div
        className={cn('h-full rounded-full', bg)}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

/** A small mastery meter — deliberately not a pie chart. */
export function MasteryDots({ value, count = 5 }: { value: number; count?: number }) {
  const filled = Math.round(value * count)
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`${Math.round(value * 100)}% mastered`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn('h-1.5 w-1.5 rounded-full', i < filled ? 'bg-ink' : 'bg-line-strong')}
        />
      ))}
    </span>
  )
}

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-[8px]', className)} />
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[16px] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-raised text-ink-3">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-pretty text-ink-2">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'good' | 'bad' | 'warn'
  className?: string
}) {
  const tones = {
    neutral: 'bg-raised text-ink-2 border-line',
    accent: 'bg-accent-tint text-accent-ink border-accent-line',
    good: 'bg-good-tint text-good border-good-line',
    bad: 'bg-bad-tint text-bad border-bad-line',
    warn: 'bg-warn-tint text-warn border-warn/20',
  }[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium',
        tones,
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ Inputs */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'interactive h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] text-ink',
          'hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12',
          className,
        )}
        {...rest}
      />
    )
  },
)

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={15}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-4"
      />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}

/* -------------------------------------------------------------------- Tabs */

export interface TabItem {
  id: string
  label: string
  count?: number
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'interactive relative shrink-0 px-3 pt-1.5 pb-2.5 text-[13.5px] font-medium',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('ml-1.5 tabular-nums', active ? 'text-ink-3' : 'text-ink-4')}>
                {item.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-ink"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Compact segmented control, for view switches rather than navigation. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-[10px] border border-line bg-raised p-0.5', className)}>
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={cn(
              'interactive relative flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[12.5px] font-medium',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-pill"
                className="absolute inset-0 rounded-[8px] bg-surface shadow-xs"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- Dropdown */

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.id === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="interactive inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-medium text-ink shadow-xs hover:border-line-strong hover:bg-raised"
      >
        {label && <span className="text-ink-3">{label}</span>}
        {current?.label}
        <ChevronDown size={14} className={cn('interactive text-ink-3', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-30 mt-1.5 min-w-[180px] origin-top-right overflow-hidden rounded-[12px] border border-line bg-surface p-1 shadow-lg"
          >
            {options.map((o) => (
              <li key={o.id}>
                <button
                  role="option"
                  aria-selected={o.id === value}
                  onClick={() => {
                    onChange(o.id)
                    setOpen(false)
                  }}
                  className="interactive flex w-full items-center justify-between gap-3 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-raised"
                >
                  {o.label}
                  {o.id === value && <Check size={14} className="text-accent" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white select-none',
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}
