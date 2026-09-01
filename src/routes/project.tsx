import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { Project } from '#/lib/projects'

export const Route = createFileRoute('/project')({
  component: ProjectPage,
  validateSearch: (s: Record<string, unknown>) => ({ folder: (s.folder as string) ?? '' }),
})

type Job = {
  projectId: string; stage: string; progress: number; detail: string;
  log: string[]; running: boolean; cancelRequested: boolean; error?: string;
}

const TABS = ['Overview', 'Script', 'Characters', 'Images', 'Audio', 'Video', 'Files'] as const

function ProjectPage() {
  const { folder } = Route.useSearch()
  const [p, setP] = useState<Project | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const [part, setPart] = useState(1)
  const [busy, setBusy] = useState('')
  const [uploadPath, setUploadPath] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  async function loadProject() {
    const proj = await fetch(`/api/project?folder=${encodeURIComponent(folder)}`).then((r) => r.json())
    setP(proj)
  }

  useEffect(() => { loadProject() /* eslint-disable-line */ }, [folder])

  const projectId = p ? `${p.folder}::${part}` : ''

  useEffect(() => {
    if (!p) return
    let stop = false
    async function poll() {
      while (!stop) {
        try {
          const j = await fetch(`/api/job?id=${encodeURIComponent(projectId)}`).then((r) => r.json())
          setJob(j)
        } catch { /* api down */ }
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
    poll()
    return () => { stop = true }
  }, [projectId])

  useEffect(() => { logRef.current?.scrollTo({ top: 999999 }) }, [job?.log?.length])

  if (!p) return <div className="p-8 text-zinc-500">Loading…</div>

  const running = job?.running === true
  const currentPart = p.parts.find((x) => x.partNumber === part)
  const sections = currentPart?.sections ?? []
  const totalWords = sections.reduce((a, s) => a + s.text.split(/\s+/).length, 0)

  async function start() {
    await fetch('/api/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: p!.folder, part }),
    })
  }
  async function cancel() {
    await fetch('/api/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId }),
    })
  }

  async function saveProject(patch: Partial<Project>) {
    const merged = { ...p!, ...patch }
    setP(merged)
    await fetch('/api/project-save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    })
  }

  async function genImage(prompt: string, outPath: string, ref?: string) {
    setBusy(outPath)
    try {
      await fetch('/api/gen-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, outPath, ref }),
      })
      await loadProject()
    } finally { setBusy('') }
  }

  async function genCharSheet(i: number) {
    const c = p!.characters[i]
    const out = `${p!.folder}\\characters\\${c.name.replace(/\W+/g, '_')}_ref.png`
    await genImage(
      `character reference sheet, ${p!.stylePreset}: ${c.name}, ${c.description}, full body front view plus face close-up, neutral grey background, crisp character design sheet`,
      out,
    )
    const chars = p!.characters.map((x, j) => j === i ? { ...x, refImagePath: out } : x)
    await saveProject({ characters: chars })
  }

  function sectionImages(sid: number) {
    return Array.from({ length: 12 }, (_, r) => `${p!.folder}\\images\\p${part}_s${sid}_${r}_1.png`)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link to="/" className="text-sm text-zinc-500 hover:text-white">← Projects</Link>
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <p className="text-xs text-zinc-500">{p.folder}</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={part} onChange={(e) => setPart(+e.target.value)} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">
            {Array.from({ length: Math.max(1, p.parts.length + 1) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>Part {n}</option>
            ))}
          </select>
          {!running ? (
            <button onClick={start} className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 font-medium text-sm">
              ▶ Generate Part {part}
            </button>
          ) : (
            <button onClick={cancel} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-medium text-sm animate-pulse">
              ■ Stop
            </button>
          )}
        </div>
      </div>

      {job && (running || job.stage === 'error') && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="capitalize font-medium">{job.stage}{running && <span className="text-fuchsia-400"> ●</span>}</span>
            <span className="text-zinc-400">{Math.round((job.progress ?? 0) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${(job.progress ?? 0) * 100}%` }} />
          </div>
          {job.error && <p className="text-red-400 text-sm mt-2">{job.error}</p>}
        </div>
      )}

      <div className="flex gap-1 border-b border-zinc-800 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap ${tab === t ? 'border-b-2 border-fuchsia-500 text-white font-medium' : 'text-zinc-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Sections" value={String(sections.length)} />
            <Stat label="Words" value={String(totalWords)} />
            <Stat label="Status" value={p.status} />
          </div>
          <Field label="Title">
            <input value={p.title} onChange={(e) => setP({ ...p!, title: e.target.value })} onBlur={() => saveProject({ title: p!.title })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </Field>
          <Field label="Story bible (AI uses this for continuity across parts)">
            <textarea value={p.storyBible} onChange={(e) => setP({ ...p!, storyBible: e.target.value })} onBlur={() => saveProject({ storyBible: p!.storyBible })} rows={5} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </Field>
          <Field label="Image style preset (used in every image prompt)">
            <textarea value={p.stylePreset} onChange={(e) => setP({ ...p!, stylePreset: e.target.value })} onBlur={() => saveProject({ stylePreset: p!.stylePreset })} rows={3} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </Field>
          {sections.length > 0 && (
            <button onClick={() => { setPart(p.parts.length + 1); setTab('Overview') }} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">
              + Continue story (Part {p.parts.length + 1}) — AI continues from section {p.lastSectionId}
            </button>
          )}
        </div>
      )}

      {tab === 'Script' && (
        <div className="space-y-3">
          {sections.length === 0 && <p className="text-zinc-500">No script yet — hit Generate.</p>}
          {sections.map((s) => (
            <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-fuchsia-400">section {s.id}</span>
                <span className="text-xs text-zinc-500">{s.text.split(/\s+/).length} words</span>
              </div>
              <textarea
                value={s.text}
                onChange={(e) => {
                  const secs = currentPart!.sections.map((x) => x.id === s.id ? { ...x, text: e.target.value } : x)
                  setP({ ...p!, parts: p!.parts.map((x) => x.partNumber === part ? { ...x, sections: secs } : x) })
                }}
                onBlur={() => saveProject({ parts: p!.parts })}
                rows={5} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              <div className="mt-2">
                <label className="text-xs text-zinc-500">Scene description (image prompt for this section)</label>
                <textarea
                  value={s.sceneDescription ?? ''}
                  onChange={(e) => {
                    const secs = currentPart!.sections.map((x) => x.id === s.id ? { ...x, sceneDescription: e.target.value } : x)
                    setP({ ...p!, parts: p!.parts.map((x) => x.partNumber === part ? { ...x, sections: secs } : x) })
                  }}
                  onBlur={() => saveProject({ parts: p!.parts })}
                  rows={2} placeholder="Visual scene for image generation…" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs" />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Characters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {p.characters.length === 0 && <p className="text-zinc-500 col-span-full">Characters appear after generation, or add your own below.</p>}
          {p.characters.map((c, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              {c.refImagePath && (
                <img src={`/api/file?path=${encodeURIComponent(c.refImagePath)}`} className="w-full rounded-lg mb-3" />
              )}
              <input value={c.name} onChange={(e) => {
                const chars = p!.characters.map((x, j) => j === i ? { ...x, name: e.target.value } : x)
                setP({ ...p!, characters: chars })
              }} onBlur={() => saveProject({ characters: p!.characters })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 font-semibold" />
              <textarea value={c.description} onChange={(e) => {
                const chars = p!.characters.map((x, j) => j === i ? { ...x, description: e.target.value } : x)
                setP({ ...p!, characters: chars })
              }} onBlur={() => saveProject({ characters: p!.characters })} rows={3} className="w-full mt-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              <button
                onClick={() => genCharSheet(i)}
                disabled={busy !== ''}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-sm disabled:opacity-40"
              >
                {busy === `${p!.folder}\\characters\\${c.name.replace(/\W+/g, '_')}_ref.png` ? 'Generating…' : '🎨 Generate reference sheet'}
              </button>
            </div>
          ))}
          <button
            onClick={() => saveProject({ characters: [...p!.characters, { name: 'New character', description: 'describe appearance: age, hair, eyes, build, clothing…' }] })}
            className="rounded-xl border border-dashed border-zinc-700 p-4 text-zinc-500 hover:text-white hover:border-fuchsia-500"
          >+ Add character</button>
        </div>
      )}

      {tab === 'Images' && (
        <div className="space-y-4">
          {sections.length === 0 && <p className="text-zinc-500">No sections yet.</p>}
          {sections.map((s) => (
            <div key={s.id}>
              <div className="text-xs text-fuchsia-400 mb-1 font-mono">section {s.id}</div>
              <div className="grid grid-cols-4 gap-2">
                {sectionImages(s.id).map((path) => (
                  <div key={path} className="relative group">
                    <img
                      src={`/api/file?path=${encodeURIComponent(path)}`}
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                      onLoad={(e) => { (e.target as HTMLImageElement).style.visibility = 'visible' }}
                      className="w-full aspect-video object-cover rounded-lg border border-zinc-800"
                    />
                    <button
                      onClick={() => genImage(`${s.sceneDescription ?? 'dramatic story scene'}. ${p!.stylePreset}`, path, p!.characters.length > 1 ? `${p!.folder}\\characters\\cast_ref.png` : p!.characters[0]?.refImagePath)}
                      disabled={busy !== ''}
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-xs text-white rounded-lg flex items-center justify-center disabled:opacity-60"
                    >
                      {busy === path ? 'Generating…' : '↻ Regenerate'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Audio' && (
        <div className="space-y-2">
          {sections.map((s) => {
            const mp3 = `${p!.folder}\\audio\\p${part}_s${s.id}.mp3`
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                <span className="text-xs font-mono text-fuchsia-400 w-16">s{s.id}</span>
                <audio controls src={`/api/file?path=${encodeURIComponent(mp3)}`} className="flex-1 h-8" />
              </div>
            )
          })}
        </div>
      )}

      {tab === 'Video' && (
        <div className="space-y-4">
          {p.parts.filter((x) => x.finalVideo).map((x) => (
            <div key={x.partNumber}>
              <h3 className="font-semibold mb-2">Part {x.partNumber} final</h3>
              <video controls src={`/api/file?path=${encodeURIComponent(x.finalVideo!)}`} className="w-full rounded-xl border border-zinc-800" />
            </div>
          ))}
          {!p.parts.some((x) => x.finalVideo) && <p className="text-zinc-500">Final video appears here after generation completes.</p>}
        </div>
      )}

      {tab === 'Files' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="font-semibold mb-1">Continue from an existing video</h3>
            <p className="text-xs text-zinc-500 mb-2">Point at a processed video file; the next Generate will continue the story from where it ends (transcription-based, coming soon).</p>
            <div className="flex gap-2">
              <input value={uploadPath} onChange={(e) => setUploadPath(e.target.value)} placeholder="D:\\path\\to\\video.mp4" className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              <button onClick={() => saveProject({ continuationFrom: { videoFile: uploadPath, note: 'continue from where this video ends' } })} disabled={!uploadPath} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40">Attach</button>
            </div>
            {p.continuationFrom && <p className="text-xs text-emerald-400 mt-2">✓ Attached: {p.continuationFrom.videoFile}</p>}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="font-semibold mb-2">Generation log (last run)</h3>
            <div ref={logRef} className="h-48 overflow-auto font-mono text-xs text-zinc-400 bg-black/40 rounded-lg p-2">
              {job?.log?.length ? job.log.map((l, i) => <div key={i} className={l.includes('ERROR') ? 'text-red-400' : ''}>{l}</div>) : <div className="text-zinc-600">No runs yet.</div>}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-xs text-zinc-400 space-y-1">
            <div>script: {p.folder}\\project.json</div>
            <div>images: {p.folder}\\images</div>
            <div>audio: {p.folder}\\audio</div>
            <div>segments: {p.folder}\\segments</div>
            <div>final: {p.folder}\\part{part}.mp4</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-bold capitalize">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
