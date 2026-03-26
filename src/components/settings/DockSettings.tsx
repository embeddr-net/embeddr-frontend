import React, { useMemo } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { usePluginStore } from '@/plugins/store'
import { useShallow } from 'zustand/react/shallow'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Label } from '@embeddr/react-ui/ui'
import { Switch } from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'

const buildDockId = (pluginId: string, def: any) => {
  const base = def?.id || def?.exportName || def?.label || 'dock'
  return `dock:${pluginId}/${base}`
}

export function DockSettings() {
  const {
    dockEnabled,
    setDockEnabled,
    dockPlacement,
    setDockPlacement,
    dockAutoHide,
    setDockAutoHide,
    dockConfig,
    updateDockConfig,
  } = useSettingsStore(
    useShallow((s) => ({
      dockEnabled: s.dockEnabled,
      setDockEnabled: s.setDockEnabled,
      dockPlacement: s.dockPlacement,
      setDockPlacement: s.setDockPlacement,
      dockAutoHide: s.dockAutoHide,
      setDockAutoHide: s.setDockAutoHide,
      dockConfig: s.dockConfig,
      updateDockConfig: s.updateDockConfig,
    })),
  )

  const { plugins, activePlugins } = usePluginStore(
    useShallow((s) => ({ plugins: s.plugins, activePlugins: s.activePlugins })),
  )

  const docks = useMemo(() => {
    const out: Array<{ id: string; label: string }> = []
    activePlugins.forEach((pluginId) => {
      const plugin = plugins[pluginId]
      if (!plugin?.components) return
      plugin.components.forEach((comp: any) => {
        if (comp.location !== 'zen-dock') return
        const id = buildDockId(pluginId, comp)
        const label = `${comp.label || comp.name || comp.exportName || id} (${pluginId})`
        out.push({ id, label })
      })
    })
    return out
  }, [activePlugins, plugins])

  return (
    <div className="space-y-4">
      <Card className="my-1">
        <CardHeader>
          <CardTitle>Dock Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Docks</Label>
              <div className="text-xs text-muted-foreground">
                Allow plugins to render sticky dock surfaces.
              </div>
            </div>
            <Switch checked={dockEnabled} onCheckedChange={setDockEnabled} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Placement</Label>
              <Select
                value={dockPlacement}
                onValueChange={(v) => setDockPlacement(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div className="space-y-1">
                <Label>Auto-hide</Label>
                <div className="text-xs text-muted-foreground">
                  Fade the dock until hovered.
                </div>
              </div>
              <Switch
                checked={dockAutoHide}
                onCheckedChange={setDockAutoHide}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="my-1">
        <CardHeader>
          <CardTitle>Installed Docks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {docks.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No docks registered.
            </div>
          ) : (
            docks.map((dock) => {
              const visible = dockConfig[dock.id]?.visible ?? true
              return (
                <div
                  key={dock.id}
                  className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
                >
                  <div className="text-sm truncate">{dock.label}</div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={visible}
                      onCheckedChange={(checked) =>
                        updateDockConfig(dock.id, { visible: checked })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateDockConfig(dock.id, {
                          order: (dockConfig[dock.id]?.order ?? 50) - 10,
                        })
                      }
                    >
                      Up
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateDockConfig(dock.id, {
                          order: (dockConfig[dock.id]?.order ?? 50) + 10,
                        })
                      }
                    >
                      Down
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
