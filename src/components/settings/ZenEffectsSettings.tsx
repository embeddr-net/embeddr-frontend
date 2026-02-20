import React, { useMemo } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { usePluginStore } from '@/plugins/store'
import { useShallow } from 'zustand/react/shallow'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/ui'
import { Switch } from '@embeddr/react-ui/components/ui'

export function ZenEffectsSettings() {
  const {
    effectsEnabled,
    setEffectsEnabled,
    globalEffectsEnabled,
    setGlobalEffectsEnabled,
    effectToggles,
    setEffectToggle,
  } = useSettingsStore(
    useShallow((s) => ({
      effectsEnabled: s.effectsEnabled,
      setEffectsEnabled: s.setEffectsEnabled,
      globalEffectsEnabled: s.globalEffectsEnabled,
      setGlobalEffectsEnabled: s.setGlobalEffectsEnabled,
      effectToggles: s.effectToggles,
      setEffectToggle: s.setEffectToggle,
    })),
  )

  const { plugins, activePlugins } = usePluginStore(
    useShallow((s) => ({ plugins: s.plugins, activePlugins: s.activePlugins })),
  )

  const effectComponents = useMemo(() => {
    const components: Array<{ pluginId: string; def: any }> = []
    activePlugins.forEach((pluginId) => {
      const plugin = plugins[pluginId]
      if (!plugin?.components) return
      plugin.components.forEach((comp: any) => {
        if (comp.location === 'zen-effect') {
          components.push({ pluginId, def: comp })
        }
      })
    })
    return components
  }, [activePlugins, plugins])

  return (
    <div className="space-y-4 p-3">
      <Card className="my-1">
        <CardHeader>
          <CardTitle>Zen Effects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <span className="text-sm">Enable effects</span>
            <Switch
              checked={effectsEnabled}
              onCheckedChange={setEffectsEnabled}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm">Allow effects on all pages</span>
              <span className="text-[10px] text-muted-foreground">
                Global effects only (requires effect scope)
              </span>
            </div>
            <Switch
              checked={globalEffectsEnabled}
              onCheckedChange={setGlobalEffectsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="my-1">
        <CardHeader>
          <CardTitle>Installed Effects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {effectComponents.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No effects registered.
            </div>
          ) : (
            effectComponents.map(({ pluginId, def }) => {
              const componentName = def.exportName || def.component
              const effectId = `${pluginId}:${def.id || def.name || componentName}`
              const isEnabled =
                effectToggles[effectId] !== undefined
                  ? effectToggles[effectId]
                  : true
              return (
                <div
                  key={effectId}
                  className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {def.label || def.name || componentName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {pluginId}
                    </span>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(val) => setEffectToggle(effectId, val)}
                  />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
