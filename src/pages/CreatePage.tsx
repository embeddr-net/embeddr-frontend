import React, { useEffect } from 'react'
import { toast } from 'sonner'
import { GenerationSettings } from '@/components/create/GenerationSettings'
import { ImagePreview } from '@/components/create/ImagePreview'
import { GenerationQueue } from '@/components/create/GenerationQueue'
import { GenerationProvider } from '@/context/GenerationContext'
import { FloatingToolbar } from '@/components/create/FloatingToolbar'
import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useGlobalStore } from '@/store/globalStore'
import { useGenerationStore } from '@/store/generationStore'

const CreatePageContent = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useLocalStorage(
    'create-left-sidebar',
    true,
  )
  const [rightSidebarOpen, setRightSidebarOpen] = useLocalStorage(
    'create-right-sidebar',
    true,
  )

  const { selectedImage, selectImage } = useGlobalStore()
  const { selectedWorkflow } = useGenerationStore()

  // Removed the useEffect that was auto-clearing the selected image
  // This allows the GenerationSettings component to render the "Selected Image" UI

  return (
    <div className="relative w-full h-full overflow-hidden flex p-1">
      {/* Left Sidebar - Controls */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          leftSidebarOpen
            ? 'w-80 opacity-100 translate-x-0 mr-1'
            : 'w-0 opacity-0 -translate-x-4 mr-0',
        )}
      >
        <div className="w-80 h-full">
          <GenerationSettings />
        </div>
      </div>

      {/* Middle - Preview */}
      <div className="flex-1 relative min-w-0 overflow-hidden border bg-background/50">
        <ImagePreview>
          {/* Floating Toolbar */}
          <FloatingToolbar
            leftSidebarOpen={leftSidebarOpen}
            setLeftSidebarOpen={setLeftSidebarOpen}
            rightSidebarOpen={rightSidebarOpen}
            setRightSidebarOpen={setRightSidebarOpen}
          />
        </ImagePreview>
      </div>

      {/* Right Sidebar - Queue/History */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          rightSidebarOpen
            ? 'w-40 opacity-100 translate-x-0 ml-1'
            : 'w-0 opacity-0 translate-x-4 ml-0',
        )}
      >
        <div className="w-40 h-full">
          <GenerationQueue />
        </div>
      </div>
    </div>
  )
}

const CreatePage = () => {
  return (
    <GenerationProvider>
      <CreatePageContent />
    </GenerationProvider>
  )
}

export default CreatePage
