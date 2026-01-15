import React from 'react'
import { registerWindowComponent } from '@/components/ui/windowRegistry'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'
import { shallow } from 'zustand/shallow'
import { usePluginStore } from './store'

function buildOverlay(plugins: any, activePlugins: string[]) {
  const out: Array<{ pluginId: string; def: any }> = []

  for (const pluginId of activePlugins) {
    const p = plugins[pluginId]
    if (!p?.components) continue

    for (const comp of p.components) {
      if (comp.location === 'zen-overlay' || comp.location === 'window') {
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
        `${pluginId}:${def.id}:${def.exportName || def.component || ''}`,
    )
    .sort()
    .join('|')
}
export function PluginWindowBootstrap() {
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
      const componentId = `${pluginId}-${def.id}`
      if (registered.current.has(componentId)) continue

      const componentName = def.exportName || def.component
      if (!componentName) continue

      registered.current.add(componentId)

      registerWindowComponent(componentId, (props: any) => (
        <DynamicPluginComponent
          pluginId={pluginId}
          componentName={componentName}
          windowId={props.id}
          {...(def.props || {})}
          {...props}
        />
      ))
    }
  }, [sig])

  return null
}
