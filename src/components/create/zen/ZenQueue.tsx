import React from 'react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { QueueItem } from '../GenerationQueue'
import { DraggablePanel } from '@/components/ui/DraggablePanel'

interface ZenQueueProps {
  isOpen: boolean
  onClose: () => void
  generations: Array<any>
  selectedGenerationId: string | null
  selectGeneration: (gen: any) => void
}

export function ZenQueue({
  isOpen,
  onClose,
  generations,
  selectedGenerationId,
  selectGeneration,
}: ZenQueueProps) {
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
            {generations.map((gen) => (
              <QueueItem
                key={gen.id}
                generation={gen}
                isSelected={selectedGenerationId === gen.id}
                onSelect={() => selectGeneration(gen)}
                onOpenImage={() => {}}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </DraggablePanel>
  )
}
