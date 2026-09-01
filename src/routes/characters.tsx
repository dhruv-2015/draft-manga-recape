import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/characters')({
  component: CharactersPage,
  validateSearch: (s: Record<string, unknown>) => ({ projectId: (s.projectId as string) ?? '' }),
})

function CharactersPage() {
  const { projectId } = Route.useSearch()
  const [characters, setCharacters] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [refImage, setRefImage] = useState('')
  const [variants, setVariants] = useState<Record<string, any[]>>({})

  useEffect(() => {
    fetch('/api/characters').then((r) => r.json()).then(setCharacters)
  }, [])

  async function addCharacter() {
    if (!name.trim()) return
    const c = await fetch('/api/characters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), description: description.trim(), refImagePath: refImage.trim() }) }).then((r) => r.json())
    setName(''); setDescription(''); setRefImage('')
    setCharacters((prev) => [...prev, c])
  }

  async function addVariant(characterId: string) {
    const vname = prompt('Variant name?')
    if (!vname) return
    const v = await fetch('/api/character-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId, name: vname, description: '' }) }).then((r) => r.json())
    setVariants((prev) => ({ ...prev, [characterId]: [...(prev[characterId] ?? []), v] }))
  }

  async function linkToProject(characterId: string) {
    if (!projectId) { alert('Open this from a project to link characters.'); return }
    await fetch('/api/project-characters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, characterId }) })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Character Library</h1>
      {projectId && <p className="text-xs text-zinc-500">Linking to project: {projectId}</p>}
      <div className="grid grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
        <input value={refImage} onChange={(e) => setRefImage(e.target.value)} placeholder="Reference image path (optional)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm col-span-2" />
        <button onClick={addCharacter} className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-sm font-medium">Add character</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((c) => (
          <div key={c._id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
            <div className="font-medium">{c.name}</div>
            <p className="text-xs text-zinc-400">{c.description}</p>
            {c.refImagePath && <p className="text-[10px] text-zinc-500">Ref: {c.refImagePath}</p>}
            <div className="flex gap-2">
              <button onClick={() => addVariant(c._id)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">+ Variant</button>
              {projectId && <button onClick={() => linkToProject(c._id)} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">Link to project</button>}
            </div>
            {(variants[c._id] ?? []).length > 0 && (
              <div className="text-xs text-zinc-400 space-y-1">
                {(variants[c._id] ?? []).map((v) => (
                  <div key={v._id} className="flex items-center justify-between">
                    <span>{v.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <Link to="/project" className="text-sm text-fuchsia-400 hover:text-fuchsia-300">← Back to projects</Link>
    </div>
  )
}
