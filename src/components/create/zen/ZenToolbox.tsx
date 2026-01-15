import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import {
  Cat,
  Check,
  EyeOff,
  Layers as LayersIcon,
  Pin,
  PinOff,
  PlugZap,
  Search,
  Workflow,
  Zap,
  Play,
  Plus,
  Trash2,
  Save,
  Layout,
} from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Switch } from '@embeddr/react-ui/components/switch'
import { useWindowStore } from '@/store/windowStore'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Badge } from '@embeddr/react-ui/components/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@embeddr/react-ui/components/context-menu'
import type { EmbeddrAPI } from '@embeddr/react-ui/types'
import { cn } from '@/lib/utils'
import { DraggablePanel } from '@/components/ui/DraggablePanel'
import { toast } from 'sonner'
import { useActions, useCreateExecution } from '@/lib/api/client-v2'
import { useGlobalStore } from '@/store/globalStore'
import { extendApiForPlugin, usePluginStore } from '@/plugins/store'
import { windowRegistry } from '@/components/ui/windowRegistry'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'

interface ZenToolboxProps {
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

export function ZenToolbox({
  isOpen: propIsOpen,
  onClose: propOnClose,
  workflows,
  selectedWorkflow,
  selectWorkflow,
  workflowSearch,
  setWorkflowSearch,
  getComponents,
  getActions,
  api,
  // openPlugins,
  // setOpenPlugins,
  hiddenWorkflows,
  setHiddenWorkflows,
  pinnedWorkflows,
  setPinnedWorkflows,
}: ZenToolboxProps) {
  // V2 Actions Integration
  const { data: serverActions } = useActions()
  const { mutate: executeAction } = useCreateExecution()
  const { selectedImage } = useGlobalStore()
  const { plugins } = usePluginStore()
  const {
    windows,
    spawnWindow,
    layouts,
    saveLayout,
    loadLayout,
    deleteLayout,
    minimizeWindow,
    closeWindow,
  } = useWindowStore()

  const windowState = windows['zen-toolbox']
  const isOpen = propIsOpen ?? (windowState ? !windowState.isMinimized : false)
  const onClose = propOnClose ?? (() => closeWindow('zen-toolbox'))
  // const onClose = propOnClose ?? (() => minimizeWindow('zen-toolbox'))

  const [newLayoutName, setNewLayoutName] = React.useState('')

  const handleActionClick = (action: any) => {
    // For now, assume actions operate on selected image if they require artifact:image
    // In future, we might need a dialog to pick inputs

    const requiresImage = action.inputs.includes('artifact:image')

    // Handling for UI-trigger actions (e.g. Media Frame)
    if (action.ui_component) {
      const overlays = getComponents('zen-overlay')
      // Try to find matching component by ID or Label or exact match
      // Also handle "MediaFramePanel" -> "media-frame-panel" conversion if needed
      const normalize = (s: string) => s.toLowerCase().replace(/-/g, '')

      const target = overlays.find(
        (o) =>
          o.def.id === action.ui_component ||
          normalize(o.def.id) === normalize(action.ui_component) ||
          o.def.label === action.ui_component,
      )

      if (target) {
        if (requiresImage && !selectedImage) {
          toast.error(`Please select an image to open ${target.def.label}`)
          return
        }

        // Open the panel
        const componentId = `${target.pluginId}-${target.def.id}`
        console.log(
          '[spawn] componentId',
          componentId,
          'registry has?',
          windowRegistry.has(componentId),
        )

        spawnWindow(componentId, target.def.label, {
          defaultPosition: target.def.defaultPosition,
          defaultSize: target.def.defaultSize,
          hideHeader: target.def.options?.hideHeader,
          transparent: target.def.options?.transparent,
          pluginId: target.pluginId,
        })
        toast.info(`Opened ${target.def.label}`)

        // If the action is purely for UI, stop here.
        // We assume actions with UI components handle their own logic via the component.
        return
      }
    }

    if (requiresImage && !selectedImage) {
      toast.error(`Please select an image to run ${action.label}`)
      return
    }

    const payload: any = {
      plugin_name: action.plugin_name,
      action_name: action.name,
      inputs: {},
    }

    if (requiresImage && selectedImage) {
      payload.inputs.artifact_id = selectedImage.id
      payload.primary_artifact_id = selectedImage.id
    }

    toast.info(`Running ${action.label}...`)

    executeAction(payload, {
      onSuccess: () => toast.success(`Started ${action.label}`),
      onError: (e) => toast.error(`Failed to start action: ${e}`),
    })
  }

  const filteredAndSortedWorkflows = React.useMemo(() => {
    return workflows
      .filter((w) =>
        w.name.toLowerCase().includes(workflowSearch.toLowerCase()),
      )
      .filter((w) => !hiddenWorkflows.includes(String(w.id)))
      .sort((a, b) => {
        const aPinned = pinnedWorkflows.includes(String(a.id))
        const bPinned = pinnedWorkflows.includes(String(b.id))
        if (aPinned && !bPinned) return -1
        if (!aPinned && bPinned) return 1
        return a.name.localeCompare(b.name)
      })
  }, [workflows, workflowSearch, hiddenWorkflows, pinnedWorkflows])

  const togglePin = (id: string) => {
    if (pinnedWorkflows.includes(id)) {
      setPinnedWorkflows(pinnedWorkflows.filter((p) => p !== id))
    } else {
      setPinnedWorkflows([...pinnedWorkflows, id])
    }
  }

  const hideWorkflow = (id: string) => {
    setHiddenWorkflows([...hiddenWorkflows, id])
  }

  return (
    <DraggablePanel
      id="zen-toolbox"
      title="Toolbox"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: 80, y: window.innerHeight - 400 }}
      defaultSize={{ width: 360, height: 450 }}
      className="absolute select-none"
    >
      <Tabs defaultValue="workflows" className="h-full flex flex-col gap-0!">
        <div className="px-2 pt-2 shrink-0">
          <TabsList className="w-fit grid grid-cols-4 gap-1">
            <TabsTrigger value="workflows">
              <Workflow className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Zap className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="plugins">
              <PlugZap className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="layouts">
              <Layout className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="workflows"
          className="flex-1 p-2 pl-2 min-h-0 mt-0 flex flex-col gap-2 overflow-hidden"
        >
          <div className="relative gap-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground " />
            <Input
              placeholder="Search workflows..."
              value={workflowSearch}
              onChange={(e) => setWorkflowSearch(e.target.value)}
              className="pl-9! h-9 bg-background"
            />
          </div>
          <ScrollArea className="flex-1 min-h-0 pr-3" type="always">
            <div className="space-y-1">
              {filteredAndSortedWorkflows.map((w) => {
                const isPinned = pinnedWorkflows.includes(String(w.id))
                return (
                  <ContextMenu key={w.id}>
                    <ContextMenuTrigger>
                      <Button
                        size="sm"
                        className={cn(
                          'w-full justify-start text-xs font-normal bg-card text-foreground group relative',
                          selectedWorkflow?.id === w.id &&
                            'bg-muted font-medium',
                        )}
                        onClick={() => {
                          selectWorkflow(w)
                        }}
                      >
                        <span className="truncate flex-1 text-left">
                          {w.name}
                        </span>
                        {isPinned && (
                          <Pin className="h-3 w-3 text-muted-foreground rotate-45 mr-1" />
                        )}
                        {selectedWorkflow?.id === w.id && (
                          <Check className="h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => togglePin(String(w.id))}
                        className="gap-2"
                      >
                        {isPinned ? (
                          <>
                            <PinOff className="h-4 w-4" /> Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4" /> Pin to top
                          </>
                        )}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => hideWorkflow(String(w.id))}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <EyeOff className="h-4 w-4" /> Hide
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
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

              {getComponents('zen-overlay').length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Overlay Panels
                  </div>
                  {getComponents('zen-overlay').map(({ pluginId, def }) => {
                    const plugin = plugins[pluginId]
                    const componentId = `${pluginId}-${def.id}`
                    const instances = Object.values(windows).filter(
                      (w) => w.componentId === componentId,
                    )

                    return (
                      <div
                        key={componentId}
                        className="flex items-center justify-between p-2 border bg-card"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {def.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {pluginId}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {instances.length > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5">
                              {instances.length}
                            </Badge>
                          )}
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
                                hideHeader: def.options?.hideHeader,
                                transparent: def.options?.transparent,
                              })
                              toast.info(`Opened ${def.label}`)
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
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
                getComponents('zen-overlay').length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                    <LayersIcon className="w-8 h-8 mb-2 opacity-50" />
                    <p>No plugins loaded</p>
                  </div>
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="layouts"
          className="flex-1 min-h-0 p-2 mt-0 flex flex-col overflow-hidden h-full"
        >
          <div className="flex flex-col gap-3 h-full">
            <div className="flex gap-2 shrink-0">
              <Input
                placeholder="New layout name..."
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                className="h-9"
              />
              <Button
                size="icon"
                onClick={() => {
                  if (!newLayoutName) return
                  saveLayout(newLayoutName)
                  setNewLayoutName('')
                  toast.success(`Saved layout: ${newLayoutName}`)
                }}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0 pr-2">
              <div className="space-y-2">
                {Object.keys(layouts).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No saved layouts
                  </div>
                ) : (
                  Object.keys(layouts).map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2 border bg-card  group"
                    >
                      <span className="text-sm font-medium">{name}</span>
                      <div className="flex items-center gap-1 opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => {
                            loadLayout(name)
                            toast.success(`Loaded layout: ${name}`)
                          }}
                        >
                          Load
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            deleteLayout(name)
                            toast.info(`Deleted layout: ${name}`)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent
          value="tools"
          className="flex-1 min-h-0 p-2 mt-0 flex flex-col overflow-hidden"
        >
          <ScrollArea className="flex-1 min-h-0 pr-3" type="always">
            <div className="flex flex-col gap-2">
              {/* Show V2 Actions (Server) */}
              {serverActions?.map((action, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2  bg-muted/50 hover:bg-muted group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      {action.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleActionClick(action)}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {(serverActions?.length ?? 0) > 0 && (
                <div className="h-px bg-border my-2" />
              )}

              {/* Show Plugin Actions (Client) */}
              {getActions('zen-toolbox-action').length === 0 &&
              (serverActions?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                  <Zap className="w-8 h-8 mb-2 opacity-50" />
                  <p>No actions available</p>
                </div>
              ) : (
                getActions('zen-toolbox-action').map(({ pluginId, def }) => {
                  const Icon = def.icon || Zap

                  if (def.component) {
                    const ActionComponent = def.component
                    return (
                      <Accordion
                        type="single"
                        collapsible
                        key={`${pluginId}-${def.id}`}
                        className="w-full border bg-card"
                      >
                        <AccordionItem value="item-1" className="border-0">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/50 data-[state=open]:">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {def.label}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 pt-2 border-t bg-muted/20">
                            <ActionComponent api={api} />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )
                  }

                  return (
                    <Button
                      key={`${pluginId}-${def.id}`}
                      variant="outline"
                      className="w-full justify-start gap-2 h-12"
                      onClick={() => def.handler?.(api)}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{def.label}</span>
                    </Button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DraggablePanel>
  )
}
