import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/v2/client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@embeddr/react-ui/components/card'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Skeleton } from '@embeddr/react-ui/components/skeleton'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import {
  Box,
  Package,
  Terminal,
  Zap,
  Play,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@embeddr/react-ui/components/dialog'

interface PluginAction {
  name: string
  label: string
  description: string
  command_args?: string
  requires_confirmation: boolean
  danger: boolean
  inputs?: string[]
}

export const PluginsList = () => {
  const [selectedAction, setSelectedAction] = useState<{
    pluginName: string
    action: PluginAction
    inputs: Record<string, string>
  } | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => embeddrApi.plugins.list(),
  })

  // Fetch collections if needed for inputs
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => embeddrApi.collections.list(),
  })

  // Mutation to execute action (CLI or API)
  const executeActionMutation = useMutation({
    mutationFn: async ({
      pluginName,
      action,
      inputs,
    }: {
      pluginName: string
      action: PluginAction
      inputs: Record<string, string>
    }) => {
      // 1. Prefer API execution if inputs are complex or no command_args
      if (!action.command_args || action.inputs?.length) {
        // Transform inputs if needed (e.g. rename 'collection' to 'collection_id')
        // But for now pass raw, plugin handles alias
        return embeddrApi.plugins.execute(pluginName, action.name, inputs)
      }

      // 2. Fallback to CLI command
      return embeddrApi.system.runCommand(action.command_args.split(' '))
    },
    onSuccess: (data) => {
      // Handle different response shapes
      if (data.success === false) {
        // CLI failure
        toast.error('Command failed', { description: data.stderr })
      } else if (data.status === 'success' || data.success) {
        // API or CLI success
        const result = data.result
          ? JSON.stringify(data.result, null, 2)
          : data.stdout
        toast.success('Action executed successfully', {
          description: (
            <pre className="mt-2 w-full rounded bg-slate-950 p-2 text-xs text-white overflow-x-auto">
              {result}
            </pre>
          ),
        })
      } else {
        // Unknown error state?
        toast.success('Action executed', { description: JSON.stringify(data) })
      }
      setSelectedAction(null)
    },
    onError: (err) => {
      toast.error('Failed to execute action', {
        description: err.message,
      })
      // Don't close dialog on error so they can retry/fix inputs
    },
  })

  const handleActionClick = (pluginName: string, action: PluginAction) => {
    // Always open dialog if inputs are required OR confirmation required
    if (
      action.requires_confirmation ||
      (action.inputs && action.inputs.length > 0)
    ) {
      setSelectedAction({ pluginName, action, inputs: {} })
    } else {
      // Immediate execution for simple safe CLI commands
      executeActionMutation.mutate({ pluginName, action, inputs: {} })
    }
  }

  const confirmAction = () => {
    if (selectedAction) {
      executeActionMutation.mutate({
        pluginName: selectedAction.pluginName,
        action: selectedAction.action,
        inputs: selectedAction.inputs,
      })
    }
  }

  const handleInputChange = (key: string, value: string) => {
    if (!selectedAction) return
    setSelectedAction({
      ...selectedAction,
      inputs: { ...selectedAction.inputs, [key]: value },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading plugins: {(error as Error).message}
      </div>
    )
  }

  const plugins = Array.isArray(data) ? data : (data as any)?.plugins || []

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {plugins.map((plugin: any) => (
          <Card key={plugin.name} className="py-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  {plugin.name}
                </CardTitle>
                <Badge variant="secondary">v{plugin.version}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Registered Intents
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plugin.intents.map((intent: string) => (
                      <Badge
                        key={intent}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {intent === 'register_api' && (
                          <Zap className="h-3 w-3" />
                        )}
                        {intent === 'register_cli' && (
                          <Terminal className="h-3 w-3" />
                        )}
                        {intent === 'register_artifact_type' && (
                          <Box className="h-3 w-3" />
                        )}
                        {intent}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions Section */}
                {plugin.actions && plugin.actions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-sm font-medium text-muted-foreground">
                      Actions
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {plugin.actions.map((action: PluginAction) => (
                        <div
                          key={action.name}
                          className="flex items-center justify-between p-2  border bg-muted/40"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {action.label}
                            </span>
                            {action.description && (
                              <span
                                className="text-xs text-muted-foreground max-w-[200px] truncate"
                                title={action.description}
                              >
                                {action.description}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={
                              action.danger ? 'destructive' : 'secondary'
                            }
                            onClick={() =>
                              handleActionClick(plugin.name, action)
                            }
                            disabled={executeActionMutation.isPending}
                          >
                            {executeActionMutation.isPending &&
                            selectedAction?.action.name === action.name ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : action.danger ? (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            ) : (
                              <Play className="h-3 w-3 mr-1" />
                            )}
                            Run
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {plugins.length === 0 && (
          <div className="text-center text-muted-foreground">
            No plugins loaded.
          </div>
        )}
      </div>

      {/* Confirmation / Inputs Dialog */}
      <Dialog
        open={!!selectedAction}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAction?.action.label}</DialogTitle>
            <DialogDescription>
              {selectedAction?.action.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Dynamic Inputs */}
            {selectedAction?.action.inputs?.map((inputName) => {
              // Special handling for common input types based on name
              // 'collection' -> Select Collection
              if (inputName === 'collection' || inputName === 'collection_id') {
                return (
                  <div key={inputName} className="space-y-2">
                    <Label>Select Collection</Label>
                    <Select
                      onValueChange={(val) => handleInputChange(inputName, val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a collection..." />
                      </SelectTrigger>
                      <SelectContent>
                        {collections?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label} ({c.file_count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }
              // 'artifact:image' -> Artifact ID input (no fancy selector for now)
              return (
                <div key={inputName} className="space-y-2">
                  <Label className="capitalize">
                    {inputName.replace(/[:_]/g, ' ')}
                  </Label>
                  <Input
                    placeholder={`Enter ${inputName}...`}
                    onChange={(e) =>
                      handleInputChange(inputName, e.target.value)
                    }
                  />
                </div>
              )
            })}

            {!selectedAction?.action.inputs?.length &&
              selectedAction?.action.command_args && (
                <div className="p-2 bg-muted rounded text-xs font-mono">
                  Running: embeddr {selectedAction.action.command_args}
                </div>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={executeActionMutation.isPending}
            >
              {executeActionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}
