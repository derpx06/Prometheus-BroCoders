import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Target,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Logo, LogoMark } from './Logo'
import { Avatar } from '../ui/primitives'
import { IconButton } from '../ui/Button'
import { USER } from '../../data/user'

export interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

export const NAV: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/learn', label: 'Learn', icon: GraduationCap },
  { to: '/app/library', label: 'Library', icon: BookOpen },
  { to: '/app/practice', label: 'Practice', icon: Target },
  { to: '/app/progress', label: 'Progress', icon: BarChart3 },
]

function Row({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'interactive group relative flex h-9 items-center gap-2.5 rounded-[9px] text-[13.5px] font-medium',
          collapsed ? 'w-9 justify-center' : 'px-2.5',
          isActive ? 'text-ink' : 'text-ink-2 hover:bg-raised/70 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* One shared pill slides between rows rather than each row fading its own */}
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              transition={{ type: 'spring', stiffness: 520, damping: 42 }}
              className="absolute inset-0 rounded-[9px] bg-raised"
            />
          )}
          <Icon
            size={16.5}
            strokeWidth={isActive ? 2.1 : 1.85}
            className={cn(
              'relative shrink-0 transition-colors duration-200',
              isActive ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2',
            )}
          />
          {!collapsed && <span className="relative truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 60 : 232 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-canvas md:flex"
    >
      <div className={cn('flex h-14 items-center', collapsed ? 'justify-center' : 'px-3.5')}>
        {collapsed ? <LogoMark className="text-accent" /> : <Logo />}
      </div>

      <nav className={cn('flex flex-1 flex-col gap-0.5', collapsed ? 'items-center px-2.5' : 'px-2.5')}>
        {NAV.map((item) => (
          <Row key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn('flex flex-col gap-0.5 pb-3', collapsed ? 'items-center px-2.5' : 'px-2.5')}>
        <Row item={{ to: '/app/settings', label: 'Settings', icon: Settings }} collapsed={collapsed} />

        <NavLink
          to="/app/profile"
          title={collapsed ? USER.name : undefined}
          className={({ isActive }) =>
            cn(
              'interactive mt-1 flex h-11 items-center gap-2.5 rounded-[10px]',
              collapsed ? 'w-11 justify-center' : 'px-1.5',
              isActive ? 'bg-raised' : 'hover:bg-raised/70',
            )
          }
        >
          <Avatar name={USER.name} size={26} />
          {!collapsed && (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium text-ink">{USER.name}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{USER.plan}</span>
            </span>
          )}
        </NavLink>

        <div className={cn('mt-1', collapsed ? '' : 'px-0.5')}>
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            size="sm"
            onClick={onToggle}
            className="text-ink-4"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </IconButton>
        </div>
      </div>
    </motion.aside>
  )
}
