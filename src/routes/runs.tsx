import { useEffect, useState, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/runs')({
  component: RunsPage,
  validateSearch: (s: Record<string, unknown>) => ({ folder: (s.folder as string) ?? '', runId: (s.runId as string) ?? '' }),
})

type RunSummary = { _id: string; projectId: string; status: string; progress: number; updatedAt: string; approvalState?: string }
type JobSummary = { _id: string; type: string; status: string; error?: string }
type EventSummary = { _id: string; level: string; message: string; createdAt: string }

function RunsPage() {
  const { folder } = Route.useSearch()
  const { runId: selectedRunId } = Route.useSearch()
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [selected, setSelected] = useState<string | null>(selectedRunId || null)
  const [detail, setDetail] = useState<{ jobs: JobSummary[]; events: EventSummary[] } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { refresh() }, [folder])
  useEffect(() => { if (selected) loadDetail(selected) }, [selected])

  useEffect(() => { if (logRef.current) logRef.current.scrollTo({ top: 999999 }) }, [detail?.events?.length])

  async function refresh() {
    const qs = folder ? `?projectId=${encodeURIComponent(folder)}` : ''
    const data = await fetch(`/api/runs${qs}`).then((r) => r.json())
    setRuns(Array.isArray(data) ? data : [])
  }

  async function loadDetail(id: string) {
    setSelected(id)
    const data = await fetch(`/api/runs?id=${encodeURIComponent(id)}`).then((r) => r.json())
    if (data) setDetail({ jobs: data.jobs ?? [], events: data.events ?? [] })
  }

  async function approve() {
    if (!selected) return
    await fetch('/api/runs-approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: selected, artifactVersion: 'v1' }) })
    refresh(); loadDetail(selected)
  }
  async function reject() {
    if (!selected) return
    await fetch('/api/runs-reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: selected }) })
    refresh(); loadDetail(selected)
  }

  const selectedRun = selected ? (runs.find((r) => r._id === selected) ?? null) : null

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Generation Runs</h1>
      <p className="text-sm text-zinc-400">Run history, progress, cost, and retry controls.</p>
      {runs.length === 0 && <p className="text-zinc-500">No runs yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {runs.map((r) => (
          <button key={r._id} onClick={() => loadDetail(r._id)} className={`rounded-xl border p-4 text-left ${selected === r._id ? 'border-fuchsia-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'}`}>
            <div className="font-medium">{r._id}</div>
            <div className="text-xs text-zinc-400">{r.status} · {Math.round((r.progress ?? 0) * 100)}% · approval: {r.approvalState ?? '—'}</div>
          </button>
        ))}
      </div>
      {selectedRun && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Run {selectedRun._id}</div>
              <div className="text-xs text-zinc-400">status: {selectedRun.status} · progress: {Math.round((selectedRun.progress ?? 0) * 100)}%</div>
            </div>
            <div className="flex gap-2">
              <button onClick={approve} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">Approve</button>
              <button onClick={reject} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-red-900 text-xs">Reject</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Jobs</h3>
              <div className="mt-2 space-y-1">
                {detail?.jobs?.length ? detail.jobs.map((j) => (
                  <div key={j._id} className="text-xs text-zinc-400">{j.type}: {j.status} {j.error ? `· ${j.error}` : ''}</div>
                )) : <p className="text-xs text-zinc-500">No jobs.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Log</h3>
              <div ref={logRef} className="mt-2 h-48 overflow-auto rounded-lg bg-black/40 p-2 text-xs text-zinc-300 space-y-1">
                {detail?.events?.length ? detail.events.map((e) => (
                  <div key={e._id} className={e.level === 'error' ? 'text-red-400' : 'text-zinc-300'}>{new Date(e.createdAt).toLocaleTimeString()} [{e.level}] {e.message}</div>
                )) : <p className="text-zinc-500">No events.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      <Link to="/project" className="text-sm text-fuchsia-400 hover:text-fuchsia-300">← Back to projects</Link>
    </div>
  )
}
