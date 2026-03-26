/**
 * Frontend API types.
 *
 * NOTE: Canonical domain types now live in @embeddr/client-typescript/src/embeddr-api-types.
 * This file will be migrated to re-export from there in a future pass.
 * For now, types are kept inline to avoid breaking the 109 consumer files.
 */

import type { PromptImage } from '@embeddr/react-ui/types'

export type { PromptImage }

// New response envelope types (from the 0.2.0 cleanup)
export type { OkResponse, ErrorResponse, ErrorCode } from '@embeddr/client-typescript/src/embeddr-api-types'

export interface PipelineSpec {
  id: number
  name: string
  description?: string
  data: Record<string, any>
  meta?: {
    exposed_inputs?: Array<{
      node_id: string
      field: string
      label?: string
      type?: string
      order?: number
      enabled: boolean
    }>
    [key: string]: any
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ExecutionRecord {
  id: string
  prompt_id?: string
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  prompt: string
  images?: Array<string>
  error_message?: string
  created_at: string
  workflow_id: number
  inputs: Record<string, any>
  outputs?: Array<any>
  preview_url?: string
}

export interface Gallery {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  cover_image_id?: string
  image_count: number
  images?: Array<PromptImage>
}

export interface UserProfile {
  id: string
  username: string
  email?: string
  avatar_url?: string
  created_at: string
  preferences?: Record<string, any>
}

export interface SearchResult {
  items: Array<PromptImage>
  total: number
  page: number
  pages: number
}

export interface Collection {
  id: number
  name: string
  description?: string
  image_count: number
  item_count?: number
  created_at: string
  updated_at: string
  cover_image?: PromptImage
}

export interface SystemStatus {
  mcp: boolean
  comfy: boolean
  docs: boolean
}

export interface InstanceProfile {
  name?: string | null
  logo_url?: string | null
  description?: string | null
}

export interface PublicSystemInfo {
  instance: InstanceProfile
  dev_mode?: boolean
  cloud_mode?: boolean
}

export interface LibraryStats {
  total_images: number
  total_size: number
  last_scan: string
  folders: number
}

export interface ScanResult {
  added: number
  updated: number
  errors: Array<string>
  duration: number
}

export interface FolderInfo {
  path: string
  name: string
  image_count: number
  has_subfolders: boolean
  parent_path?: string
}

export interface Artifact {
  id: string
  created_at: string
  uri?: string
  type_name: string
  base_type_name: string
  metadata_json: Record<string, any>
  override_capabilities?: string[]
  owner_user_id?: string
  owner_operator_id?: string
  visibility?: 'public' | 'private'
  owner_user?: {
    id: string
    username?: string
    display_name?: string
    avatar_url?: string | null
  }
  owner_operator?: {
    id: string
    name?: string
    display_name?: string
    avatar_url?: string | null
  }
}

export interface RouteInfo {
  path: string
  name?: string
  methods: string[]
  tags: string[]
}

export interface RoutesResponse {
  routes: RouteInfo[]
}

export interface CommandResult {
  success: boolean
  stdout?: string
  stderr?: string
  code?: number
}

export interface AutomationRule {
  id: string
  name: string
  description?: string | null
  is_active: boolean
  trigger_event: string
  trigger_conditions: Record<string, any>
  actions: Array<Record<string, any>>
  metadata_json?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface AutomationListResponse {
  items: AutomationRule[]
  total: number
}

export interface AutomationUpsertResponse {
  ok?: boolean
  item: AutomationRule
}

export interface IngestionPipelineConfig {
  pipeline_id?: string | null
  raw?: any
}

export interface MaintenanceScript {
  name: string
  description?: string
}

export interface MaintenancePruneResponse {
  deleted: number
}

export interface MaintenanceFixTypesResponse {
  updated: number
  scanned: number
}

export interface MaintenanceRunResponse {
  status: string
  updated: number
  dry_run?: boolean
  logs?: string[]
}

export interface ArtifactRegistryResponse {
  providers: string[]
  resolvers: string[]
  provider_resolvers: Record<string, string>
  storage_backends: string[]
  type_names: string[]
  base_type_names: string[]
  import_sources: string[]
  import_instances: string[]
  origins: string[]
  sample_size: number
  total_artifacts: number
  sampled: boolean
  relation_ontology: RelationOntologyResponse
}

export interface RelationTypeDefResponse {
  name: string
  family: string
  direction: string
  inverse?: string | null
  transitive: boolean
  structural: boolean
}

export interface RelationOntologyResponse {
  families: Record<string, string[]>
  types: RelationTypeDefResponse[]
  structural_parent_to_child: string[]
  structural_child_to_parent: string[]
  structural_all: string[]
}

export interface ArtifactTypeCountsResponse {
  type_counts: Record<string, number>
  base_type_counts: Record<string, number>
  total_artifacts: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface ArtifactEmbedding {
  id: string
  artifact_id: string
  model_name: string
  plugin_name?: string
  created_at: string
  vector_dim: number
  vector_json: number[]
  space: string
}

export interface ArtifactAnnotation {
  id: string
  artifact_id: string
  text: string
  annotation_type: string
  plugin_name?: string
  confidence?: number
  created_at: string
}

export interface ArtifactLineage {
  parent_id: string
  child_id: string
  created_at: string
  relationship_metadata: Record<string, any>
  transformation_id?: string
}

export interface LineageResponse {
  parents: ArtifactLineage[]
  children: ArtifactLineage[]
}

export interface ArtifactRelation {
  source_id: string
  target_id: string
  relation_type: string
  source_namespace: string
}

export interface ArtifactGraphFilters {
  relation_types_include?: string[]
  relation_types_exclude?: string[]
  relation_families_include?: string[]
  source_namespaces_include?: string[]
  source_namespaces_exclude?: string[]
  artifact_types_include?: string[]
  artifact_base_types_include?: string[]
  include_legacy_stash_contains?: boolean
}

export interface ArtifactGraphQueryRequest {
  seed_ids: string[]
  max_depth?: number
  direction?: 'incoming' | 'outgoing' | 'both'
  include_lineage?: boolean
  include_relations?: boolean
  limit_nodes?: number
  limit_edges?: number
  include_overlay_counts?: boolean
  filters?: ArtifactGraphFilters
}

export interface ArtifactGraphNode {
  id: string
  type_name: string
  base_type_name: string
  label: string
  uri?: string | null
  overlay_counts?: {
    features?: number
    embeddings?: number
    annotations?: number
  }
  degree?: {
    in?: number
    out?: number
    total?: number
  }
  is_seed?: boolean
}

export interface ArtifactGraphEdge {
  id: string
  source_id: string
  target_id: string
  relation_type_raw: string
  relation_type_canonical: string
  relation_family: string
  source_namespace?: string
  is_lineage?: boolean
}

export interface ArtifactGraphQueryResponse {
  nodes: ArtifactGraphNode[]
  edges: ArtifactGraphEdge[]
  meta: {
    truncated?: boolean
    truncation_reason?: string | null
    nodes_returned?: number
    edges_returned?: number
  }
}

export interface ArtifactGraphTaxonomy {
  relation_families: Array<{
    id: string
    label: string
  }>
  relation_types: Array<{
    relation_type_raw: string
    relation_type_canonical: string
    relation_family: string
    description?: string
  }>
  source_namespaces: string[]
  namespace_groups: Array<{
    group: string
    namespaces: string[]
  }>
}

export interface ScannerTypeInfo {
  type_name: string
  display_name: string
  description: string
  required_config: Record<string, any>
}

export interface CollectionResponse {
  id: string
  uri: string
  type_name: string
  label: string
  file_count: number
  metadata: Record<string, any>
}

export interface LotusUI {
  badge?: string
  icon?: string
  iconUrl?: string
  color?: string
  label?: string
  description?: string
  [key: string]: any
}

export interface LotusAction {
  action?: string
  job_type?: string
  exec?: Record<string, any>
  expose?: Record<string, any>
  input?: Record<string, any>
  output?: Record<string, any>
  [key: string]: any
}

export interface LotusQuery {
  query?: string
  slot?: string
  input?: Record<string, any>
  output?: Record<string, any>
  [key: string]: any
}

export interface LotusCapability {
  id: string
  kind: string
  title: string
  description?: string
  plugin?: string
  version?: string
  tags?: string[]
  data?: Record<string, any>
  slot?: string
  ui?: LotusUI
  action?: LotusAction
  query?: LotusQuery
}

export interface LotusCapabilityListResponse {
  items: LotusCapability[]
  total: number
  limit: number
  offset: number
}

export interface Execution {
  id: string
  type: string
  plugin_name: string
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'waiting'
  priority: number
  progress: number
  message?: string
  trigger?: string
  created_at: string
  started_at?: string
  finished_at?: string
  resource_class: string
  inputs?: Record<string, any>
  outputs?: Record<string, any> | null
  error?: string | null
  parent_execution_id?: string | null
  primary_artifact_id?: string | null
  operator_id?: string | null
  api_key_id?: string | null
  trigger_event_type?: string | null
  tags?: Record<string, string>
}

export interface ExecutionEvent {
  id: string
  execution_id: string
  event_type: string
  level: string
  message?: string
  payload?: Record<string, any> | null
  created_at: string
}

export interface ExecutionArtifactLink {
  id: string
  execution_id: string
  artifact_id: string
  action: 'created' | 'modified' | 'deleted' | 'read' | 'input'
  detail?: string | null
  created_at: string
}

export interface PluginAction {
  name: string
  label: string
  description: string
  command_args?: string
  requires_confirmation: boolean
  danger: boolean
  tier: 'system' | 'user'
  inputs: string[]
}

/**
 * @deprecated Use Execution instead. This type is kept for backward compatibility
 * but all new code should use the Execution interface.
 */
export type ArtifactExecution = Execution

// ── Provenance types ──────────────────────────────────────

export interface ProvenanceSource {
  namespace: string
  name: string
  icon_url?: string | null
}

export interface ProvenanceArtifactSummary {
  id: string
  type_name: string
  base_type_name?: string | null
  name?: string | null
  uri?: string | null
  created_at?: string | null
}

export interface ProvenanceExecution {
  id: string
  type: string
  plugin_name: string
  status: string
  created_at?: string | null
  finished_at?: string | null
}

export interface ProvenanceStep {
  artifact: ProvenanceArtifactSummary
  role: string
  relation_type?: string | null
  source?: ProvenanceSource | null
  execution?: ProvenanceExecution | null
  depth: number
}

export interface ProvenanceAnnotation {
  id: string
  annotation_type: string
  plugin_name?: string | null
  text?: string | null
  data?: Record<string, any> | null
  confidence?: number | null
}

export interface ProvenanceResponse {
  artifact: ProvenanceArtifactSummary
  sources: ProvenanceSource[]
  creation_execution?: ProvenanceExecution | null
  inputs: ProvenanceStep[]
  outputs: ProvenanceStep[]
  relations: ProvenanceStep[]
  annotations: ProvenanceAnnotation[]
}
