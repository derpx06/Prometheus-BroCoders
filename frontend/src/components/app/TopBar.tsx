import { useLocation } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button, IconButton } from '../ui/Button'
import { Logo } from './Logo'
import { NAV } from './Sidebar'
import { useUpload } from '../../store/upload'
import { useApp } from '../../store/app'
import { cn } from '../../lib/cn'

function sectionTitle(pathname: string): string {
  const match = [...NAV]
    .sort((a, b) => b.to.length - a.to.length)
    .find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  if (match) return match.label
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

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="md:hidden">
          <Logo />
        </div>
        <h1 className="hidden truncate text-[14px] font-medium text-ink-2 md:block">
          {sectionTitle(pathname)}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          <EngineDot />
          <IconButton label="Search" size="sm" onClick={onSearch} className="text-ink-3">
            <Search size={16} />
          </IconButton>
          <UploadButton />
        </div>
      </div>
    </header>
  )
}

function UploadButton() {
  const { openUpload } = useUpload()
  // Wrapped rather than toggled with `hidden` on the button itself: both utilities set
  // `display`, and which one wins depends on stylesheet order, not class order.
  return (
    <>
      <span className="hidden sm:block">
        <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => openUpload()}>
          New pack
        </Button>
      </span>
      <span className="sm:hidden">
        <IconButton
          label="New study pack"
          variant="primary"
          size="sm"
          onClick={() => openUpload()}
        >
          <Plus size={16} />
        </IconButton>
      </span>
    </>
  )
}
