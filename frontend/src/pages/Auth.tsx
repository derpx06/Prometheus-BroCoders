import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, GraduationCap, Presentation, School } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge, Skeleton } from '../components/ui/primitives'
import { Logo } from '../components/app/Logo'
import { useAuth } from '../store/auth'
import { api } from '../lib/api'
import { cn } from '../lib/cn'

/**
 * One auth surface, four entrances: sign in, sign up, accept a teacher invitation, and join
 * a class by code. They share a frame so the product does not feel like it changes hands
 * between them.
 *
 * The signup role choice is the one product decision worth noticing: a student or an
 * independent teacher signs up without a school, because forcing every individual through a
 * school-registration flow is exactly the friction this merge was supposed to remove.
 */

function Frame({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-14 items-center px-4 sm:px-6">
        <Link to="/" aria-label="Lattice home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          <h1 className="text-[25px] leading-tight font-semibold text-balance text-ink">{title}</h1>
          {description && (
            <p className="mt-2 text-[14px] leading-relaxed text-pretty text-ink-2">{description}</p>
          )}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-5 text-[13.5px] text-ink-2">{footer}</div>}
        </motion.div>
      </main>
    </div>
  )
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{label}</span>
      <input
        {...props}
        className="interactive h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
      />
      {hint && <span className="mt-1 block text-[12px] text-ink-4">{hint}</span>}
    </label>
  )
}

function Problem({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex gap-2.5 rounded-[12px] border border-bad-line bg-bad-tint p-3">
      <AlertCircle size={16} className="mt-px shrink-0 text-bad" />
      <p className="text-[13px] leading-relaxed text-ink">{message}</p>
    </div>
  )
}

/** Somewhere to send a signed-in user. Anonymous visitors stay where they are. */
function useRedirectIfSignedIn() {
  const { status } = useAuth()
  const [params] = useSearchParams()
  if (status === 'authenticated') return <Navigate to={params.get('next') || '/app'} replace />
  return null
}

/* ------------------------------------------------------------------- sign in */

export function Login() {
  const { login } = useAuth()
  const redirect = useRedirectIfSignedIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (redirect) return redirect

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame title="Welcome back" description="Pick up where your material left off.">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Problem message={error} />
        <Button type="submit" variant="primary" size="lg" block loading={busy}>
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-[13.5px] text-ink-2">
        New here?{' '}
        <Link to="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </Frame>
  )
}

/* ------------------------------------------------------------------- sign up */

type Kind = 'student' | 'teacher' | 'school'

const KINDS: { id: Kind; label: string; detail: string; icon: typeof GraduationCap }[] = [
  {
    id: 'student',
    label: 'I’m studying',
    detail: 'Turn your own material into practice, and join a class when a teacher invites you.',
    icon: GraduationCap,
  },
  {
    id: 'teacher',
    label: 'I’m teaching',
    detail: 'Build quizzes, tests and assignments, run classes, and see what students know.',
    icon: Presentation,
  },
  {
    id: 'school',
    label: 'I’m setting up a school',
    detail: 'Register the school, invite its teachers, and keep material shared across it.',
    icon: School,
  },
]

export function Signup() {
  const { signup } = useAuth()
  const redirect = useRedirectIfSignedIn()
  const [kind, setKind] = useState<Kind>('student')
  const [form, setForm] = useState({ name: '', email: '', password: '', school: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (redirect) return redirect

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        role: kind === 'student' ? 'student' : 'teacher',
        ...(kind === 'school' ? { school: { name: form.school } } : {}),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame
      title="Create your account"
      description="Everything runs on the same engine — what changes is what you can do with it."
    >
      <div className="mb-5 flex flex-col gap-2">
        {KINDS.map((k) => {
          const Icon = k.icon
          const active = kind === k.id
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={active}
              className={cn(
                'interactive flex gap-3 rounded-[12px] border p-3.5 text-left',
                active
                  ? 'border-accent bg-accent-tint'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-raised/50',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]',
                  active ? 'bg-accent text-white' : 'bg-raised text-ink-3',
                )}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-ink">{k.label}</span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-2">
                  {k.detail}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        {kind === 'school' && (
          <Field
            label="School name"
            required
            value={form.school}
            onChange={set('school')}
            placeholder="Accra Science Academy"
          />
        )}
        <Field
          label="Your name"
          autoComplete="name"
          required
          value={form.name}
          onChange={set('name')}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
          value={form.password}
          onChange={set('password')}
        />
        <Problem message={error} />
        <Button type="submit" variant="primary" size="lg" block loading={busy}>
          {kind === 'school' ? 'Register the school' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 text-[13.5px] text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </Frame>
  )
}

/* -------------------------------------------------------- accept an invitation */

export function AcceptInvite() {
  const { token = '' } = useParams()
  const { acceptInvitation, status } = useAuth()
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof api.readInvitation>> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .readInvitation(token)
      .then(setInvite)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'That invitation is not valid.'))
  }, [token])

  if (status === 'authenticated') return <Navigate to="/app" replace />

  if (loadError) {
    return (
      <Frame title="That invitation is no longer valid">
        <Problem message={loadError} />
        <div className="mt-4">
          <Link to="/signup">
            <Button variant="primary" block>
              Create an account instead
            </Button>
          </Link>
        </div>
      </Frame>
    )
  }

  if (!invite) {
    return (
      <Frame title="Checking your invitation">
        <Skeleton className="h-10 w-full" />
      </Frame>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await acceptInvitation({ token, name, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set up that account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame
      title={invite.school ? `Join ${invite.school}` : 'Set up your account'}
      description={`You were invited as ${invite.role === 'teacher' ? 'a teacher' : 'a student'}${
        invite.className ? ` in ${invite.className}` : ''
      }. Choose your own password — nobody else ever sees it.`}
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Email" value={invite.email} readOnly disabled />
        <Field
          label="Your name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Choose a password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Problem message={error} />
        <Button type="submit" variant="primary" size="lg" block loading={busy}>
          Finish setting up
        </Button>
      </form>
    </Frame>
  )
}

/* --------------------------------------------------------- join a class by code */

export function JoinClass() {
  const { code: fromUrl } = useParams()
  const { status } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState(fromUrl ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joined, setJoined] = useState<string | null>(null)

  if (status === 'anonymous') {
    return (
      <Navigate
        to={`/signup?next=${encodeURIComponent(`/join${fromUrl ? `/${fromUrl}` : ''}`)}`}
        replace
      />
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { class: klass } = await api.joinClass(code.trim())
      setJoined(klass.name)
      setTimeout(() => navigate(`/app/classes/${klass.id}`), 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that class.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame
      title="Join a class"
      description="Your teacher gives you a six-character code. It is not case-sensitive."
    >
      {joined ? (
        <div className="flex items-center gap-2.5 rounded-[12px] border border-good-line bg-good-tint p-3.5">
          <Badge tone="good">Joined</Badge>
          <p className="text-[13.5px] text-ink">You are now in {joined}.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field
            label="Class code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="K7M2QX"
            maxLength={12}
            autoCapitalize="characters"
            className="font-mono"
          />
          <Problem message={error} />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={busy}
            iconRight={<ArrowRight size={16} />}
          >
            Join class
          </Button>
        </form>
      )}
    </Frame>
  )
}
