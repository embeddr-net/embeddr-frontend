import { useQuery } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'

export function useArtifact(id: string | null) {
  const enabled = !!id

  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['artifacts', 'artifact', id],
    queryFn: () => embeddrApi.artifacts.get(id!),
    enabled,
  })

  const { data: embeddings, isLoading: isLoadingEmbeddings } = useQuery({
    queryKey: ['artifacts', 'artifact', id, 'embeddings'],
    queryFn: () => embeddrApi.artifacts.getEmbeddings(id!),
    enabled,
  })

  const { data: annotations, isLoading: isLoadingAnnotations } = useQuery({
    queryKey: ['artifacts', 'artifact', id, 'annotations'],
    queryFn: () => embeddrApi.artifacts.getAnnotations(id!),
    enabled,
  })

  const { data: lineage, isLoading: isLoadingLineage } = useQuery({
    queryKey: ['artifacts', 'artifact', id, 'lineage'],
    queryFn: () => embeddrApi.artifacts.getLineage(id!),
    enabled,
  })

  const { data: relations, isLoading: isLoadingRelations } = useQuery({
    queryKey: ['artifacts', 'artifact', id, 'relations'],
    queryFn: () => embeddrApi.artifacts.getRelations(id!),
    enabled,
  })

  const contentUrl = id ? embeddrApi.artifacts.getContentUrl(id) : ''

  // Heuristic for capabilities until backend fully supports them in response
  const capabilities = new Set<string>(
    (details as any)?.override_capabilities || [],
  )

  if (details?.type_name === 'image') {
    capabilities.add('viewable')
    capabilities.add('processable')
  } else if (details?.type_name === 'document') {
    capabilities.add('viewable')
    capabilities.add('readable')
  } else if (details?.type_name === 'text') {
    capabilities.add('readable')
    capabilities.add('viewable')
  }
  const capabilityList = Array.from(capabilities)

  return {
    details,
    embeddings,
    annotations,
    lineage,
    relations,
    contentUrl,
    capabilities: capabilityList,
    isViewable: capabilities.has('viewable'),
    isLoading:
      isLoadingDetails ||
      isLoadingEmbeddings ||
      isLoadingAnnotations ||
      isLoadingLineage ||
      isLoadingRelations,
  }
}
