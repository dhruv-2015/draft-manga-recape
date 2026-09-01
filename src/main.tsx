import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

const rootEl = document.getElementById('root')
if (rootEl && !(window as any).__mangaReactRoot) {
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(rootEl)
    ;(window as any).__mangaReactRoot = root
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  })
}

if (import.meta.hot) import.meta.hot.accept()
