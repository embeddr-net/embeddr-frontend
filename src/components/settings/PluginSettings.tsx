import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BACKEND_URL } from '@/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/ui'
import { Switch } from '@embeddr/react-ui/components/ui'
import { Input } from '@embeddr/react-ui/components/ui'
import { Label } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { RefreshCcw, Save } from 'lucide-react'

interface ConfigItem {
  type: 'boolean' | 'string' | 'number'
  default: any
  label: string
  description?: string
}

interface PluginConfigResponse {
  config: Record<string, any>
  schema: Record<string, ConfigItem>
}

// Export for reuse
export function PluginConfigCard({
  pluginId,
  showHeader = true,
}: {
  pluginId: string
  showHeader?: boolean
}) {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery<PluginConfigResponse>({
    queryKey: ['plugin-config', pluginId],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/plugins/${pluginId}/config`)
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json()
    },
  })

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({})

  useEffect(() => {
    if (data?.config) {
      setLocalConfig(data.config)
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: async (newConfig: Record<string, any>) => {
      const res = await fetch(`${BACKEND_URL}/plugins/${pluginId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })
      if (!res.ok) throw new Error('Failed to update config')
      return res.json()
    },
    onSuccess: () => {
      toast.success(`${pluginId} configuration updated`)
      queryClient.invalidateQueries({ queryKey: ['plugin-config', pluginId] })
    },
    onError: (err: any) => {
      toast.error(`Update failed: ${err.message}`)
    },
  })

  if (isLoading) return <div>Loading {pluginId} config...</div>
  if (error) return null // Hide if no config found or error
  if (!data || Object.keys(data.schema).length === 0) return null

  const handleToggle = (key: string, val: boolean) => {
    setLocalConfig((prev) => ({ ...prev, [key]: val }))
  }

  const handleInputChange = (key: string, val: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <Card className={showHeader ? 'my-2' : 'border-0 shadow-none my-0'}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{pluginId}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalConfig(data.config)}
                disabled={
                  JSON.stringify(localConfig) === JSON.stringify(data.config)
                }
              >
                <RefreshCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
              <Button
                size="sm"
                onClick={() => mutation.mutate(localConfig)}
                disabled={
                  mutation.isPending ||
                  JSON.stringify(localConfig) === JSON.stringify(data.config)
                }
              >
                <Save className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Configure {pluginId} settings</CardDescription>
        </CardHeader>
      )}
      <CardContent className={showHeader ? 'space-y-4' : 'p-0 space-y-4'}>
        {Object.entries(data.schema).map(([key, item]) => (
          <div
            key={key}
            className="flex flex-col gap-1.5 border-b border-border/50 pb-3 last:border-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium">
                  {item.label || key}
                </Label>
                {item.description && (
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              {item.type === 'boolean' ? (
                <Switch
                  checked={localConfig[key] ?? item.default}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                />
              ) : (
                <Input
                  className="w-1/2 h-8 text-sm"
                  value={localConfig[key] ?? item.default}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                />
              )}
            </div>
          </div>
        ))}

        {!showHeader && (
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLocalConfig(data.config)}
              disabled={
                JSON.stringify(localConfig) === JSON.stringify(data.config)
              }
            >
              <RefreshCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
            <Button
              size="sm"
              onClick={() => mutation.mutate(localConfig)}
              disabled={
                mutation.isPending ||
                JSON.stringify(localConfig) === JSON.stringify(data.config)
              }
            >
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PluginSettings() {
  const { data: plugins, isLoading } = useQuery<any[]>({
    queryKey: ['plugins-backend'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/plugins`)
      if (!res.ok) throw new Error('Failed to fetch plugins')
      return res.json()
    },
  })

  if (isLoading) return <div>Loading plugins...</div>

  return (
    <div className="space-y-4">
      {plugins?.map((plugin) => (
        <PluginConfigCard key={plugin.id} pluginId={plugin.id} />
      ))}
    </div>
  )
}
