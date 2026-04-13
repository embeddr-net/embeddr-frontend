import { BACKEND_URL } from '../config'
import { fetchWithAuth } from '../fetch'

export interface ServiceAdapter {
  id: string
  service_type: string
  name: string
  plugin_name: string
  capability_prefix: string
  is_default: boolean
  enabled: boolean
  config: Record<string, any>
  health_status: string
  health_message: string
  created_at: string
  updated_at: string
}

export interface ServiceOverviewAdapter {
  name: string
  plugin_name: string
  is_default: boolean
  enabled: boolean
  health: string
}

export interface ServiceOverview {
  type: string
  adapters: ServiceOverviewAdapter[]
}

export async function fetchServices(): Promise<ServiceOverview[]> {
  const res = await fetchWithAuth(`${BACKEND_URL}/services`)
  if (!res.ok) throw new Error('Failed to fetch services')
  return res.json()
}

export async function fetchAdapters(serviceType: string): Promise<ServiceAdapter[]> {
  const res = await fetchWithAuth(`${BACKEND_URL}/services/${serviceType}/adapters`)
  if (!res.ok) throw new Error(`Failed to fetch ${serviceType} adapters`)
  return res.json()
}

export async function fetchAdapter(serviceType: string, name: string): Promise<ServiceAdapter> {
  const res = await fetchWithAuth(`${BACKEND_URL}/services/${serviceType}/adapters/${name}`)
  if (!res.ok) throw new Error(`Failed to fetch adapter ${name}`)
  return res.json()
}

export async function createAdapter(serviceType: string, body: {
  name: string
  plugin_name: string
  capability_prefix: string
  config: Record<string, any>
  is_default?: boolean
}): Promise<ServiceAdapter> {
  const res = await fetchWithAuth(`${BACKEND_URL}/services/${serviceType}/adapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create adapter')
  return res.json()
}

export async function updateAdapter(serviceType: string, name: string, body: {
  config?: Record<string, any>
  enabled?: boolean
}): Promise<void> {
  const res = await fetchWithAuth(`${BACKEND_URL}/services/${serviceType}/adapters/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to update adapter')
}

export async function deleteAdapter(serviceType: string, name: string): Promise<void> {
  const res = await fetchWithAuth(`${BACKEND_URL}/services/${serviceType}/adapters/${name}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete adapter')
}

export async function setAdapterDefault(serviceType: string, name: string): Promise<void> {
  const res = await fetchWithAuth(`${BACKEND_URL}/services/${serviceType}/adapters/${name}/default`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to set default adapter')
}
