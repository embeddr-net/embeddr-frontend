import React, { useEffect } from 'react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { QueueItem } from '../GenerationQueue'
import { DraggablePanel } from '@/components/ui/DraggablePanel'
import { useExecutions } from '@/lib/api/client-v2'
import { Loader2 } from 'lucide-react'
import { Badge } from '@embeddr/react-ui/components/badge'
import { useWindowStore } from '@/store/windowStore'

interface ZenQueueProps {
  isOpen?: boolean
  onClose?: () => void
  generations: Array<any>
  selectedGenerationId: string | null
  selectGeneration: (gen: any) => void
  onRepeat: (gen: any) => void
}

export function ZenQueue({
  isOpen: propIsOpen,
  onClose: propOnClose,
  generations,
  selectedGenerationId,
  selectGeneration,
  onRepeat,
}: ZenQueueProps) {
  const { windows, minimizeWindow, closeWindow } = useWindowStore()
  const windowState = windows['zen-queue']
  const isOpen = propIsOpen ?? (windowState ? !windowState.isMinimized : false)
  // const onClose = propOnClose ?? (() => minimizeWindow('zen-queue'))
  const onClose = propOnClose ?? (() => closeWindow('zen-queue'))

  // V2 Integration
  const { data: executions, isLoading } = useExecutions({ limit: 50 })

  return (
    <DraggablePanel
      id="zen-queue"
      title="History & Queue"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: window.innerWidth - 340, y: 100 }}
      defaultSize={{ width: 220, height: 400 }}
      className="absolute"
    >
      <div className="flex flex-col h-full p-2.5">
        <ScrollArea className="h-full pr-3" type="always">
          <div className="space-y-1">
            {isLoading && (
              <div className="flex justify-center p-2">
                <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
              </div>
            )}

            {/* V2 Executions */}
            {executions?.map((ex: any) => (
              <div
                key={ex.id}
                className="p-2 border  bg-card mb-2 flex flex-col gap-1 text-xs"
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold truncate">
                    {ex.action_name}
                  </span>
                  <Badge
                    variant={
                      (ex.status === 'completed'
                        ? 'default'
                        : ex.status === 'running'
                          ? 'secondary'
                          : ex.status === 'failed'
                            ? 'destructive'
                            : 'outline') as any
                    }
                    className="text-[10px] h-4 px-1"
                  >
                    {ex.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-[10px] truncate">
                  {ex.plugin_name}
                </div>
                {ex.inputs?.artifact_id && (
                  <div className="text-[10px] text-muted-foreground truncate font-mono">
                    {ex.inputs.artifact_id.slice(0, 8)}...
                  </div>
                )}
              </div>
            ))}

            {/* Legacy Generations (Temporary Mix) */}
            {generations.map((gen) => (
              <QueueItem
                key={gen.id}
                generation={gen}
                isSelected={selectedGenerationId === gen.id}
                onSelect={() => selectGeneration(gen)}
                onOpenImage={() => {}}
                onRepeat={() => onRepeat(gen)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </DraggablePanel>
  )
}
