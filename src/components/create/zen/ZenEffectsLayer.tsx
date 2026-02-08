import React from 'react'
import {
  usePluginStore,
  useEmbeddrAPI,
  extendApiForPlugin,
} from '@/plugins/store'
import { useSettingsStore } from '@/store/settingsStore'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'
import { PluginErrorBoundary } from '@/plugins/PluginErrorBoundary'

export function ZenEffectsLayer() {
  const api = useEmbeddrAPI()
  const getComponents = usePluginStore((s) => s.getComponents)
  const plugins = usePluginStore((s) => s.plugins)
  const activePlugins = usePluginStore((s) => s.activePlugins)
  const effects = getComponents('zen-effect')
  void plugins
  void activePlugins
  const effectsEnabled = useSettingsStore((s) => s.effectsEnabled)
  const globalEffectsEnabled = useSettingsStore((s) => s.globalEffectsEnabled)
  const getEffectToggle = useSettingsStore((s) => s.getEffectToggle)

  if (!effectsEnabled || effects.length === 0) return null

  const renderEffects = (layer: 'under' | 'over') =>
    effects.map(({ pluginId, def }) => {
      const componentName = def.exportName || def.component
      if (!componentName) return null
      const effectId = `${pluginId}:${def.id || def.name || componentName}`
      if (!getEffectToggle(effectId, true)) return null
      if (globalEffectsEnabled && def?.props?.scope === 'global') return null
      const targetLayer = def?.props?.layer ?? 'over'
      if (targetLayer !== layer) return null
      return (
        <div
          key={`${pluginId}-${def.id || def.name || componentName}`}
          className="zen-effect-item pointer-events-none absolute inset-0"
        >
          <PluginErrorBoundary
            pluginId={pluginId}
            componentName={componentName}
          >
            <DynamicPluginComponent
              pluginId={pluginId}
              componentName={componentName}
              api={extendApiForPlugin(api, pluginId)}
              {...(def.props || {})}
            />
          </PluginErrorBoundary>
        </div>
      )
    })

  return (
    <>
      <div className="zen-effects-layer pointer-events-none fixed inset-0 z-[30]">
        {renderEffects('under')}
      </div>
      <div className="zen-effects-layer pointer-events-none fixed inset-0 z-[60]">
        {renderEffects('over')}
      </div>
    </>
  )
}
