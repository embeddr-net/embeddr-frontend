import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Check,
  FileJson,
  List,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Play,
} from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { QueueItem } from './GenerationQueue'
import { ZenInterface } from './ZenInterface'
import { useGeneration } from '@/context/GenerationContext'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import { BACKEND_URL } from '@/lib/api/config'
import { cn } from '@/lib/utils'

interface FloatingToolbarProps {
  leftSidebarOpen: boolean
  setLeftSidebarOpen: (open: boolean) => void
  rightSidebarOpen: boolean
  setRightSidebarOpen: (open: boolean) => void
}

export function FloatingToolbar({
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
}: FloatingToolbarProps) {
  const {
    generate,
    isGenerating,
    selectedWorkflow,
    setWorkflowInput,
    generations,
    selectGeneration,
    selectedGeneration,
    workflows,
    selectWorkflow,
  } = useGeneration()
  const [imageSelectorOpen, setImageSelectorOpen] = React.useState(false)
  const [queueOpen, setQueueOpen] = React.useState(false)
  const [workflowOpen, setWorkflowOpen] = React.useState(false)
  const [activeImageInput, setActiveImageInput] = React.useState<{
    nodeId: string
    field: string
  } | null>(null)

  const isZenMode = !leftSidebarOpen && !rightSidebarOpen

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isZenMode) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (selectedWorkflow) {
          generate()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [generate, selectedWorkflow])

  const toggleZenMode = () => {
    // Assume leftsidebar is zen
    const isZen = leftSidebarOpen
    setLeftSidebarOpen(isZen ? false : true)
    setRightSidebarOpen(isZen ? false : true)
  }

  if (isZenMode) {
    return (
      <ZenInterface
        leftSidebarOpen={leftSidebarOpen}
        setLeftSidebarOpen={setLeftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
      />
    )
  }

  const pendingGenerations = generations.filter(
    (g) => g.status === 'pending' || g.status === 'processing',
  )

  const handleImageSelect = (image: any) => {
    if (activeImageInput) {
      if (activeImageInput.field === 'image_id') {
        setWorkflowInput(
          activeImageInput.nodeId,
          activeImageInput.field,
          image.id,
        )
      } else {
        setWorkflowInput(
          activeImageInput.nodeId,
          activeImageInput.field,
          `${BACKEND_URL}/images/${image.id}/file`,
        )
      }
      // Also set preview if needed
      setWorkflowInput(
        activeImageInput.nodeId,
        '_preview',
        `${BACKEND_URL}/images/${image.id}/file`,
      )
    }
    setImageSelectorOpen(false)
    setActiveImageInput(null)
  }

  return (
    <>
      <div
        className={cn(
          'absolute bottom-2 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 transition-all duration-300',
        )}
      >
        {/* Main Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-background/80 backdrop-blur-md border shadow-lg  hover:bg-background/95">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setWorkflowOpen(!workflowOpen)
                setQueueOpen(false)
              }}
            >
              <FileJson className="h-5 w-5" />
            </Button>

            {workflowOpen && (
              <div className="absolute bottom-full mb-4 w-64 bg-background/80 backdrop-blur-md border shadow-lg  overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
                  Workflows
                </div>
                <ScrollArea className="h-[300px]" variant="left-border">
                  <div className="p-1 space-y-1">
                    {workflows.map((w) => (
                      <Button
                        key={w.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'w-full justify-start text-xs font-normal',
                          selectedWorkflow?.id === w.id &&
                            'bg-muted font-medium',
                        )}
                        onClick={() => {
                          selectWorkflow(w)
                          setWorkflowOpen(false)
                        }}
                      >
                        <span className="truncate">{w.name}</span>
                        {selectedWorkflow?.id === w.id && (
                          <Check className="ml-auto h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleZenMode()}
          >
            {leftSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button
            size="sm"
            className={cn(
              ' px-6 transition-all duration-300 ',
              isGenerating
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-primary hover:bg-primary/90',
            )}
            onClick={() => generate()}
            disabled={!selectedWorkflow}
          >
            {isGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Play className="h-5 w-5 mr-2 fill-current" />
            )}
            {isGenerating ? 'Queue' : 'Generate'}
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              onClick={() => {
                setQueueOpen(!queueOpen)
                setWorkflowOpen(false)
              }}
            >
              <List className="h-5 w-5" />
              {pendingGenerations.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4  bg-primary text-[10px] flex items-center justify-center text-primary-foreground">
                  {pendingGenerations.length}
                </span>
              )}
            </Button>

            {queueOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-background/80 backdrop-blur-md border shadow-lg  overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground flex justify-between items-center">
                  <span>History</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 ">
                    {generations.length}
                  </span>
                </div>
                <ScrollArea className="h-[300px]" variant="left-border">
                  <div className="p-2 space-y-1">
                    {generations.map((gen) => (
                      <QueueItem
                        key={gen.id}
                        generation={gen}
                        isSelected={selectedGeneration?.id === gen.id}
                        onSelect={() => selectGeneration(gen)}
                        onOpenImage={() => {}}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          >
            {rightSidebarOpen ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <ImageSelectorDialog
        open={imageSelectorOpen}
        onOpenChange={setImageSelectorOpen}
        onSelect={handleImageSelect}
      />
    </>
  )
}
