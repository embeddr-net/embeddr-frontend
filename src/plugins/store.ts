import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { useMemo } from 'react'
import type { EmbeddrAPI, PluginDefinition } from '@embeddr/react-ui/types'
import { useGlobalStore } from '@/store/globalStore'
import { useGeneration } from '@/context/GenerationContext'
import { usePanelStore } from '@/store/panelStore'
import { uploadItem } from '@/lib/api/endpoints/images'
import { BACKEND_URL } from '@/lib/api/config'
import { globalEventBus } from '@/lib/eventBus'

interface PluginState {
  plugins: Record<string, PluginDefinition>
  activePlugins: Array<string>
  knownPlugins: Array<string>

  registerPlugin: (plugin: PluginDefinition) => void
  unregisterPlugin: (pluginId: string) => void
  activatePlugin: (pluginId: string) => void
  deactivatePlugin: (pluginId: string) => void

  // Getters
  getComponents: (location: string) => Array<{ pluginId: string; def: any }>
  getActions: (location: string) => Array<{ pluginId: string; def: any }>

  // External Plugin Loading
  loadExternalPlugins: () => Promise<void>
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      plugins: {},
      activePlugins: [],
      knownPlugins: [],

      loadExternalPlugins: async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/plugins`)
          if (!res.ok) return
          const plugins = await res.json()

          // Expose register function globally for plugins to use
          ;(window as any).Embeddr = {
            ...(window as any).Embeddr,
            registerPlugin: (plugin: PluginDefinition) => {
              get().registerPlugin(plugin)
            },
          }

          for (const plugin of plugins) {
            const script = document.createElement('script')
            // If plugin.url is relative, prepend BACKEND_URL if needed,
            // but usually it's served from the same origin or we need a full URL.
            // The API returns /plugins/filename.js.
            // If we are on localhost:3000 and backend is localhost:8003, we need full URL.
            // BACKEND_URL is usually /api/v1 or http://localhost:8003/api/v1
            // We need the base URL of the backend.

            // Let's assume BACKEND_URL is like http://localhost:8003/api/v1
            // We need http://localhost:8003/plugins/filename.js
            // Or if BACKEND_URL is /api/v1 (proxy), then /plugins/filename.js works if proxy handles it.
            // But proxy usually only handles /api.

            // If BACKEND_URL is absolute, we can derive the base.
            let scriptUrl = plugin.url
            if (BACKEND_URL.startsWith('http')) {
              const url = new URL(BACKEND_URL)
              scriptUrl = `${url.origin}${plugin.url}`
            }

            // Add cache buster
            scriptUrl += `?t=${Date.now()}`

            script.src = scriptUrl
            script.async = true
            document.body.appendChild(script)

            // Try to load CSS if it exists
            // Vite usually outputs style.css if cssCodeSplit is false (default for lib mode?)
            // But we set cssCodeSplit: false in build-plugins.js now.
            // The CSS file name is usually style.css or index.css or based on entry name.
            // In lib mode with fileName 'index.js', it might be 'style.css'.
            // Let's try to load style.css from the same directory.
            const cssUrl = scriptUrl.replace('index.js', 'style.css')
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = cssUrl
            // We don't know if it exists, but adding it won't hurt much (404)
            // Ideally the API should tell us what files are in the plugin dir.
            document.head.appendChild(link)
          }
        } catch (e) {
          console.error('Failed to load external plugins', e)
        }
      },

      registerPlugin: (plugin) => {
        console.log('[PluginStore] Registering plugin:', plugin.id)
        set((state) => {
          if (state.plugins[plugin.id]) {
            // Plugin definition update (optional, but good for HMR)
            return {
              plugins: { ...state.plugins, [plugin.id]: plugin },
            }
          }

          const isKnown = state.knownPlugins.includes(plugin.id)
          const shouldActivate = !isKnown // Default to active if new

          return {
            plugins: { ...state.plugins, [plugin.id]: plugin },
            knownPlugins: isKnown
              ? state.knownPlugins
              : [...state.knownPlugins, plugin.id],
            activePlugins: shouldActivate
              ? [...state.activePlugins, plugin.id]
              : state.activePlugins,
          }
        })
      },

      unregisterPlugin: (pluginId) => {
        set((state) => {
          const { [pluginId]: _, ...rest } = state.plugins
          return {
            plugins: rest,
            activePlugins: state.activePlugins.filter((id) => id !== pluginId),
          }
        })
      },

      activatePlugin: (pluginId) => {
        set((state) => ({
          activePlugins: [...state.activePlugins, pluginId],
        }))
      },

      deactivatePlugin: (pluginId) => {
        set((state) => ({
          activePlugins: state.activePlugins.filter((id) => id !== pluginId),
        }))
      },

      getComponents: (location) => {
        const { plugins, activePlugins } = get()
        const components: Array<{ pluginId: string; def: any }> = []

        activePlugins.forEach((pluginId) => {
          const plugin = plugins[pluginId]
          if (plugin && plugin.components) {
            plugin.components.forEach((comp) => {
              if (comp.location === location) {
                components.push({ pluginId, def: comp })
              }
            })
          }
        })

        return components
      },

      getActions: (location) => {
        const { plugins, activePlugins } = get()
        const actions: Array<{ pluginId: string; def: any }> = []

        activePlugins.forEach((pluginId) => {
          const plugin = plugins[pluginId]
          if (plugin && plugin.actions) {
            plugin.actions.forEach((action) => {
              if (action.location === location) {
                actions.push({ pluginId, def: action })
              }
            })
          }
        })

        return actions
      },
    }),
    {
      name: 'embeddr-plugins',
      partialize: (state) => ({
        activePlugins: state.activePlugins,
        knownPlugins: state.knownPlugins,
      }),
    },
  ),
)
// Helper to extend API with plugin context
export const extendApiForPlugin = (
  api: EmbeddrAPI,
  pluginId: string,
): EmbeddrAPI => {
  return {
    ...api,
    utils: {
      ...api.utils,
      getPluginUrl: (path: string) => {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path
        return `${api.utils.backendUrl}/plugins/${pluginId}/${cleanPath}`
      },
    },
  }
}

// Hook to provide the API to plugins
export const useEmbeddrAPI = (): EmbeddrAPI => {
  const globalStore = useGlobalStore()
  const generation = useGeneration()
  const panelStore = usePanelStore()

  // Memoize stable parts of the API
  const events = useMemo(
    () => ({
      on: (event: string, listener: any) => globalEventBus.on(event, listener),
      off: (event: string, listener: any) =>
        globalEventBus.off(event, listener),
      emit: (event: string, ...args: Array<any>) =>
        globalEventBus.emit(event, ...args),
    }),
    [],
  )

  const toastApi = useMemo(
    () => ({
      success: toast.success,
      error: toast.error,
      info: toast.message,
    }),
    [],
  )

  const utils = useMemo(
    () => ({
      backendUrl: BACKEND_URL,
      uploadImage: async (
        file: File,
        prompt?: string,
        parent_ids?: Array<string | number>,
      ) => {
        const result = await uploadItem({
          file,
          prompt: prompt || '',
          parent_ids,
        })
        globalEventBus.emit('image:uploaded', result)
        return result
      },
      getPluginUrl: (path: string) => {
        console.warn('getPluginUrl called without plugin context')
        return `${BACKEND_URL}/${path.startsWith('/') ? path.slice(1) : path}`
      },
    }),
    [],
  )

  return useMemo(
    () => ({
      stores: {
        global: {
          selectedImage: globalStore.selectedImage,
          selectImage: globalStore.selectImage,
        },
        generation: {
          workflows: generation.workflows,
          selectedWorkflow: generation.selectedWorkflow,
          generations: generation.generations,
          isGenerating: generation.isGenerating,
          generate: generation.generate,
          setWorkflowInput: generation.setWorkflowInput,
          selectWorkflow: generation.selectWorkflow,
        },
      },
      ui: {
        activePanelId: panelStore.activePanelId,
        isPanelActive: (panelId: string) =>
          panelStore.activePanelId === panelId,
      },
      toast: toastApi,
      utils: utils,
      events: events,
    }),
    [
      globalStore.selectedImage,
      globalStore.selectImage,
      generation.workflows,
      generation.selectedWorkflow,
      generation.generations,
      generation.isGenerating,
      generation.generate,
      generation.setWorkflowInput,
      generation.selectWorkflow,
      panelStore.activePanelId,
      events,
      toastApi,
      utils,
    ],
  )
}
