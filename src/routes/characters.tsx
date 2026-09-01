import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/characters')({ component: CharactersPage })

function CharactersPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Characters</h1>
      <p className="text-sm text-zinc-400">Global characters, variants, references, and project links.</p>
      <div className="text-zinc-500 text-sm">Character library UI will be expanded in the next pass.</div>
    </div>
  )
}
