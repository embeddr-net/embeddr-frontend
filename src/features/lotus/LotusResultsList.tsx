// src/features/lotus/LotusResultsList.tsx
import React from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Badge } from '@embeddr/react-ui/components/badge'
import type { LotusResultItem } from './types'
import {
  Sparkles,
  Cpu,
  Navigation,
  FileImage,
  Globe,
  Zap,
  ChevronRight,
} from 'lucide-react'

function kindIcon(kind: string) {
  switch (kind) {
    case 'panel':
      return Cpu
    case 'action':
      return Zap
    case 'nav':
      return Navigation
    case 'artifact':
      return FileImage
    case 'resource':
      return Globe
    default:
      return Sparkles
  }
}

function resolvePreviewUrl(item: LotusResultItem) {
  const resource = item.data?.resource || {}
  const resourceType = resource?.type || item.kind
  let previewUrl =
    item.data?.preview_url || resource?.preview_url || resource?.content_url

  if (!previewUrl) return undefined

  if (resourceType === 'document') return undefined

  if (resourceType === 'video') {
    if (previewUrl.includes('/scene/') && /\/stream(\?|$)/.test(previewUrl)) {
      return previewUrl.replace(/\/stream(\?.*)?$/, '/screenshot$1')
    }
  }

  if (resourceType === 'image') {
    if (previewUrl.includes('/image/') && /\/image(\?|$)/.test(previewUrl)) {
      return previewUrl.replace(/\/image(\?.*)?$/, '/thumbnail$1')
    }
  }

  return previewUrl
}

interface LotusResultsListProps {
  items: LotusResultItem[]
  selectedId?: string | null
  onSelect: (item: LotusResultItem) => void
  onConfirm: (item: LotusResultItem) => void
  className?: string

  /**
   * If true, this component will handle ArrowUp/Down/Enter itself.
   * If false, parent handles keyboard and list is "dumb".
   */
  keyboard?: boolean

  /**
   * Parent can call this to keep input focus; list should never steal focus.
   */
  onRequestFocusInput?: () => void
}

export function LotusResultsList({
  items,
  selectedId,
  onSelect,
  onConfirm,
  className,
  keyboard = false,
  onRequestFocusInput,
}: LotusResultsListProps) {
  const selectedIndex = React.useMemo(() => {
    if (!items.length) return -1
    if (!selectedId) return 0
    const idx = items.findIndex((x) => x.id === selectedId)
    return idx === -1 ? 0 : idx
  }, [items, selectedId])

  const selectIndex = React.useCallback(
    (idx: number) => {
      if (!items.length) return
      const clamped = Math.max(0, Math.min(items.length - 1, idx))
      onSelect(items[clamped])
    },
    [items, onSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!keyboard) return
    if (!items.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectIndex(selectedIndex + 1)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (selectedIndex <= 0) {
        // go back to input
        onRequestFocusInput?.()
        return
      }
      selectIndex(selectedIndex - 1)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[selectedIndex]
      if (item) onConfirm(item)
      return
    }
  }

  if (!items.length) {
    return (
      <div
        className={cn(
          'h-full flex items-center justify-center text-muted-foreground',
          className,
        )}
      >
        <span className="text-sm">No results.</span>
      </div>
    )
  }

  return (
    <div
      className={cn('h-full', className)}
      // ✅ list container is not focusable; parent/input keeps focus
      // but if you DO set keyboard=true, you can still route key events here
      onKeyDown={handleKeyDown}
    >
      <ScrollArea className="h-full pr-2" variant="left-border" type="always">
        <div role="listbox" aria-label="Results" className="flex flex-col">
          {items.map((item) => {
            const isSelected = item.id === selectedId
            const Icon = kindIcon(item.kind)
            const previewUrl = resolvePreviewUrl(item)

            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1} // ✅ never focusable
                onMouseDown={(e) => {
                  // ✅ prevents input blur before click
                  e.preventDefault()
                }}
                onClick={() => onSelect(item)}
                onDoubleClick={() => onConfirm(item)}
                className={cn(
                  'group select-none cursor-pointer border-b px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent last:border-0 outline-none',
                  isSelected
                    ? 'bg-accent text-accent-foreground border-primary/50'
                    : 'bg-background border-transparent',
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-3 ">
                    {previewUrl ? (
                      <div className="h-9 w-9 shrink-0  overflow-hidden bg-muted">
                        <img
                          src={previewUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate break-all whitespace-pre-wrap">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize "
                    >
                      {item.kind}
                    </Badge>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </div>

                <div className="flex w-full items-center justify-between pt-2">
                  <code className="text-[10px] text-muted-foreground/70 truncate max-w-[70%]">
                    {item.id}
                  </code>
                  {item.score !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
