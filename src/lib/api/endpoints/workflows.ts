import { BACKEND_V2_URL } from '../config'

// New V2 Types
export interface WorkflowPort {
  name: string
  type: string
  description?: string
  default?: any
  exposure: number | 'internal' | 'ui' | 'api' | 'mcp'
  group?: string
  widget?: string
  options?: any[]
}

export interface WorkflowArtifactMetadata {
  schema_version: string
  inputs: Record<string, WorkflowPort>
  outputs: Record<string, WorkflowPort>
  side_effects: string[]
  implementation: {
    type: string
    version?: string
    payload: Record<string, any>
  }
}

export interface WorkflowArtifact {
  id: string
  type_name: string
  created_at: string
  metadata_json: {
    name: string
    description?: string
    workflow: WorkflowArtifactMetadata
    payload?: Record<string, any>
  }
}

// Legacy Compatibility Type
export interface Workflow {
  id: string | number
  name: string
  description?: string
  data: Record<string, any>
  meta: Record<string, any>
  is_active: boolean
  created_at: string
  metadata_json: {
    name: string
    description?: string
    workflow: WorkflowArtifactMetadata
    payload?: Record<string, any>
  }
}

// Helper to adapt V2 Artifact to Legacy Workflow Shape
function adaptToLegacy(artifact: WorkflowArtifact): Workflow {
  // Support migration: Try direct payload first, then legacy implementation path
  const payload =
    artifact.metadata_json.payload ||
    artifact.metadata_json.workflow?.implementation?.payload ||
    {}

  return {
    id: artifact.id,
    name: artifact.metadata_json.name || artifact.id, // Fallback if name missing
    description: artifact.metadata_json.description,
    data: payload,
    meta: artifact.metadata_json, // expose full metadata as 'meta'
    is_active: true, // artifact system doesn't have is_active yet
    created_at: artifact.created_at,
    metadata_json: artifact.metadata_json,
  }
}

export async function fetchWorkflows(): Promise<Array<Workflow>> {
  const response = await fetch(`${BACKEND_V2_URL}/workflows?limit=100`)
  if (!response.ok) {
    throw new Error('Failed to fetch workflows')
  }
  const artifacts: WorkflowArtifact[] = await response.json()
  return artifacts.map(adaptToLegacy)
}

export async function getWorkflow(id: string | number): Promise<Workflow> {
  const response = await fetch(`${BACKEND_V2_URL}/workflows/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch workflow')
  }
  const artifact: WorkflowArtifact = await response.json()
  return adaptToLegacy(artifact)
}

export async function getWorkflowTemplates(): Promise<Record<string, string>> {
  const response = await fetch(`${BACKEND_V2_URL}/workflows/templates`)
  if (!response.ok) throw new Error('Failed to fetch templates')
  return await response.json()
}

export async function createWorkflow(data: {
  name: string
  description?: string
  graph?: Record<string, any>
  template?: string
}): Promise<Workflow> {
  const payload: any = {
    name: data.name,
    description: data.description,
    template: data.template,
    payload: data.graph,
  }

  const response = await fetch(`${BACKEND_V2_URL}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to create workflow')
  }
  const artifact = await response.json()
  return adaptToLegacy(artifact)
}

export async function duplicateWorkflow(
  id: string | number,
): Promise<Workflow> {
  const response = await fetch(`${BACKEND_V2_URL}/workflows/${id}/duplicate`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to duplicate workflow')
  }
  const artifact = await response.json()
  return adaptToLegacy(artifact)
}

export async function composeWorkflows(
  ids: string[],
  name: string,
): Promise<Workflow> {
  // Query param style for ids or body? Backend expects body `workflow_ids`
  const response = await fetch(
    `${BACKEND_V2_URL}/workflows/compose?name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ids),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to compose workflows')
  }
  const artifact = await response.json()
  return adaptToLegacy(artifact)
}

export async function getWorkflowHistory(id: string): Promise<any> {
  console.log(id)
  return { status: 'pending' }
}

export async function updateWorkflowMetadata(
  id: string | number,
  metadata: Record<string, any>,
): Promise<Workflow> {
  // We need to fetch the current artifact to get the full metadata structure if we only have the workflow part...
  // But the V2 API `PUT /workflows/{id}` expects `WorkflowArtifactMetadata` (the definition part).
  // Let's check backend `update_workflow`: expects `WorkflowArtifactMetadata`.

  const response = await fetch(`${BACKEND_V2_URL}/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  })
  if (!response.ok) throw new Error('Failed to update workflow')
  return adaptToLegacy(await response.json())
}

// Deprecated V1 Stubs
export async function updateWorkflow(id: any, data: any): Promise<any> {
  console.warn('updateWorkflow is deprecated/stubbed', id, data)
  return {}
}

export async function deleteWorkflow(id: string | number): Promise<void> {
  const response = await fetch(`${BACKEND_V2_URL}/workflows/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete workflow')
  }
}

export async function syncWorkflows(): Promise<{ status: string }> {
  return { status: 'ok' }
}

export async function runWorkflow(
  id: string | number,
  inputs: Record<string, any>,
): Promise<{
  status: string
  execution_id?: string
  prompt_id?: string | null
  outputs?: Array<any>
}> {
  const response = await fetch(`${BACKEND_V2_URL}/workflows/${id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  })

  if (!response.ok) {
    throw new Error('Failed to run workflow')
  }
  return await response.json()
}
