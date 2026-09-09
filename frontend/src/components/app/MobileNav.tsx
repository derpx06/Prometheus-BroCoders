import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, ClipboardList, Home, Plus, Target, Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useUpload } from '../../store/upload'
import { useAuth } from '../../store/auth'

/** Four slots either side of the create button, chosen per role. */
const BY_ROLE = {
  student: [
    { to: '/app', label: 'Home', icon: Home, end: true },
    { to: '/app/assignments', label: 'Work', icon: ClipboardList },
    { to: '/app/practice', label: 'Practice', icon: Target },
    { to: '/app/progress', label: 'Progress', icon: BarChart3 },
  ],
  teacher: [
    { to: '/app', label: 'Home', icon: Home, end: true },
    { to: '/app/classes', label: 'Classes', icon: Users },
    { to: '/app/library', label: 'Library', icon: BookOpen },
    { to: '/app/analytics', label: 'Insights', icon: BarChart3 },
  ],
  demo: [
    { to: '/app', label: 'Home', icon: Home, end: true },
    { to: '/app/library', label: 'Library', icon: BookOpen },
    { to: '/app/practice', label: 'Practice', icon: Target },
    { to: '/app/progress', label: 'Progress', icon: BarChart3 },
  ],
} as const

/** Bottom navigation, mobile only. Large touch targets, upload always one tap away. */
export function MobileNav() {
  const { openUpload } = useUpload()
  const { role, isTeacher } = useAuth()
  const navigate = useNavigate()
  const ITEMS = isTeacher ? BY_ROLE.teacher : role === 'student' ? BY_ROLE.student : BY_ROLE.demo

  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
        {ITEMS.slice(0, 2).map((i) => (
          <Item key={i.to} {...i} />
        ))}

        <div className="flex justify-center">
          <button
            onClick={() => (isTeacher ? navigate('/app/create') : openUpload())}
            aria-label={isTeacher ? 'Create with AI' : 'Add study material'}
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
