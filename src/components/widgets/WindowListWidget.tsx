import React, { useState } from 'react'
import { useWindowStore } from '@/store/windowStore'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/popover'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@embeddr/react-ui/components/context-menu'
import {
  Layers,
  Check,
  Maximize2,
  Minimize2,
  X,
  Layout,
  Pin,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'

export function WindowListWidget() {
  const {
    windows,
    panelOrder,
    backdropWindowId,
    minimizeWindow,
    restoreWindow,
    bringToFront,
    closeWindow,
    setBackdrop,
    togglePin,
  } = useWindowStore(
    useShallow((s) => ({
      windows: s.windows,
      panelOrder: s.panelOrder,
      backdropWindowId: s.backdropWindowId,
      minimizeWindow: s.minimizeWindow,
      restoreWindow: s.restoreWindow,
      bringToFront: s.bringToFront,
      closeWindow: s.closeWindow,
      setBackdrop: s.setBackdrop,
      togglePin: s.togglePin,
    })),
  )
  const [open, setOpen] = useState(false)

  const windowList = Object.values(windows)

  if (windowList.length === 0) return null

  const activeWindowId = panelOrder[panelOrder.length - 1]

  const handleWindowClick = (w: (typeof windowList)[0]) => {
    if (w.id === activeWindowId && !w.isMinimized) {
      minimizeWindow(w.id)
    } else {
      if (w.isMinimized) restoreWindow(w.id)
      bringToFront(w.id)
    }
  }

  // Sort: Active first, then open, then minimized
  const sortedWindows = [...windowList].sort((a, b) => {
    // Backdrop always first
    if (a.id === backdropWindowId) return -1
    if (b.id === backdropWindowId) return 1

    // Minimized last
    if (a.isMinimized && !b.isMinimized) return 1
    if (!a.isMinimized && b.isMinimized) return -1

    // Default to title
    return a.title.localeCompare(b.title)
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 text-muted-foreground transition-colors',
            open && 'text-foreground bg-accent',
          )}
          title="Window Manager"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2"
        align="start"
        side="top"
        sideOffset={8}
      >
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-medium text-muted-foreground px-2 py-1 mb-1 border-b border-border/50 uppercase tracking-wider flex items-center justify-between">
            <span>Open Panels</span>
            <span className="bg-muted px-1.5 rounded-sm text-foreground">
              {windowList.length}
            </span>
          </div>

          {sortedWindows.map((w) => {
            const isActive = w.id === activeWindowId
            const isBackdrop = w.id === backdropWindowId

            return (
              <ContextMenu key={w.id}>
                <ContextMenuTrigger>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'w-full justify-between h-8 text-xs font-normal group relative',
                      w.isMinimized &&
                        'opacity-70 italic text-muted-foreground hover:opacity-100',
                      isBackdrop &&
                        'border border-primary/20 bg-primary/5 text-primary',
                    )}
                    onClick={() => handleWindowClick(w)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isBackdrop ? (
                        <Layout className="h-3.5 w-3.5 shrink-0" />
                      ) : w.isMinimized ? (
                        <Minimize2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full shrink-0',
                            isActive
                              ? 'bg-green-500'
                              : 'bg-muted-foreground/30',
                          )}
                        />
                      )}
                      <span className="truncate">{w.title}</span>
                    </div>

                    {/* Hover Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {w.isPinned && (
                        <Pin className="h-3 w-3 text-muted-foreground" />
                      )}
                      <div
                        role="button"
                        className="p-1 rounded-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeWindow(w.id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </div>
                    </div>
                  </Button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => handleWindowClick(w)}>
                    {w.isMinimized ? 'Restore' : 'Bring to Front'}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => minimizeWindow(w.id)}
                    disabled={w.isMinimized}
                  >
                    Minimize
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => setBackdrop(w.id)}
                    disabled={isBackdrop}
                  >
                    <Layout className="mr-2 h-3.5 w-3.5" />
                    Set as Backdrop
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => togglePin(w.id)}>
                    <Pin className="mr-2 h-3.5 w-3.5" />
                    {w.isPinned ? 'Unpin' : 'Pin Always on Top'}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => closeWindow(w.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="mr-2 h-3.5 w-3.5" />
                    Close Window
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
