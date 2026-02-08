import React from 'react'
import { VisualCommandBarEditor } from '@/components/settings/VisualCommandBarEditor'
import { Badge } from '@embeddr/react-ui/components/badge'

export function CommandBarCustomizer() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Command Bar
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            Live
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Defaults
          </Badge>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drag handles to move. Hover for controls.
      </p>
      <VisualCommandBarEditor />
    </div>
  )
}
