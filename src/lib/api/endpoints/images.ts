import { BACKEND_URL } from '../config'
import type { PromptImage } from '../types'

export async function fetchImage(id: string): Promise<PromptImage> {
  const response = await fetch(`${BACKEND_URL}/items/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchItem(itemId: number | string): Promise<PromptImage> {
  const response = await fetch(`${BACKEND_URL}/images/${itemId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch item')
  }
  const item = await response.json()

  // Map LocalImage to PromptImage
  return {
    id: item.id,
    owner_id: 'local',
    created_at: item.created_at,
    image_url: `${BACKEND_URL}/images/${item.id}/file`,
    thumb_url: `${BACKEND_URL}/images/${item.id}/thumbnail`,
    file_size: item.file_size,
    prompt: item.filename,
    author_name: 'Local User',
    author_username: 'local',
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
}) => {
  const { file, prompt, model = 'unknown', tags } = data

  const formData = new FormData()
  formData.append('file', file)
  formData.append('prompt', prompt)
  formData.append('model', model)
  if (tags) formData.append('tags', tags)

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
  id: string,
  data: Partial<PromptImage>,
): Promise<PromptImage> {
  const response = await fetch(`${BACKEND_URL}/items/${id}`, {
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
