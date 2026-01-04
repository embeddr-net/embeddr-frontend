import { BACKEND_URL } from '../config'
import type { Collection, PromptImage } from '../types'

export async function fetchCollections(): Promise<Array<Collection>> {
  const response = await fetch(`${BACKEND_URL}/collections`)
  if (!response.ok) {
    throw new Error('Failed to fetch collections')
  }
  return response.json()
}

export async function getCollection(id: string): Promise<Collection> {
  const response = await fetch(`${BACKEND_URL}/collections/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch collection: ${response.statusText}')
  }
  return response.json()
}

export async function createCollection(data: {
  name: string
  description?: string
}): Promise<Collection> {
  const response = await fetch(`${BACKEND_URL}/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create collection')
  }
  return response.json()
}

export async function deleteCollection(id: number): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/collections/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete collection')
  }
}

export async function addItemToCollection(
  collectionId: number,
  imageId: number,
): Promise<void> {
  const response = await fetch(
    `${BACKEND_URL}/collections/${collectionId}/items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId }),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to add item to collection')
  }
}

export async function removeItemFromCollection(
  collectionId: number,
  imageId: number,
): Promise<void> {
  const response = await fetch(
    `${BACKEND_URL}/collections/${collectionId}/items/${imageId}`,
    {
      method: 'DELETE',
    },
  )

  if (!response.ok) {
    throw new Error('Failed to remove item from collection')
  }
}

export async function fetchCollectionItems(
  collectionId: number,
  offset = 0,
  limit = 50,
): Promise<Array<PromptImage>> {
  const response = await fetch(
    `${BACKEND_URL}/collections/${collectionId}/items?skip=${offset}&limit=${limit}`,
  )
  if (!response.ok) {
    throw new Error('Failed to fetch collection items')
  }
  const result = await response.json()
  // Map LocalImage to PromptImage
  return result.items.map((item: any) => ({
    id: item.id,
    owner_id: 'local',
    prompt: item.prompt,
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

// Aliases for compatibility if needed, or just use the new names
export const getCollections = fetchCollections
export const getCollectionImages = fetchCollectionItems
export const addToCollection = addItemToCollection
export const removeFromCollection = removeItemFromCollection
