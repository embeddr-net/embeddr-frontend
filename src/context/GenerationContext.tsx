import React, { useEffect } from 'react'
import { useGenerationStore } from '@/store/generationStore'

// Re-export the store hook as useGeneration for backward compatibility
// We wrap it to derive selectedGeneration from ID
export const useGeneration = () => {
  const store = useGenerationStore()
  const selectedGeneration =
    store.generations.find((g) => g.id === store.selectedGenerationId) || null

  return {
    ...store,
    selectedGeneration,
  }
}

// Dummy provider for backward compatibility (deprecated)
// We use this to trigger initial data fetching
export const GenerationProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { fetchWorkflows, fetchHistory, connectWebSocket } =
    useGenerationStore()

  useEffect(() => {
    fetchWorkflows()
    fetchHistory()
    connectWebSocket()
  }, [])

  return <>{children}</>
}
