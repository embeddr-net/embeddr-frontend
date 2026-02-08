import React, { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'
import {
  extendApiForPlugin,
  useEmbeddrAPI,
  usePluginStore,
} from '@/plugins/store'
import { useCommandBarStore } from '@/store/commandBarStore'
import { useSettingsStore } from '@/store/settingsStore'

const buildWidgetId = (pluginId: string, def: any) => {
  const base = def?.id || def?.exportName || def?.label || 'widget'
  return `plugin:${pluginId}/${base}`
}

export function usePluginWidgets() {
  const api = useEmbeddrAPI()
  const { plugins, activePlugins } = usePluginStore(
    useShallow((s) => ({ plugins: s.plugins, activePlugins: s.activePlugins })),
  )
  const { registerWidget, unregisterWidget } = useCommandBarStore(
    useShallow((s) => ({
      registerWidget: s.registerWidget,
      unregisterWidget: s.unregisterWidget,
    })),
  )
  const widgetConfig = useSettingsStore(useShallow((s) => s.widgetConfig))

  const pluginWidgets = useMemo(() => {
    const out: Array<{ pluginId: string; def: any }> = []
    activePlugins.forEach((pluginId) => {
      const plugin = plugins[pluginId]
      if (!plugin?.components) return
      plugin.components.forEach((comp: any) => {
        if (comp.location === 'command-bar-widget') {
          out.push({ pluginId, def: comp })
        }
      })
    })
    return out
  }, [activePlugins, plugins])

  useEffect(() => {
    const registered: string[] = []

    pluginWidgets.forEach(({ pluginId, def }) => {
      const id = buildWidgetId(pluginId, def)
      const cfg = widgetConfig[id]
      const slot = def?.props?.slot || 'right'
      const order = def?.props?.order ?? 80
      const location = cfg?.section ?? slot
      const visible = cfg?.visible ?? true
      const finalOrder = cfg?.order ?? order

      if (!visible) return

      const apiForPlugin = extendApiForPlugin(api, pluginId)
      registerWidget({
        id,
        component: (
          <DynamicPluginComponent
            pluginId={pluginId}
            componentName={def.exportName || def.id || def.label}
            api={apiForPlugin}
            {...(def.props || {})}
          />
        ),
        location,
        order: finalOrder,
      })
      registered.push(id)
    })

    return () => {
      registered.forEach((id) => unregisterWidget(id))
    }
  }, [api, pluginWidgets, registerWidget, unregisterWidget, widgetConfig])
}
