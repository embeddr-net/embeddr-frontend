import { useEffect } from 'react'
import { useCommandBarStore } from '@/store/commandBarStore'
import { ClockWidget } from '@/components/widgets/ClockWidget'
import { SystemMetricsWidget } from '@/components/widgets/SystemMetricsWidget'
import { TaskbarWidget } from '@/components/widgets/TaskbarWidget'
import { ZenToggleWidget } from '@/components/widgets/ZenToggleWidget'
import { WindowListWidget } from '@/components/widgets/WindowListWidget'
import { HidePanelsWidget } from '@/components/widgets/HidePanelsWidget'
import { NavWidget } from '@/components/widgets/NavWidget'
import { SettingsWidget } from '@/components/widgets/SettingsWidget'
import { ConnectionWidget } from '@/components/widgets/ConnectionWidget'
import { useSettingsStore } from '@/store/settingsStore'
import React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useRouterState } from '@tanstack/react-router'

export function useDefaultWidgets() {
  const registerWidget = useCommandBarStore((s) => s.registerWidget)
  const unregisterWidget = useCommandBarStore((s) => s.unregisterWidget)
  const widgetConfig = useSettingsStore(useShallow((s) => s.widgetConfig))
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isZenPage = pathname === '/'

  const getOrder = (id: string, defaultOrder: number) => {
    const cfg = widgetConfig[id]
    return cfg?.order ?? defaultOrder
  }

  const getSection = (id: string, defaultLoc: 'left' | 'center' | 'right') => {
    const cfg = widgetConfig[id]
    return cfg?.section ?? defaultLoc
  }

  const isVisible = (id: string) => {
    const cfg = widgetConfig[id]
    return cfg?.visible ?? true
  }

  useEffect(() => {
    const register = (
      id: string,
      component: React.ReactNode,
      defaultLoc: 'left' | 'center' | 'right',
      defaultOrder: number,
    ) => {
      if (!isVisible(id)) return
      registerWidget({
        id,
        component,
        location: getSection(id, defaultLoc),
        order: getOrder(id, defaultOrder),
      })
    }

    // Navigation (Home, Search, Lotus)
    register('nav', <NavWidget />, 'left', 0)

    if (isZenPage) {
      // Zen Toolbar Toggle
      register('zen-toggle-btn', <ZenToggleWidget />, 'left', 1)

      // Window Manager List
      register('window-list', <WindowListWidget />, 'left', 5)

      // Hide All Toggle
      register('hide-all-toggle', <HidePanelsWidget />, 'left', 6)

      // Taskbar (Minimized Windows)
      register('taskbar', <TaskbarWidget />, 'right', 10)
    } else {
      unregisterWidget('zen-toggle-btn')
      unregisterWidget('window-list')
      unregisterWidget('hide-all-toggle')
      unregisterWidget('taskbar')
    }

    // System Metrics (Artifacts/Plugins)
    register('system-metrics', <SystemMetricsWidget />, 'right', 50)

    // Settings & Theme
    register('settings', <SettingsWidget />, 'right', 90)

    // Connection Status
    register('connection', <ConnectionWidget />, 'right', 95)

    // Clock
    register('clock', <ClockWidget />, 'right', 100)
  }, [registerWidget, unregisterWidget, widgetConfig, isZenPage]) // Re-run when config or route changes
}
