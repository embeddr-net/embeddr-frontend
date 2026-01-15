import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchArtifact, runActionArtifact, updateArtifact } from '@/lib/api'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

export function useActionGraph(artifactId: string) {
  const queryClient = useQueryClient()

  // Fetch the ActionArtifact
  const {
    data: artifact,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['artifact', artifactId],
    queryFn: () => fetchArtifact(artifactId),
    enabled: !!artifactId,
  })

  // Graph Data Accessor
  const graph = artifact?.metadata_json?.graph || { nodes: [], edges: [] }

  // Run Mutation
  const runMutation = useMutation({
    mutationFn: async (inputs: Record<string, any>) => {
      return runActionArtifact(artifactId, inputs)
    },
    onSuccess: (data) => {
      toast.success(`Execution started: ${data.execution_id}`)
      // We might want to track this execution ID
    },
    onError: (err: any) => {
      toast.error(`Failed to start execution: ${err.message}`)
    },
  })

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (newGraph: any) => {
      if (!artifact) throw new Error('Artifact not loaded')
      const updatedMetadata = {
        ...artifact.metadata_json,
        graph: newGraph,
      }
      return updateArtifact(artifactId, { metadata_json: updatedMetadata })
    },
    onSuccess: () => {
      toast.success('Graph saved successfully')
      queryClient.invalidateQueries({ queryKey: ['artifact', artifactId] })
    },
    onError: (err: any) => {
      toast.error(`Failed to save graph: ${err.message}`)
    },
  })

  return {
    artifact,
    graph,
    isLoading,
    error,
    runGraph: runMutation.mutateAsync,
    isRunning: runMutation.isPending,
    saveGraph: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
