import React, { memo } from 'react'
import { Card } from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { ChevronUp, Layers } from 'lucide-react'
import type { PromptImage } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface ImageNodeProps {
  data: {
    image: PromptImage
    stackCount?: number
    stackId?: string
    isStack?: boolean
  }
  selected?: boolean
  onToggleStack?: () => void
}

export const ImageNode = memo(
  ({ data, selected, onToggleStack }: ImageNodeProps) => {
    const { image, stackCount, isStack, stackId } = data

    return (
      <div className="relative group">
        {/* Stack effect (Collapsed) */}
        {isStack && stackCount && stackCount > 1 && (
          <>
            <div className="absolute top-2 left-2 w-full h-full bg-card border border-border rounded-lg -z-10 shadow-sm" />
            <div className="absolute top-1 left-1 w-full h-full bg-card border border-border rounded-lg -z-10 shadow-sm" />
            <div className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-background">
              {stackCount}
            </div>
          </>
        )}

        {/* Expanded Stack Indicator */}
        {!isStack && stackId && (
          <div className="absolute -top-3 right-0 z-10">
            <Button
              variant="secondary"
              size="icon-sm"
              className="h-6 w-6 rounded-full shadow-md border border-border"
              onClick={(e) => {
                e.stopPropagation()
                onToggleStack?.()
              }}
              title="Collapse Stack"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Connection points visual indicators */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-muted-foreground opacity-50" />

        <Card
          className={cn(
            'w-[240px] overflow-hidden transition-all duration-200 border-2',
            selected
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50',
            !isStack && stackId && 'border-dashed border-primary/40', // Visual hint for expanded items
          )}
        >
          <div className="aspect-square relative bg-muted">
            <img
              src={image.thumb_url || image.image_url}
              alt={image.prompt}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <p className="text-xs text-white line-clamp-2">{image.prompt}</p>
            </div>
            {/* Stack Icon Overlay for Collapsed */}
            {isStack && (
              <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md backdrop-blur-sm">
                <Layers className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="p-2 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>ID: {image.id}</span>
              <span>{new Date(image.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>

        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-muted-foreground opacity-50" />
      </div>
    )
  },
)
