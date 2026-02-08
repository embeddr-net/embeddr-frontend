import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import type { Execution, ExecutionEvent } from '@/lib/api/types'

export interface ExecutionFilters {
  limit?: number
  offset?: number
  status?: string
  plugin_name?: string
  type?: string
  created_after?: string
  created_before?: string
  q?: string
}

export const useExecutions = (filters: ExecutionFilters) => {
  return useQuery<Execution[]>({
    queryKey: ['executions', filters],
    queryFn: async () => {
      const res = await embeddrApi.executions.list(filters)
      if (Array.isArray(res)) return res
      return res.items || []
    },
    staleTime: 5_000,
  })
}

export const useExecutionEvents = (
  executionId: string | null,
  params?: { limit?: number; offset?: number },
) => {
  return useQuery<ExecutionEvent[]>({
    queryKey: ['execution-events', executionId, params],
    queryFn: async () => {
      if (!executionId) return []
      const res = await embeddrApi.executions.events(executionId, params)
      if (Array.isArray(res)) return res
      return res.items || []
    },
    enabled: !!executionId,
  })
}

export const useCreateExecution = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      plugin_name: string
      job_type: string
      inputs: Record<string, any>
      primary_artifact_id?: string
    }) => embeddrApi.executions.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] })
    },
  })
}
