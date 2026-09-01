import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

const rootEl = document.getElementById('root')
const alreadyMounted = !!(rootEl as any)?.__reactFiber$ || !!(rootEl as any)?.__reactInternalInstance
if (rootEl && !alreadyMounted) {
  import('react-dom/client').then(({ createRoot }) => {
    createRoot(rootEl).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  }).catch(() => {})
}

if (import.meta.hot) import.meta.hot.accept()
