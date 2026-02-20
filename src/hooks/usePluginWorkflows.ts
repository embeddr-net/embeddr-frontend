import { useMutation, useQuery } from '@tanstack/react-query'
import { BACKEND_URL } from '@/lib/api/config'
import { fetchWithAuth } from '@/lib/api/fetch'
import { useWorkflowProviderPluginId } from '@/lib/plugins/workflowProvider'

export const usePluginWorkflows = (pluginName?: string, category?: string) => {
  const resolvedPluginName = useWorkflowProviderPluginId()
  const targetPlugin = pluginName || resolvedPluginName

  return useQuery({
    queryKey: ['plugin-workflows', targetPlugin, category],
    queryFn: async () => {
      // Manual fetch because the client doesn't have dynamic plugin routes yet
      // unless we add a generic helper
      const res = await fetchWithAuth(
        `${BACKEND_URL}/plugins/${targetPlugin}/workflows${category ? `?category=${category}` : ''}`,
      )
      if (!res.ok) throw new Error('Failed to fetch plugin workflows')
      return res.json() as Promise<
        Array<{ id: number | string; name: string; description: string }>
      >
    },
  })
}

export const usePluginWorkflow = (
  pluginName: string | undefined,
  workflowName: string | null,
) => {
  const resolvedPluginName = useWorkflowProviderPluginId()
  const targetPlugin = pluginName || resolvedPluginName

  return useQuery({
    queryKey: ['plugin-workflow', targetPlugin, workflowName],
    queryFn: async () => {
      if (!workflowName) return null
      const res = await fetch(
        `${BACKEND_URL}/plugins/${targetPlugin}/workflows/${workflowName}`,
      )
      if (!res.ok) throw new Error('Failed to fetch plugin workflow')
      return res.json()
    },
    enabled: !!workflowName,
  })
}

export const useRunPluginWorkflow = (pluginName?: string) => {
  const resolvedPluginName = useWorkflowProviderPluginId()
  const targetPlugin = pluginName || resolvedPluginName

  return useMutation({
    mutationFn: async ({
      workflowName,
      inputs,
    }: {
      workflowName: string
      inputs: any
    }) => {
      const res = await fetch(`${BACKEND_URL}/plugins/${targetPlugin}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_name: workflowName, inputs }),
      })
      if (!res.ok) throw new Error('Failed to run plugin workflow')
      return res.json()
    },
  })
}
