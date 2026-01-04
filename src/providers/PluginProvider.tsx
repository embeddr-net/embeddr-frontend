import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useEmbeddrAPI, usePluginStore } from '@/plugins/store'
import { DEFAULT_PLUGINS } from '@/plugins/defaults'

const PluginContext = createContext<null>(null)

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const api = useEmbeddrAPI()
  const { registerPlugin, loadExternalPlugins, plugins } = usePluginStore()

  const initializedPlugins = useRef<Set<string>>(new Set())
  const cleanupFns = useRef<Record<string, () => void>>({})

  // 1. Register default plugins and load external ones (ONCE)
  useEffect(() => {
    console.log(
      '[PluginProvider] Registering default plugins and loading external ones',
    )
    DEFAULT_PLUGINS.forEach((plugin) => {
      registerPlugin(plugin)
    })
    loadExternalPlugins()
  }, []) // Empty dependency array: run once on mount

  // 2. Initialize plugins when they appear in the store
  useEffect(() => {
    // We only want to initialize plugins that haven't been initialized yet.
    // We do NOT want to re-initialize if 'api' changes, unless we really have to.
    // But 'api' changes often.
    // If we include 'api' in deps, this effect runs often.
    // But the check `!initializedPlugins.current.has(plugin.id)` prevents re-execution of initialize().

    Object.values(plugins).forEach((plugin) => {
      if (!initializedPlugins.current.has(plugin.id)) {
        console.log('[PluginProvider] Initializing plugin:', plugin.id)
        try {
          const cleanup = plugin.initialize?.(api)
          if (typeof cleanup === 'function') {
            cleanupFns.current[plugin.id] = cleanup
          }
          initializedPlugins.current.add(plugin.id)
        } catch (err) {
          console.error(
            `[PluginProvider] Failed to initialize plugin ${plugin.id}:`,
            err,
          )
        }
      }
    })
  }, [plugins, api]) // Re-run when plugins list changes or api changes (but guarded)

  // 3. Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[PluginProvider] Unmounting, cleaning up all plugins')
      Object.values(cleanupFns.current).forEach((fn) => fn())
      cleanupFns.current = {}
      initializedPlugins.current.clear()
    }
  }, [])

  return (
    <PluginContext.Provider value={null}>{children}</PluginContext.Provider>
  )
}

export const usePluginContext = () => useContext(PluginContext)
