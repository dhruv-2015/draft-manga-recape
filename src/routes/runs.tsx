import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/runs')({
  component: RunsPage,
  validateSearch: (s: Record<string, unknown>) => ({ folder: (s.folder as string) ?? '' }),
})

type RunSummary = { _id: string; status: string; progress: number; updatedAt: string }

function RunsPage() {
  const { folder } = Route.useSearch()
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => { refresh() }, [folder])
  async function refresh() {
    // In a real implementation, this would query MongoDB for runs tied to the project.
    // For now, keep a lightweight placeholder until persistence is wired.
    setRuns([])
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Generation Runs</h1>
      <p className="text-sm text-zinc-400">Run history, progress, cost, and retry controls.</p>
      {runs.length === 0 && <p className="text-zinc-500">No runs yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {runs.map((r) => (
          <button key={r._id} onClick={() => setSelected(r._id)} className={`rounded-xl border p-4 text-left ${selected === r._id ? 'border-fuchsia-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'}`}>
            <div className="font-medium">{r._id}</div>
            <div className="text-xs text-zinc-400">{r.status} · {Math.round((r.progress ?? 0) * 100)}%</div>
          </button>
        ))}
      </div>
    </div>
  )
}
