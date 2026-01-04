import { useQuery } from '@tanstack/react-query'
import { BACKEND_URL } from '@/lib/api'

export interface Collection {
  id: number
  name: string
  description?: string
  created_at: string
  item_count: number
}

async function fetchCollections(): Promise<Array<Collection>> {
  const response = await fetch(`${BACKEND_URL}/collections`)
  if (!response.ok) {
    throw new Error('Failed to fetch collections')
  }
  return response.json()
}

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  })
}
