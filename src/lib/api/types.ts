export interface PromptImage {
  id: number
  url: string
  image_url: string // Added for compatibility
  thumb_url?: string // Added for compatibility
  file_size?: number
  author_name?: string
  author_username?: string
  author_image?: string
  prompt: string
  negative_prompt?: string
  width: number
  height: number
  seed?: number
  steps?: number
  cfg_scale?: number
  sampler_name?: string
  scheduler?: string
  model_name?: string
  model?: string
  tags?: string
  created_at: string
  gallery_id?: string
  is_favorite?: boolean
  liked_by_me?: boolean
  like_count?: number
  embedding?: Array<number>
  metadata?: Record<string, any>
  origin?: string
  local_path?: string
}

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
  status: 'ok' | 'error' | 'maintenance'
  version: string
  features: {
    search: boolean
    generation: boolean
    upload: boolean
  }
  stats: {
    total_images: number
    total_galleries: number
    storage_used: number
  }
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
