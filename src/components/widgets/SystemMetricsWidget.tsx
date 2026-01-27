import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import { useEmbeddrAPI } from '@/plugins/store'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { Database, Puzzle, Zap, Activity, Play } from 'lucide-react'

export function SystemMetricsWidget() {
  const api = useEmbeddrAPI()
  const { lastMessage } = useWebSocket()

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

  const automationStatus = React.useMemo(() => {
    const data = lastMessage?.data as any
    const automation = data?.automation_status
    return {
      total: automation?.total ?? 0,
      active: automation?.active ?? 0,
    }
  }, [lastMessage])

  const executionStatus = React.useMemo(() => {
    const data = lastMessage?.data as any
    const queueRemaining =
      data?.queue_status?.remaining ??
      data?.queue_remaining ??
      data?.exec_info?.queue_remaining ??
      data?.exec_info?.queueRemaining ??
      0
    const running = Array.isArray(data?.running_executions)
      ? data.running_executions.length
      : 0
    const active = Math.max(queueRemaining, running)
    return { queueRemaining, running, active }
  }, [lastMessage])

  const capsCount = capsQuery.data?.total ?? capsQuery.data?.items?.length ?? 0

  return (
    <div className="flex items-center gap-3 text-muted-foreground select-none">
      <div className="flex items-center gap-1.5" title="Total Artifacts">
        <Database className="w-3 h-3 text-primary/70" />
        <span className="font-mono">{artifactsQuery.data?.total ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Active Plugins">
        <Puzzle className="w-3 h-3 text-blue-400/70" />
        <span className="font-mono">{pluginsQuery.data?.length ?? 0}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Capabilities">
        <Zap className="w-3 h-3 text-yellow-500/70" />
        <span className="font-mono">{capsCount}</span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={`Active jobs (queue ${executionStatus.queueRemaining}, running ${executionStatus.running})`}
      >
        <Play className="w-3 h-3 text-emerald-400/70" />
        <span className="font-mono">{executionStatus.active}</span>
      </div>
      <div className="flex items-center gap-1.5" title="Active Automations">
        <Activity className="w-3 h-3 text-indigo-400/70" />
        <span className="font-mono">
          {automationStatus.active} / {automationStatus.total}
        </span>
      </div>
    </div>
  )
}
