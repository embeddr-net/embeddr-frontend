// src/features/lotus/LotusPreviewPane.tsx
import React from 'react'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import type { LotusResultItem } from './types'
import { cn } from '@/lib/utils'
import {
  CornerDownLeft,
  Command,
  Option,
  ArrowUpDown,
  FileText,
} from 'lucide-react'

interface LotusPreviewPaneProps {
  item: LotusResultItem | null
  onRun: () => void
  className?: string
}

export function LotusPreviewPane({
  item,
  onRun,
  className,
}: LotusPreviewPaneProps) {
  if (!item) {
    return (
      <div
        className={cn(
          'h-full p-4 flex items-center justify-center text-muted-foreground',
          className,
        )}
      >
        <span className="text-sm">Pick something.</span>
      </div>
    )
  }

  const resource = item.data?.resource || {}
  const resourceType = resource?.type || item.kind
  let previewUrl = item.data?.preview_url || resource?.preview_url
  if (!previewUrl && resource?.content_url) previewUrl = resource.content_url

  if (resourceType === 'document') previewUrl = undefined

  if (resourceType === 'video' && previewUrl) {
    if (previewUrl.includes('/scene/') && /\/stream(\?|$)/.test(previewUrl)) {
      previewUrl = previewUrl.replace(/\/stream(\?.*)?$/, '/screenshot$1')
    }
  }

  if (resourceType === 'image' && previewUrl) {
    if (previewUrl.includes('/image/') && /\/image(\?|$)/.test(previewUrl)) {
      previewUrl = previewUrl.replace(/\/image(\?.*)?$/, '/thumbnail$1')
    }
  }
  const previewTitle = item.title || 'Preview'

  return (
    <div className={cn('h-full flex flex-col', className)}>
      <div className="p-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">{item.title}</h3>
              <Badge variant="outline" className="capitalize">
                {item.kind}
              </Badge>
            </div>
            {item.subtitle && (
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {item.subtitle}
              </div>
            )}
          </div>
          <Button onClick={onRun} className="" variant="secondary">
            <CornerDownLeft className="h-4 w-4 mr-2" />
            Run
          </Button>
        </div>
      </div>

      <ScrollArea
        className="flex-1 min-h-0"
        type="always"
        variant="left-border"
      >
        <div className="p-4">
          {previewUrl ? (
            <div className="mb-4 border border-border/60 bg-muted/30 overflow-hidden">
              <img
                src={previewUrl}
                alt={previewTitle}
                className="w-full max-h-65 object-contain bg-background"
                loading="lazy"
              />
            </div>
          ) : resourceType === 'document' ? (
            <div className="mb-4 border border-border/60 bg-muted/30 flex items-center gap-2 p-4 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Document preview unavailable.</span>
            </div>
          ) : null}
          {item.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No description.
            </p>
          )}

          <div className="mt-6 space-y-2">
            <div className="text-[11px] text-muted-foreground/70 uppercase tracking-wide">
              Shortcuts
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" /> Up/Down to select
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <CornerDownLeft className="h-4 w-4" /> Enter to run
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Command className="h-4 w-4" /> Cmd/Ctrl + K to open
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Option className="h-4 w-4" /> Esc to close
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/60 text-[10px] text-muted-foreground/70">
        <span className="truncate block">id: {item.id}</span>
      </div>
    </div>
  )
}
