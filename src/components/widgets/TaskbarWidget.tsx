import React from 'react'
import { useWindowStore } from '@/store/windowStore'
import { Button } from '@embeddr/react-ui/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@embeddr/react-ui/ui'
import { Maximize2, Layout, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'

export function TaskbarWidget() {
  const setBackdrop = useWindowStore((s) => s.setBackdrop)
  const restoreWindow = useWindowStore((s) => s.restoreWindow)
  const closeAll = useWindowStore((s) => s.closeAll)

  const minimizedWindows = useWindowStore(
    useShallow((s) => Object.values(s.windows).filter((w) => w.isMinimized)),
  )
  const backdropWindow = useWindowStore((s) =>
    s.backdropWindowId ? s.windows[s.backdropWindowId] : null,
  )
  const hasOpenWindows = useWindowStore(
    useShallow((s) => Object.values(s.windows).some((w) => !w.isMinimized)),
  )

  if (!backdropWindow && minimizedWindows.length === 0 && !hasOpenWindows) {
    return null
  }

  return (
    <div className="flex items-center gap-2 h-full px-2">
      {/* Active Backdrop Indicator */}
      {backdropWindow && (
        <div className="flex items-center bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 h-6 select-none animate-in fade-in slide-in-from-left-2 duration-300">
          <Layout className="h-3 w-3 mr-1.5 opacity-70" />
          <span className="text-[10px] font-medium max-w-25 truncate">
            {backdropWindow.title}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-1 hover:bg-primary/20 hover:text-primary rounded-full"
            onClick={() => setBackdrop(null)}
            title="Eject Backdrop"
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      )}

      {/* Vertical Separator if both exist */}
      {backdropWindow && minimizedWindows.length > 0 && (
        <div className="h-3 w-px bg-border/50 mx-1" />
      )}

      {/* Minimized Windows List */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-150">
        {minimizedWindows.map((w) => (
          <Tooltip key={w.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1.5 border border-transparent hover:border-border hover:bg-muted/50 transition-all min-w-0"
                onClick={() => restoreWindow(w.id)}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                <span className="truncate max-w-30">{w.title}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Click to restore <span className="font-semibold">{w.title}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Close All Helper */}
      {(hasOpenWindows || minimizedWindows.length > 0) && (
        <>
          <div className="h-3 w-px bg-border/50 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => closeAll()}
            title="Close All Windows"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}
