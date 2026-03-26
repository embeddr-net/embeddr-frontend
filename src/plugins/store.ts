import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import React, { useMemo } from 'react'
import type { EmbeddrAPI, PluginDefinition } from '@embeddr/zen-shell'
import { useGlobalStore } from '@/store/globalStore'
import { useUserStore } from '@/store/userStore'
import { useGeneration } from '@/context/GenerationContext'
import { usePanelStore } from '@/store/panelStore'
import { useWindowStore } from '@/store/windowStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useSettingsStore } from '@/store/settingsStore'
import { registerWindowComponent } from '@/components/ui/windowRegistry'
import { uploadItem } from '@/lib/api/endpoints/images'
import { BACKEND_URL, BASE_URL } from '@/lib/api/config'
import { globalEventBus } from '@/lib/eventBus'
import { fetchWithAuth } from '@/lib/api/fetch'
import {
  loadExternalPlugins as loadExternalPluginsZen,
  registerPlugin as registerZenPlugin,
  unregisterPlugin as unregisterZenPlugin,
  usePluginRegistry,
  type PluginLoaderAdapter,
  type PluginManifest,
} from '@embeddr/zen-shell'
import { fetchPluginManifests } from '@/lib/api/endpoints/plugins'

interface PluginState {
  plugins: Record<string, PluginDefinition>
  activePlugins: Array<string>
  knownPlugins: Array<string>
  isLoadingExternal: boolean
  hasLoadedExternal: boolean

  registerPlugin: (plugin: PluginDefinition) => void
  unregisterPlugin: (pluginId: string) => void
  activatePlugin: (pluginId: string) => void
  deactivatePlugin: (pluginId: string) => void

  // Getters
  getComponents: (location: string) => Array<{ pluginId: string; def: any }>
  getActions: (location: string) => Array<{ pluginId: string; def: any }>

  // External Plugin Loading
  loadExternalPlugins: (options?: { force?: boolean }) => Promise<void>

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
      isLoadingExternal: false,
      hasLoadedExternal: false,

      loadExternalPlugins: async (options) => {
        const force = options?.force ?? false
        const state = get()
        if (state.isLoadingExternal) {
          return
        }
        if (!force && state.hasLoadedExternal) {
          return
        }
        if (force) {
          set({ hasLoadedExternal: false })
        }
        set({ isLoadingExternal: true })
        try {
          const ensureRegistrySync = () => {
            if ((window as any).__embeddrRegistrySync) return
            ;(window as any).__embeddrRegistrySync =
              usePluginRegistry.subscribe((state) => {
                set({
                  plugins: state.plugins,
                  activePlugins: state.activePlugins,
                  knownPlugins: state.knownPlugins,
                  backendMetadata: state.backendMetadata,
                })
              })
          }

          const adapter: PluginLoaderAdapter = {
            list: async () => {
              return fetchPluginManifests()
            },
            resolveScriptUrl: (manifest) => {
              const plugin = manifest as any
              let scriptUrl = plugin.url
              if (!scriptUrl) return ''
              if (BACKEND_URL.startsWith('http')) {
                const url = new URL(BACKEND_URL)
                scriptUrl = `${url.origin}${plugin.url}`
              }
              return scriptUrl
            },
            resolveCssUrl: (manifest) => {
              const plugin = manifest as any
              const cssUrl = plugin.css_url
              if (!cssUrl) return null
              if (BACKEND_URL.startsWith('http')) {
                const url = new URL(BACKEND_URL)
                return `${url.origin}${cssUrl}`
              }
              return cssUrl
            },
          }

          ensureRegistrySync()
          await loadExternalPluginsZen({ adapter, cacheBust: force })
          set({ hasLoadedExternal: true })
        } catch (e) {
          console.error('Failed to load external plugins', e)
          set({ hasLoadedExternal: true })
        } finally {
          set({ isLoadingExternal: false })
        }
      },

      registerPlugin: (plugin) => {
        registerZenPlugin(plugin)
        const registry = usePluginRegistry.getState()
        set({
          plugins: registry.plugins,
          activePlugins: registry.activePlugins,
          knownPlugins: registry.knownPlugins,
          backendMetadata: registry.backendMetadata,
        })
      },

      unregisterPlugin: (pluginId) => {
        unregisterZenPlugin(pluginId)
        const registry = usePluginRegistry.getState()
        set({
          plugins: registry.plugins,
          activePlugins: registry.activePlugins,
          knownPlugins: registry.knownPlugins,
          backendMetadata: registry.backendMetadata,
        })
      },

      activatePlugin: (pluginId) => {
        usePluginRegistry.getState().activatePlugin(pluginId)
        const registry = usePluginRegistry.getState()
        set({
          plugins: registry.plugins,
          activePlugins: registry.activePlugins,
          knownPlugins: registry.knownPlugins,
          backendMetadata: registry.backendMetadata,
        })
      },

      deactivatePlugin: (pluginId) => {
        usePluginRegistry.getState().deactivatePlugin(pluginId)
        const registry = usePluginRegistry.getState()
        set({
          plugins: registry.plugins,
          activePlugins: registry.activePlugins,
          knownPlugins: registry.knownPlugins,
          backendMetadata: registry.backendMetadata,
        })
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
const extendedApiCache = new WeakMap<EmbeddrAPI, Map<string, EmbeddrAPI>>()

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

  const pluginCache = extendedApiCache.get(api)
  if (pluginCache?.has(pluginId)) {
    return pluginCache.get(pluginId) as EmbeddrAPI
  }

  const extended = {
    ...api,
    utils: {
      ...api.utils,
      getPluginUrl: (path: string) => {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path
        return `${BACKEND_URL}/plugins/${pluginId}/${cleanPath}`
      },
    },
    plugin: {
      fetch: async (path: string, init?: RequestInit) => {
        // Handle absolute or relative paths
        let url = path
        if (!path.startsWith('http')) {
          const cleanPath = path.startsWith('/') ? path.slice(1) : path
          url = `${BACKEND_URL}/plugins/${pluginId}/${cleanPath}`
        }
        return fetchWithAuth(url, init)
      },
      request: async (path: string, init?: RequestInit) => {
        // Reuse the fetch implementation above via closure or direct logic
        // We can't access 'extended.plugin.fetch' easily inside definition, so duping logic or moving it out.
        // Actually since we are inside the closure of 'extended', we can just use the same logic.
        let url = path
        if (!path.startsWith('http')) {
          const cleanPath = path.startsWith('/') ? path.slice(1) : path
          url = `${BACKEND_URL}/plugins/${pluginId}/${cleanPath}`
        }

        // Add default Content-Type if body exists and not set
        const options = { ...init }
        if (
          options.body &&
          typeof options.body === 'string' &&
          !options.headers
        ) {
          options.headers = { 'Content-Type': 'application/json' }
        }

        const res = await fetchWithAuth(url, options)
        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText)
          let errorJson
          try {
            errorJson = JSON.parse(errorText)
          } catch {}
          throw new Error(
            errorJson?.detail ||
              errorJson?.error ||
              errorText ||
              `Request failed: ${res.status}`,
          )
        }
        return res.json()
      },
    },
  }

  if (pluginCache) {
    pluginCache.set(pluginId, extended)
  } else {
    extendedApiCache.set(api, new Map([[pluginId, extended]]))
  }

  return extended
}

// Hook to provide the API to plugins
export const useEmbeddrAPI = (): EmbeddrAPI => {
  const globalStore = useGlobalStore()
  const generation = useGeneration()
  // Avoid subscribing to panel store to reduce API object churn
  // const windowStore = useWindowStore() // Removed to prevent re-renders on every window move

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

  const utils = useMemo(() => {
    const getPanels = () => {
      const windows = useWindowStore.getState().windows
      const panelOrder = useWindowStore.getState().panelOrder
      const hoverPanelId = useWindowStore.getState().hoverPanelId
      const activeId = panelOrder[panelOrder.length - 1]
      return Object.values(windows).map((win) => ({
        id: win.id,
        componentId: win.componentId,
        title: win.title,
        position: win.position,
        size: win.size,
        isPinned: win.isPinned,
        isMinimized: win.isMinimized,
        isBackdrop: useWindowStore.getState().backdropWindowId === win.id,
        isActive: activeId === win.id,
        isHovered: hoverPanelId === win.id,
      }))
    }

    return {
      backendUrl: BACKEND_URL,
      getApiKey: () => useUserStore.getState().apiKey,
      withApiKey: (url: string) => {
        const apiKey = useUserStore.getState().apiKey
        if (!apiKey || !url) return url
        try {
          const u = new URL(url, window.location.origin)
          if (u.pathname.includes('/api/')) {
            u.searchParams.set('api_key', apiKey)
            return u.toString()
          }
        } catch {}
        return url
      },
      getPanels,
      subscribePanelState: (listener: (panels: any[]) => void) => {
        const store = useWindowStore
        const notify = () => listener(getPanels())
        notify()
        return store.subscribe(notify)
      },
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
    }
  }, [])

  const pluginApi = useMemo(
    () => ({
      fetch: async () => {
        throw new Error('api.plugin.fetch called outside of plugin context')
      },
      request: async () => {
        throw new Error('api.plugin.request called outside of plugin context')
      },
    }),
    [],
  )

  const artifacts = useMemo(() => {
    const list = async (input: {
      limit?: number
      offset?: number
      q?: string
      access_scope?: 'personal' | 'instance'
      type_name?: string
      visibility?: 'all' | 'public' | 'private'
      sort?: 'new' | 'random'
      ids?: string[]
    }) => {
      const q = new URLSearchParams()
      if (input.limit !== undefined) q.append('limit', `${input.limit}`)
      if (input.offset !== undefined) q.append('offset', `${input.offset}`)
      if (input.q) q.append('q', input.q)
      if (input.access_scope) q.append('access_scope', input.access_scope)
      if (input.type_name) q.append('type_name', input.type_name)
      if (input.visibility && input.visibility !== 'all') {
        q.append('visibility', input.visibility)
      }
      if (input.sort) q.append('sort', input.sort)
      if (input.ids?.length) input.ids.forEach((id) => q.append('ids', id))

      const res = await fetchWithAuth(
        `${BACKEND_URL}/artifacts/?${q.toString()}`,
      )
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to list artifacts')
      }

      return res.json()
    }

    const getContentUrl = (id: string) => {
      const base = `${BACKEND_URL}/artifacts/${id}/content`
      const apiKey = useUserStore.getState().apiKey
      if (apiKey) {
        try {
          const url = new URL(base)
          url.searchParams.set('api_key', apiKey)
          return url.toString()
        } catch {
          return `${base}?api_key=${encodeURIComponent(apiKey)}`
        }
      }
      return base
    }

    const resolve = async (input: {
      id: string
      variant?: 'preview' | 'original'
    }) => {
      const params = new URLSearchParams()
      if (input.variant) params.append('variant', input.variant)
      const qs = params.toString()
      const res = await fetchWithAuth(
        `${BACKEND_URL}/artifacts/${input.id}/resolve${qs ? `?${qs}` : ''}`,
      )
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to resolve artifact')
      }
      return res.json()
    }

    const create = async (input: {
      type_name: string
      uri?: string
      metadata_json?: Record<string, any>
      override_capabilities?: Array<string>
      base_type_name?: string
      confirm?: boolean
    }) => {
      const res = await fetchWithAuth(
        `${BACKEND_URL}/lotus/embeddr-core.artifact.create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to create artifact')
      }

      return res.json()
    }

    const update = async (
      id: string,
      input: {
        metadata_json?: Record<string, any>
        override_capabilities?: Array<string>
        uri?: string
        type_name?: string
        base_type_name?: string
        visibility?: 'public' | 'private'
      },
    ) => {
      const res = await fetchWithAuth(`${BACKEND_URL}/artifacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to update artifact')
      }

      return res.json()
    }

    const remove = async (id: string) => {
      const res = await fetchWithAuth(`${BACKEND_URL}/artifacts/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to delete artifact')
      }

      return res.json()
    }

    const uploadInit = async (input: {
      artifact_id: string
      filename?: string
      content_type?: string
      size?: number
      confirm?: boolean
    }) => {
      const res = await fetchWithAuth(
        `${BACKEND_URL}/lotus/embeddr-core.artifact.upload.init`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to init upload')
      }

      return res.json()
    }

    const uploadComplete = async (input: {
      upload_id: string
      confirm?: boolean
    }) => {
      const res = await fetchWithAuth(
        `${BACKEND_URL}/lotus/embeddr-core.artifact.upload.complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to complete upload')
      }

      return res.json()
    }

    const uploadFile = async (input: { artifact_id: string; file: File }) => {
      const init = await uploadInit({
        artifact_id: input.artifact_id,
        filename: input.file.name,
        content_type: input.file.type,
        size: input.file.size,
        confirm: true,
      })

      const uploadPath = init.upload_path as string
      const formData = new FormData()
      formData.append('file', input.file)

      const uploadUrl = uploadPath.startsWith('http')
        ? uploadPath
        : uploadPath.startsWith('/api/')
          ? `${BASE_URL}${uploadPath}`
          : `${BACKEND_URL}${uploadPath}`

      const uploadRes = await fetchWithAuth(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const txt = await uploadRes.text()
        throw new Error(txt || 'Upload failed')
      }

      const uploaded = await uploadRes.json()
      const complete = await uploadComplete({
        upload_id: init.upload_id,
        confirm: true,
      })

      return { init, uploaded, complete }
    }

    const get = async (
      id: string,
      input?: { include_owner_profiles?: boolean },
    ) => {
      const q = new URLSearchParams()
      if (input?.include_owner_profiles) {
        q.append('include_owner_profiles', 'true')
      }

      const res = await fetchWithAuth(
        `${BACKEND_URL}/artifacts/${id}${q.toString() ? `?${q.toString()}` : ''}`,
      )
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to get artifact')
      }
      return res.json()
    }

    const getRelations = async (id: string) => {
      const res = await fetchWithAuth(
        `${BACKEND_URL}/artifacts/${id}/relations`,
      )
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to get relations')
      }
      return res.json()
    }

    const queryGraph = async (input: {
      seed_ids: string[]
      max_depth?: number
      direction?: 'incoming' | 'outgoing' | 'both'
      include_lineage?: boolean
      include_relations?: boolean
      limit_nodes?: number
      limit_edges?: number
      include_overlay_counts?: boolean
      filters?: {
        relation_types_include?: string[]
        relation_types_exclude?: string[]
        relation_families_include?: string[]
        source_namespaces_include?: string[]
        source_namespaces_exclude?: string[]
        artifact_types_include?: string[]
        artifact_base_types_include?: string[]
        include_legacy_stash_contains?: boolean
      }
    }) => {
      const res = await fetchWithAuth(`${BACKEND_URL}/artifacts/graph/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to query graph')
      }
      return res.json()
    }

    const getGraphTaxonomy = async () => {
      const res = await fetchWithAuth(`${BACKEND_URL}/artifacts/graph/taxonomy`)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to fetch graph taxonomy')
      }
      return res.json()
    }

    const addRelation = async (
      sourceId: string,
      input: {
        target_id: string
        relation_type?: string
        metadata_json?: Record<string, any>
      },
    ) => {
      const res = await fetchWithAuth(
        `${BACKEND_URL}/artifacts/${sourceId}/relations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_id: input.target_id,
            relation_type: input.relation_type || 'contains',
            metadata_json: input.metadata_json || {},
          }),
        },
      )

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to create relation')
      }

      return res.json()
    }

    return {
      list,
      get,
      getRelations,
      queryGraph,
      getGraphTaxonomy,
      addRelation,
      getContentUrl,
      resolve,
      create,
      update,
      delete: remove,
      uploadInit,
      uploadComplete,
      uploadFile,
    }
  }, [])

  const resources = useMemo(() => {
    const resolve = async (input: {
      artifactId?: string
      url?: string
      hintType?: string
      adapterId?: string
      artifactPayload?: Record<string, any>
    }) => {
      const { artifactId, url, hintType, adapterId, artifactPayload } = input

      if (artifactPayload?.content_url && artifactPayload?.preview_url) {
        return {
          ...artifactPayload,
          id: artifactPayload.id ?? artifactId,
          type: artifactPayload.type ?? hintType,
          content_url: artifactPayload.content_url,
          preview_url: artifactPayload.preview_url,
          url: artifactPayload.url ?? url,
        }
      }

      if (artifactId && !url) {
        const apiKey = useUserStore.getState().apiKey
        const appendAuth = (base: string) => {
          if (!apiKey) return base
          try {
            const u = new URL(base)
            u.searchParams.set('api_key', apiKey)
            return u.toString()
          } catch {
            return `${base}?api_key=${encodeURIComponent(apiKey)}`
          }
        }
        return {
          id: artifactId,
          type: hintType || 'image',
          content_url: appendAuth(
            `${BACKEND_URL}/artifacts/${artifactId}/content`,
          ),
          preview_url: appendAuth(
            `${BACKEND_URL}/artifacts/${artifactId}/preview`,
          ),
        }
      }

      const res = await fetchWithAuth(`${BACKEND_URL}/resources/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact_id: artifactId,
          url,
          hint_type: hintType,
          adapter_id: adapterId,
        }),
      })
      if (res.ok) return res.json()

      if (url) {
        return {
          id: artifactId,
          type: hintType || 'image',
          content_url: url,
          preview_url: url,
          url,
        }
      }

      return {
        id: artifactId,
        type: hintType || 'image',
      }
    }

    return { resolve }
  }, [])

  const settings = useMemo(
    () => ({
      get: <T = any>(key: string, defaultValue?: T) =>
        useSettingsStore.getState().getSetting(key, defaultValue),
      set: (key: string, value: any) =>
        useSettingsStore.getState().setSetting(key, value),
      getPlugin: <T = any>(pluginId: string, key: string, defaultValue?: T) =>
        useSettingsStore
          .getState()
          .getPluginSetting(pluginId, key, defaultValue),
      setPlugin: (pluginId: string, key: string, value: any) =>
        useSettingsStore.getState().setPluginSetting(pluginId, key, value),
    }),
    [],
  )

  const models = useMemo(
    () => ({
      list: async (input: { category: string; page?: number; limit?: number }) => {
        const page = input.page || 1
        const limit = input.limit || 60
        const category = (input.category || '').trim().toLowerCase()
        let endpoint = 'loras'
        if (category === 'checkpoints') endpoint = 'checkpoints'
        else if (category === 'embeddings') endpoint = 'embeddings'

        try {
          const res = await fetchWithAuth(
            `${BACKEND_URL}/comfy/${endpoint}?page=${page}&limit=${limit}`,
          )
          if (!res.ok)
            return { items: [], total: 0, page, limit, pages: 0, category }
          const payload = await res.json()
          return { ...payload, category }
        } catch (e) {
          console.error(`Failed to fetch model catalog category=${category}`, e)
          return { items: [], total: 0, page, limit, pages: 0, category }
        }
      },
      listSamplers: async () => {
        try {
          const res = await fetchWithAuth(`${BACKEND_URL}/comfy/samplers`)
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

  const security = useMemo(
    () => ({
      overview: async () => {
        const res = await fetchWithAuth(`${BACKEND_URL}/security/overview`)
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || 'Failed to load security overview')
        }
        return res.json()
      },
      operatorProfile: async () => {
        const res = await fetchWithAuth(`${BACKEND_URL}/security/operator`)
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || 'Failed to load operator profile')
        }
        return res.json()
      },
    }),
    [],
  )

  return useMemo(() => {
    const api = {
      stores: {
        global: {
          selectedImage: globalStore.selectedImage,
          selectImage: globalStore.selectImage,
        },
        execution: {
          pipelines: generation.workflows,
          selectedPipeline: generation.selectedWorkflow,
          runs: generation.generations,
          isRunning: generation.isGenerating,
          run: generation.generate,
          setPipelineInput: generation.setWorkflowInput,
          selectPipeline: generation.selectWorkflow,
        },
      },
      ui: {
        get activePanelId() {
          return usePanelStore.getState().activePanelId
        },
        isPanelActive: (panelId: string) =>
          usePanelStore.getState().activePanelId === panelId,
      },
      workspaces: {
        getState: () => useWorkspaceStore.getState(),
        subscribe: (listener: (state: any) => void) =>
          useWorkspaceStore.subscribe(listener),
        list: () => useWorkspaceStore.getState().listWorkspaces(),
        getActiveId: () => useWorkspaceStore.getState().activeWorkspaceId,
        ensureDefault: () =>
          useWorkspaceStore.getState().ensureDefaultWorkspace(),
        create: (
          name: string,
          options?: { fromCurrent?: boolean; isTemplate?: boolean },
        ) => useWorkspaceStore.getState().createWorkspace(name, options),
        save: (id: string) => useWorkspaceStore.getState().saveWorkspace(id),
        saveActive: () => useWorkspaceStore.getState().saveActiveWorkspace(),
        apply: (id: string) =>
          useWorkspaceStore.getState().setActiveWorkspace(id),
        rename: (id: string, name: string) =>
          useWorkspaceStore.getState().renameWorkspace(id, name),
        clone: (id: string, name?: string) =>
          useWorkspaceStore.getState().cloneWorkspace(id, name),
        remove: (id: string) =>
          useWorkspaceStore.getState().deleteWorkspace(id),
        setTemplate: (id: string, isTemplate: boolean) =>
          useWorkspaceStore.getState().setTemplate(id, isTemplate),
      },
      windows: {
        open: (id: string, title: string, componentId: string, props?: any) => {
          useWindowStore
            .getState()
            .openWindow({ id, title, componentId, props })
        },

        spawn: (componentId: string, title: string, props?: any) => {
          const id = crypto.randomUUID()
          useWindowStore
            .getState()
            .openWindow({ id, title, componentId, props })
          return id
        },

        register: (id: string, component: any) => {
          registerWindowComponent(id, component)
        },
        getState: () => useWindowStore.getState(),
        list: () => Object.values(useWindowStore.getState().windows),
      },
      toast: toastApi,
      settings: settings,
      utils: utils,
      executions: {
        create: async (input: {
          plugin_name: string
          job_type?: string
          inputs?: Record<string, any>
          action_id?: string
          parameters?: Record<string, any>
        }) => {
          const jobType = input.job_type || input.action_id
          const inputs = input.inputs || input.parameters || {}
          const res = await fetchWithAuth(`${BACKEND_URL}/executions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              plugin_name: input.plugin_name,
              job_type: jobType,
              inputs,
            }),
          })
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Execution failed')
          }
          return res.json()
        },
        get: async (executionId: string) => {
          const res = await fetchWithAuth(
            `${BACKEND_URL}/executions/${executionId}`,
          )
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Execution lookup failed')
          }
          return res.json()
        },
        list: async (input?: {
          plugin_name?: string
          status?: string
          limit?: number
          offset?: number
        }) => {
          const params = new URLSearchParams()
          if (input?.plugin_name) params.set('plugin_name', input.plugin_name)
          if (input?.status) params.set('status', input.status)
          if (input?.limit != null) params.set('limit', String(input.limit))
          if (input?.offset != null) params.set('offset', String(input.offset))
          const qs = params.toString()
          const res = await fetchWithAuth(
            `${BACKEND_URL}/executions${qs ? `?${qs}` : ''}`,
          )
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Execution list failed')
          }
          return res.json()
        },
        cancel: async (executionId: string) => {
          const res = await fetchWithAuth(
            `${BACKEND_URL}/executions/${executionId}/cancel`,
            {
              method: 'POST',
            },
          )
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Execution cancel failed')
          }
          return res.json()
        },
        nudge: async (
          executionId: string,
          input:
            | string
            | {
                message: string
                mode?: 'steer' | 'goal_replace'
                goal?: string
              },
        ) => {
          const payload = typeof input === 'string' ? { message: input } : input
          const res = await fetchWithAuth(
            `${BACKEND_URL}/executions/${executionId}/nudge`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          )
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Execution nudge failed')
          }
          return res.json()
        },
      },
      lotus: {
        invoke: async (capId: string, input?: Record<string, any>) => {
          const res = await fetchWithAuth(`${BACKEND_URL}/lotus/${capId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input ?? {}),
          })
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Lotus invoke failed')
          }
          return res.json()
        },
        query: async (q: string, limit = 20) => {
          const params = new URLSearchParams({ q, limit: String(limit) })
          const res = await fetchWithAuth(
            `${BACKEND_URL}/lotus/query?${params.toString()}`,
          )
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Lotus query failed')
          }
          return res.json()
        },
        list: async (input?: {
          kind?: string
          plugin?: string
          slot?: string
          limit?: number
          offset?: number
        }) => {
          const params = new URLSearchParams()
          if (input?.kind) params.append('kind', input.kind)
          if (input?.plugin) params.append('plugin', input.plugin)
          if (input?.slot) params.append('slot', input.slot)
          if (input?.limit !== undefined)
            params.append('limit', String(input.limit))
          if (input?.offset !== undefined)
            params.append('offset', String(input.offset))
          const qs = params.toString()
          const res = await fetchWithAuth(
            `${BACKEND_URL}/lotus/list${qs ? `?${qs}` : ''}`,
          )
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Lotus list failed')
          }
          return res.json()
        },
      },
      plugin: pluginApi,
      plugins: {
        list: async () => {
          const res = await fetchWithAuth(`${BACKEND_URL}/plugins`)
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Failed to list plugins')
          }
          return res.json()
        },
        listLogos: async () => {
          const res = await fetchWithAuth(`${BACKEND_URL}/plugins/logos`)
          if (!res.ok) {
            const txt = await res.text()
            throw new Error(txt || 'Failed to list plugin logos')
          }
          const data = await res.json()
          return (data?.logos || {}) as Record<string, string | null>
        },
        getComponents: (location: string) =>
          usePluginStore.getState().getComponents(location),
        getActions: (location: string) =>
          usePluginStore.getState().getActions(location),
        getApi: (pluginId: string) => extendApiForPlugin(api as any, pluginId),
      },
      security,
      artifacts,
      resources,
      client: {
        plugins: {
          call: async <T = any>(
            pluginId: string,
            path: string,
            method: string,
            body?: any,
          ): Promise<T> => {
            const cleanPath = path.startsWith('/') ? path.slice(1) : path
            const url = `${BACKEND_URL}/plugins/${pluginId}/${cleanPath}`

            const headers: Record<string, string> = {}
            if (body) headers['Content-Type'] = 'application/json'

            const res = await fetchWithAuth(url, {
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
      models: models,
    }

    return api
  }, [
    globalStore.selectedImage,
    globalStore.selectImage,
    generation.workflows,
    generation.selectedWorkflow,
    generation.generations,
    generation.isGenerating,
    generation.generate,
    generation.setWorkflowInput,
    generation.selectWorkflow,
    events,
    toastApi,
    settings,
    utils,
    models,
    security,
  ])
}
