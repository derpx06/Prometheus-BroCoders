import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-xs hover:bg-accent-hover active:bg-accent-ink disabled:bg-ink-4',
  secondary:
    'bg-surface text-ink border border-line shadow-xs hover:bg-raised hover:border-line-strong active:bg-sunken',
  ghost: 'text-ink-2 hover:bg-raised hover:text-ink active:bg-sunken',
  subtle: 'bg-raised text-ink hover:bg-sunken active:bg-line',
  danger: 'bg-bad text-white hover:brightness-110 active:brightness-95',
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[8px]',
  md: 'h-9.5 px-3.5 text-[13.5px] gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-[12px]',
}

const BASE =
  'interactive relative inline-flex select-none items-center justify-center font-medium whitespace-nowrap ' +
  'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BASE, VARIANT[variant], SIZE[size], block && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <Loader2 size={size === 'lg' ? 17 : 15} className="animate-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  )
})

export function ButtonLink({
  to,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  block,
  className,
  children,
}: {
  to: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  block?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(BASE, VARIANT[variant], SIZE[size], block && 'w-full', className)}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: Variant
  size?: Size
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, ...rest },
  ref,
) {
  const box = size === 'sm' ? 'h-7.5 w-7.5 rounded-[8px]' : size === 'lg' ? 'h-11 w-11 rounded-[12px]' : 'h-9 w-9 rounded-[10px]'
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'interactive inline-flex shrink-0 items-center justify-center active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        box,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
