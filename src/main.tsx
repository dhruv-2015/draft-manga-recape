import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

let mounted = false
const rootEl = document.getElementById('root')
if (rootEl && !mounted) {
  mounted = true
  import('react-dom/client').then(({ createRoot }) => {
    createRoot(rootEl).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  })
}

if (import.meta.hot) import.meta.hot.accept()
