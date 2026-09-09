import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button, IconButton } from '../ui/Button'
import { Logo } from './Logo'
import { navFor } from './Sidebar'
import { useUpload } from '../../store/upload'
import { useApp } from '../../store/app'
import { useAuth } from '../../store/auth'
import { cn } from '../../lib/cn'

function sectionTitle(pathname: string, nav: ReturnType<typeof navFor>): string {
  // The role's own nav, not the union of every role's: `/app/classes` is "Classes" to a
  // teacher and "My classes" to a student, and the header should agree with the sidebar.
  const match = [...nav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  if (match) return match.label
  if (pathname.startsWith('/app/classes')) return 'Class'
  if (pathname.startsWith('/app/assignments')) return 'Assignment'
  if (pathname.startsWith('/app/attempt')) return 'In progress'
  if (pathname.startsWith('/app/material')) return 'Material'
  if (pathname.startsWith('/app/create')) return 'Create'
  if (pathname.startsWith('/app/pack')) return 'Learning path'
  if (pathname.startsWith('/app/quiz')) return 'Practice'
  if (pathname.startsWith('/app/notes')) return 'Notes'
  if (pathname.startsWith('/app/flashcards')) return 'Flashcards'
  if (pathname.startsWith('/app/settings')) return 'Settings'
  if (pathname.startsWith('/app/profile')) return 'Profile'
  return 'Lattice'
}

function EngineDot() {
  const { engine } = useApp()
  const label =
    engine === 'online'
      ? 'Engine connected — uploads run through the live model'
      : engine === 'offline'
        ? 'Engine offline — running on bundled demo material'
        : 'Checking engine…'
  return (
    <span
      title={label}
      className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2 lg:inline-flex"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          engine === 'online' ? 'bg-good' : engine === 'offline' ? 'bg-ink-4' : 'bg-warn',
        )}
      />
      {engine === 'online' ? 'Engine live' : engine === 'offline' ? 'Demo mode' : 'Connecting'}
    </span>
  )
}

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const { pathname } = useLocation()
  const { role, isTeacher } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="md:hidden">
          <Logo />
        </div>
        <h1 className="hidden truncate text-[14px] font-medium text-ink-2 md:block">
          {sectionTitle(pathname, navFor(role))}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          <EngineDot />
          <IconButton label="Search" size="sm" onClick={onSearch} className="text-ink-3">
            <Search size={16} />
          </IconButton>
          <PrimaryAction teacher={isTeacher} />
        </div>
      </div>
    </header>
  )
}

function PrimaryAction({ teacher }: { teacher: boolean }) {
  const { openUpload } = useUpload()
  const navigate = useNavigate()
  const label = teacher ? 'Create with AI' : 'New pack'
  const run = () => (teacher ? navigate('/app/create') : openUpload())

  // Wrapped rather than toggled with `hidden` on the button itself: both utilities set
  // `display`, and which one wins depends on stylesheet order, not class order.
  return (
    <>
      <span className="hidden sm:block">
        <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={run}>
          {label}
        </Button>
      </span>
      <span className="sm:hidden">
        <IconButton label={label} variant="primary" size="sm" onClick={run}>
          <Plus size={16} />
        </IconButton>
      </span>
    </>
  )
}
