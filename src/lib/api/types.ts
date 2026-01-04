import type { Generation, PromptImage, Workflow } from '@embeddr/react-ui/types'

export type { PromptImage, Workflow, Generation }

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
