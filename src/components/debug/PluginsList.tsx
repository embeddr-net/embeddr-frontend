import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Skeleton } from '@embeddr/react-ui/components/skeleton'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import { Switch } from '@embeddr/react-ui/components/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@embeddr/react-ui/components/dialog'
import type { LotusCapability } from '@/lib/api/types'

type LotusActionCapability = LotusCapability & {
  data?: {
    action?: string
    plugin?: string
    input?: {
      schema?: Record<string, any>
    }
    expose?: Record<string, boolean>
    exec?: Record<string, any>
  }
}

type ActionDialogState = {
  capability: LotusActionCapability
  inputs: Record<string, any>
  confirm: boolean
}

const parseFieldValue = (schema: any, value: string | boolean) => {
  if (schema?.type === 'boolean') {
    return Boolean(value)
  }
  if (schema?.type === 'number' || schema?.type === 'integer') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }
  if (schema?.type === 'array' || schema?.type === 'object') {
    if (typeof value === 'string' && value.trim().length) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
  }
  return value
}

export const PluginsList = () => {
  const [search, setSearch] = useState('')
  const [selectedAction, setSelectedAction] =
    useState<ActionDialogState | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['lotus', 'capabilities', 'actions'],
    queryFn: () => embeddrApi.lotus.list({ kind: 'action', limit: 500 }),
  })

  const actions = useMemo(() => {
    const items = (data?.items || []) as LotusActionCapability[]
    return items.filter((cap) => {
      const expose = cap.data?.expose
      return !expose || expose.api !== false
    })
  }, [data])

  const grouped = useMemo(() => {
    const map = new Map<string, LotusActionCapability[]>()
    actions.forEach((cap) => {
      const plugin = cap.plugin || cap.data?.plugin || 'unknown'
      if (!map.has(plugin)) map.set(plugin, [])
      map.get(plugin)?.push(cap)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [actions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return grouped
    return grouped
      .map(([plugin, caps]) => {
        const filteredCaps = caps.filter((cap) => {
          const hay =
            `${cap.id} ${cap.title} ${cap.description || ''}`.toLowerCase()
          return hay.includes(q)
        })
        return [plugin, filteredCaps] as const
      })
      .filter(([, caps]) => caps.length > 0)
  }, [grouped, search])

  const invokeMutation = useMutation({
    mutationFn: async ({ capability, inputs }: ActionDialogState) => {
      return embeddrApi.lotus.invoke(capability.id, inputs)
    },
    onSuccess: (data) => {
      toast.success('Action invoked', {
        description: (
          <pre className="mt-2 w-full rounded bg-slate-950 p-2 text-xs text-white overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        ),
      })
      setSelectedAction(null)
    },
    onError: (err) => {
      toast.error('Failed to invoke action', {
        description: err instanceof Error ? err.message : String(err),
      })
    },
  })

  const handleOpen = (capability: LotusActionCapability) => {
    const schema = capability.data?.input?.schema || {}
    const properties = schema.properties || {}
    const defaults: Record<string, any> = {}

    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      if (prop.default !== undefined) defaults[key] = prop.default
    })

    setSelectedAction({ capability, inputs: defaults, confirm: false })
  }

  const updateInput = (key: string, schema: any, value: string | boolean) => {
    if (!selectedAction) return
    setSelectedAction({
      ...selectedAction,
      inputs: {
        ...selectedAction.inputs,
        [key]: parseFieldValue(schema, value),
      },
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
        Error loading Lotus actions: {(error as Error).message}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search Lotus actions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Badge variant="secondary">{actions.length} actions</Badge>
        </div>

        {filtered.map(([plugin, caps]) => (
          <Card key={plugin} className="py-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plugin}</CardTitle>
                <Badge variant="outline">{caps.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {caps.map((cap) => (
                  <div
                    key={cap.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {cap.title || cap.id}
                      </span>
                      {cap.description && (
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {cap.description}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {cap.id}
                      </span>
                    </div>
                    <Button size="sm" onClick={() => handleOpen(cap)}>
                      <Play className="mr-2 h-3 w-3" />
                      Invoke
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!selectedAction}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedAction?.capability.title}</DialogTitle>
            <DialogDescription>
              {selectedAction?.capability.description ||
                selectedAction?.capability.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedAction &&
              (() => {
                const schema =
                  selectedAction.capability.data?.input?.schema || {}
                const properties = schema.properties || {}
                const required = schema.required || []

                return Object.entries(properties).map(
                  ([key, prop]: [string, any]) => {
                    const value = selectedAction.inputs[key]
                    const label = prop.title || key

                    if (prop.enum) {
                      return (
                        <div key={key} className="space-y-2">
                          <Label>{label}</Label>
                          <Select
                            value={value ?? ''}
                            onValueChange={(val) => updateInput(key, prop, val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {prop.enum.map((opt: string) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    }

                    if (prop.type === 'boolean') {
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <Label>{label}</Label>
                            {prop.description && (
                              <div className="text-xs text-muted-foreground">
                                {prop.description}
                              </div>
                            )}
                          </div>
                          <Switch
                            checked={Boolean(value)}
                            onCheckedChange={(checked) =>
                              updateInput(key, prop, checked)
                            }
                          />
                        </div>
                      )
                    }

                    if (prop.type === 'object' || prop.type === 'array') {
                      return (
                        <div key={key} className="space-y-2">
                          <Label>
                            {label}
                            {required.includes(key) && (
                              <span className="text-destructive"> *</span>
                            )}
                          </Label>
                          <Textarea
                            value={
                              typeof value === 'string'
                                ? value
                                : JSON.stringify(value ?? {}, null, 2)
                            }
                            onChange={(event) =>
                              updateInput(key, prop, event.target.value)
                            }
                            className="min-h-24 font-mono text-xs"
                          />
                        </div>
                      )
                    }

                    return (
                      <div key={key} className="space-y-2">
                        <Label>
                          {label}
                          {required.includes(key) && (
                            <span className="text-destructive"> *</span>
                          )}
                        </Label>
                        <Input
                          value={value ?? ''}
                          onChange={(event) =>
                            updateInput(key, prop, event.target.value)
                          }
                          placeholder={prop.description || label}
                          type={
                            prop.type === 'number' || prop.type === 'integer'
                              ? 'number'
                              : 'text'
                          }
                        />
                      </div>
                    )
                  },
                )
              })()}

            {selectedAction?.capability.data?.exec?.requires_confirmation && (
              <div className="flex items-center justify-between">
                <Label>Confirm action</Label>
                <Switch
                  checked={selectedAction.confirm}
                  onCheckedChange={(checked) =>
                    setSelectedAction(
                      selectedAction
                        ? { ...selectedAction, confirm: checked }
                        : selectedAction,
                    )
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedAction && invokeMutation.mutate(selectedAction)
              }
              disabled={invokeMutation.isPending || !selectedAction}
            >
              {invokeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Invoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}
