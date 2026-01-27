import { BACKEND_V2_URL } from '../config'
import type {
  Artifact,
  ArtifactEmbedding,
  ArtifactAnnotation,
  LineageResponse,
  ArtifactRelation,
  ScannerTypeInfo,
  PaginatedResponse,
  CollectionResponse,
  LotusCapabilityListResponse,
  Execution,
  ExecutionEvent,
} from './types'

export interface SystemInfoResponse {
  version: string
  dev_mode: boolean
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

class EmbeddrApi {
  private baseUrl: string

  constructor(baseUrl: string = BACKEND_V2_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  public artifacts = {
    list: (params: {
      limit?: number
      offset?: number
      type_name?: string
      media_type?: string
      tags?: string[]
      collection_id?: string
      library_id?: string
      parent_id?: string
      recursive?: boolean
      sort?: 'new' | 'random'
      is_archived?: boolean
    }) => {
      const q = new URLSearchParams()
      q.append('limit', (params.limit || 50).toString())
      q.append('offset', (params.offset || 0).toString())
      if (params.type_name) q.append('type_name', params.type_name)
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
      if (params.tags) {
        params.tags.forEach((tag) => q.append('tags', tag))
      }

      return this.request<PaginatedResponse<Artifact>>(
        `/artifacts/?${q.toString()}`,
      )
    },

    get: (id: string) => {
      return this.request<Artifact>(`/artifacts/${id}`)
    },

    getEmbeddings: (id: string) => {
      return this.request<ArtifactEmbedding[]>(`/artifacts/${id}/embeddings`)
    },

    getAnnotations: (id: string) => {
      return this.request<ArtifactAnnotation[]>(`/artifacts/${id}/annotations`)
    },

    getLineage: (id: string) => {
      return this.request<LineageResponse>(`/artifacts/${id}/lineage`)
    },

    getRelations: (id: string) => {
      return this.request<ArtifactRelation[]>(`/artifacts/${id}/relations`)
    },

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
        q.append('max_depth', params.maxDepth.toString())
      if (params.includeLineage !== undefined)
        q.append('include_lineage', params.includeLineage.toString())
      if (params.includeRelations !== undefined)
        q.append('include_relations', params.includeRelations.toString())

      return this.request<any>(`/artifacts/${id}/subgraph?${q.toString()}`)
    },

    getContentUrl: (id: string) => {
      return `${this.baseUrl}/artifacts/${id}/content`
    },

    getPreviewUrl: (
      id: string,
      type: 'thumbnail' | 'preview' = 'thumbnail',
    ) => {
      // Use the preview endpoint to get the derived image
      return `${this.baseUrl}/artifacts/${id}/preview?preview_type=${type}`
    },

    create: (input: {
      type_name: string
      base_type_name?: string
      metadata_json?: Record<string, any>
      uri?: string | null
      override_capabilities?: string[]
    }) => {
      return this.request<Artifact>(`/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_name: input.type_name,
          base_type_name: input.base_type_name || 'artifact',
          metadata_json: input.metadata_json || {},
          uri: input.uri ?? undefined,
          override_capabilities: input.override_capabilities || [],
        }),
      })
    },

    update: (
      id: string,
      input: {
        metadata_json?: Record<string, any>
        override_capabilities?: string[]
        uri?: string | null
        type_name?: string
        base_type_name?: string
      },
    ) => {
      return this.request<Artifact>(`/artifacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    },

    delete: (id: string) => {
      return this.request<{ ok: boolean }>(`/artifacts/${id}`, {
        method: 'DELETE',
      })
    },

    uploadFile: (uploadId: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${this.baseUrl}/artifacts/uploads/${uploadId}`, {
        method: 'POST',
        body: form,
      }).then(async (res) => {
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || 'Failed to upload file')
        }
        return res.json()
      })
    },

    // Legacy text search
    search: (
      query: string,
      limit: number = 20,
      offset: number = 0,
      typeName?: string,
    ) => {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
      })
      if (typeName) params.append('type_name', typeName)
      return this.request<PaginatedResponse<Artifact>>(
        `/artifacts/search?${params.toString()}`,
      )
    },

    semanticSearchCap: (
      query: string,
      limit = 20,
      model?: string,
      space?: string,
    ) => {
      return this.lotus.invoke<{
        items: { id: string; score: number }[]
        count: number
      }>('search.text', { query, limit, model_name: model, space })
    },

    findSimilarCap: (
      artifactId: string,
      limit = 20,
      model?: string,
      space?: string,
    ) => {
      return this.lotus.invoke<{
        items: { id: string; score: number }[]
        count: number
      }>('search.similar', {
        artifact_id: artifactId,
        limit,
        model_name: model,
        space,
      })
    },
    // Semantic search via plugin
    semanticSearch: (
      query: string,
      limit: number = 20,
      useReranker: boolean = false,
      model?: string,
    ) => {
      return this.plugins.call<{
        items: { id: string; score: number }[]
        count: number
      }>('embeddr-search', '/query', 'POST', {
        query,
        limit,
        use_reranker: useReranker,
        model_name: model,
      })
    },

    // Similarity search via plugin
    findSimilar: (
      artifactId: string,
      limit: number = 20,
      model?: string,
      space?: string,
    ) => {
      return this.plugins.call<{
        items: { id: string; score: number }[]
        count: number
      }>('embeddr-search', '/similar', 'POST', {
        artifact_id: artifactId,
        limit,
        model_name: model,
        space,
      })
    },
  }

  public resources = {
    listAdapters: () => {
      return this.request<ResourceAdaptersResponse>(`/resources/adapters`)
    },
    resolve: (input: ResourceResolveRequest) => {
      return this.request<Record<string, any>>(`/resources/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    },
  }

  public system = {
    info: () => {
      return this.request<SystemInfoResponse>('/system/info')
    },
    backupDatabase: () => {
      return this.request<{ status: string; backup_path: string }>(
        '/system/db/backup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: true }),
        },
      )
    },
    getRoutes: () => {
      return this.request<{ routes: any[] }>('/system/routes')
    },
    getAutomationStatus: () => {
      return this.request<{ total: number; active: number }>(
        '/system/automation/status',
      )
    },
    listAutomations: () => {
      return this.request<{
        items: Array<{
          id: string
          name: string
          description?: string | null
          is_active: boolean
          trigger_event: string
          trigger_conditions: Record<string, any>
          actions: Array<Record<string, any>>
          metadata_json?: Record<string, any>
          created_at: string
          updated_at: string
        }>
        total: number
      }>('/system/automation/list')
    },
    upsertAutomation: (input: {
      id?: string | null
      name: string
      description?: string | null
      is_active: boolean
      trigger_event: string
      trigger_conditions: Record<string, any>
      actions: Array<Record<string, any>>
      metadata_json?: Record<string, any>
    }) => {
      return this.request<{
        ok: boolean
        item: {
          id: string
          name: string
          description?: string | null
          is_active: boolean
          trigger_event: string
          trigger_conditions: Record<string, any>
          actions: Array<Record<string, any>>
          metadata_json?: Record<string, any>
          created_at: string
          updated_at: string
        }
      }>('/system/automation/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    },
    deleteAutomation: (id: string) => {
      return this.request<{ ok: boolean; id: string }>(
        `/system/automation/${id}`,
        { method: 'DELETE' },
      )
    },
    getIngestionPipeline: () => {
      return this.request<{ pipeline_id?: string | null; raw?: any }>(
        '/system/ingestion/pipeline',
      )
    },
    setIngestionPipeline: (pipeline_id?: string | null) => {
      return this.request<{ ok: boolean; pipeline_id?: string | null }>(
        '/system/ingestion/pipeline',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pipeline_id: pipeline_id ?? null }),
        },
      )
    },
    runCommand: (args: string[]) => {
      return this.request<{ success: boolean; stdout: string; stderr: string }>(
        '/system/cli',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ args }),
        },
      )
    },
    getBlobRegistry: () => {
      return this.request<BlobRegistryResponse>('/system/blob-registry')
    },
    setBlobDefaults: (input: {
      default_provider?: string | null
      default_resolver?: string | null
    }) => {
      return this.request<{
        ok: boolean
        default_provider?: string | null
        default_resolver?: string | null
      }>('/system/blob-registry/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    },
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
      if (params?.limit !== undefined) q.append('limit', String(params.limit))
      if (params?.offset !== undefined)
        q.append('offset', String(params.offset))
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

    dispatch: (result_id: string, kind: 'action' | 'nav', data: any) =>
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
    }) => {
      return this.request<Execution>(`/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    },
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
      if (params?.limit !== undefined) q.append('limit', String(params.limit))
      if (params?.offset !== undefined)
        q.append('offset', String(params.offset))
      if (params?.status) q.append('status', params.status)
      if (params?.plugin_name) q.append('plugin_name', params.plugin_name)
      if (params?.type) q.append('type', params.type)
      if (params?.created_after) q.append('created_after', params.created_after)
      if (params?.created_before)
        q.append('created_before', params.created_before)
      if (params?.q) q.append('q', params.q)
      const qs = q.toString()
      return this.request<Execution[]>(`/executions${qs ? `?${qs}` : ''}`)
    },
    get: (id: string) => {
      return this.request<Execution>(`/executions/${id}`)
    },
    wait: (
      id: string,
      params?: { timeout_s?: number; poll_interval_s?: number },
    ) => {
      const q = new URLSearchParams()
      if (params?.timeout_s !== undefined)
        q.append('timeout_s', String(params.timeout_s))
      if (params?.poll_interval_s !== undefined)
        q.append('poll_interval_s', String(params.poll_interval_s))
      const qs = q.toString()
      return this.request<Execution>(
        `/executions/${id}/wait${qs ? `?${qs}` : ''}`,
      )
    },
    events: (id: string, params?: { limit?: number; offset?: number }) => {
      const q = new URLSearchParams()
      if (params?.limit !== undefined) q.append('limit', String(params.limit))
      if (params?.offset !== undefined)
        q.append('offset', String(params.offset))
      const qs = q.toString()
      return this.request<ExecutionEvent[]>(
        `/executions/${id}/events${qs ? `?${qs}` : ''}`,
      )
    },
  }

  public plugins = {
    list: () => {
      return this.request<any[]>('/plugins')
    },
    call: <T>(
      pluginName: string,
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
      body?: any,
    ) => {
      return this.request<T>(`/plugins/${pluginName}${endpoint}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
    },
    execute: (pluginName: string, actionName: string, inputs: any) => {
      return this.request<any>(`/plugins/${pluginName}/execute/${actionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
    },
  }

  public collections = {
    list: (category?: 'library' | 'source') => {
      // Renamed to Collections in V2, but kept as .library here for minimal refactor
      const q = category ? `?category=${category}` : ''
      return this.request<CollectionResponse[]>(`/collections${q}`)
    },
    listScanners: () => {
      return this.request<ScannerTypeInfo[]>('/collections/scanners')
    },
    create: (name: string, description?: string) => {
      return this.request<CollectionResponse>('/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
    },
    addArtifact: (collectionId: string, artifactId: string | number) => {
      return this.request<{ status: string }>(
        `/collections/${collectionId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_id: artifactId }),
        },
      )
    },
    add: (
      path: string,
      label: string,
      scanner_type: string = 'collection:directory',
      config: Record<string, any> = {},
    ) => {
      // Backend expects 'uri', mapping path -> uri
      return this.request<CollectionResponse>('/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: path,
          label,
          type_name: scanner_type,
          scanner_config: config,
          recursive: true,
        }),
      })
    },
    rescan: (id: string) => {
      return this.request<{ status: string }>(`/collections/${id}/scan`, {
        method: 'POST',
      })
    },
    remove: (id: string) => {
      return this.request<{ status: string }>(`/collections/${id}`, {
        method: 'DELETE',
      })
    },
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
    }) => {
      const q = new URLSearchParams()
      q.append('n_neighbors', params.n_neighbors.toString())
      q.append('min_dist', params.min_dist.toString())
      q.append('spread', params.spread.toString())
      if (params.limit) q.append('limit', params.limit.toString())
      if (params.search_query) q.append('search_query', params.search_query)
      if (params.search_queries) {
        params.search_queries.forEach((sq) => q.append('search_queries', sq))
      }

      return this.request<any[]>(`/plugins/embeddr-umap/umap?${q.toString()}`)
    },
  }

  public maintenance = {
    getOrphans: (limit: number = 100) => {
      return this.request<
        Array<{
          id: string
          uri: string
          type: string
          metadata: any
          reason: string
        }>
      >(`/maintenance/orphans?limit=${limit}`)
    },
    scanMissing: (limit: number = 100) => {
      return this.request<
        Array<{
          id: string
          uri: string
          type: string
          metadata: any
          reason: string
        }>
      >(`/maintenance/scan_missing?limit=${limit}`, { method: 'POST' })
    },
    prune: (ids: string[]) => {
      return this.request<{ deleted: number }>('/maintenance/prune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids),
      })
    },
    fixTypes: (limit: number = 1000) => {
      return this.request<{ updated: number; scanned: number }>(
        `/maintenance/fix_types?limit=${limit}`,
        { method: 'POST' },
      )
    },
    listScripts: () => {
      return this.request<Array<{ name: string; description: string }>>(
        '/maintenance/scripts',
      )
    },
    runScript: (name: string, dryRun: boolean) => {
      const q = new URLSearchParams()
      q.append('script_name', name)
      q.append('dry_run', dryRun.toString())
      return this.request<{
        status: string
        updated: number
        dry_run: boolean
        logs?: string[]
      }>(`/maintenance/scripts/run?${q.toString()}`, { method: 'POST' })
    },
  }
}

export const embeddrApi = new EmbeddrApi()
export default EmbeddrApi
