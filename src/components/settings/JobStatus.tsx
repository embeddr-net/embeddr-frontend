import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Progress } from '@embeddr/react-ui/components/progress'
import { Button } from '@embeddr/react-ui/components/button'
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { BACKEND_URL } from '@/lib/api'

export function JobStatus() {
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null)

  const { data: status, refetch } = useQuery({
    queryKey: ['job-status'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/jobs/status`)
      return res.json()
    },
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.status === 'running' ? 1000 : 5000
    },
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${BACKEND_URL}/jobs/stop`, { method: 'POST' })
    },
    onSuccess: () => {
      toast.info('Stopping job...')
      refetch()
    },
  })

  if (!status || status.status === 'idle') return null

  // If the job is completed/failed/stopped and we've dismissed this specific job ID, don't show it
  if (status.job_id === dismissedJobId && status.status !== 'running') {
    return null
  }

  const isRunning = status.status === 'running'
  const isCompleted = status.status === 'completed'
  const isFailed = status.status === 'failed'
  const isStopped = status.status === 'stopped'

  const percent = status.total > 0 ? (status.progress / status.total) * 100 : 0

  return (
    <div
      className={`border p-4 space-y-3 transition-colors ${
        isCompleted
          ? ' border-green-200'
          : isFailed
            ? 'bg-red-50/50 border-red-200'
            : 'bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {isFailed && <XCircle className="h-4 w-4 text-red-600" />}

          <span className="font-medium text-sm">
            {status.job_type === 'embedding_generation'
              ? 'Generating Embeddings'
              : 'Background Job'}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {status.message}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
            >
              <XCircle className="h-3 w-3 mr-1" /> Stop
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setDismissedJobId(status.job_id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Progress
          value={isCompleted ? 100 : percent}
          className={`h-2 ${isCompleted ? '[&>div]:bg-green-600' : ''}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {status.progress} / {status.total}
          </span>
          <span>{isCompleted ? '100' : Math.round(percent)}%</span>
        </div>
      </div>
    </div>
  )
}
