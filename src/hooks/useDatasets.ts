import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BACKEND_URL } from '@/lib/api'

export interface Dataset {
  id: number
  name: string
  description?: string
  type: 'regular' | 'image_pair'
  collection_id: number
  created_at: string
  updated_at: string
  item_count: number
  captioning_config?: string
}

export interface DatasetItem {
  id: number
  original_image_id: number
  processed_image_path?: string
  pair_image_path?: string
  caption?: string
  original_path: string
}

async function fetchDatasets(): Promise<Array<Dataset>> {
  const response = await fetch(`${BACKEND_URL}/datasets`)
  if (!response.ok) {
    throw new Error('Failed to fetch datasets')
  }
  return response.json()
}

async function getDataset(id: number): Promise<Dataset> {
  const response = await fetch(`${BACKEND_URL}/datasets/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch dataset')
  }
  return response.json()
}

async function getDatasetItems(id: number): Promise<Array<DatasetItem>> {
  const response = await fetch(`${BACKEND_URL}/datasets/${id}/items`)
  if (!response.ok) {
    throw new Error('Failed to fetch dataset items')
  }
  return response.json()
}

async function createDataset(data: {
  name: string
  description?: string
  type: 'regular' | 'image_pair'
  collection_id: number
}): Promise<Dataset> {
  const response = await fetch(`${BACKEND_URL}/datasets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create dataset')
  }
  return response.json()
}

async function deleteDataset(id: number): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/datasets/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete dataset')
  }
}

async function exportDataset(
  id: number,
): Promise<{ path: string; message: string }> {
  const response = await fetch(`${BACKEND_URL}/datasets/${id}/export`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to export dataset')
  }
  return response.json()
}

async function updateDatasetItem(data: {
  datasetId: number
  itemId: number
  updates: {
    processed_image_path?: string
    pair_image_path?: string
    caption?: string
  }
}): Promise<DatasetItem> {
  const response = await fetch(
    `${BACKEND_URL}/datasets/${data.datasetId}/items/${data.itemId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.updates),
    },
  )

  if (!response.ok) {
    throw new Error('Failed to update dataset item')
  }
  return response.json()
}

async function updateDataset(data: {
  id: number
  updates: {
    name?: string
    description?: string
    captioning_config?: string
  }
}): Promise<Dataset> {
  const response = await fetch(`${BACKEND_URL}/datasets/${data.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data.updates),
  })

  if (!response.ok) {
    throw new Error('Failed to update dataset')
  }
  return response.json()
}

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
  })
}

export function useDataset(id: number | null) {
  return useQuery({
    queryKey: ['dataset', id],
    queryFn: () => (id ? getDataset(id) : Promise.resolve(null)),
    enabled: !!id,
  })
}

export function useUpdateDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateDataset,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dataset', data.id] })
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useDatasetItems(id: number | null) {
  return useQuery({
    queryKey: ['dataset-items', id],
    queryFn: () => (id ? getDatasetItems(id) : Promise.resolve([])),
    enabled: !!id,
  })
}

export function useCreateDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useDeleteDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useUpdateDatasetItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateDatasetItem,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['dataset-items', variables.datasetId],
      })
    },
  })
}

export function useExportDataset() {
  return useMutation({
    mutationFn: exportDataset,
  })
}

async function autoCaptionDataset(id: number): Promise<{ message: string }> {
  const response = await fetch(`${BACKEND_URL}/datasets/${id}/caption`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to start auto-captioning')
  }
  return response.json()
}

async function generateItemCaption(data: {
  datasetId: number
  itemId: number
}): Promise<{ caption: string }> {
  const response = await fetch(
    `${BACKEND_URL}/datasets/${data.datasetId}/items/${data.itemId}/caption`,
    {
      method: 'POST',
    },
  )
  if (!response.ok) {
    throw new Error('Failed to generate caption')
  }
  return response.json()
}

export function useAutoCaptionDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: autoCaptionDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captioning-status'] })
    },
  })
}

export function useGenerateItemCaption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateItemCaption,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['dataset-items', variables.datasetId],
      })
      queryClient.invalidateQueries({ queryKey: ['captioning-status'] })
    },
  })
}
