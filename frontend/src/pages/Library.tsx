import { useMemo, useState } from 'react'
import { Folder, LayoutGrid, List, Search } from 'lucide-react'
import { Page, PageHeader } from '../components/app/AppLayout'
import { Button } from '../components/ui/Button'
import { Dropdown, EmptyState, SearchInput, Segmented } from '../components/ui/primitives'
import { PackCard, PackRow } from '../components/app/PackCard'
import { useApp } from '../store/app'
import { useUpload } from '../store/upload'
import { SUBJECTS } from '../data/subjects'
import { packProgress } from '../lib/pack'
import { cn } from '../lib/cn'

type Sort = 'recent' | 'name' | 'progress'
type View = 'grid' | 'list'

export function Library() {
  const { packs } = useApp()
  const { openUpload } = useUpload()
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [view, setView] = useState<View>('grid')

  const folders = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of packs) counts.set(p.folder, (counts.get(p.folder) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [packs])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return packs
      .filter((p) => folder === 'all' || p.folder === folder)
      .filter(
        (p) =>
          !q ||
          `${p.title} ${p.summary} ${p.sourceLabel} ${p.concepts.map((c) => c.name).join(' ')}`
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => {
        if (sort === 'name') return a.title.localeCompare(b.title)
        if (sort === 'progress') return packProgress(b) - packProgress(a)
        return (b.lastStudied ?? b.createdAt) - (a.lastStudied ?? a.createdAt)
      })
  }, [packs, query, folder, sort])

  return (
    <Page>
      <PageHeader
        title="Library"
        description="Everything you have uploaded, and everything built from it."
        action={
          <Button variant="primary" onClick={() => openUpload()}>
            Add material
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search material, notes and concepts"
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <Dropdown
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'recent', label: 'Recently studied' },
              { id: 'name', label: 'Name' },
              { id: 'progress', label: 'Mastery' },
            ]}
          />
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { id: 'grid', label: '', icon: <LayoutGrid size={14} /> },
              { id: 'list', label: '', icon: <List size={14} /> },
            ]}
          />
        </div>
      </div>

      {/* Collections */}
      <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1">
        <FolderChip
          label="All material"
          count={packs.length}
          active={folder === 'all'}
          onClick={() => setFolder('all')}
        />
        {folders.map(([name, count]) => (
          <FolderChip
            key={name}
            label={name}
            count={count}
            active={folder === name}
            color={
              Object.values(SUBJECTS).find((s) => s.label === name)?.color ?? 'var(--color-ink-3)'
            }
            onClick={() => setFolder(name)}
          />
        ))}
      </div>

      <p className="mt-5 mb-3 text-[12.5px] text-ink-3">
        {results.length} {results.length === 1 ? 'pack' : 'packs'}
        {folder !== 'all' && ` in ${folder}`}
        {query && ` matching “${query}”`}
      </p>

      {results.length ? (
        view === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <PackCard key={p.id} pack={p} />
            ))}
          </div>
        ) : (
          <div className="card divide-y divide-line p-1.5">
            {results.map((p) => (
              <PackRow
                key={p.id}
                pack={p}
                to={`/app/pack/${p.id}`}
                meta={`${p.concepts.length} concepts`}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={query ? <Search size={19} /> : <Folder size={19} />}
          title={query ? 'Nothing matches that' : 'This collection is empty'}
          description={
            query
              ? 'Try a different word, or search for a concept name rather than a title.'
              : 'Upload material to this subject and it will show up here.'
          }
          action={
            query ? (
              <Button onClick={() => setQuery('')}>Clear search</Button>
            ) : (
              <Button variant="primary" onClick={() => openUpload()}>
                Upload material
              </Button>
            )
          }
        />
      )}
    </Page>
  )
}

function FolderChip({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'interactive inline-flex shrink-0 items-center gap-2 rounded-[10px] border px-3 py-1.5 text-[13px] font-medium',
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
      )}
    >
      {color && !active && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      )}
      {label}
      <span className={cn('tabular-nums', active ? 'text-white/60' : 'text-ink-4')}>{count}</span>
    </button>
  )
}
