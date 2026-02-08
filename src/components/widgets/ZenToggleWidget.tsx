import React from 'react'
import { useWindowStore } from '@/store/windowStore'
import { Button } from '@embeddr/react-ui/components/button'
import { Box, PanelBottomClose, PanelBottomOpen, PlugZap } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/popover'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { usePluginStore } from '@/plugins/store'
import { usePluginLogos } from '@/hooks/usePluginLogos'
import { lucideIconFromName } from '@/lib/lucide'

export function ZenToggleWidget() {
  const showZenToolbar = useWindowStore((s) => s.showZenToolbar)
  const toggleZenToolbar = useWindowStore((s) => s.toggleZenToolbar)
  const spawnWindow = useWindowStore((s) => s.spawnWindow)
  const openWindow = useWindowStore((s) => s.openWindow)
  const restoreWindow = useWindowStore((s) => s.restoreWindow)
  const bringToFront = useWindowStore((s) => s.bringToFront)
  const windows = useWindowStore((s) => s.windows)
  const getComponents = usePluginStore((s) => s.getComponents)
  const { logos } = usePluginLogos()
  const [pinnedPanels] = useLocalStorage<string[]>('zen-pinned-panels', [])

  const pinnedPanelDefs = React.useMemo(() => {
    if (!pinnedPanels.length) return []
    const overlays = getComponents('zen-overlay').filter(
      ({ def }) => !def.options?.spawnOnly,
    )
    const map = new Map(
      overlays.map(({ pluginId, def }) => [
        `${pluginId}-${def.id}`,
        { pluginId, def },
      ]),
    )
    return pinnedPanels.map((id) => map.get(id)).filter(Boolean) as Array<{
      pluginId: string
      def: any
    }>
  }, [getComponents, pinnedPanels])

  if (!showZenToolbar) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground"
        onClick={toggleZenToolbar}
        title="Show Toolbar"
      >
        <PanelBottomOpen className="h-3.5 w-3.5" />
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={toggleZenToolbar}
          title="Hide Toolbar"
        >
          <PanelBottomClose className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2"
          onClick={() => {
            const windowId = 'zen-toolbox'
            const win = windows[windowId]
            if (!win) {
              openWindow({
                id: windowId,
                title: 'Toolbox',
                componentId: 'core-toolbox',
              })
              return
            }
            if (win.isMinimized) {
              restoreWindow(windowId)
            } else {
              bringToFront(windowId)
            }
          }}
        >
          <Box className="h-3.5 w-3.5" />
          <span className="text-xs truncate">Toolbox</span>
        </Button>
        <div className="my-1 h-px bg-border/60" />
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
          Pinned Panels
        </div>
        {pinnedPanelDefs.length === 0 ? (
          <div className="text-xs text-muted-foreground px-1 py-2">
            Pin panels in the Toolbox.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {pinnedPanelDefs.map(({ pluginId, def }) => {
              const componentId = `${pluginId}-${def.id}`
              const PanelIcon = lucideIconFromName(def.icon)
              const logoUrl = logos?.[pluginId]
              return (
                <Button
                  key={componentId}
                  variant="ghost"
                  size="icon-sm"
                  className="justify-start gap-2 h-6 w-6"
                  onClick={() => {
                    const componentName = def.exportName || def.component
                    if (!componentName) return
                    spawnWindow(componentId, def.label, {
                      pluginId,
                      componentName,
                      defaultPosition: def.defaultPosition,
                      defaultSize: def.defaultSize,
                      panelMode: def.options?.instanceMode,
                      hideHeader: def.options?.hideHeader,
                      transparent: def.options?.transparent,
                    })
                  }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-3.5 w-3.5 rounded-sm object-contain"
                    />
                  ) : PanelIcon ? (
                    <PanelIcon className="h-3.5 w-3.5" />
                  ) : (
                    <PlugZap className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs truncate">{def.label}</span>
                </Button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
