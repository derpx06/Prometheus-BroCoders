import { NavLink } from 'react-router-dom'
import { BarChart3, GraduationCap, Home, Plus, Target } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useUpload } from '../../store/upload'

const ITEMS = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/learn', label: 'Learn', icon: GraduationCap },
  { to: '/app/practice', label: 'Practice', icon: Target },
  { to: '/app/progress', label: 'Progress', icon: BarChart3 },
]

/** Bottom navigation, mobile only. Large touch targets, upload always one tap away. */
export function MobileNav() {
  const { openUpload } = useUpload()

  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
        {ITEMS.slice(0, 2).map((i) => (
          <Item key={i.to} {...i} />
        ))}

        <div className="flex justify-center">
          <button
            onClick={() => openUpload()}
            aria-label="Add study material"
            className="interactive -mt-1 flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent text-white shadow-md active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>

        {ITEMS.slice(2).map((i) => (
          <Item key={i.to} {...i} />
        ))}
      </div>
    </nav>
  )
}

function Item({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'interactive flex min-h-11 flex-col items-center justify-center gap-1 rounded-[10px] py-1.5 text-[10.5px] font-medium',
          isActive ? 'text-ink' : 'text-ink-4',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
          {label}
        </>
      )}
    </NavLink>
  )
}
