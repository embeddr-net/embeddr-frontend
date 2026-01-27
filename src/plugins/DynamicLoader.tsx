import React, { Suspense, useMemo } from 'react'
import { Skeleton } from '@embeddr/react-ui/components/skeleton'

interface DynamicPluginComponentProps {
  pluginId: string
  componentName: string
  api: any
  [key: string]: any
}

/**
 * A wrapper that attempts to resolve a React component from the global window object.
 * Plugins are expected to be attached to window as [pluginId.replace(/-/g, '_')]Plugin.
 */
export const DynamicPluginComponent: React.FC<DynamicPluginComponentProps> =
  React.memo(({ pluginId, componentName, api, ...props }) => {
    const [Component, setComponent] =
      React.useState<React.ComponentType<any> | null>(null)

    React.useEffect(() => {
      // Normalize plugin lib name: simple-window -> simple_windowPlugin
      const libName = pluginId.replace(/[^a-zA-Z0-9]/g, '_') + 'Plugin'

      let attempts = 0
      const maxAttempts = 50 // 5 seconds total

      console.debug(
        `[DynamicLoader] Starting load for ${pluginId} (expecting window.${libName})`,
      )

      const checkLib = () => {
        const lib = (window as any)[libName]
        if (lib) {
          console.log(`[DynamicLoader] Found library for ${pluginId}`, lib)
          const comp =
            lib[componentName] ||
            (lib.default && lib.default[componentName]) ||
            lib.default
          if (comp) {
            console.log(
              `[DynamicLoader] Found component ${componentName} in ${pluginId}`,
            )
            setComponent(() => comp)
            return true
          } else {
            console.warn(
              `[DynamicLoader] Library found for ${pluginId} but component ${componentName} is missing. Available keys:`,
              Object.keys(lib),
              'Default keys:',
              lib.default ? Object.keys(lib.default) : 'no default',
            )
          }
        }
        return false
      }

      if (checkLib()) return

      const interval = setInterval(() => {
        attempts++
        if (checkLib()) {
          clearInterval(interval)
        } else if (attempts >= maxAttempts) {
          console.error(
            `[DynamicLoader] Failed to load ${pluginId} after ${maxAttempts} attempts. Expected global: window.${libName}`,
          )
          console.log(
            `[DynamicLoader] Current window globals starting with "embeddr":`,
            Object.keys(window).filter((k) => k.startsWith('embeddr')),
          )
          clearInterval(interval)
        }
      }, 100)

      return () => clearInterval(interval)
    }, [pluginId, componentName])

    if (!Component) {
      return (
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-62.5" />
          <Skeleton className="h-4 w-50" />
          <Skeleton className="h-20 w-full" />
        </div>
      )
    }

    return <Component api={api} pluginId={pluginId} {...props} />
  })
