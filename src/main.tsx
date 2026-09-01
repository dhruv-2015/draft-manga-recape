import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

declare global {
  interface Window {
    __mangaRootMounted?: boolean
  }
}

if (!window.__mangaRootMounted) {
  window.__mangaRootMounted = true
  import('react-dom/client').then(({ createRoot }) => {
    const rootEl = document.getElementById('root')
    if (!rootEl) return
    createRoot(rootEl).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  }).catch(() => {})
}

if (import.meta.hot) import.meta.hot.accept()
