import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

const rootEl = document.getElementById('root')
if (rootEl) {
  import('react-dom/client').then(({ createRoot }) => {
    const existing = (rootEl as any).__reactRoot
    if (existing) {
      existing.render(
        <StrictMode>
          <RouterProvider router={router} />
        </StrictMode>,
      )
      return
    }
    const root = createRoot(rootEl)
    ;(rootEl as any).__reactRoot = root
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  })
}

if (import.meta.hot) import.meta.hot.accept()
