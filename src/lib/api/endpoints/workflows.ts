import { BACKEND_URL } from '../config'

export interface Workflow {
  id: number
  name: string
  description?: string
  data: Record<string, any>
  meta: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function fetchWorkflows(): Promise<Array<Workflow>> {
  const response = await fetch(`${BACKEND_URL}/workflows`)
  if (!response.ok) {
    throw new Error('Failed to fetch workflows')
  }
  return response.json()
}

export async function getWorkflow(id: number): Promise<Workflow> {
  const response = await fetch(`${BACKEND_URL}/workflows/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch workflow')
  }
  return response.json()
}

export async function createWorkflow(data: {
  name: string
  description?: string
  data: Record<string, any>
  metadata?: Record<string, any>
  is_active?: boolean
}): Promise<Workflow> {
  const response = await fetch(`${BACKEND_URL}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create workflow')
  }
  return response.json()
}

export async function syncWorkflows(): Promise<{ status: string }> {
  const response = await fetch(`${BACKEND_URL}/workflows/sync`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to sync workflows')
  }
  return response.json()
}

export async function runWorkflow(
  id: number,
  inputs: Record<string, Record<string, any>>,
): Promise<{ prompt_id: string; outputs: Array<any> }> {
  const response = await fetch(`${BACKEND_URL}/workflows/${id}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs }),
  })

  if (!response.ok) {
    throw new Error('Failed to run workflow')
  }
  return response.json()
}

export async function updateWorkflow(
  id: number,
  data: {
    name?: string
    description?: string
    data?: Record<string, any>
    metadata?: Record<string, any>
    is_active?: boolean
  },
): Promise<Workflow> {
  const response = await fetch(`${BACKEND_URL}/workflows/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to update workflow')
  }
  return response.json()
}

export async function deleteWorkflow(id: number): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/workflows/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete workflow')
  }
}
