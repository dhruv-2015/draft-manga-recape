import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

const rootEl = document.getElementById('root')
if (rootEl && !(rootEl as any).__mounted) {
  ;(rootEl as any).__mounted = true
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(rootEl)
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  })
}

if (import.meta.hot) import.meta.hot.accept()
