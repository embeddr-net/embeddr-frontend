import React, { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Spinner } from '@embeddr/react-ui/components/ui'

const ZenPage = React.lazy(() => import('@/pages/ZenPage'))

const ZenRouteLoader = () => (
  <div className="fixed inset-0 z-[65] bg-background/70 backdrop-blur-sm">
    <div
      className="absolute inset-0 flex items-center justify-center p-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
        <Spinner className="size-5" />
        <div className="text-sm">Loading Zen workspace…</div>
      </div>
    </div>
  </div>
)

export const Route = createFileRoute('/')({
  component: () => (
    <Suspense fallback={<ZenRouteLoader />}>
      <ZenPage />
    </Suspense>
  ),
})
