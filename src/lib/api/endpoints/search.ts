import { BACKEND_URL } from '../config'
import type { PromptImage } from '../types'

export async function fetchItems(
  data: {
    offset?: number
    limit?: number
    sort?: 'random' | 'new'
    filter?: 'all' | 'following'
    libraryId?: number | null
    tags?: Array<string>
    isArchived?: boolean | null
    mediaType?: 'image' | 'video' | 'all'
  } = {},
): Promise<Array<PromptImage>> {
  const {
    offset = 0,
    limit = 100,
    sort = 'new',
    libraryId,
    tags,
    isArchived = false,
    mediaType,
  } = data

  let url = `${BACKEND_URL}/images?skip=${offset}&limit=${limit}`
  if (libraryId) {
    url += `&library_id=${libraryId}`
  }
  if (sort) {
    url += `&sort=${sort}`
  }
  if (tags && tags.length > 0) {
    url += `&tags=${encodeURIComponent(tags.join(','))}`
  }
  if (isArchived !== undefined) {
    if (isArchived === null) {
      url += `&is_archived=null`
    } else {
      url += `&is_archived=${isArchived}`
    }
  }
  if (mediaType && mediaType !== 'all') {
    url += `&media_type=${mediaType}`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch items')
  }
  const result = await response.json()

  return result.items.map((item: any) => ({
    id: item.id,
    owner_id: 'local',
    created_at: item.created_at,
    image_url: `${BACKEND_URL}/images/${item.id}/file`,
    thumb_url: `${BACKEND_URL}/images/${item.id}/thumbnail`,
    file_size: item.file_size,
    prompt: item.filename,
    author_name: 'Local User',
    author_username: 'local',
    width: item.width,
    height: item.height,
    media_type: item.media_type,
    duration: item.duration,
    fps: item.fps,
    frame_count: item.frame_count,
    phash: item.phash,
    is_archived: item.is_archived,
  }))
}

export async function searchItems(
  query: string,
  limit: number = 50,
  offset: number = 0,
  libraryId?: number | null,
  model?: string,
  collectionId?: number | null,
  isArchived?: boolean | null,
  mediaType?: 'image' | 'video' | 'all',
): Promise<Array<PromptImage>> {
  let url = `${BACKEND_URL}/images?q=${encodeURIComponent(
    query,
  )}&limit=${limit}&skip=${offset}`
  if (libraryId) {
    url += `&library_id=${libraryId}`
  }
  if (collectionId) {
    url += `&collection_id=${collectionId}`
  }
  if (model) {
    url += `&model=${encodeURIComponent(model)}`
  }
  if (isArchived !== undefined) {
    if (isArchived === null) {
      url += `&is_archived=null`
    } else {
      url += `&is_archived=${isArchived}`
    }
  }
  if (mediaType && mediaType !== 'all') {
    url += `&media_type=${mediaType}`
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to search items')
  }
  const result = await response.json()

  return result.items.map((item: any) => ({
    id: item.id,
    owner_id: 'local',
    prompt: item.prompt || item.filename,
    model: item.model,
    created_at: item.created_at,
    image_url: `${BACKEND_URL}/images/${item.id}/file`,
    thumb_url: `${BACKEND_URL}/images/${item.id}/thumbnail`,
    width: item.width,
    height: item.height,
    file_size: item.file_size,
    phash: item.phash,
    is_archived: item.is_archived,
  }))
}

export async function searchItemsByImageId(
  imageId: number | string,
  limit: number = 50,
  offset: number = 0,
  libraryId?: number | null,
  model?: string,
  collectionId?: number | null,
  isArchived?: boolean | null,
  mediaType?: 'image' | 'video' | 'all',
): Promise<Array<PromptImage>> {
  let url = `${BACKEND_URL}/images/${imageId}/similar?limit=${limit}&skip=${offset}`
  if (libraryId) {
    url += `&library_id=${libraryId}`
  }
  if (collectionId) {
    url += `&collection_id=${collectionId}`
  }
  if (model) {
    url += `&model=${encodeURIComponent(model)}`
  }
  if (isArchived !== undefined) {
    if (isArchived === null) {
      url += `&is_archived=null`
    } else {
      url += `&is_archived=${isArchived}`
    }
  }
  if (mediaType && mediaType !== 'all') {
    url += `&media_type=${mediaType}`
  }

  const response = await fetch(url, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Failed to search items by image')
  }
  const result = await response.json()

  return result.items.map((item: any) => ({
    id: item.id,
    owner_id: 'local',
    prompt: item.prompt || item.filename,
    model: item.model,
    created_at: item.created_at,
    image_url: `${BACKEND_URL}/images/${item.id}/file`,
    thumb_url: `${BACKEND_URL}/images/${item.id}/thumbnail`,
    width: item.width,
    height: item.height,
    file_size: item.file_size,
    phash: item.phash,
    is_archived: item.is_archived,
  }))
}
