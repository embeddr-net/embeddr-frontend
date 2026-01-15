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
} from './types'

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

  public system = {
    getRoutes: () => {
      return this.request<{ routes: any[] }>('/system/routes')
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
