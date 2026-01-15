import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Switch } from '@embeddr/react-ui/components/switch'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import { Badge } from '@embeddr/react-ui/components/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@embeddr/react-ui/components/card'
import {
  fetchAnalysisConfigs,
  fetchAnalysisCapabilities,
  setAnalysisConfig,
} from '@/lib/api/endpoints/analysis'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import { AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@embeddr/react-ui/components/tooltip'

interface Props {
  scope?: 'global' | 'collection'
  scopeId?: string | null // Collection ID
}

interface MergedPlugin {
  name: string
  loaded: boolean
  enabled: boolean | null // null means default (true)
  priority: number | null
  capabilities: Map<string, MergedCapability>
}

interface MergedCapability {
  id: string // full id "plugin:cap"
  name: string // short name "cap"
  label?: string
  description?: string
  loaded: boolean
  enabled: boolean | null
  priority: number | null
  defaultPriority?: number
  supportedTypes?: string[]
}

export const AutoAnalysisSettings = ({ scope = 'global', scopeId }: Props) => {
  const queryClient = useQueryClient()

  const effectiveScopeId = scopeId || undefined

  const { data: configs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['analysis-config', scope, effectiveScopeId],
    queryFn: () => fetchAnalysisConfigs(scope, effectiveScopeId),
  })

  // We only fetch capabilities for global listings usually, but it's fine
  const { data: capabilities, isLoading: loadingCaps } = useQuery({
    queryKey: ['analysis-capabilities'],
    queryFn: fetchAnalysisCapabilities,
  })

  const mutation = useMutation({
    mutationFn: setAnalysisConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['analysis-config', scope, effectiveScopeId],
      })
    },
  })

  const mergedData = useMemo(() => {
    // We want to run even if one is missing, but for clean merge let's wait
    if (loadingConfigs || loadingCaps) return []

    const map = new Map<string, MergedPlugin>()

    // 1. Initialize from Loaded Capabilities
    capabilities?.forEach((p) => {
      map.set(p.plugin_name, {
        name: p.plugin_name,
        loaded: true,
        enabled: null, // Default
        priority: null,
        capabilities: new Map(),
      })

      const pEntry = map.get(p.plugin_name)!
      p.capabilities.forEach((c) => {
        const fullId = `${p.plugin_name}:${c.name}`
        pEntry.capabilities.set(c.name, {
          id: fullId,
          name: c.name,
          label: c.label,
          description: c.supported_types.join(', '), // simplistic desc
          loaded: true,
          enabled: null,
          priority: null,
          defaultPriority: c.priority,
          supportedTypes: c.supported_types,
        })
      })
    })

    // 2. Merge Saved Configs
    configs?.forEach((cfg) => {
      // Determine if this is a Plugin config or Capability config
      // Heuristic: Check if name contains colon

      const parts = cfg.plugin_name.split(':')
      const isCapability = parts.length > 1

      let pluginName = cfg.plugin_name
      let capName = ''

      if (isCapability) {
        pluginName = parts[0]
        capName = parts.slice(1).join(':') // handle multiple colons if any
      }

      // Find or Create Plugin Entry
      if (!map.has(pluginName)) {
        map.set(pluginName, {
          name: pluginName,
          loaded: false, // In config but not loaded
          enabled: null,
          priority: null,
          capabilities: new Map(),
        })
      }

      const pEntry = map.get(pluginName)!

      if (!isCapability) {
        // It's the plugin switch
        pEntry.enabled = cfg.enabled
        if (cfg.priority !== undefined) pEntry.priority = cfg.priority
      } else {
        // It's a capability switch
        if (!pEntry.capabilities.has(capName)) {
          pEntry.capabilities.set(capName, {
            id: cfg.plugin_name,
            name: capName,
            label: capName, // Fallback label
            loaded: false,
            enabled: null,
            priority: null,
            defaultPriority: 0,
          })
        }
        const cEntry = pEntry.capabilities.get(capName)!
        cEntry.enabled = cfg.enabled
        if (cfg.priority !== undefined && cfg.priority !== null)
          cEntry.priority = cfg.priority
      }
    })

    // Sort logic?
    // Usually plugins are sorted by name.

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [configs, capabilities, loadingConfigs, loadingCaps])

  if (loadingConfigs || loadingCaps)
    return (
      <div className="flex justify-center p-4">
        <Spinner />
      </div>
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {scope === 'global'
            ? 'Global Auto-Analysis Configuration'
            : 'Collection Analysis Overrides'}
        </CardTitle>
        <CardDescription>
          {scope === 'global'
            ? 'Configure which analysis tasks run automatically for new artifacts. Higher priority executes first.'
            : 'Override global settings for this collection.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mergedData.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No analysis plugins found.
          </div>
        )}

        {mergedData.map((plugin) => (
          <div
            key={plugin.name}
            className="border rounded-lg p-4 space-y-4 bg-card/50"
          >
            {/* Plugin Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">{plugin.name}</Label>
                {!plugin.loaded && (
                  <Badge
                    variant="outline"
                    className="text-yellow-500 border-yellow-500/50"
                  >
                    Not Loaded
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-2">
                  {plugin.enabled === false ? 'Disabled' : 'Enabled'}
                </span>
                <Switch
                  checked={plugin.enabled !== false} // Default to true
                  onCheckedChange={(checked) =>
                    mutation.mutate({
                      scope,
                      scope_id: effectiveScopeId,
                      plugin_name: plugin.name,
                      enabled: checked,
                      priority: plugin.priority || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Capabilities List */}
            {plugin.capabilities.size > 0 && (
              <div className="pl-4 border-l-2 border-muted space-y-3">
                {Array.from(plugin.capabilities.values())
                  .sort((a, b) => {
                    // Sort capabilities by effective priority for display?
                    const pA = a.priority ?? a.defaultPriority ?? 0
                    const pB = b.priority ?? b.defaultPriority ?? 0
                    return pB - pA // Descending
                  })
                  .map((cap) => (
                    <div
                      key={cap.id}
                      className="flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">
                            {cap.label || cap.name}
                          </Label>
                          {!cap.loaded && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="w-3 h-3 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Capability not found in loaded plugin
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {cap.description && (
                          <p className="text-xs text-muted-foreground">
                            {cap.loaded
                              ? `Types: ${cap.supportedTypes?.join(', ')}`
                              : 'Unknown Capability'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground hidden group-hover:inline-block">
                          Priority
                        </span>
                        <Input
                          type="number"
                          className="w-16 h-8 text-xs text-right"
                          value={cap.priority ?? cap.defaultPriority ?? 0}
                          disabled={plugin.enabled === false}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            mutation.mutate({
                              scope,
                              scope_id: effectiveScopeId,
                              plugin_name: cap.id,
                              enabled: cap.enabled !== false,
                              priority: isNaN(val) ? 0 : val,
                            })
                          }}
                        />
                        <Switch
                          disabled={plugin.enabled === false} // Disable if parent is off
                          checked={cap.enabled !== false}
                          onCheckedChange={(checked) =>
                            mutation.mutate({
                              scope,
                              scope_id: effectiveScopeId,
                              plugin_name: cap.id,
                              enabled: checked,
                              priority:
                                cap.priority ?? cap.defaultPriority ?? 0,
                            })
                          }
                          className="scale-90"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
