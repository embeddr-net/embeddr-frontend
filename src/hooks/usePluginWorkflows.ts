import { useMutation, useQuery } from '@tanstack/react-query'
import { BACKEND_V2_URL } from '@/lib/api/config'

export const usePluginWorkflows = (pluginName: string, category?: string) => {
  return useQuery({
    queryKey: ['plugin-workflows', pluginName, category],
    queryFn: async () => {
      // Manual fetch because v2 client doesn't have dynamic plugin routes yet
      // unless we add a generic helper
      const res = await fetch(
        `${BACKEND_V2_URL}/plugins/${pluginName}/workflows${category ? `?category=${category}` : ''}`,
      )
      if (!res.ok) throw new Error('Failed to fetch plugin workflows')
      return res.json() as Promise<
        Array<{ id: number | string; name: string; description: string }>
      >
    },
  })
}

export const usePluginWorkflow = (
  pluginName: string,
  workflowName: string | null,
) => {
  return useQuery({
    queryKey: ['plugin-workflow', pluginName, workflowName],
    queryFn: async () => {
      if (!workflowName) return null
      const res = await fetch(
        `${BACKEND_V2_URL}/plugins/${pluginName}/workflows/${workflowName}`,
      )
      if (!res.ok) throw new Error('Failed to fetch plugin workflow')
      return res.json()
    },
    enabled: !!workflowName,
  })
}

export const useRunPluginWorkflow = (pluginName: string) => {
  return useMutation({
    mutationFn: async ({
      workflowName,
      inputs,
    }: {
      workflowName: string
      inputs: any
    }) => {
      const res = await fetch(`${BACKEND_V2_URL}/plugins/${pluginName}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_name: workflowName, inputs }),
      })
      if (!res.ok) throw new Error('Failed to run plugin workflow')
      return res.json()
    },
  })
}
