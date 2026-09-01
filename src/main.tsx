import { StrictMode } from 'react'
import { createRouter } from '@tanstack/react-router'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

console.log('[manga-recap] main.tsx executing, render path')

const rootEl = document.getElementById('root')
if (rootEl) {
  import('react-dom').then(({ render }) => {
    console.log('[manga-recap] rendering via react-dom.render')
    render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
      rootEl,
    )
  }).catch((e) => {
    console.log('[manga-recap] react-dom import failed', e)
  })
}

if (import.meta.hot) import.meta.hot.accept()
