import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { Project } from '~/lib/projects'

export const Route = createFileRoute('/')({
  component: Home,
})

type FolderInfo = { path: string; parent: string | null; dirs: string[] }

function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [cfg, setCfg] = useState<any>(null)
  const [showNew, setShowNew] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null)
  const [pathInput, setPathInput] = useState('')
  const [chosenFolder, setChosenFolder] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [storyBible, setStoryBible] = useState('')

  async function refresh() {
    const [p, c] = await Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/config').then((r) => r.json()),
    ])
    setProjects(p)
    setCfg(c)
  }

  useEffect(() => { refresh() }, [])

  async function openBrowser(start?: string) {
    const info = await fetch(`/api/folders?path=${encodeURIComponent(start ?? '')}`).then((r) => r.json())
    setFolderInfo(info)
    setPathInput(info.path)
    setShowBrowser(true)
  }

  async function navigate(p: string) {
    const info = await fetch(`/api/folders?path=${encodeURIComponent(p)}`).then((r) => r.json())
    setFolderInfo(info)
    setPathInput(info.path)
  }

  async function create() {
    if (!title.trim()) return
    const p = await fetch('/api/project-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, folder: chosenFolder ?? undefined, storyBible }),
    }).then((r) => r.json())
    setShowNew(false)
    setShowBrowser(false)
    setTitle('')
    setStoryBible('')
    setChosenFolder(null)
    refresh()
  }

  async function remove(folder: string) {
    if (!confirm('Delete this project and all its files?')) return
    await fetch('/api/project-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    })
    refresh()
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-zinc-400">Root: {cfg?.projectsRoot}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openBrowser()} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">
            Change root folder
          </button>
          <button onClick={() => { setShowNew(true); setChosenFolder(null) }} className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 font-medium">
            + New Video
          </button>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="text-center py-24 text-zinc-500">
          <div className="text-5xl mb-4">🎬</div>
          <p>No projects yet. Create your first AI video.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.folder} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col">
            <div className="font-semibold mb-1 line-clamp-2">{p.title}</div>
            <div className="text-xs text-zinc-500 mb-3">
              {new Date(p.createdAt).toLocaleDateString()} · {p.parts.reduce((a, x) => a + x.sections.length, 0)} sections
              {p.parts.some((x) => x.finalVideo) && ' · ✅ video ready'}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full w-fit mb-3 ${
              p.status === 'done' ? 'bg-emerald-900 text-emerald-300'
              : p.status === 'generating' ? 'bg-amber-900 text-amber-300'
              : p.status === 'error' ? 'bg-red-900 text-red-300'
              : 'bg-zinc-800 text-zinc-400'
            }`}>{p.status}</span>
            <div className="mt-auto flex gap-2">
              <Link to="/project" search={{ folder: p.folder }} className="flex-1 text-center px-3 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-sm font-medium">
                Open
              </Link>
              <button onClick={() => remove(p.folder)} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-red-900 text-sm">
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-xl font-bold">New Video Project</h2>
            <div>
              <label className="text-sm text-zinc-400">Working title (AI may rename it)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Everyone Awakens a Gift at 18…" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-fuchsia-500 outline-none" />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Story bible / premise (optional — AI invents one if empty)</label>
              <textarea value={storyBible} onChange={(e) => setStoryBible(e.target.value)} rows={3} placeholder="Any premise, characters or rules you already have…" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-fuchsia-500 outline-none" />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Project folder</label>
              <div className="flex gap-2 mt-1">
                <input readOnly value={chosenFolder ?? '(default: Videos/Manga Recap Studio/<title>)'} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300" />
                <button onClick={() => openBrowser(chosenFolder ?? cfg?.projectsRoot)} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">Browse</button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg bg-zinc-800">Cancel</button>
              <button onClick={create} disabled={!title.trim()} className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 font-medium">Create</button>
            </div>
          </div>
        </div>
      )}

      {showBrowser && folderInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-xl space-y-3">
            <h2 className="text-lg font-bold">Choose folder</h2>
            <div className="flex gap-2">
              <input value={pathInput} onChange={(e) => setPathInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && navigate(pathInput)} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
              <button onClick={() => navigate(pathInput)} className="px-3 py-2 rounded-lg bg-zinc-800 text-sm">Go</button>
            </div>
            <div className="h-72 overflow-auto rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {folderInfo.parent && (
                <button onClick={() => navigate(folderInfo.parent!)} className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-zinc-400">↰ ..</button>
              )}
              {folderInfo.dirs?.map((d) => (
                <button key={d} onClick={() => navigate(d)} className="w-full text-left px-3 py-2 hover:bg-zinc-800">📁 {d.split(/[\\/]/).pop()}</button>
              ))}
              {folderInfo.dirs?.length === 0 && <div className="px-3 py-4 text-zinc-500 text-sm">No subfolders</div>}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBrowser(false)} className="px-4 py-2 rounded-lg bg-zinc-800">Cancel</button>
              <button
                onClick={() => {
                  if (showNew) { setChosenFolder(folderInfo.path); setShowBrowser(false) }
                  else {
                    fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectsRoot: folderInfo.path }) }).then(() => { setShowBrowser(false); refresh() })
                  }
                }}
                className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 font-medium"
              >Select this folder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
