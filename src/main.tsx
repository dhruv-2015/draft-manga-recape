import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

const origError = console.error
console.error = (...args: any[]) => {
  const msg = args.join(' ')
  if (typeof msg === 'string' && msg.includes('createRoot()')) {
    console.log('[manga-recap] caught createRoot warning stack:', new Error().stack)
  }
  origError.apply(console, args)
}

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
