import React from 'react'
import { useWindowStore } from '@/store/windowStore'
import { Button } from '@embeddr/react-ui/components/ui'
import { Eye, EyeOff } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@embeddr/react-ui/components/ui'

export function HidePanelsWidget() {
  const { toggleHidePanels, windows, backdropWindowId, arePanelsHidden } =
    useWindowStore(
      useShallow((s) => ({
        toggleHidePanels: s.toggleHidePanels,
        windows: s.windows,
        backdropWindowId: s.backdropWindowId,
        arePanelsHidden: s.arePanelsHidden,
      })),
    )

  // Only show if we actually have windows to manage (excluding backdrop)
  const hasManageableWindows = Object.values(windows).some(
    (w) => w.id !== backdropWindowId,
  )

  if (!hasManageableWindows) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={toggleHidePanels}
        >
          {arePanelsHidden ? (
            <EyeOff className="h-4 w-4 text-primary" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {arePanelsHidden ? 'Show Panels' : 'Hide Panels'}
      </TooltipContent>
    </Tooltip>
  )
}
