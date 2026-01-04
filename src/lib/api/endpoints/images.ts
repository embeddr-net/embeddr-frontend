import { BACKEND_URL } from '../config'
import type { PromptImage } from '../types'

export async function fetchImage(id: string): Promise<PromptImage> {
  const response = await fetch(`${BACKEND_URL}/items/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchLocalImage(itemId: number | string): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/images/${itemId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch item')
  }
  return response.json()
}

export async function fetchItem(itemId: number | string): Promise<PromptImage> {
  const response = await fetch(`${BACKEND_URL}/images/${itemId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch item')
  }
  const item = await response.json()

  const mapLocalImage = (img: any) => ({
    id: img.id,
    owner_id: 'local',
    created_at: img.created_at,
    image_url: `${BACKEND_URL}/images/${img.id}/file`,
    thumb_url: `${BACKEND_URL}/images/${img.id}/thumbnail`,
    file_size: img.file_size,
    prompt: img.filename,
    author_name: 'Local User',
    author_username: 'local',
    media_type: img.media_type,
    duration: img.duration,
    fps: img.fps,
    frame_count: img.frame_count,
    phash: img.phash,
    is_archived: img.is_archived,
  })

  // Map LocalImage to PromptImage
  return {
    ...mapLocalImage(item),
    parents: item.parents?.map(mapLocalImage),
    children: item.children?.map(mapLocalImage),
  } as any as PromptImage
}

export async function uploadImage(
  file: File,
  metadata?: any,
): Promise<PromptImage> {
  const formData = new FormData()
  formData.append('file', file)
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  const response = await fetch(`${BACKEND_URL}/items/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.statusText}`)
  }
  return response.json()
}

export const uploadItem = async (data: {
  file: File
  prompt: string
  model?: string
  tags?: string
  parent_ids?: Array<string | number>
}) => {
  const { file, prompt, model = 'unknown', tags, parent_ids } = data

  const formData = new FormData()
  formData.append('file', file)
  formData.append('prompt', prompt)
  formData.append('model', model)
  if (tags) formData.append('tags', tags)
  if (parent_ids && parent_ids.length > 0) {
    formData.append('parent_ids', JSON.stringify(parent_ids))
  }

  const response = await fetch(`${BACKEND_URL}/images/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload item')
  }
  return response.json() as Promise<PromptImage>
}

export async function updateImage(
  id: number | string,
  data: { is_archived?: boolean; tags?: string; prompt?: string },
): Promise<PromptImage> {
  const response = await fetch(`${BACKEND_URL}/images/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to update image: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteImage(id: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/items/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete image: ${response.statusText}`)
  }
}

export async function toggleFavorite(id: string): Promise<PromptImage> {
  const response = await fetch(`${BACKEND_URL}/items/${id}/favorite`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to toggle favorite: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchTags(): Promise<
  Array<{ name: string; count: number }>
> {
  const response = await fetch(`${BACKEND_URL}/images/tags`)
  if (!response.ok) {
    throw new Error('Failed to fetch tags')
  }
  return response.json()
}
