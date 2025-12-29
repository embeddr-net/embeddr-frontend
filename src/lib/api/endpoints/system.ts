import { BACKEND_URL } from '../config'
import type { PromptImage, SystemStatus } from '../types'

export async function getSystemStatus(): Promise<SystemStatus> {
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

  const res = await fetch(url)
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
  const res = await fetch(`${BACKEND_URL}/system/models`)
  if (!res.ok) {
    throw new Error('Failed to fetch available models')
  }
  return res.json()
}
