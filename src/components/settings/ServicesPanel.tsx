import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { Label } from '@embeddr/react-ui/ui'
import { Switch } from '@embeddr/react-ui/ui'
import {
  HardDrive,
  Brain,
  Search,
  Star,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Save,
  TestTube,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  fetchServices,
  fetchAdapters,
  setAdapterDefault,
  updateAdapter,
  type ServiceOverview,
  type ServiceAdapter,
} from '@/lib/api'
import { BACKEND_URL } from '@/lib/api/config'
import { fetchWithAuth } from '@/lib/api/fetch'

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  storage: <HardDrive className="h-5 w-5" />,
  embeddings: <Brain className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
}

const SERVICE_LABELS: Record<string, string> = {
  storage: 'Storage',
  embeddings: 'Embeddings',
  search: 'Search',
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  storage: 'Where artifacts and blobs are stored',
  embeddings: 'Vector embedding models for search and similarity',
  search: 'Search index and query backends',
}

function healthBadge(status: string) {
  switch (status) {
    case 'healthy':
      return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Healthy</Badge>
    case 'needs_credentials':
      return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Needs Config</Badge>
    case 'degraded':
      return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Degraded</Badge>
    case 'unhealthy':
      return <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10">Unhealthy</Badge>
    default:
      return <Badge variant="outline" className="text-muted-foreground">Unknown</Badge>
  }
}

// Fetch config schema for a plugin to know field types and which are secrets
interface ConfigSchemaField {
  key: string
  type: string
  description?: string
  default?: any
  isSecret: boolean
}

function useConfigSchema(pluginName: string) {
  return useQuery({
    queryKey: ['config-schema', pluginName],
    queryFn: async (): Promise<ConfigSchemaField[]> => {
      const res = await fetchWithAuth(`${BACKEND_URL}/config/schemas`)
      if (!res.ok) return []
      const schemas = await res.json()
      const match = schemas.find((s: any) => s.plugin_name === pluginName)
      if (!match) return []

      const schema = typeof match.schema_json === 'string'
        ? JSON.parse(match.schema_json)
        : match.schema || {}
      const ui = typeof match.ui_json === 'string'
        ? JSON.parse(match.ui_json)
        : match.ui || {}
      const widgets = ui.widgets || {}
      const order: string[] = ui.order || []
      const props = schema.properties || {}

      const fields: ConfigSchemaField[] = Object.entries(props).map(([key, val]: [string, any]) => ({
        key,
        type: val.type || 'string',
        description: val.description || '',
        default: val.default,
        isSecret: widgets[key] === 'password',
      }))

      // Sort by UI order if specified
      if (order.length > 0) {
        fields.sort((a, b) => {
          const ai = order.indexOf(a.key)
          const bi = order.indexOf(b.key)
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
        })
      }

      return fields
    },
    staleTime: 60000,
  })
}

function AdapterConfigForm({
  adapter,
  serviceType,
  onSaved,
}: {
  adapter: ServiceAdapter
  serviceType: string
  onSaved: () => void
}) {
  const { data: fields } = useConfigSchema(adapter.plugin_name)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()

  useEffect(() => {
    // Initialize form with adapter's current config
    const initial: Record<string, any> = { ...adapter.config }
    setFormData(initial)
  }, [adapter.config])

  const saveMutation = useMutation({
    mutationFn: () => updateAdapter(serviceType, adapter.name, { config: formData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adapters', serviceType] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success(`${adapter.name} adapter updated`)
      onSaved()
    },
    onError: () => toast.error('Failed to save adapter config'),
  })

  if (!fields || fields.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        No configuration schema available for this plugin.
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-2">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label className="text-xs font-medium">
            {field.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            {field.isSecret && (
              <span className="text-muted-foreground ml-1">(encrypted)</span>
            )}
          </Label>
          <div className="flex gap-1">
            {field.type === 'integer' ? (
              <Input
                type="number"
                value={formData[field.key] ?? field.default ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))
                }
                placeholder={field.description || field.key}
                className="h-8 text-sm"
              />
            ) : (
              <Input
                type={field.isSecret && !showSecrets[field.key] ? 'password' : 'text'}
                value={formData[field.key] ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.isSecret ? '••••••••' : (field.description || field.key)}
                className="h-8 text-sm"
              />
            )}
            {field.isSecret && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() =>
                  setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                }
              >
                {showSecrets[field.key] ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          Save
        </Button>
      </div>
    </div>
  )
}

function AdapterCard({
  adapter,
  serviceType,
  onSetDefault,
  onToggleEnabled,
}: {
  adapter: ServiceAdapter
  serviceType: string
  onSetDefault: () => void
  onToggleEnabled: (enabled: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      !adapter.enabled && "opacity-50",
      adapter.is_default && "border-primary/40 bg-primary/5",
    )}>
      <div
        className="flex items-center justify-between p-3 gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{adapter.name}</span>
              {adapter.is_default && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">Default</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {adapter.plugin_name}
              {adapter.config?.bucket && ` — ${adapter.config.bucket}`}
              {adapter.config?.endpoint_url && ` (${adapter.config.endpoint_url})`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {healthBadge(adapter.health_status)}

          {!adapter.is_default && adapter.enabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onSetDefault}
              title="Set as default"
            >
              <Star className="h-3.5 w-3.5" />
            </Button>
          )}

          <Switch
            checked={adapter.enabled}
            onCheckedChange={onToggleEnabled}
            className="scale-75"
          />
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/50 mt-0 pt-2">
          <AdapterConfigForm
            adapter={adapter}
            serviceType={serviceType}
            onSaved={() => {}}
          />
        </div>
      )}
    </div>
  )
}

function ServiceSection({ service }: { service: ServiceOverview }) {
  const queryClient = useQueryClient()

  const { data: adapters, isLoading } = useQuery({
    queryKey: ['adapters', service.type],
    queryFn: () => fetchAdapters(service.type),
    refetchInterval: 10000,
  })

  const setDefaultMutation = useMutation({
    mutationFn: (name: string) => setAdapterDefault(service.type, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adapters', service.type] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('Default adapter updated')
    },
    onError: () => toast.error('Failed to set default'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      updateAdapter(service.type, name, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adapters', service.type] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
    onError: () => toast.error('Failed to update adapter'),
  })

  const icon = SERVICE_ICONS[service.type]
  const label = SERVICE_LABELS[service.type] || service.type
  const description = SERVICE_DESCRIPTIONS[service.type] || ''

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !adapters || adapters.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No adapters registered. Install a plugin that provides {label.toLowerCase()}.
          </div>
        ) : (
          <div className="space-y-2">
            {adapters.map((adapter) => (
              <AdapterCard
                key={adapter.id}
                adapter={adapter}
                serviceType={service.type}
                onSetDefault={() => setDefaultMutation.mutate(adapter.name)}
                onToggleEnabled={(enabled) =>
                  toggleMutation.mutate({ name: adapter.name, enabled })
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ServicesPanel() {
  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    refetchInterval: 15000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Services & Adapters
        </h3>
        <p className="text-xs text-muted-foreground">
          System-level backends for storage, embeddings, and search. Click an adapter to configure it.
        </p>
      </div>

      {services?.map((service) => (
        <ServiceSection key={service.type} service={service} />
      ))}
    </div>
  )
}
