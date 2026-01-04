import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BACKEND_URL } from '@/lib/api/config'

export interface CaptioningModelOption {
  name: string
  label: string
  type: 'select' | 'text' | 'textarea' | 'number' | 'checkbox'
  options?: Array<{ label: string; value: string | number | boolean }>
  default?: any
  required?: boolean
  placeholder?: string
  description?: string
}

export interface CaptioningModel {
  id: string
  name: string
  description: string
  capabilities: Array<string>
  options: Record<string, Array<CaptioningModelOption>>
}

export function useCaptioningModels() {
  return useQuery<Array<CaptioningModel>>({
    queryKey: ['captioning-models'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/captioning/models`)
      if (!res.ok) throw new Error('Failed to fetch captioning models')
      return res.json()
    },
  })
}

export function useCaptioningStatus() {
  return useQuery<{ loaded_model: string | null }>({
    queryKey: ['captioning-status'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/captioning/status`)
      if (!res.ok) throw new Error('Failed to fetch captioning status')
      return res.json()
    },
    refetchInterval: 2000, // Poll every 2 seconds
  })
}

export function useLoadCaptioningModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (modelName: string) => {
      const res = await fetch(`${BACKEND_URL}/captioning/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      })
      if (!res.ok) throw new Error('Failed to load model')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captioning-status'] })
    },
  })
}

export function useUnloadCaptioningModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BACKEND_URL}/captioning/unload`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to unload model')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captioning-status'] })
    },
  })
}
