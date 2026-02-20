import React, { useMemo } from 'react'
import { Card } from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@embeddr/react-ui/components/ui'
import { AlertTriangle, Boxes, Layers, Zap } from 'lucide-react'
import type {
  ArtifactRegistryResponse,
  ArtifactTypeCountsResponse,
  LotusCapability,
} from '@/lib/api/types'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { BACKEND_URL, BASE_URL } from '@/lib/api/config'
import { usePluginLogos } from '@/hooks/usePluginLogos'

type LotusOverviewPanelProps = {
  capabilities: LotusCapability[]
  plugins?: Array<Record<string, any>>
  stats: {
    artifacts: number
    plugins: number
    automations: number
    providers: number
  }
  operator?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string | null
    is_admin?: boolean
  } | null
  artifactRegistry?: ArtifactRegistryResponse
  artifactTypeCounts?: ArtifactTypeCountsResponse
  clientCount?: number
  clientDetails?: Array<{
    client_id: string
    address?: string | null
    user_agent?: string | null
    origin?: string | null
    forwarded_for?: string | null
    path?: string | null
  }>
  onManage?: (section: string) => void
}

export function LotusOverviewPanel({
  capabilities,
  plugins: _plugins = [],
  stats,
  operator,
  artifactRegistry,
  artifactTypeCounts,
  clientCount,
  clientDetails: _clientDetails,
  onManage,
}: LotusOverviewPanelProps) {
  const { isConnected, lastMessage } = useWebSocket()
  const { logos } = usePluginLogos()

  const kindCounts = useMemo(() => {
    const map = new Map<string, number>()
    capabilities.forEach((cap) => {
      const kind = cap.kind || 'other'
      map.set(kind, (map.get(kind) || 0) + 1)
    })
    return map
  }, [capabilities])

  const pluginsMap = useMemo(() => {
    const map = new Map<string, { total: number; versions: Set<string> }>()
    capabilities.forEach((cap) => {
      const plugin = cap.plugin || 'core'
      const entry = map.get(plugin) || { total: 0, versions: new Set() }
      entry.total += 1
      if (cap.version) {
        entry.versions.add(cap.version)
      }
      map.set(plugin, entry)
    })

    _plugins.forEach((plugin) => {
      const name = String(plugin.name || plugin.id || '')
      if (!name) return
      if (!map.has(name)) {
        map.set(name, { total: 0, versions: new Set() })
      }
      const entry = map.get(name)
      const version = plugin.version ? String(plugin.version) : null
      if (entry && version) {
        entry.versions.add(version)
      }
    })

    return map
  }, [capabilities, _plugins])

  const pluginOrder = useMemo(() => {
    return Array.from(pluginsMap.keys()).sort((a, b) => a.localeCompare(b))
  }, [pluginsMap])

  const statusMeta = useMemo(() => {
    const data = lastMessage?.data as any
    const queueRemaining =
      data?.queue_remaining ??
      data?.exec_info?.queue_remaining ??
      data?.exec_info?.queueRemaining ??
      null
    const socketClients =
      data?.client_count ??
      data?.clients?.length ??
      data?.connected_clients ??
      null
    return { queueRemaining, clientCount: socketClients }
  }, [lastMessage])

  const renderIcon = (cap: LotusCapability) => {
    const ui = (cap.data as any)?.ui || {}
    const color = ui?.color as string | undefined

    const svg = ui?.iconSvg as string | undefined
    if (svg && typeof svg === 'string') {
      return (
        <span
          className="w-3.5 h-3.5 inline-flex items-center justify-center"
          style={color ? { color } : undefined}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )
    }

    const iconUrl = ui?.iconUrl as string | undefined
    if (iconUrl) {
      let normalized = iconUrl
      if (normalized.startsWith('/') && !normalized.startsWith('/api/')) {
        const pluginName = cap.plugin || 'core'
        if (normalized.startsWith(`/${pluginName}/static/`)) {
          normalized = `/api/plugins${normalized}`
        }
      }
      const resolvedUrl = normalized.startsWith('http')
        ? normalized
        : `${
            normalized.startsWith('/api/') ? BASE_URL : BACKEND_URL
          }${normalized.startsWith('/') ? '' : '/'}${normalized}`
      return (
        <img
          src={resolvedUrl}
          alt=""
          className="w-3.5 h-3.5 object-contain rounded-sm"
          style={color ? { color } : undefined}
        />
      )
    }

    return null
  }

  const pluginIconCaps = useMemo(() => {
    const map = new Map<string, LotusCapability | null>()
    for (const cap of capabilities) {
      const plugin = cap.plugin || 'core'
      if (map.has(plugin)) continue
      const ui = (cap.data as any)?.ui || {}
      if (ui?.iconSvg || ui?.iconUrl) {
        map.set(plugin, cap)
      }
    }
    return map
  }, [capabilities])

  const typeCounts = useMemo(() => {
    const counts = artifactTypeCounts?.type_counts || {}
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [artifactTypeCounts])

  const baseTypeCounts = useMemo(() => {
    const counts = artifactTypeCounts?.base_type_counts || {}
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [artifactTypeCounts])

  const artifactTypeCaps = useMemo(() => {
    return capabilities.filter((cap) => cap.kind === 'artifact_type')
  }, [capabilities])

  const registeredTypesByPlugin = useMemo(() => {
    const map = new Map<string, Array<Record<string, any>>>()
    artifactTypeCaps.forEach((cap) => {
      const plugin = cap.plugin || 'core'
      const data = (cap.data as any) || {}
      const types = Array.isArray(data.types) ? data.types : []
      if (!map.has(plugin)) {
        map.set(plugin, [])
      }
      map.get(plugin)?.push(...types)
    })

    for (const [plugin, types] of map.entries()) {
      const deduped = new Map<string, Record<string, any>>()
      types.forEach((t) => {
        if (t?.name) deduped.set(String(t.name), t)
      })
      map.set(plugin, Array.from(deduped.values()))
    }

    return map
  }, [artifactTypeCaps])

  const unknownTypeCounts = useMemo(() => {
    const known = new Set<string>()
    for (const types of registeredTypesByPlugin.values()) {
      types.forEach((t) => {
        if (t?.name) known.add(String(t.name))
      })
    }

    return typeCounts.filter(([type]) => !known.has(type))
  }, [registeredTypesByPlugin, typeCounts])

  const operatorName =
    operator?.display_name || operator?.username || 'Operator'
  const operatorInitials = operatorName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const pulseItems = [
    { label: 'Artifacts', value: stats.artifacts },
    { label: 'Providers', value: stats.providers },
    { label: 'Automations', value: stats.automations },
    { label: 'Kinds', value: kindCounts.size },
    { label: 'Plugins', value: pluginOrder.length },
    { label: 'Capabilities', value: capabilities.length },
    { label: 'Queue', value: statusMeta.queueRemaining ?? '—' },
    { label: 'Clients', value: statusMeta.clientCount ?? clientCount ?? '—' },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="p-4 border bg-background">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-background/70 border flex items-center justify-center overflow-hidden">
              {operator?.avatar_url ? (
                <img
                  src={operator.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">
                  {operatorInitials || 'OP'}
                </span>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Operator
              </div>
              <div className="text-base font-semibold">{operatorName}</div>
              <div className="text-[11px] text-muted-foreground">
                {operator?.is_admin ? 'Admin session' : 'Standard session'}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={isConnected ? 'secondary' : 'destructive'}>
                {isConnected ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Clients</span>
              <span className="font-semibold">
                {statusMeta.clientCount ?? clientCount ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Queue</span>
              <span className="font-semibold">
                {statusMeta.queueRemaining ?? '—'}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManage?.('storage')}
            >
              Storage
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManage?.('defaults')}
            >
              Defaults
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManage?.('configs')}
            >
              Configs
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onManage?.('capabilities')}
            >
              Capabilities
            </Button>
          </div>
        </Card>

        <Card className="p-4 border bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold">System Pulse</div>
                <div className="text-[11px] text-muted-foreground">
                  Live platform telemetry and capability surface.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline">{capabilities.length} caps</Badge>
              <Badge variant="outline">{pluginOrder.length} plugins</Badge>
              <Badge variant="outline">{stats.artifacts} artifacts</Badge>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {pulseItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border bg-background/70 p-3"
              >
                <div className="text-[10px] text-muted-foreground">
                  {item.label}
                </div>
                <div className="text-lg font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Registry</div>
            <Badge variant="outline" className="text-[10px]">
              {artifactRegistry?.type_names?.length || 0} types
            </Badge>
          </div>
          <Tabs defaultValue="types" className="mt-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="types">Types</TabsTrigger>
              <TabsTrigger value="plugins">Plugins</TabsTrigger>
              <TabsTrigger value="kinds">Kinds</TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="mt-3">
              <ScrollArea className="h-80 pr-2" type="always">
                <TooltipProvider>
                  <div className="space-y-3">
                    {Array.from(registeredTypesByPlugin.entries()).map(
                      ([plugin, types]) => {
                        const iconCap = pluginIconCaps.get(plugin)
                        const pluginLogo = logos?.[plugin] || null
                        return (
                          <div key={plugin} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                              <span>{plugin}</span>
                              <span>{types.length} types</span>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-2">
                              {types.map((type) => {
                                const name = String(type?.name || 'unknown')
                                const count =
                                  artifactTypeCounts?.type_counts?.[name] || 0
                                return (
                                  <div
                                    key={`${plugin}-${name}`}
                                    className="flex items-center justify-between rounded border px-2 py-1 text-[11px]"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Tooltip>
                                        <TooltipTrigger className="flex items-center">
                                          {iconCap ? (
                                            renderIcon(iconCap)
                                          ) : pluginLogo ? (
                                            <img
                                              src={pluginLogo}
                                              alt=""
                                              className="w-3.5 h-3.5 object-contain rounded-sm"
                                            />
                                          ) : (
                                            <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
                                          )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {plugin}
                                        </TooltipContent>
                                      </Tooltip>
                                      <span className="text-foreground/90 truncate">
                                        {name}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px]"
                                    >
                                      {count}
                                    </Badge>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      },
                    )}
                    {registeredTypesByPlugin.size === 0 && (
                      <div className="text-xs text-muted-foreground">
                        No registry types found.
                      </div>
                    )}
                    {unknownTypeCounts.length > 0 && (
                      <div className="rounded border border-dashed p-2">
                        <div className="text-[11px] font-semibold text-muted-foreground">
                          Unregistered types
                        </div>
                        <div className="mt-2 grid gap-1 sm:grid-cols-2">
                          {unknownTypeCounts.map(([type, count]) => (
                            <div
                              key={`unknown-${type}`}
                              className="flex items-center justify-between rounded border px-2 py-1 text-[11px]"
                            >
                              <span className="text-foreground/90">{type}</span>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="plugins" className="mt-3">
              <ScrollArea className="h-80 pr-2" type="always">
                <div className="flex flex-col gap-2">
                  {pluginOrder.map((plugin) => {
                    const entry = pluginsMap.get(plugin)
                    if (!entry) return null
                    const iconCap = pluginIconCaps.get(plugin)
                    const pluginLogo = logos?.[plugin] || null
                    const pluginMeta = _plugins.find(
                      (item) => String(item.name || item.id || '') === plugin,
                    )
                    const panels = Array.isArray(pluginMeta?.panels)
                      ? pluginMeta?.panels.length
                      : 0
                    const pages = Array.isArray(pluginMeta?.pages)
                      ? pluginMeta?.pages.length
                      : 0
                    const widgets = Array.isArray(pluginMeta?.widgets)
                      ? pluginMeta?.widgets.length
                      : 0
                    const actions = Array.isArray(pluginMeta?.actions)
                      ? pluginMeta?.actions.length
                      : 0
                    const frontendCount = panels + pages + widgets

                    return (
                      <div
                        key={plugin}
                        className="flex items-center justify-between gap-2 text-[11px] rounded border px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {iconCap ? (
                            renderIcon(iconCap)
                          ) : pluginLogo ? (
                            <img
                              src={pluginLogo}
                              alt=""
                              className="w-3.5 h-3.5 object-contain rounded-sm"
                            />
                          ) : (
                            <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span className="font-medium truncate">{plugin}</span>
                          {entry.versions.size > 0 && (
                            <Badge variant="outline" className="text-[9px]">
                              v{Array.from(entry.versions)[0]}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3 w-3" /> {frontendCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Zap className="h-3 w-3" /> {actions}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Boxes className="h-3 w-3" /> {entry.total}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {pluginOrder.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                      <AlertTriangle className="w-6 h-6 mb-1 opacity-50" />
                      <span className="text-[10px]">No plugins detected</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="kinds" className="mt-3">
              <div className="flex flex-wrap gap-2">
                {Array.from(kindCounts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([kind, count]) => (
                    <Badge key={kind} variant="outline">
                      {kind}:{count}
                    </Badge>
                  ))}
                {kindCounts.size === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No capabilities detected.
                  </span>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="p-3">
          <div className="text-xs font-semibold">Registry Signals</div>
          <div className="mt-3 grid gap-2">
            <div className="rounded-lg border bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground">
                Registered types
              </div>
              <div className="text-lg font-semibold">
                {artifactRegistry?.type_names?.length || 0}
              </div>
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground">
                Base types
              </div>
              <div className="text-lg font-semibold">
                {artifactRegistry?.base_type_names?.length || 0}
              </div>
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground">
                Import sources
              </div>
              <div className="text-lg font-semibold">
                {artifactRegistry?.import_sources?.length || 0}
              </div>
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground">Origins</div>
              <div className="text-lg font-semibold">
                {artifactRegistry?.origins?.length || 0}
              </div>
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground">
                Base types
              </div>
              <ScrollArea className="mt-2 h-28 pr-2" type="always">
                <div className="space-y-2">
                  {baseTypeCounts.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      No base types found.
                    </div>
                  )}
                  {baseTypeCounts.map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-foreground/90">{type}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
