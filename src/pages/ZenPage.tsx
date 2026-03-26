import React from 'react'
import { GenerationProvider } from '@/context/GenerationContext'
import { ZenInterface } from '@/components/create/ZenInterface'
import { useLocalStorage } from '@/hooks/useLocalStorage'

const ZenPage = () => {
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
