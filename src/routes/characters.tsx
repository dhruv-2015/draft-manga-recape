import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/characters')({ component: CharactersPage })

function CharactersPage() {
  const [characters, setCharacters] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [refImage, setRefImage] = useState('')

  useEffect(() => {
    fetch('/api/characters').then((r) => r.json()).then(setCharacters)
  }, [])

  async function addCharacter() {
    if (!name.trim()) return
    await fetch('/api/characters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), description: description.trim(), refImagePath: refImage.trim() }) })
    setName(''); setDescription(''); setRefImage('')
    const list = await fetch('/api/characters').then((r) => r.json())
    setCharacters(list)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Character Library</h1>
      <div className="grid grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
        <input value={refImage} onChange={(e) => setRefImage(e.target.value)} placeholder="Reference image path (optional)" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm col-span-2" />
        <button onClick={addCharacter} className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-sm font-medium">Add character</button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {characters.map((c) => (
          <div key={c._id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-2">
            <div className="font-medium">{c.name}</div>
            <p className="text-xs text-zinc-400">{c.description}</p>
            {c.refImagePath && <p className="text-[10px] text-zinc-500">Ref: {c.refImagePath}</p>}
          </div>
        ))}
      </div>
      <Link to="/project" className="text-sm text-fuchsia-400 hover:text-fuchsia-300">← Back to projects</Link>
    </div>
  )
}
