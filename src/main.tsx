import React, { StrictMode } from 'react'
import ReactDOMClient from 'react-dom/client'
import ReactDOM from 'react-dom'
import * as EmbeddrUI from '@embeddr/react-ui'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'

// Expose React and ReactDOM for external plugins
;

(window as any).React = React
;(window as any).ReactDOM = ReactDOM
;(window as any).EmbeddrUI = EmbeddrUI

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
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

// import reportWebVitals from './lib/reportWebVitals.ts'
// reportWebVitals()
