import { useMemo, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { EmptyState, Tabs } from '../components/ui/primitives'
import { PackCard } from '../components/app/PackCard'
import { useApp } from '../store/app'
import { useUpload } from '../store/upload'
import { hasStarted, packProgress } from '../lib/pack'

type Filter = 'all' | 'active' | 'mastered' | 'new'

export function Learning() {
  const { packs } = useApp()
  const { openUpload } = useUpload()
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(() => {
    const withProgress = packs.map((p) => ({
      pack: p,
      progress: packProgress(p),
      started: hasStarted(p),
    }))
    return {
      all: withProgress,
      active: withProgress.filter((x) => x.started && x.progress < 0.8),
      mastered: withProgress.filter((x) => x.started && x.progress >= 0.8),
      new: withProgress.filter((x) => !x.started),
    }
  }, [packs])

  const shown = groups[filter]

  return (
    <Page>
      <PageHeader
        title="Learn"
        description="Every learning path you have built, and how far through each one you are."
        action={
          <Button variant="primary" onClick={() => openUpload()}>
            Add material
          </Button>
        }
      />

      <Tabs
        className="mb-6"
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        items={[
          { id: 'all', label: 'All', count: groups.all.length },
          { id: 'active', label: 'In progress', count: groups.active.length },
          { id: 'new', label: 'Not started', count: groups.new.length },
          { id: 'mastered', label: 'Mastered', count: groups.mastered.length },
        ]}
      />

      {shown.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown
            .sort((a, b) => (b.pack.lastStudied ?? 0) - (a.pack.lastStudied ?? 0))
            .map(({ pack }) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={<GraduationCap size={19} />}
          title={filter === 'mastered' ? 'Nothing mastered yet' : 'Nothing in this view'}
          description={
            filter === 'mastered'
              ? 'Keep answering quizzes — a pack lands here once your average mastery passes 80%.'
              : 'Upload study material and it will appear here as a full study pack.'
          }
          action={
            <Button variant="primary" onClick={() => openUpload()}>
              Upload material
            </Button>
          }
        />
      )}
    </Page>
  )
}
