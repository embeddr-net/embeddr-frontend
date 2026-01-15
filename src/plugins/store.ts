import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import React, { useMemo } from 'react'
import type { EmbeddrAPI, PluginDefinition } from '@embeddr/react-ui/types'
import { useGlobalStore } from '@/store/globalStore'
import { useGeneration } from '@/context/GenerationContext'
import { usePanelStore } from '@/store/panelStore'
import { useWindowStore } from '@/store/windowStore'
import { registerWindowComponent } from '@/components/ui/windowRegistry'
import { uploadItem } from '@/lib/api/endpoints/images'
import { BACKEND_URL, BASE_URL, BACKEND_V2_URL } from '@/lib/api/config'
import { globalEventBus } from '@/lib/eventBus'
import { DynamicPluginComponent } from './DynamicLoader'
import * as Icons from 'lucide-react'

function lucideIconFromName(name: string) {
  return (Icons as any)[name] || undefined
}
const LOCATION_MAP: Record<string, any> = {
  ZEN_PANEL: 'zen-toolbox-tab',
  SIDEBAR: 'zen-sidebar',
  OVERLAY: 'zen-overlay',
  HEADER: 'header-nav',

  WINDOW: 'window', // registered, not shown automatically
}

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

  // Storage for backend metadata to merge later
  backendMetadata: Record<string, any>
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      plugins: {},
      activePlugins: [],
      knownPlugins: [],
      backendMetadata: {},

      loadExternalPlugins: async () => {
        try {
          // Use v2 endpoint for plugins as v1 is deprecated/empty for plugins
          const res = await fetch(`${BACKEND_V2_URL}/plugins`)
          if (!res.ok) return
          const plugins = await res.json()

          // Store metadata for lookup during registration
          const metadataMap: Record<string, any> = {}
          plugins.forEach((p: any) => {
            metadataMap[p.id] = p

            // Pre-register frontend components if defined in backend manifest
            if (p.frontend_components && p.frontend_components.length > 0) {
              const virtualDef: PluginDefinition = {
                id: p.id,
                name: p.name || p.id,
                version: p.version || '0.0.0',
                description: '',
                components: p.frontend_components.map((c: any) => ({
                  id: c.name,
                  location: LOCATION_MAP[c.location] || c.location,
                  label: c.label || c.name,

                  // ✅ keep metadata needed by host-owned windows
                  exportName: c.component,
                  props: c.props || {},

                  // optional extras from backend
                  icon: c.icon,
                })),

                actions: (p.frontend_actions || []).map((a: any) => ({
                  id: a.name,
                  location: a.location || 'zen-toolbox-action',
                  label: a.label || a.name,
                  // icon: map string -> lucide component (see below)
                  icon: a.icon ? lucideIconFromName(a.icon) : undefined,

                  // If action has a component, your toolbox UI will render accordion content.
                  component: a.component
                    ? (apiProps: any) =>
                        React.createElement(DynamicPluginComponent, {
                          pluginId: p.id,
                          componentName: a.component,
                          api: apiProps.api,
                          ...(a.props || {}),
                        })
                    : undefined,

                  // If you want button-only actions later:
                  handler: !a.component
                    ? async (api: any) => {
                        // Option A: call server-side action by name (recommended)
                        // await api.actions.runServerAction({ pluginId: p.id, action: a.name })
                      }
                    : undefined,
                })),
              }
              get().registerPlugin(virtualDef)
            }
          })
          set({ backendMetadata: metadataMap })
          ;(window as any).Embeddr = {
            ...(window as any).Embeddr,
            registerPlugin: (plugin: PluginDefinition) => {
              console.log(
                '[Store] Global registerPlugin called for:',
                plugin.id,
              )
              get().registerPlugin(plugin)
            },
          }

          for (const plugin of plugins) {
            const script = document.createElement('script')
            // If plugin.url is relative, prepend BACKEND_URL if needed,
            // but usually it's served from the same origin or we need a full URL.
            // The API returns /plugins/filename.js.
            // If we are on localhost:3000 and backend is localhost:8003, we need full URL.
            // We use BASE_URL which is the root of the backend (e.g. http://localhost:8003).

            let scriptUrl = plugin.url
            if (BASE_URL.startsWith('http')) {
              const url = new URL(BASE_URL)
              scriptUrl = `${url.origin}${plugin.url}`
            }

            // Add cache buster
            scriptUrl += `?t=${Date.now()}`

            script.src = scriptUrl
            script.async = true
            script.onload = () => {
              console.log(
                `[PluginStore] Successfully loaded script for ${plugin.id}: ${scriptUrl}`,
              )
            }
            script.onerror = (e) => {
              console.error(
                `[PluginStore] FAILED to load script for ${plugin.id}: ${scriptUrl}`,
                e,
              )
            }
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

        // Merge backend metadata if available (intents, etc)
        const metadata = get().backendMetadata[plugin.id]
        if (metadata && metadata.intents) {
          plugin.intents = metadata.intents
        }

        set((state) => {
          if (state.plugins[plugin.id]) {
            // Plugin definition update (optional, but good for HMR)
            return {
              plugins: { ...state.plugins, [plugin.id]: plugin },
            }
          }

          const isKnown = state.knownPlugins.includes(plugin.id)
          const isActive = state.activePlugins.includes(plugin.id)

          return {
            plugins: { ...state.plugins, [plugin.id]: plugin },
            knownPlugins: isKnown
              ? state.knownPlugins
              : [...state.knownPlugins, plugin.id],
            activePlugins: isActive
              ? state.activePlugins
              : [...state.activePlugins, plugin.id],
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
  if (!api || !api.utils) {
    console.error(
      '[PluginStore] extendApiForPlugin called with invalid api:',
      api,
    )
    return api
  }
  return {
    ...api,
    utils: {
      ...api.utils,
      getPluginUrl: (path: string) => {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path
        return `${BACKEND_V2_URL}/plugins/${pluginId}/${cleanPath}`
      },
    },
  }
}

// Hook to provide the API to plugins
export const useEmbeddrAPI = (): EmbeddrAPI => {
  const globalStore = useGlobalStore()
  const generation = useGeneration()
  const panelStore = usePanelStore()
  const windowStore = useWindowStore()

  // Memoize stable parts of the API
  const events = useMemo(
    () => ({
      on: (event: any, listener: any) => globalEventBus.on(event, listener),
      off: (event: any, listener: any) => globalEventBus.off(event, listener),
      emit: (event: any, ...args: Array<any>) =>
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

  const comfy = useMemo(
    () => ({
      getLoras: async (page = 1, limit = 60) => {
        try {
          const res = await fetch(
            `${BACKEND_URL}/comfy/loras?page=${page}&limit=${limit}`,
          )
          if (!res.ok) return { items: [], total: 0, page, limit, pages: 0 }
          return await res.json()
        } catch (e) {
          console.error('Failed to fetch LoRAs', e)
          return { items: [], total: 0, page, limit, pages: 0 }
        }
      },
      getCheckpoints: async (page = 1, limit = 60) => {
        try {
          const res = await fetch(
            `${BACKEND_URL}/comfy/checkpoints?page=${page}&limit=${limit}`,
          )
          if (!res.ok) return { items: [], total: 0, page, limit, pages: 0 }
          return await res.json()
        } catch (e) {
          console.error('Failed to fetch Checkpoints', e)
          return { items: [], total: 0, page, limit, pages: 0 }
        }
      },
      getEmbeddings: async (page = 1, limit = 60) => {
        try {
          const res = await fetch(
            `${BACKEND_URL}/comfy/embeddings?page=${page}&limit=${limit}`,
          )
          if (!res.ok) return { items: [], total: 0, page, limit, pages: 0 }
          return await res.json()
        } catch (e) {
          console.error('Failed to fetch Embeddings', e)
          return { items: [], total: 0, page, limit, pages: 0 }
        }
      },
      getSamplers: async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/comfy/samplers`)
          if (!res.ok) return { samplers: [], schedulers: [] }
          return await res.json()
        } catch (e) {
          console.error('Failed to fetch Samplers', e)
          return { samplers: [], schedulers: [] }
        }
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
      windows: {
        open: (id: string, title: string, componentId: string, props?: any) => {
          windowStore.openWindow({ id, title, componentId, props })
        },

        spawn: (componentId: string, title: string, props?: any) => {
          const id = crypto.randomUUID()
          windowStore.openWindow({ id, title, componentId, props })
          return id
        },

        register: (id: string, component: any) => {
          registerWindowComponent(id, component)
        },
      },
      toast: toastApi,
      utils: utils,
      client: {
        plugins: {
          call: async <T = any>(
            pluginId: string,
            path: string,
            method: string,
            body?: any,
          ): Promise<T> => {
            const cleanPath = path.startsWith('/') ? path.slice(1) : path
            const url = `${BACKEND_V2_URL}/plugins/${pluginId}/${cleanPath}`

            const headers: Record<string, string> = {}
            if (body) headers['Content-Type'] = 'application/json'

            const res = await fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            })

            if (!res.ok) {
              const text = await res.text()
              throw new Error(`Plugin API Call failed: ${res.status} ${text}`)
            }
            return res.json()
          },
        },
      },
      events: events,
      comfy: comfy,
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
      comfy,
    ],
  )
}
