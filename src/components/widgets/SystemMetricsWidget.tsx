import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import { useEmbeddrAPI } from '@/plugins/store'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useGenerationStore } from '@/store/generationStore'
import { Database, Puzzle, Zap, Play } from 'lucide-react'

export function SystemMetricsWidget() {
  const api = useEmbeddrAPI()
  const { lastMessage } = useWebSocket()
  const queryClient = useQueryClient()
  const { queueStatus, generations } = useGenerationStore()

  const capsQuery = useQuery({
    queryKey: ['lotus', 'capabilities', 'global_bar'],
    queryFn: () => api.lotus.list({ limit: 200 }),
    staleTime: 60000,
  })

  const pluginsQuery = useQuery({
    queryKey: ['plugins', 'loaded'],
    queryFn: () => embeddrApi.plugins.list(),
    staleTime: 60000,
  })

  const artifactsQuery = useQuery({
    queryKey: ['artifacts', 'count'],
    queryFn: () => embeddrApi.artifacts.list({ limit: 1, offset: 0 }),
    staleTime: 30000,
  })

  const runningCount = React.useMemo(() => {
    return generations.filter((gen) =>
      ['pending', 'processing'].includes(gen.status),
    ).length
  }, [generations])

  const executionStatus = React.useMemo(() => {
    const queueRemaining = queueStatus?.remaining ?? 0
    const running = runningCount
    return {
      queueRemaining,
      running,
      active: queueRemaining + running,
    }
  }, [queueStatus?.remaining, runningCount])

  React.useEffect(() => {
    if (!lastMessage?.type) return
    const type = lastMessage.type as string

    if (
      type === 'dataset:items_added' ||
      type === 'dataset:item_updated' ||
      type === 'artifact.created' ||
      type === 'artifact.ingested'
    ) {
      queryClient.invalidateQueries({ queryKey: ['artifacts', 'count'] })
    }

    if (
      type === 'status_response' ||
      type === 'executing' ||
      type === 'execution_start' ||
      type === 'executed' ||
      type === 'generation_submitted'
    ) {
      queryClient.invalidateQueries({ queryKey: ['artifacts', 'count'] })
    }
  }, [lastMessage, queryClient])

  const capsCount = capsQuery.data?.total ?? capsQuery.data?.items?.length ?? 0

  return (
    <div className="flex items-center gap-2 text-muted-foreground select-none px-1 embeddr-system-metrics">
      <div
        className="flex items-center gap-1.5"
        title={artifactsQuery.data?.total + ' Total Artifacts'}
      >
        <Database className="w-3 h-3 text-primary/70" />
        <span className="font-mono hover:text-primary hover:font-bold ">
          {artifactsQuery.data?.total ?? 0}
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={pluginsQuery.data?.length + ' Loaded Plugins'}
      >
        <Puzzle className="w-3 h-3 text-blue-400/70" />
        <span className="font-mono hover:text-primary hover:font-bold ">
          {pluginsQuery.data?.length ?? 0}
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={capsCount + ' Capabilities'}
      >
        <Zap className="w-3 h-3 text-yellow-500/70" />
        <span className="font-mono hover:text-primary hover:font-bold ">
          {capsCount}
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={`Active jobs (queue ${executionStatus.queueRemaining}, running ${executionStatus.running})`}
      >
        <Play className="w-3 h-3 text-emerald-400/70" />
        <span className="font-mono hover:text-primary hover:font-bold ">
          {executionStatus.active}
        </span>
      </div>
    </div>
  )
}
