import { BACKEND_URL } from '../config'
import type { Artifact } from '../types'

export async function fetchActionArtifacts(): Promise<Artifact[]> {
  // Assuming backend supports filtering by type?
  // If not, we might need to search or use a specific endpoint.
  // Let's assume a query param or filter.
  // Current backend might be simplistic.
  // Let's try to hit /api/v2/artifacts?type_name=action:graph
  // If that fails we might need to implement it in backend, but for now let's write client code.
  const url = new URL(`${BACKEND_URL}/api/v2/artifacts/`)
  url.searchParams.append('type_name', 'action:graph')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch action artifacts')

  // Check structure
  const data = await res.json()
  return Array.isArray(data) ? data : data.items || []
}

export async function fetchArtifact(id: string): Promise<Artifact> {
  const res = await fetch(`${BACKEND_URL}/api/v2/artifacts/${id}`)
  if (!res.ok) throw new Error('Failed to fetch artifact')
  return res.json()
}

export async function runActionArtifact(
  artifactId: string,
  inputs: Record<string, any>,
): Promise<{ execution_id: string }> {
  const res = await fetch(`${BACKEND_URL}/api/v2/actions/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      artifact_id: artifactId,
      inputs,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to run action')
  }

  return res.json()
}

export interface AvailableAction {
  plugin_name: string
  job_type: string
  name: string
  description: string
  version: string
  inputs: Record<string, any> | string[]
  outputs: Record<string, any> | string[]
}

export async function fetchAvailableActions(): Promise<AvailableAction[]> {
  const res = await fetch(`${BACKEND_URL}/api/v2/executions/actions`)
  if (!res.ok) throw new Error('Failed to fetch available actions')
  return res.json()
}
