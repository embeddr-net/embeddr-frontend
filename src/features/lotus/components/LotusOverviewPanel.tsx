import React, { useMemo, useState } from 'react'
import { Card } from '@embeddr/react-ui/components/card'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import {
  AlertTriangle,
  Boxes,
  Plug,
  Globe,
  HardDrive,
  Cpu,
  Network,
  Database,
  Box,
  Zap,
  Shield,
  Settings,
  Workflow,
  Sparkles,
} from 'lucide-react'
import type { LotusCapability } from '@/lib/api/v2/types'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { BACKEND_URL } from '@/lib/api/config'

type LotusOverviewPanelProps = {
  capabilities: LotusCapability[]
  plugins?: Array<Record<string, any>>
  stats: {
    artifacts: number
    plugins: number
    automations: number
    providers: number
  }
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
  plugins = [],
  stats,
  clientCount,
  clientDetails,
  onManage,
}: LotusOverviewPanelProps) {
  const { isConnected, lastMessage } = useWebSocket()
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null)
  const capabilitiesByKind = useMemo(() => {
    const map = new Map<string, LotusCapability[]>()
    capabilities.forEach((cap) => {
      const kind = cap.kind || 'other'
      const list = map.get(kind) || []
      list.push(cap)
      map.set(kind, list)
    })

    Array.from(map.values()).forEach((list) =>
      list.sort((a, b) => a.title.localeCompare(b.title)),
    )

    return map
  }, [capabilities])

  const kindOrder = useMemo(() => {
    return Array.from(capabilitiesByKind.keys()).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [capabilitiesByKind])

  const isPanelCapability = (cap: LotusCapability) => {
    const ui = (cap.data as any)?.ui || {}
    const tags = cap.tags || []
    return (
      Boolean(ui.panel || ui.panelId || ui.panel_id || ui.slot) ||
      tags.includes('panel') ||
      tags.includes('ui')
    )
  }

  const panelCapabilities = useMemo(
    () => capabilities.filter(isPanelCapability),
    [capabilities],
  )

  const kindCounts = useMemo(() => {
    const map = new Map<string, number>()
    capabilities.forEach((cap) => {
      const kind = cap.kind || 'other'
      map.set(kind, (map.get(kind) || 0) + 1)
    })
    return map
  }, [capabilities])

  const pluginsMap = useMemo(() => {
    const map = new Map<
      string,
      { total: number; kinds: Record<string, number>; versions: Set<string> }
    >()

    capabilities.forEach((cap) => {
      const plugin = cap.plugin || 'core'
      const entry = map.get(plugin) || {
        total: 0,
        kinds: {},
        versions: new Set(),
      }
      entry.total += 1
      entry.kinds[cap.kind] = (entry.kinds[cap.kind] || 0) + 1
      if (cap.version) {
        entry.versions.add(cap.version)
      }
      map.set(plugin, entry)
    })

    return map
  }, [capabilities])

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

  type IconComponent = React.ComponentType<{
    className?: string
    style?: React.CSSProperties
  }>

  const iconMap: Record<string, IconComponent> = {
    plug: Plug,
    globe: Globe,
    harddrive: HardDrive,
    cpu: Cpu,
    network: Network,
    database: Database,
    box: Box,
    boxes: Boxes,
    zap: Zap,
    shield: Shield,
  }

  const kindIconMap: Record<string, IconComponent> = {
    action: Zap,
    feature: Sparkles,
    config: Settings,
    storage: HardDrive,
    provider: Plug,
    resolver: Network,
    indexer: Database,
    artifact_type: Box,
    workflow: Workflow,
    transport: Globe,
    embedding: Cpu,
  }

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
      const resolvedUrl = iconUrl.startsWith('http')
        ? iconUrl
        : `${BACKEND_URL}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`
      return (
        <img
          src={resolvedUrl}
          alt=""
          className="w-3.5 h-3.5 object-contain rounded-sm"
          style={color ? { color } : undefined}
        />
      )
    }

    const raw = ui?.icon
    if (!raw || typeof raw !== 'string') return null
    const key = raw.toLowerCase()
    const Icon = iconMap[key]
    if (!Icon) return null
    return (
      <Icon className="w-3.5 h-3.5" style={color ? { color } : undefined} />
    )
  }

  const pluginIconCaps = useMemo(() => {
    const map = new Map<string, LotusCapability | null>()
    for (const cap of capabilities) {
      const plugin = cap.plugin || 'core'
      if (map.has(plugin)) continue
      const ui = (cap.data as any)?.ui || {}
      if (ui?.icon || ui?.iconSvg || ui?.iconUrl) {
        map.set(plugin, cap)
      }
    }
    return map
  }, [capabilities])

  const selectedCapabilities = useMemo(() => {
    if (!selectedPlugin) return []
    return capabilities.filter(
      (cap) => (cap.plugin || 'core') === selectedPlugin,
    )
  }, [capabilities, selectedPlugin])

  const selectedFeatures = useMemo(() => {
    if (!selectedPlugin) return []
    return selectedCapabilities.filter(
      (cap) => cap.kind === 'feature' || cap.slot?.startsWith('feature.'),
    )
  }, [selectedCapabilities, selectedPlugin])

  const selectedPanels = useMemo(() => {
    if (!selectedPlugin) return []
    return panelCapabilities.filter(
      (cap) => (cap.plugin || 'core') === selectedPlugin,
    )
  }, [panelCapabilities, selectedPlugin])

  const selectedEntry = useMemo(() => {
    if (!selectedPlugin) return null
    return pluginsMap.get(selectedPlugin) || null
  }, [pluginsMap, selectedPlugin])

  const selectedPluginMeta = useMemo(() => {
    if (!selectedPlugin) return null
    return (
      plugins.find((plugin) => {
        const pluginId =
          plugin?.id || plugin?.name || plugin?.plugin || plugin?.plugin_name
        return pluginId === selectedPlugin
      }) || null
    )
  }, [plugins, selectedPlugin])

  const pluginIds = useMemo(() => {
    return plugins
      .map(
        (plugin) =>
          plugin?.id || plugin?.name || plugin?.plugin || plugin?.plugin_name,
      )
      .filter(Boolean) as string[]
  }, [plugins])

  const pluginDependencies = useMemo(() => {
    if (!selectedPluginMeta) return [] as string[]
    const deps =
      (selectedPluginMeta?.depends_on as string[]) ||
      (selectedPluginMeta?.dependencies as string[]) ||
      (selectedPluginMeta?.requires as string[]) ||
      (selectedPluginMeta?.required_plugins as string[]) ||
      []
    return Array.from(new Set(deps.filter(Boolean)))
  }, [selectedPluginMeta])

  const missingDependencies = useMemo(() => {
    if (!pluginDependencies.length) return [] as string[]
    const known = new Set(pluginIds)
    return pluginDependencies.filter((dep) => !known.has(dep))
  }, [pluginDependencies, pluginIds])

  const pluginPanels =
    (selectedPluginMeta?.panels as Array<Record<string, any>>) ||
    (selectedPluginMeta?.ui?.panels as Array<Record<string, any>>) ||
    []
  const pluginWidgets =
    (selectedPluginMeta?.widgets as Array<Record<string, any>>) || []
  const pluginPages =
    (selectedPluginMeta?.pages as Array<Record<string, any>>) || []
  const pluginActions =
    (selectedPluginMeta?.actions as Array<Record<string, any>>) ||
    (selectedPluginMeta?.frontend_actions as Array<Record<string, any>>) ||
    []
  const pluginComponents =
    (selectedPluginMeta?.components as Array<Record<string, any>>) ||
    (selectedPluginMeta?.frontend_components as Array<Record<string, any>>) ||
    []
  const pluginIntents = (selectedPluginMeta?.intents as Array<string>) || []

  const overviewStats = useMemo(
    () => [
      { label: 'Artifacts', value: stats.artifacts },
      { label: 'Plugins', value: stats.plugins },
      { label: 'Capabilities', value: capabilities.length },
      { label: 'Providers', value: stats.providers },
      { label: 'Automations', value: stats.automations },
    ],
    [capabilities.length, stats],
  )

  const systemNodes = useMemo(
    () => [
      {
        key: 'capabilities',
        label: 'Capabilities',
        value: capabilities.length,
        icon: Boxes,
        onClick: () => onManage?.('capabilities'),
      },
      {
        key: 'plugins',
        label: 'Plugins',
        value: pluginOrder.length,
        icon: Plug,
        onClick: () => onManage?.('capabilities'),
      },
      {
        key: 'storage',
        label: 'Storage',
        value: kindCounts.get('storage') ?? 0,
        icon: HardDrive,
        onClick: () => onManage?.('storage'),
      },
      {
        key: 'workflows',
        label: 'Workflows',
        value: kindCounts.get('workflow') ?? 0,
        icon: Workflow,
        onClick: () => onManage?.('workflows'),
      },
      {
        key: 'configs',
        label: 'Configs',
        value: kindCounts.get('config') ?? 0,
        icon: Settings,
        onClick: () => onManage?.('configs'),
      },
      {
        key: 'providers',
        label: 'Providers',
        value: stats.providers,
        icon: Network,
        onClick: () => onManage?.('defaults'),
      },
      {
        key: 'panels',
        label: 'Panels',
        value: panelCapabilities.length,
        icon: Box,
        onClick: () => onManage?.('capabilities'),
      },
      {
        key: 'transports',
        label: 'Transports',
        value: kindCounts.get('transport') ?? 0,
        icon: Globe,
        onClick: () => onManage?.('capabilities'),
      },
      {
        key: 'embeddings',
        label: 'Embeddings',
        value: kindCounts.get('embedding') ?? 0,
        icon: Cpu,
        onClick: () => onManage?.('capabilities'),
      },
      {
        key: 'automations',
        label: 'Automations',
        value: stats.automations,
        icon: Zap,
        onClick: () => onManage?.('workflows'),
      },
    ],
    [
      capabilities.length,
      kindCounts,
      onManage,
      panelCapabilities.length,
      pluginOrder.length,
      stats,
    ],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden gap-2">
      <div className="flex items-center gap-2 px-3 py-2 border bg-muted/20 rounded">
        <div className="flex items-center gap-2 text-xs">
          <Boxes className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">Lotus Command Deck</span>
        </div>
        <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground">
          <Badge variant="outline">{capabilities.length} capabilities</Badge>
          <Badge variant="outline">{pluginOrder.length} plugins</Badge>
          <Badge variant={isConnected ? 'secondary' : 'destructive'}>
            {isConnected ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
        <Card className="flex flex-col overflow-hidden bg-background/40 backdrop-blur-sm border">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b">
            <span className="text-xs font-semibold">System navigation</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px]"
              onClick={() => setSelectedPlugin(null)}
            >
              Reset view
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3">
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="plugins" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 text-[10px] hover:no-underline">
                    Plugins
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlugin(null)}
                        className="rounded-md border border-muted/40 px-2 py-2 text-left text-[10px] hover:border-muted-foreground/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Lotus overview</span>
                          <Badge variant="outline" className="text-[9px]">
                            {capabilities.length}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          Full system map & status
                        </div>
                      </button>
                      {pluginOrder.map((plugin) => {
                        const entry = pluginsMap.get(plugin)
                        if (!entry) return null
                        const iconCap = pluginIconCaps.get(plugin)
                        return (
                          <button
                            key={plugin}
                            type="button"
                            onClick={() => setSelectedPlugin(plugin)}
                            className={`rounded-md border px-2 py-2 text-left text-[10px] transition ${
                              selectedPlugin === plugin
                                ? 'border-primary/60 bg-primary/10'
                                : 'border-muted/40 hover:border-muted-foreground/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {iconCap ? (
                                  renderIcon(iconCap)
                                ) : (
                                  <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <span className="font-semibold truncate">
                                  {plugin}
                                </span>
                              </div>
                              <Badge variant="secondary" className="text-[9px]">
                                {entry.total}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">
                              {Object.keys(entry.kinds).length} lanes
                            </div>
                          </button>
                        )
                      })}
                      {pluginOrder.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                          <AlertTriangle className="w-6 h-6 mb-1 opacity-50" />
                          <span className="text-[10px]">
                            No plugins detected
                          </span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="lanes" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 text-[10px] hover:no-underline">
                    Capability lanes
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="flex flex-col gap-2">
                      {kindOrder.map((kind) => {
                        const items = capabilitiesByKind.get(kind) || []
                        const KindIcon = kindIconMap[kind]
                        return (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => onManage?.('capabilities')}
                            className="group rounded-md border px-2 py-2 text-left text-[10px] flex items-center justify-between gap-3 hover:border-muted-foreground/40 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {KindIcon ? (
                                <KindIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Box className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate">
                                  {kind.replace(/_/g, ' ')}
                                </span>
                                <span className="text-muted-foreground truncate">
                                  {items.length} items
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[9px]">
                              {items.length}
                            </Badge>
                          </button>
                        )
                      })}
                      {kindOrder.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                          <AlertTriangle className="w-6 h-6 mb-1 opacity-50" />
                          <span className="text-[10px]">
                            No capabilities detected
                          </span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="features" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 text-[10px] hover:no-underline">
                    Feature generators
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="flex flex-col gap-2">
                      {capabilities
                        .filter(
                          (cap) =>
                            cap.kind === 'feature' ||
                            cap.slot?.startsWith('feature.'),
                        )
                        .map((cap) => (
                          <button
                            key={cap.id}
                            type="button"
                            onClick={() =>
                              setSelectedPlugin(cap.plugin || 'core')
                            }
                            className="group rounded-md border px-2 py-2 text-left text-[10px] flex items-center justify-between gap-3 hover:border-muted-foreground/40 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate">
                                  {cap.title}
                                </span>
                                <span className="text-muted-foreground truncate">
                                  {cap.slot || cap.kind}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[9px]">
                              {cap.plugin || 'core'}
                            </Badge>
                          </button>
                        ))}
                      {capabilities.filter(
                        (cap) =>
                          cap.kind === 'feature' ||
                          cap.slot?.startsWith('feature.'),
                      ).length === 0 && (
                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                          <AlertTriangle className="w-6 h-6 mb-1 opacity-50" />
                          <span className="text-[10px]">
                            No feature generators
                          </span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col border-muted/30 bg-background/30 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-muted/20 via-transparent to-muted/30" />
          <div
            className={`relative z-10 flex flex-col gap-6 px-6 py-8 w-full ${
              selectedPlugin
                ? 'items-start justify-start'
                : 'items-center justify-center'
            }`}
          >
            {selectedPlugin ? (
              <>
                <div className="w-full max-w-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pluginIconCaps.get(selectedPlugin) ? (
                      renderIcon(
                        pluginIconCaps.get(selectedPlugin) as LotusCapability,
                      )
                    ) : (
                      <Boxes className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <div className="text-xs font-semibold">
                        {selectedPlugin}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Plugin overview
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px]"
                    onClick={() => setSelectedPlugin(null)}
                  >
                    Back to overview
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                  <div className="rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                    <div className="text-[10px] text-muted-foreground">
                      Capabilities
                    </div>
                    <div className="text-sm font-semibold">
                      {selectedCapabilities.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                    <div className="text-[10px] text-muted-foreground">
                      Lanes
                    </div>
                    <div className="text-sm font-semibold">
                      {selectedEntry
                        ? Object.keys(selectedEntry.kinds).length
                        : 0}
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    Versions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry && selectedEntry.versions.size > 0 ? (
                      Array.from(selectedEntry.versions)
                        .sort((a, b) => a.localeCompare(b))
                        .map((version) => (
                          <Badge
                            key={version}
                            variant="outline"
                            className="text-[9px]"
                          >
                            v{version}
                          </Badge>
                        ))
                    ) : (
                      <Badge variant="outline" className="text-[9px]">
                        unknown
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    Plugin metadata
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Panels</span>
                      <span className="font-semibold">
                        {pluginPanels.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Widgets</span>
                      <span className="font-semibold">
                        {pluginWidgets.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Pages</span>
                      <span className="font-semibold">
                        {pluginPages.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Actions</span>
                      <span className="font-semibold">
                        {pluginActions.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Components</span>
                      <span className="font-semibold">
                        {pluginComponents.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Intents</span>
                      <span className="font-semibold">
                        {pluginIntents.length}
                      </span>
                    </div>
                  </div>
                  {pluginIntents.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pluginIntents.map((intent) => (
                        <Badge
                          key={intent}
                          variant="outline"
                          className="text-[9px]"
                        >
                          {intent}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {!selectedPluginMeta && (
                    <div className="text-[10px] text-muted-foreground mt-2">
                      Plugin metadata not available from backend.
                    </div>
                  )}
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    Dependencies
                  </div>
                  {pluginDependencies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {pluginDependencies.map((dep) => {
                        const isMissing = missingDependencies.includes(dep)
                        return (
                          <Badge
                            key={dep}
                            variant={isMissing ? 'destructive' : 'outline'}
                            className="text-[9px]"
                          >
                            {dep}
                          </Badge>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">
                      No dependencies declared.
                    </span>
                  )}
                  {missingDependencies.length > 0 && (
                    <div className="mt-2 text-[10px] text-destructive">
                      Missing: {missingDependencies.join(', ')}
                    </div>
                  )}
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    Capabilities
                  </div>
                  <div className="max-h-56">
                    <ScrollArea className="h-56">
                      <div className="flex flex-col gap-1 pr-2">
                        {selectedCapabilities.map((cap) => (
                          <div
                            key={cap.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{cap.title}</span>
                            <div className="flex items-center gap-1">
                              {cap.slot && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px]"
                                >
                                  {cap.slot}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px]">
                                {cap.kind}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {selectedCapabilities.length === 0 && (
                          <span className="text-muted-foreground text-[10px]">
                            No capabilities registered.
                          </span>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    Panels
                  </div>
                  <div className="max-h-40">
                    <ScrollArea className="h-40">
                      <div className="flex flex-col gap-1 pr-2">
                        {pluginPanels.length > 0
                          ? pluginPanels.map((panel) => (
                              <div
                                key={
                                  panel.name || panel.component || panel.label
                                }
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate">
                                  {panel.label || panel.name || panel.component}
                                </span>
                                {panel.icon && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px]"
                                  >
                                    {panel.icon}
                                  </Badge>
                                )}
                              </div>
                            ))
                          : selectedPanels.map((cap) => (
                              <div
                                key={cap.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate">{cap.title}</span>
                                <div className="flex items-center gap-1">
                                  {cap.slot && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px]"
                                    >
                                      {cap.slot}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="text-[9px]"
                                  >
                                    {cap.kind}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        {pluginPanels.length === 0 &&
                          selectedPanels.length === 0 && (
                            <span className="text-muted-foreground text-[10px]">
                              No panels detected.
                            </span>
                          )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    Features
                  </div>
                  <div className="max-h-40">
                    <ScrollArea className="h-40">
                      <div className="flex flex-col gap-1 pr-2">
                        {selectedFeatures.map((cap) => (
                          <div
                            key={cap.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{cap.title}</span>
                            <div className="flex items-center gap-1">
                              {cap.slot && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px]"
                                >
                                  {cap.slot}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px]">
                                {cap.kind}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {selectedFeatures.length === 0 && (
                          <span className="text-muted-foreground text-[10px]">
                            No feature generators detected.
                          </span>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="w-48 h-48 rounded-full border border-muted/40 bg-background/60 shadow-lg flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] tracking-[0.5em] text-muted-foreground">
                      EMBEDDR
                    </span>
                    <span className="text-sm font-semibold">Lotus Core</span>
                    <Badge variant={isConnected ? 'secondary' : 'destructive'}>
                      {isConnected ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <Badge variant="outline">
                      Queue {statusMeta.queueRemaining ?? '—'}
                    </Badge>
                    <Badge variant="outline">
                      Clients {statusMeta.clientCount ?? clientCount ?? '—'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                  {overviewStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs"
                    >
                      <div className="text-[10px] text-muted-foreground">
                        {stat.label}
                      </div>
                      <div className="text-sm font-semibold">
                        {stat.value ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    Frontend
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Realtime</span>
                      <Badge
                        variant={isConnected ? 'secondary' : 'destructive'}
                      >
                        {isConnected ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Clients</span>
                      <span className="font-semibold">
                        {statusMeta.clientCount ?? clientCount ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Queue</span>
                      <span className="font-semibold">
                        {statusMeta.queueRemaining ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Panel</span>
                      <span className="font-semibold">Lotus Deck</span>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                  <div className="text-[10px] text-muted-foreground mb-2">
                    System map
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {systemNodes.map((node) => {
                      const NodeIcon = node.icon
                      return (
                        <button
                          key={node.key}
                          type="button"
                          onClick={node.onClick}
                          className="flex items-center justify-between gap-2 rounded-md border border-muted/40 bg-background/70 px-2 py-1 text-[10px] hover:border-muted-foreground/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <NodeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="truncate">{node.label}</span>
                          </div>
                          <span className="font-semibold">
                            {node.value ?? 0}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {clientDetails && clientDetails.length > 0 && (
                  <div className="w-full max-w-xl rounded-lg border border-muted/30 bg-background/60 px-3 py-2 text-xs">
                    <div className="text-[10px] text-muted-foreground mb-2">
                      Connected clients
                    </div>
                    <div className="space-y-1 max-h-28 overflow-auto">
                      {clientDetails.map((client) => {
                        const label =
                          client.user_agent || client.origin || 'unknown'
                        return (
                          <div
                            key={client.client_id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate" title={label}>
                              {label}
                            </span>
                            <span className="text-muted-foreground shrink-0">
                              {client.address || client.forwarded_for || '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-2">
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
                    onClick={() => onManage?.('workflows')}
                  >
                    Workflows
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
                    onClick={() => onManage?.('defaults')}
                  >
                    Defaults
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden bg-background/40 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b">
            <span className="text-xs font-semibold">Plugin coverage</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px]"
              onClick={() => onManage?.('capabilities')}
            >
              Explore
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0 m-1">
            <div className="px-3 py-1 flex flex-col gap-2">
              {pluginOrder.map((plugin) => {
                const entry = pluginsMap.get(plugin)
                if (!entry) return null
                const iconCap = pluginIconCaps.get(plugin)
                const versions = Array.from(entry.versions).sort((a, b) =>
                  a.localeCompare(b),
                )
                const versionLabel =
                  versions.length > 1
                    ? `v${versions[0]} +${versions.length - 1}`
                    : versions.length === 1
                      ? `v${versions[0]}`
                      : null
                return (
                  <div
                    key={plugin}
                    className="rounded-lg border px-3 py-2 text-[10px] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {iconCap ? (
                          renderIcon(iconCap)
                        ) : (
                          <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="font-medium truncate">{plugin}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {versionLabel && (
                          <Badge variant="outline" className="text-[9px]">
                            {versionLabel}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[9px]">
                          {entry.total}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(entry.kinds)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([kind, count]) => (
                          <Badge
                            key={kind}
                            variant="outline"
                            className="text-[9px]"
                          >
                            {kind}:{count}
                          </Badge>
                        ))}
                    </div>
                    {entry.kinds.config && (
                      <Badge variant="secondary" className="text-[9px] w-fit">
                        configurable
                      </Badge>
                    )}
                  </div>
                )
              })}
              {pluginOrder.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                  <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">No plugins detected</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
