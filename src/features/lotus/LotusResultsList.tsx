// src/features/lotus/LotusResultsList.tsx
import React from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import type { LotusResultItem } from './types'
import { usePluginLogos } from '@/hooks/usePluginLogos'
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
  const { logos } = usePluginLogos()

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
            const pluginId =
              item.data?.pluginId ||
              item.data?.plugin ||
              item.data?.plugin_name ||
              ''
            const pluginLogo = pluginId ? logos?.[pluginId] : null

            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item)}
                onDoubleClick={() => onConfirm(item)}
                className={cn(
                  'group select-none cursor-pointer border-b px-3 py-2 text-left text-sm transition-colors hover:bg-accent last:border-0 outline-none',
                  isSelected
                    ? 'bg-accent text-accent-foreground border-primary/50'
                    : 'bg-background border-transparent',
                )}
              >
                <div className="flex w-full items-center gap-2.5">
                  {/* Icon: plugin logo > preview image > kind icon */}
                  {previewUrl ? (
                    <div className="h-8 w-8 shrink-0 rounded overflow-hidden bg-muted">
                      <img
                        src={previewUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : pluginLogo ? (
                    <img
                      src={pluginLogo}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                  )}

                  {/* Text content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {item.title}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] capitalize shrink-0"
                      >
                        {item.kind}
                      </Badge>
                    </div>
                    {(item.subtitle || item.description) && (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {item.subtitle || item.description}
                      </div>
                    )}
                  </div>

                  {/* Right side */}
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
