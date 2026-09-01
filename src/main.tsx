import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

declare global {
  interface Window {
    __mangaReactRoot?: ReturnType<typeof import('react-dom/client').createRoot>
  }
}

const rootEl = document.getElementById('root')
if (rootEl && !rootEl.hasAttribute('data-manga-root')) {
  rootEl.setAttribute('data-manga-root', 'true')
  import('react-dom/client').then(({ createRoot }) => {
    const root = window.__mangaReactRoot || createRoot(rootEl)
    window.__mangaReactRoot = root
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  }).catch(() => {})
}

if (import.meta.hot) import.meta.hot.accept()
