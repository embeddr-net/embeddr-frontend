import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Switch } from '@embeddr/react-ui/components/switch'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@embeddr/react-ui/components/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import {
  fetchAnalysisConfigs,
  fetchAnalysisCapabilities,
  setAnalysisConfig,
  type PluginCapabilities,
} from '@/lib/api/endpoints/analysis'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import { ArrowUp, ArrowDown, Settings2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PluginConfigCard } from './PluginSettings'

interface Props {
  scope?: 'global' | 'collection'
  scopeId?: string | null
}

interface WorkflowStep {
  id: string
  pluginName: string
  label: string
  description?: string
  priority: number
  enabled: boolean
  originalPriority: number
  isDirty: boolean
  tags: string[]
}

export const IngestionWorkflowEditor = ({
  scope = 'global',
  scopeId,
}: Props) => {
  const queryClient = useQueryClient()
  const effectiveScopeId = scopeId || undefined
  const [selectedPluginForConfig, setSelectedPluginForConfig] = useState<
    string | null
  >(null)

  // 1. Fetching Data
  const { data: configs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['analysis-config', scope, effectiveScopeId],
    queryFn: () => fetchAnalysisConfigs(scope, effectiveScopeId),
  })

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

  // 2. Transforming Data into Linear Workflow
  const { steps, availableSteps } = useMemo(() => {
    if (!capabilities || loadingConfigs)
      return { steps: [], availableSteps: [] }

    const activeSteps: WorkflowStep[] = []
    const inactiveSteps: WorkflowStep[] = []

    capabilities.forEach((p: PluginCapabilities) => {
      p.capabilities.forEach((cap: any) => {
        // HEURISTIC: Only show capabilities tagged 'ingest' or capable of analysis
        const tags = cap.tags || []

        // Find existing config
        // The config key used in backend is usually `plugin_name` unless it's a specific capability override.
        // But here we treat the "plugin" as the unit of configuration for now,
        // because setAnalysisConfig takes `plugin_name`.
        // However, if a plugin has multiple capabilities, we might need to distinguish them.
        // For now, let's assume one main "ingest" capability per plugin or they share config.

        // Let's use the FULL ID for the switch logic if we want to support granular toggles later,
        // but existing setAnalysisConfig takes `plugin_name`.

        const fullId = `${p.plugin_name}:${cap.name}`
        // We check if there is a config entry for this specific plugin
        const cfg = configs?.find(
          (c) => c.plugin_name === fullId || c.plugin_name === p.plugin_name,
        )

        // Default Logic:
        // If config exists, use it.
        // If not, check "enabled" default.
        // We default to FALSE so they appear in "Available" list unless explicitly enabled.
        const enabled = cfg ? cfg.enabled : false

        const priority = cfg?.priority ?? cap.priority ?? 10

        const step = {
          id: p.plugin_name, // Key used for API
          pluginName: p.plugin_name,
          label: cap.label || cap.name,
          description: `Provided by ${p.plugin_name}`,
          priority: priority,
          originalPriority: cap.priority ?? 10,
          enabled: enabled,
          isDirty: false,
          tags: tags,
        }

        // Avoid duplicates if multiple capabilities map to same plugin?
        // For now, let's allow them.

        if (enabled) {
          activeSteps.push(step)
        } else {
          inactiveSteps.push(step)
        }
      })
    })

    // Sort by Priority Descending (Highest runs first)
    return {
      steps: activeSteps.sort((a, b) => b.priority - a.priority),
      availableSteps: inactiveSteps.sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    }
  }, [capabilities, configs, loadingConfigs])

  // 3. Handlers
  const handleAdd = (step: WorkflowStep) => {
    // Add to END of list (Lowest priority)
    const lowestPrio = steps.length > 0 ? steps[steps.length - 1].priority : 10
    const newPrio = Math.max(0, lowestPrio - 1)

    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: step.id,
      enabled: true,
      priority: newPrio,
    })
  }

  const handleRemove = (step: WorkflowStep) => {
    // Just disable it
    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: step.id,
      enabled: false,
      priority: step.priority,
    })
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === steps.length - 1) return

    const newSteps = [...steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    const current = newSteps[index]
    const target = newSteps[targetIndex]

    // Swap Priorities logic
    const tempPrio = current.priority
    current.priority = target.priority
    target.priority = tempPrio

    if (current.priority === target.priority) {
      if (direction === 'up') current.priority += 1
      else current.priority -= 1
    }

    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: current.id,
      enabled: current.enabled,
      priority: current.priority,
    })
    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: target.id,
      enabled: target.enabled,
      priority: target.priority,
    })
  }

  if (loadingConfigs || loadingCaps)
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    )

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ingestion Pipeline</CardTitle>
              <CardDescription>
                Customize steps that run when new artifacts are scanned. Steps
                execute in order from Top (High Priority) to Bottom.
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Step
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b font-medium bg-muted/30">
                  Available Actions
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {availableSteps.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No additional actions found.
                    </div>
                  )}
                  {availableSteps.map((step) => (
                    <button
                      key={step.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md flex items-center justify-between group"
                      onClick={() => handleAdd(step)}
                    >
                      <span>{step.label}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {step.pluginName}
                      </Badge>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card transition-all group"
              >
                {/* Ordering Controls */}
                <div className="flex flex-col gap-0 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === steps.length - 1}
                    onClick={() => handleMove(index, 'down')}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>

                {/* Step Icon/Number */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-transparent group-hover:ring-primary/20">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate">
                      {step.label}
                    </h4>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {step.pluginName}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      P{step.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedPluginForConfig(step.pluginName)}
                    title="Configure Step"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(step)}
                    title="Remove Step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {steps.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                Pipeline is empty. Add steps to configure ingestion.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedPluginForConfig}
        onOpenChange={(o) => !o && setSelectedPluginForConfig(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {selectedPluginForConfig}</DialogTitle>
          </DialogHeader>
          {selectedPluginForConfig && (
            <div className="pt-2">
              <PluginConfigCard
                pluginId={selectedPluginForConfig}
                showHeader={false}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
