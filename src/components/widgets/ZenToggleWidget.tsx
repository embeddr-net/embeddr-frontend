import React from 'react'
import { useWindowStore } from '@/store/windowStore'
import { Button } from '@embeddr/react-ui/components/button'
import { PanelBottomClose, PanelBottomOpen } from 'lucide-react'

export function ZenToggleWidget() {
  const showZenToolbar = useWindowStore((s) => s.showZenToolbar)
  const toggleZenToolbar = useWindowStore((s) => s.toggleZenToolbar)

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground"
      onClick={toggleZenToolbar}
      title={showZenToolbar ? 'Hide Toolbar' : 'Show Toolbar'}
    >
      {showZenToolbar ? (
        <PanelBottomClose className="h-3.5 w-3.5" />
      ) : (
        <PanelBottomOpen className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}
