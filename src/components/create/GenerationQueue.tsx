import { Card } from '@embeddr/react-ui/components/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  History,
  List,
  Loader2,
  Terminal,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@embeddr/react-ui/components/tooltip'
import type { Generation } from '@/lib/api/types'
import { useGeneration } from '@/context/GenerationContext'
import { useGlobalStore } from '@/store/globalStore'
import { ImageDetailDialog } from '@/components/dialogs/ImageDetailDialog'
import { cn } from '@/lib/utils'

import { useLocalStorage } from '@/hooks/useLocalStorage'
import { BACKEND_URL } from '@/lib/api/config'

export function QueueItem({
  generation,
  isSelected,
  onSelect,
}: {
  generation: Generation
  isSelected: boolean
  onSelect: () => void
  onOpenImage: (id: string) => void
}) {
  const { selectImage } = useGlobalStore()

  // Extract inputs
  const inputValues = Object.values(generation.inputs || {})

  // Helper to get image URL from input value
  const getImageUrl = (val: any): string | null => {
    if (!val) return null
    if (typeof val === 'string') {
      if (val.startsWith('http') || val.startsWith('data:')) return val
      // Check for internal image path
      const match = val.match(/\/images\/(\d+)\/file/)
      if (match) return val
      return null
    }
    if (val._preview) return val._preview
    if (val.image_url) return val.image_url
    if (val.url) return val.url
    return null
  }

  const imageInputs = inputValues.map(getImageUrl).filter(Boolean) as Array<string>

  // Text Inputs
  const textInputs = inputValues
    .filter((val: any) => {
      if (val?.prompt && typeof val.prompt === 'string') return true
      return false
    })
    .map((val: any) => val.prompt)

  return (
    <div
      className={cn(
        'group flex flex-col gap-2 p-3 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all cursor-pointer select-none relative ',
        isSelected && 'bg-muted/50 border-primary/40',
      )}
      onClick={() => {
        console.log('[QueueItem] Clicked item:', generation.id)
        onSelect()
      }}
    >
      <div className="flex items-start gap-3">
        {/* Main Result Image */}
        <div className="h-16 w-16 shrink-0 border border-border bg-background/50 flex items-center justify-center overflow-hidden relative  hover:ring-1 ring-primary transition-all">
          {generation.status === 'completed' &&
          generation.images &&
          generation.images.length > 0 ? (
            <div
              className=" w-full h-full overflow-hidden cursor-pointer hover:ring-1 ring-primary transition-all"
              onClick={(e) => {
                e.stopPropagation()
                const imgUrl = generation.images![0]
                const match = imgUrl.match(/\/images\/(\d+)\/file/)
                if (match) {
                  selectImage({
                    id: parseInt(match[1]),
                    image_url: imgUrl,
                    url: imgUrl,
                    width: 0,
                    height: 0,
                    prompt: '',
                    created_at: new Date().toISOString(),
                  } as any)
                } else {
                  window.open(imgUrl, '_blank')
                }
              }}
            >
              <img
                src={generation.images[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : generation.status === 'failed' ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : generation.status === 'processing' ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Clock className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div
            className="text-xs font-medium truncate"
            title={generation.prompt}
          >
            {generation.prompt || 'Generation'}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
            <span
              className={cn(
                'capitalize',
                generation.status === 'completed'
                  ? 'text-green-500'
                  : generation.status === 'failed'
                    ? 'text-destructive'
                    : 'text-primary',
              )}
            >
              {generation.status}
            </span>
            <span>•</span>
            <span>{new Date(generation.created_at).toLocaleTimeString()}</span>
          </div>

          {/* Inputs Row */}
          {imageInputs.length > 0 && (
            <div className="flex items-center gap-1 mt-1 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[10px] text-muted-foreground mr-1 shrink-0">
                In:
              </span>
              {imageInputs.slice(0, 5).map((url, idx) => (
                <div
                  key={idx}
                  className="h-8 w-8 shrink-0  overflow-hidden border border-border/50 cursor-pointer hover:ring-1 ring-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Try to extract ID
                    const match = url.match(/\/images\/(\d+)\/file/)
                    if (match) {
                      selectImage({
                        id: parseInt(match[1]),
                        image_url: url,
                        url: url,
                        width: 0,
                        height: 0,
                        prompt: '',
                        created_at: new Date().toISOString(),
                      } as any)
                    } else {
                      window.open(url, '_blank')
                    }
                  }}
                >
                  <img src={url} className="h-full w-full object-cover" />
                </div>
              ))}
              {imageInputs.length > 5 && (
                <div className="h-8 w-8 shrink-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground ">
                  +{imageInputs.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1  transition-colors',
          generation.status === 'completed'
            ? 'bg-green-500/50 group-hover:bg-green-500'
            : generation.status === 'failed'
              ? 'bg-destructive/50 group-hover:bg-destructive'
              : 'bg-primary/50 group-hover:bg-primary',
        )}
      />
    </div>
  )
}

export function GenerationQueue() {
  const {
    generations,
    selectGeneration,
    selectedGeneration,
    loadMoreHistory,
    hasMoreHistory,
    isLoadingHistory,
  } = useGeneration()
  const { selectImage } = useGlobalStore()
  const [detailImageId, setDetailImageId] = useState<string | null>(null)
  const [activeRightTab, setActiveRightTab] = useLocalStorage(
    'create-queue-tab',
    'history',
  )
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const pendingGenerations = generations.filter(
    (g) =>
      g.status === 'pending' ||
      g.status === 'queued' ||
      g.status === 'processing',
  )
  const completedGenerations = generations.filter(
    (g) => g.status === 'completed' || g.status === 'failed',
  )

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreHistory && !isLoadingHistory) {
          loadMoreHistory()
        }
      },
      { threshold: 0.2, rootMargin: '400px' },
    )

    observerRef.current = observer

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [hasMoreHistory, isLoadingHistory, loadMoreHistory])

  // Re-observe if sentinel ref changes (e.g. tab switch)
  useEffect(() => {
    if (sentinelRef.current && observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current.observe(sentinelRef.current)
    }
  }, [activeRightTab])

  return (
    <div className="col-span-1 flex flex-col overflow-visible h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 gap-1">
      <Card className="flex-1 p-0! gap-0! flex flex-col overflow-visible min-h-0 border-none bg-transparent">
        <Tabs
          value={activeRightTab}
          onValueChange={setActiveRightTab}
          className="h-full flex flex-col w-full! min-h-0 gap-1! space-y-0!"
        >
          <TabsContent
            value="queue"
            className="flex-1 m-0 overflow-hidden flex flex-col bg-card/50 border border-foreground/10 "
          >
            {pendingGenerations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs py-8 gap-2 opacity-50">
                <List className="h-8 w-8" />
                <span>Queue is empty</span>
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                <ScrollArea
                  className="h-full"
                  variant="left-border"
                  type="always"
                >
                  <div className="p-2 space-y-1 pr-4">
                    {pendingGenerations.map((gen) => (
                      <QueueItem
                        key={gen.id}
                        generation={gen}
                        isSelected={selectedGeneration?.id === gen.id}
                        onSelect={() => selectGeneration(gen)}
                        onOpenImage={setDetailImageId}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="history"
            className="flex-1 m-0 overflow-hidden flex flex-col bg-card/50 border border-foreground/10 "
          >
            {completedGenerations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs py-8 gap-2 opacity-50">
                <History className="h-8 w-8" />
                <span>No history yet</span>
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                <ScrollArea
                  className="h-full"
                  variant="left-border"
                  type="always"
                >
                  <div className="p-2 space-y-1 pr-4">
                    {completedGenerations.map((gen) => (
                      <QueueItem
                        key={gen.id}
                        generation={gen}
                        isSelected={selectedGeneration?.id === gen.id}
                        onSelect={() => {
                          console.log(
                            '[GenerationQueue] Selecting generation:',
                            gen.id,
                          )
                          selectGeneration(gen)
                          // If we select a generation, we want to see it, so clear any global selection
                          // But wait, the user said "clicking on the history card doesnt set both comparison images properly"
                          // This implies they want to see the generation's comparison if available.
                          // ImagePreview handles this via `selectedGeneration` and `hasParent`.
                          // But if `selectedImage` is set, it overrides.
                          // So we MUST clear `selectedImage` here to show the generation.
                          selectImage(null)
                        }}
                        onOpenImage={setDetailImageId}
                      />
                    ))}
                    {/* Sentinel for infinite scroll */}
                    <div
                      ref={sentinelRef}
                      className="h-4 w-full flex items-center justify-center"
                    >
                      {isLoadingHistory && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
          <div className="flex items-center justify-between shrink-0 border border-foreground/10 p-1 bg-muted/35 ">
            <TabsList className="flex gap-1 w-full justify-start bg-transparent p-0 h-auto">
              <TabsTrigger
                value="history"
                className="max-w-fit items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-none border border-transparent data-[state=active]:border-border  px-3 py-1.5 h-auto"
                asChild
              >
                <Button variant="outline" size="icon-sm">
                  <History />
                </Button>
              </TabsTrigger>
              <TabsTrigger
                value="queue"
                className="max-w-fit items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-none border border-transparent data-[state=active]:border-border  px-3 py-1.5 h-auto"
                asChild
              >
                <Button variant="outline" size="icon-sm">
                  <List />
                  {pendingGenerations.length > 0 && (
                    <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1 ">
                      {pendingGenerations.length}
                    </span>
                  )}
                </Button>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </Card>

      <ImageDetailDialog
        imageId={detailImageId}
        open={!!detailImageId}
        onOpenChange={(open) => !open && setDetailImageId(null)}
      />
    </div>
  )
}
