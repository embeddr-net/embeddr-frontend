import React, { useEffect, useState } from 'react'
import { GenerationProvider } from '@/context/GenerationContext'
import { ZenInterface } from '@/components/create/ZenInterface'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Spinner } from '@embeddr/react-ui/components/ui'

const ZenPage = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // We manage the sidebar states here to satisfy the ZenInterface props,
  // though we are effectively running in "Zen Only" mode for now.
  const [leftSidebarOpen, setLeftSidebarOpen] = useLocalStorage(
    'create-left-sidebar',
    false,
  )
  const [rightSidebarOpen, setRightSidebarOpen] = useLocalStorage(
    'create-right-sidebar',
    false,
  )

  if (!ready) {
    return (
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
  }

  return (
    <GenerationProvider>
      <div className="w-full h-full relative overflow-hidden">
        <ZenInterface
          leftSidebarOpen={leftSidebarOpen}
          setLeftSidebarOpen={setLeftSidebarOpen}
          rightSidebarOpen={rightSidebarOpen}
          setRightSidebarOpen={setRightSidebarOpen}
        />
      </div>
    </GenerationProvider>
  )
}

export default ZenPage
