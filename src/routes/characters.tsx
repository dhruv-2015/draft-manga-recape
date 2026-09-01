import { createFileRoute } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/characters')({ component: CharactersPage })

function CharactersPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Character Library</h1>
      <p className="text-sm text-zinc-400 mb-6">Global characters are created once and reused across projects.</p>
      <div className="text-zinc-500 text-sm">Characters are managed inside each project for now. Global character library coming in a later phase.</div>
    </div>
  )
}
