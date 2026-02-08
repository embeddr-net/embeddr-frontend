import React, { StrictMode } from 'react'
import ReactDOMClient from 'react-dom/client'
import ReactDOM from 'react-dom'
import * as EmbeddrUI from '@embeddr/react-ui'
import * as Lucide from 'lucide-react'
import * as ReactQuery from '@tanstack/react-query'
import * as Recharts from 'recharts'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { globalEventBus } from './lib/eventBus'
import { embeddrApi } from './lib/api/client'
import { useUserStore } from './store/userStore'
import { GlobalEffectsLayer } from './components/effects/GlobalEffectsLayer'

import './styles.css'

// Expose React and ReactDOM for external plugins
;(window as any).React = React
;(window as any).ReactDOM = ReactDOM
;(window as any).EmbeddrUI = EmbeddrUI
;(window as any).Lucide = Lucide
;(window as any).ReactQuery = ReactQuery
;(window as any).Recharts = Recharts
;(window as any).Embeddr = {
  eventBus: globalEventBus,
}

const bootstrapAuthCookie = async () => {
  const apiKey = useUserStore.getState().apiKey
  if (!apiKey) return
  try {
    await embeddrApi.auth.setSession({ apiKey })
  } catch (error) {
    console.warn('Failed to bootstrap auth cookie', error)
  }
}

bootstrapAuthCookie()

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOMClient.createRoot(rootElement)
  root.render(
    <StrictMode>
      <GlobalEffectsLayer />
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

// import reportWebVitals from './lib/reportWebVitals.ts'
// reportWebVitals()
