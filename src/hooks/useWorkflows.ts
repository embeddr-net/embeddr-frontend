import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkflow,
  duplicateWorkflow,
  composeWorkflows,
  fetchWorkflows,
  getWorkflow,
  runWorkflow,
  updateWorkflowMetadata,
  deleteWorkflow,
  getWorkflowTemplates,
  type WorkflowArtifactMetadata,
} from '../lib/api/endpoints/workflows'
import type { WorkflowArtifact } from '../lib/api/endpoints/workflows'

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow-templates'],
    queryFn: getWorkflowTemplates,
  })
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
  })
}

export function useWorkflow(id: string | number | null) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => (id ? getWorkflow(id) : Promise.resolve(null)),
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      graph?: any
      template?: string
    }) => createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useDuplicateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: duplicateWorkflow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useComposeWorkflows() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, name }: { ids: string[]; name: string }) =>
      composeWorkflows(ids, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

// Deprecated name, but implemented for V2
export function useRunWorkflow() {
  return useMutation({
    mutationFn: async ({
      id,
      inputs,
    }: {
      id: string | number
      inputs: any
    }) => {
      return runWorkflow(id, inputs)
    },
  })
}

export function useSyncWorkflows() {
  return useMutation({
    mutationFn: async () => ({ status: 'ok' }),
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}

export function useUpdateWorkflow() {
  // Stub
  return useMutation({
    mutationFn: async (args: any) => {
      console.log('update', args)
    },
  })
}

export function useUpdateWorkflowMetadata() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      metadata,
    }: {
      id: string | number
      metadata: Record<string, any>
    }) => updateWorkflowMetadata(id, metadata),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow'] }),
  })
}
