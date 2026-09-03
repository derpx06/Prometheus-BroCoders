import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * Last line of defence.
 *
 * A blank page is the worst possible failure — it gives the student nothing to act on.
 * This turns a render crash into a readable message and a way out, and offers to clear
 * locally stored state, which is what causes most of them after a schema change.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lattice crashed while rendering:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-[20px] font-semibold text-ink">Something in here broke.</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-pretty text-ink-2">
            Not your fault. Reloading usually fixes it — if it does not, clearing the study data
            saved in this browser will.
          </p>
          <p className="mt-4 rounded-[10px] border border-line bg-surface px-3 py-2 text-left font-mono text-[11.5px] break-words text-ink-3">
            {this.state.error.message}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              onClick={() => location.reload()}
              className="interactive inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-accent px-4 text-[14px] font-medium text-white hover:bg-accent-hover"
            >
              <RefreshCw size={15} />
              Reload
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear()
                } catch {
                  /* nothing stored to clear */
                }
                location.href = '/app'
              }}
              className="interactive inline-flex h-10 items-center justify-center rounded-[10px] border border-line bg-surface px-4 text-[14px] font-medium text-ink hover:bg-raised"
            >
              Clear saved data
            </button>
          </div>
        </div>
      </div>
    )
  }
}
