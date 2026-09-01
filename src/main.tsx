import { StrictMode } from 'react'
import { createRouter } from './router.tsx'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

router.mount()
