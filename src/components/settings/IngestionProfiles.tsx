import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Label } from '@embeddr/react-ui/components/label'
import { Switch } from '@embeddr/react-ui/components/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { embeddrApi } from '@/lib/api/client'
import {
  fetchAnalysisConfigs,
  setAnalysisConfig,
  type AnalysisConfig,
} from '@/lib/api/endpoints/analysis'
import type { LotusCapability } from '@/lib/api/types'

type IngestionStep = {
  plugin_name: string
  label: string
  priority: number
}

const CORE_STEPS: IngestionStep[] = [
  {
    plugin_name: 'embeddr-thumbnailer',
    label: 'Generate thumbnails',
    priority: 20,
  },
  {
    plugin_name: 'embeddr-embeddings',
    label: 'Generate embeddings',
    priority: 10,
  },
]

const INGESTION_KEYWORDS = [
  'ingest',
  'thumbnail',
  'embedding',
  'embed',
  'scanner',
]

const isIngestionCapability = (cap: LotusCapability) => {
  if (cap.tags?.includes('ingest')) return true
  const id = String(cap.id || '').toLowerCase()
  const title = String(cap.title || '').toLowerCase()
  const slot = String(cap.slot || '').toLowerCase()
  return INGESTION_KEYWORDS.some(
    (key) => id.includes(key) || title.includes(key) || slot.includes(key),
  )
}

export function IngestionProfiles() {
  const queryClient = useQueryClient()
  const [applying, setApplying] = useState(false)

  const { data: lotusCaps } = useQuery({
    queryKey: ['lotus', 'capabilities', 'ingestion-defaults'],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  })

  const { data: blobRegistry } = useQuery({
    queryKey: ['system', 'blob-registry', 'ingestion-defaults'],
    queryFn: () => embeddrApi.system.getBlobRegistry(),
    staleTime: 30_000,
  })

  const { data: configs } = useQuery({
    queryKey: ['analysis-config', 'global', 'core-defaults'],
    queryFn: () => fetchAnalysisConfigs('global'),
    staleTime: 30_000,
  })

  const ingestionPlugins = useMemo(() => {
    const items = (lotusCaps?.items || []) as LotusCapability[]
    const names = new Set<string>()
    items.forEach((cap) => {
      if (!isIngestionCapability(cap)) return
      const pluginName = cap.plugin || cap.id?.split('.')[0]
      if (pluginName) names.add(pluginName)
    })
    return Array.from(names)
  }, [lotusCaps?.items])

  const coreStatus = useMemo(() => {
    const map = new Map(configs?.map((cfg) => [cfg.plugin_name, cfg]) || [])
    return CORE_STEPS.map((step) => ({
      ...step,
      enabled: map.get(step.plugin_name)?.enabled ?? false,
    }))
  }, [configs])

  const isCoreAvailable = CORE_STEPS.every((step) =>
    ingestionPlugins.includes(step.plugin_name),
  )

  const providerOptions = blobRegistry?.providers || []
  const defaultProvider = blobRegistry?.default_provider || 'default'

  const applyIngestionDefaults = async (enabledSteps: IngestionStep[]) => {
    await embeddrApi.system.applyIngestionDefaults({
      enabled_plugins: enabledSteps.map((step) => step.plugin_name),
    })
    queryClient.invalidateQueries({
      queryKey: ['system', 'ingestion', 'pipeline'],
    })
    queryClient.invalidateQueries({
      queryKey: ['system', 'automation', 'status'],
    })
  }

  const handleStorageChange = async (value: string) => {
    const provider = value === 'default' ? null : value
    await embeddrApi.system.setBlobDefaults({
      default_provider: provider,
      default_resolver: null,
    })
    queryClient.invalidateQueries({
      queryKey: ['system', 'blob-registry', 'ingestion-defaults'],
    })
  }

  const handleToggleStep = async (step: IngestionStep, enabled: boolean) => {
    const nextEnabled = coreStatus
      .map((item) =>
        item.plugin_name === step.plugin_name ? { ...item, enabled } : item,
      )
      .filter((item) => item.enabled)

    await setAnalysisConfig({
      scope: 'global',
      plugin_name: step.plugin_name,
      enabled,
      priority: step.priority,
    })
    queryClient.setQueryData<AnalysisConfig[]>(
      ['analysis-config', 'global', 'core-defaults'],
      (prev) => {
        const next = prev ? [...prev] : []
        const index = next.findIndex(
          (cfg) =>
            cfg.plugin_name === step.plugin_name &&
            cfg.scope === 'global' &&
            !cfg.scope_id,
        )
        const payload: AnalysisConfig = {
          scope: 'global',
          plugin_name: step.plugin_name,
          enabled,
          priority: step.priority,
        }
        if (index >= 0) {
          next[index] = { ...next[index], ...payload }
        } else {
          next.push(payload)
        }
        return next
      },
    )
    await applyIngestionDefaults(nextEnabled)
    queryClient.invalidateQueries({
      queryKey: ['analysis-config', 'global', 'core-defaults'],
    })
  }

  const handleApplyCoreDefaults = async () => {
    setApplying(true)
    try {
      await Promise.all(
        CORE_STEPS.map((step) =>
          setAnalysisConfig({
            scope: 'global',
            plugin_name: step.plugin_name,
            enabled: true,
            priority: step.priority,
          }),
        ),
      )
      queryClient.setQueryData<AnalysisConfig[]>(
        ['analysis-config', 'global', 'core-defaults'],
        (prev) => {
          const next = prev ? [...prev] : []
          CORE_STEPS.forEach((step) => {
            const index = next.findIndex(
              (cfg) =>
                cfg.plugin_name === step.plugin_name &&
                cfg.scope === 'global' &&
                !cfg.scope_id,
            )
            const payload: AnalysisConfig = {
              scope: 'global',
              plugin_name: step.plugin_name,
              enabled: true,
              priority: step.priority,
            }
            if (index >= 0) {
              next[index] = { ...next[index], ...payload }
            } else {
              next.push(payload)
            }
          })
          return next
        },
      )
      await applyIngestionDefaults(CORE_STEPS)
      queryClient.invalidateQueries({
        queryKey: ['analysis-config', 'global', 'core-defaults'],
      })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Card className="my-1">
      <CardHeader>
        <CardTitle>Ingestion Defaults</CardTitle>
        <CardDescription>
          Set where files go by default and enable core ingestion steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default storage provider</Label>
            {providerOptions.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No storage providers registered yet.
              </div>
            ) : (
              <Select
                value={defaultProvider}
                onValueChange={(value) => handleStorageChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use server default</SelectItem>
                  {providerOptions.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleApplyCoreDefaults}
              disabled={!isCoreAvailable || applying}
            >
              {applying ? 'Applying...' : 'Apply core defaults'}
            </Button>
          </div>
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Core ingestion</CardTitle>
            <CardDescription>
              Enable thumbnail + embedding generation for new artifacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coreStatus.map((step) => (
              <div
                key={step.plugin_name}
                className="flex items-center justify-between rounded-md border border-border/50 bg-background/60 px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">{step.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {step.plugin_name}
                  </div>
                </div>
                <Switch
                  checked={step.enabled}
                  onCheckedChange={(value) => handleToggleStep(step, !!value)}
                />
              </div>
            ))}
            {!isCoreAvailable && (
              <div className="text-xs text-muted-foreground">
                Core plugins not detected. Install thumbnailer and embeddings
                plugins to enable defaults.
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
