import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkflow,
  deleteWorkflow,
  fetchWorkflows,
  getWorkflow,
  runWorkflow,
  syncWorkflows,
  updateWorkflow,
} from '../lib/api/endpoints/workflows'
import type { Workflow } from '../lib/api/endpoints/workflows'

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
  })
}

export function useSyncWorkflows() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: syncWorkflows,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useWorkflow(id: number | null) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => (id ? getWorkflow(id) : Promise.resolve(null)),
    enabled: !!id,
  })
}

export function useRunWorkflow() {
  return useMutation({
    mutationFn: ({
      id,
      inputs,
    }: {
      id: number
      inputs: Record<string, Record<string, any>>
    }) => runWorkflow(id, inputs),
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<Omit<Workflow, 'id' | 'created_at' | 'updated_at'>>
    }) => {
      const { meta, ...rest } = data
      return updateWorkflow(id, {
        ...rest,
        ...(meta ? { metadata: meta } : {}),
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', data.id] })
    },
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}
