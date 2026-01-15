import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PluginAction, ArtifactExecution, Artifact } from './types-v2'
// We need the root API URL, not the V1 backend URL
// If BACKEND_URL is /api/v1, we want /api/v2
// If BACKEND_URL is http://host/api/v1, we want http://host/api/v2
import { BACKEND_V2_URL } from './config'

// API V2 Base URL is now the default BACKEND_URL
const API_V2_BASE = BACKEND_V2_URL

async function fetchActions(): Promise<PluginAction[]> {
  const res = await fetch(`${API_V2_BASE}/executions/actions`)
  if (!res.ok) throw new Error('Failed to fetch actions')
  return res.json()
}

async function fetchExecutions(params?: {
  plugin_name?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<ArtifactExecution[]> {
  const url = new URL(`${API_V2_BASE}/executions`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v))
    })
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch executions')
  return res.json()
}

async function fetchArtifacts(params?: {
  limit?: number
  offset?: number
  type_name?: string
  q?: string
}): Promise<{ items: Artifact[]; total: number }> {
  // Use /search if q is present, else /
  const endpoint = params?.q
    ? `${API_V2_BASE}/artifacts/search`
    : `${API_V2_BASE}/artifacts/`

  const url = new URL(endpoint)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v))
    })
  }

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch artifacts')
  return res.json()
}

async function createExecution(payload: {
  plugin_name: string
  action_name: string
  inputs: Record<string, any>
  primary_artifact_id?: string
}): Promise<ArtifactExecution> {
  console.log('Create Execution Payload:', payload)
  const res = await fetch(`${API_V2_BASE}/executions`, {
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

export function useActions() {
  return useQuery({
    queryKey: ['actions'],
    queryFn: fetchActions,
  })
}

export function useExecutions(params?: {
  plugin_name?: string
  status?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['executions', params],
    queryFn: () => fetchExecutions(params),
    refetchInterval: 2000, // Poll every 2s for updates
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

export function useCreateExecution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExecution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] })
    },
  })
}
