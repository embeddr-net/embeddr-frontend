import { BACKEND_URL } from '../config'
import type { FolderInfo, LibraryStats, ScanResult } from '../types'

export interface LibraryPath {
  id: number
  path: string
  name: string | null
  image_count: number
}

export async function fetchLibraryPaths(): Promise<Array<LibraryPath>> {
  const response = await fetch(`${BACKEND_URL}/workspace/paths`)
  if (!response.ok) {
    throw new Error('Failed to fetch library paths')
  }
  return response.json()
}

export const fetchLibraries = fetchLibraryPaths

export async function getLibraryStats(): Promise<LibraryStats> {
  const response = await fetch(`${BACKEND_URL}/library/stats`)
  if (!response.ok) {
    throw new Error('Failed to fetch library stats: ${response.statusText}')
  }
  return response.json()
}

export async function scanLibrary(path?: string): Promise<ScanResult> {
  const response = await fetch(`${BACKEND_URL}/library/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  })

  if (!response.ok) {
    throw new Error('Failed to scan library: ${response.statusText}')
  }
  return response.json()
}

export async function getFolders(path?: string): Promise<Array<FolderInfo>> {
  const params = path ? `?path=${encodeURIComponent(path)}` : ''
  const response = await fetch(`${BACKEND_URL}/library/folders${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch folders: ${response.statusText}')
  }
  return response.json()
}
