import { cn } from '../../lib/cn'

/**
 * The mark: four nodes and the edges between them — a lattice. Concepts joined by
 * prerequisites is literally what the engine builds, so the logo says what it does.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <path
        d="M12 4.5 5.5 9.2M12 4.5 18.5 9.2M5.5 9.2 12 19M18.5 9.2 12 19M5.5 9.2h13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="12" cy="4.5" r="2.1" fill="currentColor" />
      <circle cx="5.5" cy="9.2" r="1.9" fill="currentColor" opacity="0.75" />
      <circle cx="18.5" cy="9.2" r="1.9" fill="currentColor" opacity="0.75" />
      <circle cx="12" cy="19" r="2.1" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <LogoMark className="text-accent" />
      <span className="text-[15px] font-semibold tracking-[-0.015em]">Lattice</span>
    </span>
  )
}
