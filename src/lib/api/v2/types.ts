export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface Artifact {
  id: string
  created_at: string
  uri?: string
  type_name: string
  base_type_name: string
  metadata_json: Record<string, any>
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
