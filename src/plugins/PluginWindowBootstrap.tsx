import React from 'react'
import { registerWindowComponent } from '@/components/ui/windowRegistry'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'
import { PluginErrorBoundary } from './PluginErrorBoundary'
import { shallow } from 'zustand/shallow'
import { extendApiForPlugin, useEmbeddrAPI, usePluginStore } from './store'

function buildOverlay(plugins: any, activePlugins: string[]) {
  const out: Array<{ pluginId: string; def: any }> = []

  for (const pluginId of activePlugins) {
    const p = plugins[pluginId]
    if (!p?.components) continue

    for (const comp of p.components) {
      if (
        comp.location === 'zen-overlay' ||
        comp.location === 'window' ||
        comp.location === 'OVERLAY'
      ) {
        out.push({ pluginId, def: comp })
      }
    }
  }

  return out
}

function signature(overlay: Array<{ pluginId: string; def: any }>) {
  return overlay
    .map(
      ({ pluginId, def }) =>
        `${pluginId}:${def.id || def.name}:${def.exportName || def.component || ''}`,
    )
    .sort()
    .join('|')
}
export function PluginWindowBootstrap() {
  const api = useEmbeddrAPI()
  const plugins = usePluginStore((s) => s.plugins)
  const activePlugins = usePluginStore((s) => s.activePlugins)

  const overlay = React.useMemo(
    () => buildOverlay(plugins, activePlugins),
    [plugins, activePlugins],
  )

  const sig = React.useMemo(() => signature(overlay), [overlay])
  const registered = React.useRef(new Set<string>())

  React.useEffect(() => {
    for (const { pluginId, def } of overlay) {
      const componentKey = def.id || def.name
      if (!componentKey) continue
      const componentId = `${pluginId}-${componentKey}`
      if (registered.current.has(componentId)) continue

      const componentName = def.exportName || def.component
      if (!componentName) continue

      registered.current.add(componentId)

      registerWindowComponent(componentId, (props: any) => (
        <PluginErrorBoundary pluginId={pluginId} componentName={componentName}>
          <DynamicPluginComponent
            pluginId={pluginId}
            componentName={componentName}
            api={extendApiForPlugin(api, pluginId)}
            windowId={props.id}
            {...(def.props || {})}
            {...props}
          />
        </PluginErrorBoundary>
      ))
    }
  }, [sig])

  return null
}
