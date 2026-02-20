import React from 'react'
import { Button } from '@embeddr/react-ui/components/ui'
import {
  Layers as LayersIcon,
  Pin,
  PinOff,
  PlugZap,
  X,
  Settings,
  LayoutGrid,
  Plus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import { useWindowStore } from '@/store/windowStore'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import type { EmbeddrAPI } from '@embeddr/zen-shell'
import { DraggablePanel } from '@/components/ui/DraggablePanel'
import {
  extendApiForPlugin,
  useEmbeddrAPI,
  usePluginStore,
} from '@/plugins/store'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'
import { usePluginLogos } from '@/hooks/usePluginLogos'
import { lucideIconFromName } from '@/lib/lucide'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type DraggablePanelProps = React.ComponentProps<typeof DraggablePanel>

interface ZenToolboxProps extends Partial<DraggablePanelProps> {
  isOpen?: boolean
  onClose?: () => void
  workflows: Array<any>
  selectedWorkflow: any
  selectWorkflow: (workflow: any) => void
  workflowSearch: string
  setWorkflowSearch: (search: string) => void
  getComponents: (location: string) => Array<{ pluginId: string; def: any }>
  getActions: (location: string) => Array<{ pluginId: string; def: any }>
  api: EmbeddrAPI
  openPlugins: Record<string, boolean>
  setOpenPlugins: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  hiddenWorkflows: Array<string>
  setHiddenWorkflows: (hidden: Array<string>) => void
  pinnedWorkflows: Array<string>
  setPinnedWorkflows: (pinned: Array<string>) => void
}

export function ZenToolbox(props: ZenToolboxProps) {
  const {
    isOpen: propIsOpen,
    onClose: propOnClose,
    onMinimize: propOnMinimize,
    id: propId,
    title: propTitle,
    defaultPosition: propDefaultPosition,
    defaultSize: propDefaultSize,
    className: propClassName,
    position,
    size,
    onPositionChange,
    onSizeChange,
    zIndex,
    pinned,
    onPinChange,
    isActive,
    hideHeader,
    transparent,
    additionalSettingsItems,
    showTitle,
    onShowTitleChange,
    context,
    getComponents: propGetComponents,
    api: propApi,
  } = props
  const { plugins } = usePluginStore()
  const fallbackApi = useEmbeddrAPI()
  const fallbackGetComponents = usePluginStore((s) => s.getComponents)
  const getComponents = propGetComponents ?? fallbackGetComponents
  const api = propApi ?? fallbackApi
  const { logos } = usePluginLogos()
  const [pinnedPanels, setPinnedPanels] = useLocalStorage<string[]>(
    'zen-pinned-panels',
    [],
  )

  const spawnWindow = useWindowStore((s) => s.spawnWindow)
  const layouts = useWindowStore((s) => s.layouts)
  const saveLayout = useWindowStore((s) => s.saveLayout)
  const loadLayout = useWindowStore((s) => s.loadLayout)
  const deleteLayout = useWindowStore((s) => s.deleteLayout)
  const closeWindow = useWindowStore((s) => s.closeWindow)
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow)
  const windows = useWindowStore((s) => s.windows)

  const panelId = propId || 'zen-toolbox'
  const isMinimized = useWindowStore((s) => s.windows[panelId]?.isMinimized)
  const isOpen = propIsOpen ?? isMinimized === false
  const onClose = propOnClose ?? (() => closeWindow(panelId))
  const onMinimize = propOnMinimize ?? (() => minimizeWindow(panelId))
  // const onClose = propOnClose ?? (() => minimizeWindow('zen-toolbox'))

  const overlayPanels = getComponents('zen-overlay').filter(
    ({ def }) => !def.options?.spawnOnly,
  )
  const groupedOverlayPanels = React.useMemo(() => {
    const map = new Map<string, Array<{ pluginId: string; def: any }>>()
    overlayPanels.forEach((item) => {
      const list = map.get(item.pluginId) || []
      list.push(item)
      map.set(item.pluginId, list)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [overlayPanels])
  const pinnedPanelDefs = pinnedPanels
    .map((id) =>
      overlayPanels.find((item) => `${item.pluginId}-${item.def.id}` === id),
    )
    .filter(Boolean) as Array<{ pluginId: string; def: any }>
  const corePanelDefs = overlayPanels.filter(
    ({ pluginId, def }) =>
      pluginId === 'embeddr-core' &&
      ['config-panel', 'workspace-panel'].includes(def.id),
  )

  const movePinnedPanel = (panelId: string, direction: 'up' | 'down') => {
    setPinnedPanels((current) => {
      const index = current.indexOf(panelId)
      if (index === -1) return current
      const nextIndex = direction === 'up' ? index - 1 : index + 1
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const temp = next[index]
      next[index] = next[nextIndex]
      next[nextIndex] = temp
      return next
    })
  }

  return (
    <DraggablePanel
      id={panelId}
      title={propTitle ?? 'Toolbox'}
      isOpen={isOpen}
      onClose={onClose}
      onMinimize={onMinimize}
      defaultPosition={
        propDefaultPosition ?? { x: 80, y: window.innerHeight - 400 }
      }
      defaultSize={propDefaultSize ?? { width: 360, height: 450 }}
      className={cn('select-none', propClassName)}
      position={position}
      size={size}
      onPositionChange={onPositionChange}
      onSizeChange={onSizeChange}
      zIndex={zIndex}
      pinned={pinned}
      onPinChange={onPinChange}
      isActive={isActive}
      hideHeader={hideHeader}
      transparent={transparent}
      additionalSettingsItems={additionalSettingsItems}
      showTitle={showTitle}
      onShowTitleChange={onShowTitleChange}
      context={context}
    >
      <Tabs defaultValue="panels" className="h-full flex flex-col gap-0!">
        <div className="px-2 pt-2 shrink-0">
          <TabsList className="w-fit grid grid-cols-2 gap-1">
            <TabsTrigger value="panels">
              <LayoutGrid className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="plugins">
              <PlugZap className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="panels"
          className="flex-1 p-2 pl-2 min-h-0 mt-0 flex flex-col gap-2 overflow-hidden"
        >
          <ScrollArea className="flex-1 min-h-0 pr-3" type="always">
            <div className="space-y-4">
              {corePanelDefs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Core
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {corePanelDefs.map(({ pluginId, def }) => {
                      const componentId = `${pluginId}-${def.id}`
                      const PanelIcon = lucideIconFromName(def.icon) || Settings
                      return (
                        <Button
                          key={componentId}
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={() => {
                            const componentName =
                              def.exportName || def.component
                            if (!componentName) return
                            spawnWindow(componentId, def.label, {
                              pluginId,
                              componentName,
                              defaultPosition: def.defaultPosition,
                              defaultSize: def.defaultSize,
                              panelMode: def.options?.instanceMode,
                              hideHeader: def.options?.hideHeader,
                              transparent: def.options?.transparent,
                            })
                          }}
                        >
                          <PanelIcon className="h-4 w-4" />
                          <span className="text-xs">{def.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pinned Panels
                </div>
                {pinnedPanelDefs.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Pin panels from the Plugins tab to show them here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pinnedPanelDefs.map(({ pluginId, def }) => {
                      const componentId = `${pluginId}-${def.id}`
                      const logoUrl = logos?.[pluginId]
                      const PanelIcon = lucideIconFromName(def.icon)
                      const isSingleInstance =
                        def.options?.instanceMode === 'single'
                      const instances = Object.values(windows).filter(
                        (w) => w.componentId === componentId,
                      )
                      return (
                        <div
                          key={componentId}
                          className="flex items-center justify-between p-2 border bg-card rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt=""
                                className="h-4 w-4 rounded-sm object-contain"
                              />
                            ) : (
                              <PlugZap className="h-4 w-4 text-muted-foreground" />
                            )}
                            {PanelIcon ? (
                              <PanelIcon className="h-4 w-4 text-muted-foreground" />
                            ) : null}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {def.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {pluginId}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() =>
                                  movePinnedPanel(componentId, 'up')
                                }
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() =>
                                  movePinnedPanel(componentId, 'down')
                                }
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                            {!isSingleInstance && instances.length > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5">
                                {instances.length}
                              </Badge>
                            )}
                            {isSingleInstance && instances.length > 0 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => closeWindow(instances[0].id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {isSingleInstance ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => {
                                  const componentName =
                                    def.exportName || def.component
                                  if (!componentName) return
                                  spawnWindow(componentId, def.label, {
                                    pluginId,
                                    componentName,
                                    defaultPosition: def.defaultPosition,
                                    defaultSize: def.defaultSize,
                                    panelMode: def.options?.instanceMode,
                                    hideHeader: def.options?.hideHeader,
                                    transparent: def.options?.transparent,
                                  })
                                }}
                              >
                                Open
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => {
                                  const componentName =
                                    def.exportName || def.component
                                  if (!componentName) return
                                  spawnWindow(componentId, def.label, {
                                    pluginId,
                                    componentName,
                                    defaultPosition: def.defaultPosition,
                                    defaultSize: def.defaultSize,
                                    panelMode: def.options?.instanceMode,
                                    hideHeader: def.options?.hideHeader,
                                    transparent: def.options?.transparent,
                                  })
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="plugins"
          forceMount
          className="flex-1 min-h-0 p-2 mt-0 flex flex-col data-[state=inactive]:hidden overflow-hidden"
        >
          <ScrollArea className="flex-1 min-h-0" type="always">
            <div className="space-y-4 pr-3">
              {/* Overlay Plugins Toggles */}
              {/* Only show overlay plugins if they are Zen Panels (check intents) */}

              {groupedOverlayPanels.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Overlay Panels
                  </div>
                  {groupedOverlayPanels.map(([pluginId, panels]) => {
                    const logoUrl = logos?.[pluginId]
                    return (
                      <div key={pluginId} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt=""
                              className="h-4 w-4 rounded-sm object-contain"
                            />
                          ) : (
                            <PlugZap className="h-4 w-4" />
                          )}
                          <span className="uppercase tracking-wider">
                            {pluginId}
                          </span>
                          <Badge variant="secondary" className="h-4 px-1.5">
                            {panels.length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {panels.map(({ pluginId, def }) => {
                            const componentId = `${pluginId}-${def.id}`
                            const instances = Object.values(windows).filter(
                              (w) => w.componentId === componentId,
                            )
                            const PanelIcon = lucideIconFromName(def.icon)
                            const isSingleInstance =
                              def.options?.instanceMode === 'single'
                            const isPinned = pinnedPanels.includes(componentId)

                            return (
                              <div
                                key={componentId}
                                className="flex items-center justify-between p-2 border bg-card rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  {PanelIcon ? (
                                    <PanelIcon className="h-4 w-4 text-muted-foreground" />
                                  ) : null}
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {def.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {def.id}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant={isPinned ? 'secondary' : 'ghost'}
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setPinnedPanels((current) =>
                                        current.includes(componentId)
                                          ? current.filter(
                                              (id) => id !== componentId,
                                            )
                                          : [...current, componentId],
                                      )
                                    }}
                                  >
                                    {isPinned ? (
                                      <Pin className="h-4 w-4" />
                                    ) : (
                                      <PinOff className="h-4 w-4" />
                                    )}
                                  </Button>
                                  {!isSingleInstance &&
                                    instances.length > 0 && (
                                      <Badge
                                        variant="secondary"
                                        className="h-5 px-1.5"
                                      >
                                        {instances.length}
                                      </Badge>
                                    )}
                                  {isSingleInstance && instances.length > 0 && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        closeWindow(instances[0].id)
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {isSingleInstance ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7"
                                      onClick={() => {
                                        const componentName =
                                          def.exportName || def.component

                                        spawnWindow(componentId, def.label, {
                                          pluginId,
                                          componentName, // ✅ string export name
                                          defaultPosition: def.defaultPosition,
                                          defaultSize: def.defaultSize,
                                          panelMode: def.options?.instanceMode,
                                          hideHeader: def.options?.hideHeader,
                                          transparent: def.options?.transparent,
                                        })
                                        toast.info(`Opened ${def.label}`)
                                      }}
                                    >
                                      Open
                                    </Button>
                                  ) : (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        const componentName =
                                          def.exportName || def.component

                                        spawnWindow(componentId, def.label, {
                                          pluginId,
                                          componentName, // ✅ string export name
                                          defaultPosition: def.defaultPosition,
                                          defaultSize: def.defaultSize,
                                          panelMode: def.options?.instanceMode,
                                          hideHeader: def.options?.hideHeader,
                                          transparent: def.options?.transparent,
                                        })
                                        toast.info(`Opened ${def.label}`)
                                      }}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Toolbox Plugins - Filter by Intent if needed */}
              {getComponents('zen-toolbox-tab').map(({ pluginId, def }) => {
                const pluginApi = extendApiForPlugin(api, pluginId)

                // In the new contract, backend gives us a string export name
                const componentName = def.exportName || def.component
                if (!componentName) {
                  console.warn(
                    '[ZenToolbox] toolbox-tab missing component name',
                    {
                      pluginId,
                      def,
                    },
                  )
                  return null
                }

                return (
                  <div key={`${pluginId}-${def.id}`} className="py-1">
                    <DynamicPluginComponent
                      pluginId={pluginId}
                      componentName={componentName}
                      api={pluginApi}
                      {...(def.props || {})}
                    />
                  </div>
                )
              })}

              {getComponents('zen-toolbox-tab').length === 0 &&
                overlayPanels.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                    <LayersIcon className="w-8 h-8 mb-2 opacity-50" />
                    <p>No plugins loaded</p>
                  </div>
                )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DraggablePanel>
  )
}
