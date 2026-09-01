import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

const rootEl = document.getElementById('root')
if (rootEl) {
  import('react-dom').then(({ render }) => {
    render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
      rootEl,
    )
  }).catch(() => {})
}

if (import.meta.hot) import.meta.hot.accept()
