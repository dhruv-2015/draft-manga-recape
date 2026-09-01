import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getDoc, listDocs } from '~/lib/docs'

export const Route = createFileRoute('/docs')({
  component: DocsPage,
  validateSearch: (s: Record<string, unknown>) => ({ page: (s.page as string) ?? 'index' }),
})

function DocsPage() {
  const { page } = Route.useSearch()
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [pages, setPages] = useState<string[]>([])

  useEffect(() => {
    setPages(listDocs())
    const doc = getDoc(page)
    if (doc) {
      const first = doc.split('\n').find((l) => l.startsWith('# '))
      setTitle(first?.slice(2) ?? page)
      setContent(doc)
    } else {
      setContent('# Not found\n\nThe requested doc page does not exist.')
      setTitle('Not found')
    }
  }, [page])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Documentation</h1>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {pages.map((p) => (
          <Link key={p} to="/docs" search={{ page: p }} className={`px-3 py-1.5 rounded-lg text-sm ${page === p ? 'bg-fuchsia-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
            {p}
          </Link>
        ))}
      </div>
      <div className="prose prose-invert max-w-none rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono leading-relaxed">{content}</pre>
      </div>
    </div>
  )
}
