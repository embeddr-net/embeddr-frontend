import { BACKEND_URL } from '../config'
import { fetchWithAuth } from '../fetch'
import type { PromptImage, SystemStatus } from '../types'

export async function getSystemStatus(): Promise<SystemStatus> {
  return {
    comfy: false,
    docs: false,
    mcp: false,
  }
  const response = await fetch(`${BACKEND_URL}/system/status`)
  if (!response.ok) {
    throw new Error(`Failed to fetch system status: ${response.statusText}`)
  }
  return response.json()
}

export interface GlobalStats {
  user_count: number
  image_count: number
  random_images: Array<PromptImage>
}

export const fetchGlobalStats = async () => {
  const response = await fetch(`${BACKEND_URL}/stats`)
  if (!response.ok) {
    throw new Error('Failed to fetch global stats')
  }
  return response.json() as Promise<GlobalStats>
}

export interface UmapStats {
  status: string
  generated_at?: string
  count?: number
}

export async function fetchUmapStats(): Promise<UmapStats> {
  const res = await fetch(`${BACKEND_URL}/umap/stats`)
  if (!res.ok) {
    throw new Error('Failed to fetch UMAP stats')
  }
  return res.json()
}

export async function fetchSystemLogs(
  limit: number = 100,
  filter?: string,
): Promise<Array<string>> {
  let url = `${BACKEND_URL}/system/logs?limit=${limit}`
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`
  }

  const res = await fetchWithAuth(url)
  if (!res.ok) {
    throw new Error('Failed to fetch system logs')
  }
  return res.json()
}

export interface ModelInfo {
  id: string
  name: string
}

export async function fetchAvailableModels(): Promise<Array<ModelInfo>> {
  const res = await fetchWithAuth(`${BACKEND_URL}/system/models`)
  if (!res.ok) {
    throw new Error('Failed to fetch available models')
  }
  return res.json()
}

export interface SystemInfoResponse {
  version: string
  dev_mode: boolean
  instance?: {
    name?: string | null
    logo_url?: string | null
    description?: string | null
  }
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

export async function fetchSystemInfo(): Promise<SystemInfoResponse> {
  const res = await fetchWithAuth(`${BACKEND_URL}/system/info`)
  if (!res.ok) {
    throw new Error('Failed to fetch system info')
  }
  return res.json()
}

export async function backupDatabase(): Promise<{
  status: string
  backup_path: string
}> {
  const res = await fetchWithAuth(`${BACKEND_URL}/system/db/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  })
  if (!res.ok) {
    throw new Error('Failed to backup database')
  }
  return res.json()
}
