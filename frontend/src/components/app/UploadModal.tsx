import { useEffect, useState } from 'react'
import { AlertCircle, ClipboardType, FileText, Sparkles, Youtube } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/primitives'
import { SupportedFormats, UploadZone } from './UploadZone'
import { ProcessingComplete, ProcessingView } from './ProcessingView'
import { useUpload } from '../../store/upload'
import { useAuth } from '../../store/auth'
import { cn } from '../../lib/cn'

type Tab = 'file' | 'text' | 'link'

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'file', label: 'Upload', icon: FileText },
  { id: 'text', label: 'Paste text', icon: ClipboardType },
  { id: 'link', label: 'YouTube', icon: Youtube },
]

export function UploadModal() {
  const {
    open,
    phase,
    stage,
    fileName,
    doneTitle,
    error,
    initialTab,
    closeUpload,
    submitFile,
    submitText,
    submitLink,
    submitSample,
    reset,
  } = useUpload()
  const { status } = useAuth()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  const processing = phase === 'processing' || phase === 'done'

  return (
    <Modal
      open={open}
      onClose={closeUpload}
      locked={processing}
      size={tab === 'text' && phase === 'choose' ? 'lg' : 'md'}
      title={
        processing
          ? undefined
          : phase === 'error'
            ? 'That did not go through'
            : 'Add study material'
      }
      description={
        processing || phase === 'error'
          ? undefined
          : 'One upload becomes notes, flashcards, a quiz and a tutor that knows your material.'
      }
    >
      {phase === 'done' ? (
        <ProcessingComplete title={doneTitle} />
      ) : processing ? (
        <ProcessingView stage={stage} fileName={fileName} />
      ) : phase === 'error' ? (
        <div className="py-1">
          <div className="flex gap-3 rounded-[12px] border border-bad-line bg-bad-tint p-3.5">
            <AlertCircle size={17} className="mt-px shrink-0 text-bad" />
            <p className="text-[13.5px] leading-relaxed text-ink">{error}</p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="primary" onClick={reset} block className="sm:w-auto">
              Try again
            </Button>
            <Button onClick={submitSample} block className="sm:w-auto">
              Open the sample pack
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 inline-flex rounded-[10px] border border-line bg-raised p-0.5">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'interactive flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium',
                    tab === t.id
                      ? 'bg-surface text-ink shadow-xs'
                      : 'text-ink-3 hover:text-ink-2',
                  )}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {tab === 'file' && (
            <>
              <UploadZone onFile={submitFile} size="lg" />
              <SupportedFormats className="mt-3" />
            </>
          )}

          {tab === 'text' && (
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
                What should we call it?
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lecture 7 — Waves"
                className="interactive mb-3 h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
              />
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
                Paste your notes or a transcript
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="Paste a few paragraphs of the material you want to study…"
                className="interactive w-full resize-y rounded-[12px] border border-line bg-surface p-3 text-[13.5px] leading-relaxed hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[12px] tabular-nums text-ink-4">
                  {text.trim().length.toLocaleString()} characters
                </span>
                <Button
                  variant="primary"
                  disabled={text.trim().length < 400}
                  onClick={() => submitText(text, title.trim() || 'Pasted notes')}
                >
                  Build my study pack
                </Button>
              </div>
            </div>
          )}

          {tab === 'link' && (
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
                YouTube link
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="interactive h-10 w-full rounded-[10px] border border-line bg-surface px-3 text-[14px] hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/12"
              />
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
                We read the video's own caption track, so a lecture becomes a study pack the
                same way a PDF does. Videos with captions turned off have no transcript to
                read — paste the text instead.
              </p>
              {status !== 'authenticated' && (
                <div className="mt-3 flex gap-2.5 rounded-[12px] border border-line bg-raised p-3.5">
                  <Badge tone="warn" className="mt-px h-fit shrink-0">
                    Needs an account
                  </Badge>
                  <p className="text-[13px] leading-relaxed text-ink-2">
                    A fetched transcript is saved as a source you can reuse, so this one needs
                    you signed in.
                  </p>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button
                  variant="primary"
                  disabled={url.trim().length < 8 || status !== 'authenticated'}
                  onClick={() => submitLink(url.trim(), title.trim())}
                >
                  Build my study pack
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
            <Sparkles size={15} className="shrink-0 text-accent" />
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-2">
              No material to hand? Try{' '}
              <span className="font-medium text-ink">Introduction to Cell Biology.pdf</span>
            </p>
            <Button size="sm" onClick={submitSample}>
              Use sample
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
