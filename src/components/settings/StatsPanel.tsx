import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@embeddr/react-ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Button } from '@embeddr/react-ui/components/button'
import { Activity, HardDrive, Play, Power } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@embeddr/react-ui/lib/utils'
import { JobStatus } from './JobStatus'
import { useSettings } from '@/hooks/useSettings'
import { BACKEND_URL } from '@/lib/api'

export function StatsPanel() {
  const { selectedModel, setSelectedModel } = useSettings()
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/jobs/stats`)
      return res.json()
    },
    refetchInterval: 5000,
  })

  const { data: models } = useQuery({
    queryKey: ['available-models'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/system/models`)
      return res.json()
    },
    refetchInterval: 5000, // Poll to check loaded status
  })

  const loadModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const res = await fetch(
        `${BACKEND_URL}/system/models/${encodeURIComponent(modelId)}/load`,
        {
          method: 'POST',
        },
      )
      if (!res.ok) throw new Error('Failed to load model')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Model loaded successfully')
      queryClient.invalidateQueries({ queryKey: ['available-models'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const unloadModelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BACKEND_URL}/system/models/unload`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to unload model')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Model unloaded')
      queryClient.invalidateQueries({ queryKey: ['available-models'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const activeModel = models?.find((m: any) => m.loaded)
  const isModelLoading =
    loadModelMutation.isPending || unloadModelMutation.isPending

  const isLocked = activeModel?.id === selectedModel || isModelLoading
  return (
    <div className="space-y-1">
      <div className="grid gap-1 md:grid-cols-3">
        {/* GPU Stats */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">GPU Status</span>
          </div>
          {stats?.gpu ? (
            <div className="space-y-1">
              <div className="font-medium truncate" title={stats.gpu.name}>
                {stats.gpu.name}
              </div>
              <div className="text-xs text-muted-foreground">
                Mem: {stats.gpu.memory_allocated_mb}MB /{' '}
                {stats.gpu.memory_reserved_mb}MB
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              {stats?.gpu_error ? 'GPU Error' : 'No GPU Detected'}
            </div>
          )}
        </Card>

        {/* Model Selection */}
        <Card className="p-4 flex flex-col justify-between gap-2!">
          <div className="flex items-center justify-between text-muted-foreground m-0! ">
            <div className="flex items-center gap-2 w-full">
              {/* <Cpu className="h-4 w-4" /> */}
              <div
                className={`h-2 w-2 rounded-full ${
                  activeModel ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={activeModel ? 'Model Loaded' : 'No Model Loaded'}
              />
              <span className="text-xs font-medium uppercase">
                Active Model
              </span>
              {activeModel?.id === selectedModel ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 ml-auto"
                  onClick={() => unloadModelMutation.mutate()}
                  disabled={isModelLoading}
                  title="Unload Model"
                >
                  <Power className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 ml-auto p-0 text-green-500 hover:text-green-600"
                  onClick={() => loadModelMutation.mutate(selectedModel)}
                  disabled={isModelLoading}
                  title="Load Model"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={activeModel?.id === selectedModel || isModelLoading}
              >
                <SelectTrigger
                  className={cn(
                    'h-8 text-xs flex-1',
                    isLocked && 'opacity-50 cursor-not-allowed',
                  )}
                  onPointerDown={(e) => {
                    if (isLocked) {
                      e.preventDefault()
                      e.stopPropagation()
                      toast.warning('Please unload current model.')
                    }
                  }}
                >
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Disk Stats */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <HardDrive className="h-4 w-4" />
            <span className="text-xs font-medium uppercase">Storage</span>
          </div>
          {stats?.disk && (
            <div className="space-y-1">
              <div className="font-medium">{stats.disk.free_gb} GB Free</div>
              <div className="text-xs text-muted-foreground">
                {stats.disk.percent}% Used of {stats.disk.total_gb} GB
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Active Job Status */}
      <JobStatus />
    </div>
  )
}
