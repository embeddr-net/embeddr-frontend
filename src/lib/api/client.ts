import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserStore } from '@/store/userStore'
import { BACKEND_URL, BASE_URL } from './config'
import { fetchWithAuth } from '@/lib/api/fetch'
import type {
  Artifact,
  ArtifactAnnotation,
  ArtifactEmbedding,
  ArtifactExecution,
  ArtifactRelation,
  ArtifactGraphQueryRequest,
  ArtifactGraphQueryResponse,
  ArtifactGraphTaxonomy,
  ArtifactTypeCountsResponse,
  AutomationListResponse,
  AutomationUpsertResponse,
  CollectionResponse,
  CommandResult,
  Execution,
  ExecutionArtifactLink,
  ExecutionEvent,
  IngestionPipelineConfig,
  InstanceProfile,
  LineageResponse,
  LotusCapabilityListResponse,
  MaintenanceFixTypesResponse,
  MaintenancePruneResponse,
  MaintenanceRunResponse,
  MaintenanceScript,
  ArtifactRegistryResponse,
  RelationOntologyResponse,
  PaginatedResponse,
  PublicSystemInfo,
  PluginAction,
  RoutesResponse,
  ScannerTypeInfo,
} from './types'

export interface SystemInfoResponse {
  version: string
  dev_mode: boolean
  instance?: InstanceProfile
  db_version?: string | null
  db: {
    provider: string
    url: {
      driver?: string
      dialect?: string
      username?: string | null
      password?: string | null
      host?: string | null
      port?: number | null
      database?: string | null
    }
    connected: boolean
    latency_ms?: number | null
    error?: string | null
    supports_backup?: boolean
    latest_backup?: string | null
  }
  stats: {
    images: number
    libraries: number
    artifacts?: number
    collections?: number
  }
}

export interface BlobRegistryResponse {
  providers: string[]
  resolvers: string[]
  provider_resolvers: Record<string, string>
  default_provider?: string | null
  default_resolver?: string | null
  config?: Record<string, any>
}

export interface ResourceAdapterInfo {
  id: string
  plugin?: string | null
  title?: string | null
  description?: string | null
  tags?: string[]
  adapter?: {
    match?: Record<string, any>
  }
}

export interface ResourceAdaptersResponse {
  adapters: ResourceAdapterInfo[]
}

export interface ResourceResolveRequest {
  artifact_id?: string
  url?: string
  hint_type?: string
  adapter_id?: string
}

export interface AuthSessionOperatorInfo {
  id: string
  name: string
  display_name?: string | null
  is_root?: boolean
}

export interface AuthSessionUserInfo {
  id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  is_admin?: boolean
}

export interface AuthSessionClientKeyInfo {
  id: string
  name: string
  key_prefix?: string | null
  scopes: string[]
  permissions: string[]
  is_active?: boolean
  expires_at?: string | null
  last_used_at?: string | null
}

export interface AuthSessionInfo {
  auth_mode: string
  auth_enabled: boolean
  operator?: AuthSessionOperatorInfo | null
  user?: AuthSessionUserInfo | null
  client_key?: AuthSessionClientKeyInfo | null
  permissions: string[]
}

class EmbeddrApi {
  private baseUrl: string

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers = new Headers(options.headers || {})

    const config: RequestInit = {
      ...options,
      headers,
      credentials: options.credentials ?? 'include',
    }

    const response = await fetchWithAuth(url, config)

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private withApiKey(url: string) {
    const token = useUserStore.getState().apiKey
    if (!token) return url
    const [base, query] = url.split('?')
    const params = new URLSearchParams(query || '')
    if (!params.has('api_key')) {
      params.set('api_key', token)
    }
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  public auth = {
    setSession: async (options?: {
      apiKey?: string | null
      clear?: boolean
    }) => {
      const token = options?.apiKey ?? useUserStore.getState().apiKey
      const headers = new Headers({ 'Content-Type': 'application/json' })
      if (token) headers.set('X-API-Key', token)

      const response = await fetch(`${this.baseUrl}/system/auth/session`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ clear: !!options?.clear }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
  }

  public artifacts = {
    list: (params: {
      limit?: number
      offset?: number
      q?: string
      access_scope?: 'personal' | 'instance'
      type_name?: string
      visibility?: 'all' | 'public' | 'private'
      media_type?: string
      tags?: string[]
      collection_id?: string
      library_id?: string
      parent_id?: string
      recursive?: boolean
      sort?: 'new' | 'random'
      is_archived?: boolean
      provider?: string
      import_source?: string
      import_instance?: string
      origin?: string
    }) => {
      const q = new URLSearchParams()
      q.append('limit', (params.limit || 50).toString())
      q.append('offset', (params.offset || 0).toString())
      if (params.q) q.append('q', params.q)
      if (params.access_scope) q.append('access_scope', params.access_scope)
      if (params.type_name) q.append('type_name', params.type_name)
      if (params.visibility && params.visibility !== 'all') {
        q.append('visibility', params.visibility)
      }
      if (params.media_type) q.append('media_type', params.media_type)
      if (params.collection_id) q.append('collection_id', params.collection_id)
      if (params.library_id) q.append('library_id', params.library_id)
      if (params.parent_id) q.append('parent_id', params.parent_id)
      if (params.recursive !== undefined) {
        q.append('recursive', params.recursive.toString())
      }
      if (params.sort) q.append('sort', params.sort)
      if (params.is_archived !== undefined) {
        q.append('is_archived', params.is_archived.toString())
      }
      if (params.provider) q.append('provider', params.provider)
      if (params.import_source) q.append('import_source', params.import_source)
      if (params.import_instance) {
        q.append('import_instance', params.import_instance)
      }
      if (params.origin) q.append('origin', params.origin)
      if (params.tags) {
        params.tags.forEach((tag) => q.append('tags', tag))
      }

      return this.request<PaginatedResponse<Artifact>>(
        `/artifacts/?${q.toString()}`,
      )
    },

    get: (id: string, input?: { include_owner_profiles?: boolean }) => {
      const q = new URLSearchParams()
      if (input?.include_owner_profiles) {
        q.append('include_owner_profiles', 'true')
      }
      return this.request<Artifact>(
        `/artifacts/${id}${q.toString() ? `?${q.toString()}` : ''}`,
      )
    },

    getEmbeddings: (id: string) =>
      this.request<ArtifactEmbedding[]>(`/artifacts/${id}/embeddings`),

    getAnnotations: (id: string) =>
      this.request<ArtifactAnnotation[]>(`/artifacts/${id}/annotations`),

    getLineage: (id: string) =>
      this.request<LineageResponse>(`/artifacts/${id}/lineage`),

    getRelations: (id: string) =>
      this.request<ArtifactRelation[]>(`/artifacts/${id}/relations`),

    getProvenance: (id: string) =>
      this.request<import('@/lib/api/types').ProvenanceResponse>(`/artifacts/${id}/provenance`),

    getSubgraph: (
      id: string,
      params: {
        maxDepth?: number
        includeLineage?: boolean
        includeRelations?: boolean
      },
    ) => {
      const q = new URLSearchParams()
      if (params.maxDepth !== undefined)
        q.append('max_depth', `${params.maxDepth}`)
      if (params.includeLineage !== undefined) {
        q.append('include_lineage', `${params.includeLineage}`)
      }
      if (params.includeRelations !== undefined) {
        q.append('include_relations', `${params.includeRelations}`)
      }
      return this.request(`/artifacts/${id}/subgraph?${q.toString()}`)
    },

    queryGraph: (input: ArtifactGraphQueryRequest) =>
      this.request<ArtifactGraphQueryResponse>(`/artifacts/graph/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),

    getGraphTaxonomy: () =>
      this.request<ArtifactGraphTaxonomy>(`/artifacts/graph/taxonomy`),

    getContentUrl: (id: string) =>
      this.withApiKey(`${this.baseUrl}/artifacts/${id}/content`),

    getPreviewUrl: (id: string, type: 'thumbnail' | 'preview' = 'thumbnail') =>
      this.withApiKey(
        `${this.baseUrl}/artifacts/${id}/preview?preview_type=${type}`,
      ),

    create: (input: {
      type_name: string
      base_type_name?: string
      metadata_json?: Record<string, any>
      uri?: string | null
      override_capabilities?: string[]
    }) =>
      this.request<Artifact>(`/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),

    update: (
      id: string,
      input: {
        metadata_json?: Record<string, any>
        override_capabilities?: string[]
        uri?: string | null
        type_name?: string
        base_type_name?: string
        visibility?: 'public' | 'private'
      },
    ) =>
      this.request<Artifact>(`/artifacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      this.request(`/artifacts/${id}`, { method: 'DELETE' }),

    uploadFile: (uploadId: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      return this.request(`/artifacts/uploads/${uploadId}`, {
        method: 'POST',
        body: form,
      })
    },

    uploadToPath: (uploadPath: string, file: File) => {
      const form = new FormData()
      form.append('file', file)

      const normalizedPath = (uploadPath || '').trim()
      if (!normalizedPath) {
        throw new Error('upload_path is required')
      }

      const url = normalizedPath.startsWith('http')
        ? normalizedPath
        : normalizedPath.startsWith('/api/')
          ? `${BASE_URL}${normalizedPath}`
          : `${BACKEND_URL}${normalizedPath}`

      return fetchWithAuth(url, {
        method: 'POST',
        body: form,
        credentials: 'include',
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`,
          )
        }
        return response.json()
      })
    },

    search: (
      query: string,
      limit: number = 20,
      offset: number = 0,
      typeName?: string,
    ) => {
      const q = new URLSearchParams()
      q.append('q', query)
      q.append('limit', limit.toString())
      q.append('offset', offset.toString())
      if (typeName) q.append('type_name', typeName)
      return this.request<PaginatedResponse<Artifact>>(
        `/artifacts/search?${q.toString()}`,
      )
    },

    semanticSearchCap: (
      query: string,
      limit = 20,
      model?: string,
      space?: string,
    ) => {
      const q = new URLSearchParams()
      q.append('q', query)
      q.append('limit', limit.toString())
      if (model) q.append('model', model)
      if (space) q.append('space', space)
      return this.request(`/artifacts/semantic/cap?${q.toString()}`)
    },

    findSimilarCap: (
      artifactId: string,
      limit = 20,
      model?: string,
      space?: string,
    ) => {
      const q = new URLSearchParams()
      q.append('limit', limit.toString())
      if (model) q.append('model', model)
      if (space) q.append('space', space)
      return this.request(
        `/artifacts/${artifactId}/similar/cap?${q.toString()}`,
      )
    },

    semanticSearch: (
      query: string,
      limit: number = 20,
      useReranker: boolean = false,
      model?: string,
    ) => {
      const q = new URLSearchParams()
      q.append('q', query)
      q.append('limit', limit.toString())
      q.append('rerank', `${useReranker}`)
      if (model) q.append('model', model)
      return this.request(`/artifacts/semantic?${q.toString()}`)
    },

    findSimilar: (
      artifactId: string,
      limit: number = 20,
      model?: string,
      space?: string,
    ) => {
      const q = new URLSearchParams()
      q.append('limit', limit.toString())
      if (model) q.append('model', model)
      if (space) q.append('space', space)
      return this.request(`/artifacts/${artifactId}/similar?${q.toString()}`)
    },
  }

  public resources = {
    listAdapters: () =>
      this.request<ResourceAdaptersResponse>(`/resources/adapters`),
    resolve: (input: ResourceResolveRequest) =>
      this.request(`/resources/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
  }

  public system = {
    info: () => this.request<SystemInfoResponse>(`/system/info`),
    publicInfo: () => this.request<PublicSystemInfo>(`/system/public`),
    getInstanceProfile: () => this.request<InstanceProfile>(`/system/instance`),
    setInstanceProfile: (input: {
      name?: string | null
      logo_url?: string | null
      description?: string | null
      confirm?: boolean
    }) =>
      this.request<InstanceProfile>(`/system/instance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name ?? null,
          logo_url: input.logo_url ?? null,
          description: input.description ?? null,
          confirm: input.confirm ?? false,
        }),
      }),
    backupDatabase: () => this.request(`/system/db/backup`, { method: 'POST' }),
    getRoutes: () => this.request<RoutesResponse>(`/system/routes`),
    getAutomationStatus: () => this.request(`/system/automation/status`),
    listAutomations: () =>
      this.request<AutomationListResponse>(`/system/automation/list`),
    upsertAutomation: (input: {
      id?: string | null
      name: string
      description?: string | null
      is_active: boolean
      trigger_event: string
      trigger_conditions: Record<string, any>
      actions: Array<Record<string, any>>
      metadata_json?: Record<string, any>
    }) =>
      this.request<AutomationUpsertResponse>(`/system/automation/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    deleteAutomation: (id: string) =>
      this.request(`/system/automation/${id}`, { method: 'DELETE' }),
    getIngestionPipeline: () =>
      this.request<IngestionPipelineConfig>(`/system/ingestion/pipeline`),
    setIngestionPipeline: (pipeline_id?: string | null) =>
      this.request(`/system/ingestion/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_id }),
      }),
    applyIngestionDefaults: (input?: { enabled_plugins?: string[] }) =>
      this.request(`/system/ingestion/defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input ?? {}),
      }),
    runCommand: (args: string[]) =>
      this.request<CommandResult>(`/system/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args }),
      }),
    getBlobRegistry: () =>
      this.request<BlobRegistryResponse>(`/system/blob-registry`),
    getArtifactRegistry: () =>
      this.request<ArtifactRegistryResponse>(`/system/artifact-registry`),
    getRelationOntology: () =>
      this.request<RelationOntologyResponse>(`/system/relation-ontology`),
    getArtifactTypeCounts: () =>
      this.request<ArtifactTypeCountsResponse>(`/system/artifact-type-counts`),
    getTypeSummary: () =>
      this.request<{ types: Array<{ name: string; parent_name?: string | null; artifact_count: number; default_capabilities?: string[]; description?: string; metadata?: Record<string, any> }>; total_artifacts: number }>(`/types/summary`),
    setBlobDefaults: (input: {
      default_provider?: string | null
      default_resolver?: string | null
    }) =>
      this.request(`/system/blob-registry/defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
  }

  public security = {
    whoami: () => this.request<AuthSessionInfo>(`/security/whoami`),
  }

  public lotus = {
    query: (q: string, limit = 20) =>
      this.request<{ query: string; results: any[] }>(
        `/lotus/query?q=${encodeURIComponent(q)}&limit=${limit}`,
      ),

    list: (params?: {
      kind?: string
      plugin?: string
      slot?: string
      limit?: number
      offset?: number
    }) => {
      const q = new URLSearchParams()
      if (params?.kind) q.append('kind', params.kind)
      if (params?.plugin) q.append('plugin', params.plugin)
      if (params?.slot) q.append('slot', params.slot)
      if (params?.limit) q.append('limit', params.limit.toString())
      if (params?.offset) q.append('offset', params.offset.toString())

      const qs = q.toString()
      return this.request<LotusCapabilityListResponse>(
        `/lotus/list${qs ? `?${qs}` : ''}`,
      )
    },

    invoke: <T>(capId: string, input?: any) =>
      this.request<T>(`/lotus/${capId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input ?? {}),
      }),

    dispatch: (
      result_id: string,
      kind: 'action' | 'nav' | 'feature',
      data: any,
    ) =>
      this.request(`/lotus/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id, kind, data }),
      }),
  }

  public executions = {
    create: (input: {
      plugin_name: string
      job_type: string
      inputs: Record<string, any>
      primary_artifact_id?: string
    }) =>
      this.request<Execution>(`/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    list: (params?: {
      limit?: number
      offset?: number
      status?: string
      plugin_name?: string
      type?: string
      created_after?: string
      created_before?: string
      q?: string
    }) => {
      const q = new URLSearchParams()
      if (params?.limit) q.append('limit', params.limit.toString())
      if (params?.offset) q.append('offset', params.offset.toString())
      if (params?.status) q.append('status', params.status)
      if (params?.plugin_name) q.append('plugin_name', params.plugin_name)
      if (params?.type) q.append('type', params.type)
      if (params?.created_after) q.append('created_after', params.created_after)
      if (params?.created_before)
        q.append('created_before', params.created_before)
      if (params?.q) q.append('q', params.q)
      const qs = q.toString()
      return this.request<PaginatedResponse<Execution>>(
        `/executions${qs ? `?${qs}` : ''}`,
      )
    },
    get: (id: string) => this.request<Execution>(`/executions/${id}`),
    activeCount: () =>
      this.request<{ active: number }>(`/executions/active-count`),
    wait: (
      id: string,
      params?: { timeout_s?: number; poll_interval_s?: number },
    ) => {
      const q = new URLSearchParams()
      if (params?.timeout_s) q.append('timeout_s', params.timeout_s.toString())
      if (params?.poll_interval_s)
        q.append('poll_interval_s', params.poll_interval_s.toString())
      const qs = q.toString()
      return this.request<Execution>(
        `/executions/${id}/wait${qs ? `?${qs}` : ''}`,
      )
    },
    events: (id: string, params?: { limit?: number; offset?: number }) => {
      const q = new URLSearchParams()
      if (params?.limit) q.append('limit', params.limit.toString())
      if (params?.offset) q.append('offset', params.offset.toString())
      const qs = q.toString()
      return this.request<PaginatedResponse<ExecutionEvent>>(
        `/executions/${id}/events${qs ? `?${qs}` : ''}`,
      )
    },
    cancel: (id: string) =>
      this.request<Execution>(`/executions/${id}/cancel`, {
        method: 'POST',
      }),
    nudge: (
      id: string,
      input:
        | string
        | {
            message: string
            mode?: 'steer' | 'goal_replace'
            goal?: string
          },
    ) =>
      this.request<{ ok: boolean; message: string }>(`/executions/${id}/nudge`, {
        method: 'POST',
        body: JSON.stringify(
          typeof input === 'string' ? { message: input } : input,
        ),
      }),
    artifacts: (id: string, action?: string) => {
      const q = new URLSearchParams()
      if (action) q.append('action', action)
      const qs = q.toString()
      return this.request<ExecutionArtifactLink[]>(
        `/executions/${id}/artifacts${qs ? `?${qs}` : ''}`,
      )
    },
    children: (id: string) =>
      this.request<Execution[]>(`/executions/${id}/children`),
  }

  public plugins = {
    list: () => this.request<any[]>('/plugins'),
    listLogos: async () => {
      const data = await this.request<{ logos: Record<string, string | null> }>(
        '/plugins/logos',
      )
      const logos = (data?.logos || {}) as Record<string, string | null>
      // Plugin assets are served at /plugins/*, not under /api/
      const origin = BASE_URL.replace(/\/api\/?$/, '')
      const normalize = (value: string | null) => {
        if (!value) return null
        if (value.startsWith('http://') || value.startsWith('https://')) {
          return value
        }
        if (value.startsWith('//')) return `${window.location.protocol}${value}`
        if (value.startsWith('/plugins/')) return `${origin}${value}`
        if (value.startsWith('/')) return `${origin}${value}`
        return `${origin}/${value}`
      }
      return {
        logos: Object.fromEntries(
          Object.entries(logos).map(([key, value]) => [key, normalize(value)]),
        ),
      }
    },
    call: <T>(
      pluginName: string,
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
      body?: any,
    ) =>
      this.request<T>(`/plugins/${pluginName}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }),
    execute: (pluginName: string, actionName: string, inputs: any) =>
      this.request<any>(`/plugins/${pluginName}/execute/${actionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      }),
  }

  public config = {
    get: (pluginName: string, params?: { config_id?: string }) => {
      const q = new URLSearchParams()
      if (params?.config_id) q.append('config_id', params.config_id)
      const qs = q.toString()
      return this.request<{
        ok: boolean
        plugin: string
        config_id?: string | null
        scope: string
        scope_id?: string | null
        value: Record<string, any>
      }>(`/lotus/config/${pluginName}${qs ? `?${qs}` : ''}`)
    },
    put: (
      pluginName: string,
      payload: {
        value: Record<string, any>
        scope?: string
        scope_id?: string | null
        config_id?: string | null
      },
    ) =>
      this.request<{
        ok: boolean
        plugin: string
        config_id?: string | null
        scope: string
        scope_id?: string | null
        value: Record<string, any>
      }>(`/lotus/config/${pluginName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  }

  public collections = {
    list: (category?: 'library' | 'source') =>
      this.request<CollectionResponse[]>(
        `/collections${category ? `?category=${category}` : ''}`,
      ),
    listScanners: () =>
      this.request<ScannerTypeInfo[]>(`/collections/scanners`),
    create: (name: string, description?: string) =>
      this.request(`/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      }),
    addArtifact: (collectionId: string, artifactId: string | number) =>
      this.request(`/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact_id: artifactId }),
      }),
    add: (
      uri: string,
      label: string,
      type_name: string = 'collection:directory',
      scanner_config: Record<string, any> = {},
    ) =>
      this.request(`/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri, label, type_name, scanner_config }),
      }),
    update: (
      id: string,
      input: { label?: string; scanner_config?: Record<string, any> },
    ) =>
      this.request<CollectionResponse>(`/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: input.label,
          scanner_config: input.scanner_config,
        }),
      }),
    rescan: (id: string) =>
      this.request(`/collections/${id}/scan`, { method: 'POST' }),
    remove: (id: string) =>
      this.request(`/collections/${id}`, { method: 'DELETE' }),
  }

  public get library() {
    return this.collections
  }

  public projections = {
    getUmap: (params: {
      n_neighbors: number
      min_dist: number
      spread: number
      limit?: number
      search_query?: string
      search_queries?: string[]
    }) =>
      this.request<any[]>(
        `/projections/umap?n_neighbors=${params.n_neighbors}&min_dist=${params.min_dist}&spread=${params.spread}&limit=${params.limit || 100}` +
          `${params.search_query ? `&search_query=${encodeURIComponent(params.search_query)}` : ''}` +
          `${params.search_queries ? `&search_queries=${params.search_queries.map((q) => encodeURIComponent(q)).join('&search_queries=')}` : ''}`,
      ),
  }

  public maintenance = {
    getOrphans: (limit: number = 100) =>
      this.request<
        Array<{
          id: string
          uri: string
          type: string
          metadata: any
          reason: string
        }>
      >(`/maintenance/orphans?limit=${limit}`),
    scanMissing: (limit: number = 100) =>
      this.request<
        Array<{
          id: string
          uri: string
          type: string
          metadata: any
          reason: string
        }>
      >(`/maintenance/missing?limit=${limit}`),
    prune: (ids: string[]) =>
      this.request<MaintenancePruneResponse>(`/maintenance/prune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
    fixTypes: (limit: number = 1000) =>
      this.request<MaintenanceFixTypesResponse>(
        `/maintenance/fix-types?limit=${limit}`,
      ),
    listScripts: () =>
      this.request<MaintenanceScript[]>(`/maintenance/scripts`),
    runScript: (name: string, dryRun: boolean) =>
      this.request<MaintenanceRunResponse>(`/maintenance/scripts/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      }),
  }
}

export const embeddrApi = new EmbeddrApi()
export default EmbeddrApi

// ─── Legacy Standalone Functions ─────────────────────────────────────
// These are DEPRECATED. Use embeddrApi.* and hooks from @/hooks/useExecutions instead.
// Kept for backward compatibility during migration.

/** @deprecated Use embeddrApi.executions.list() */
async function fetchActions(): Promise<PluginAction[]> {
  const res = await fetchWithAuth(`${BACKEND_URL}/executions/actions`)
  if (!res.ok) throw new Error('Failed to fetch actions')
  return res.json()
}

/** @deprecated Use embeddrApi.executions.list() via useExecutions hook */
async function fetchExecutions(params?: {
  plugin_name?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<ArtifactExecution[]> {
  const url = new URL(`${BACKEND_URL}/executions`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v))
    })
  }
  const res = await fetchWithAuth(url.toString())
  if (!res.ok) throw new Error('Failed to fetch executions')
  return res.json()
}

async function fetchArtifacts(params?: {
  limit?: number
  offset?: number
  type_name?: string
  q?: string
}): Promise<{ items: Artifact[]; total: number }> {
  const endpoint = params?.q
    ? `${BACKEND_URL}/artifacts/search`
    : `${BACKEND_URL}/artifacts/`

  const url = new URL(endpoint)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v))
    })
  }

  const res = await fetchWithAuth(url.toString())
  if (!res.ok) throw new Error('Failed to fetch artifacts')
  return res.json()
}

/** @deprecated Use embeddrApi.executions.create() via useCreateExecution hook from @/hooks/useExecutions */
async function createExecution(payload: {
  plugin_name: string
  action_name: string
  inputs: Record<string, any>
  primary_artifact_id?: string
}): Promise<ArtifactExecution> {
  const res = await fetchWithAuth(`${BACKEND_URL}/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create execution: ${err}`)
  }
  return res.json()
}

/** @deprecated Use useActions from proper hook */
export function useActions() {
  return useQuery({
    queryKey: ['actions'],
    queryFn: fetchActions,
  })
}

/** @deprecated Use useExecutions from @/hooks/useExecutions */
export function useExecutions(params?: {
  plugin_name?: string
  status?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['executions', params],
    queryFn: () => fetchExecutions(params),
    refetchInterval: 2000,
  })
}

export function useArtifacts(params?: {
  limit?: number
  offset?: number
  type_name?: string
  q?: string
}) {
  return useQuery({
    queryKey: ['artifacts', params],
    queryFn: () => fetchArtifacts(params),
  })
}

/** @deprecated Use useCreateExecution from @/hooks/useExecutions */
export function useCreateExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExecution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] })
    },
  })
}
