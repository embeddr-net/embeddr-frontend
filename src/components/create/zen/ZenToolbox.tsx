import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import {
  CatIcon,
  Check,
  Layers,
  PlugZapIcon,
  Search,
  WorkflowIcon,
  Zap,
  ZapIcon,
} from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Switch } from '@embeddr/react-ui/components/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import type { EmbeddrAPI } from '@embeddr/react-ui/types'
import { cn } from '@/lib/utils'
import { DraggablePanel } from '@/components/ui/DraggablePanel'
import { extendApiForPlugin } from '@/plugins/store'

interface ZenToolboxProps {
  isOpen: boolean
  onClose: () => void
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
}

export function ZenToolbox({
  isOpen,
  onClose,
  workflows,
  selectedWorkflow,
  selectWorkflow,
  workflowSearch,
  setWorkflowSearch,
  getComponents,
  getActions,
  api,
  openPlugins,
  setOpenPlugins,
  hiddenWorkflows,
}: ZenToolboxProps) {
  return (
    <DraggablePanel
      id="zen-toolbox"
      title="Toolbox"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: 80, y: window.innerHeight - 400 }}
      defaultSize={{ width: 360, height: 450 }}
      className="absolute"
    >
      <Tabs defaultValue="workflows" className="h-full flex flex-col gap-0!">
        <div className="px-2 pt-2 shrink-0">
          <TabsList className="w-fit grid grid-cols-3 gap-1">
            <TabsTrigger value="workflows">
              <WorkflowIcon />{' '}
            </TabsTrigger>
            <TabsTrigger value="plugins">
              <PlugZapIcon />{' '}
            </TabsTrigger>
            <TabsTrigger value="actions">
              {' '}
              <ZapIcon />{' '}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="workflows"
          className="flex-1 p-2 pl-2 min-h-0 mt-0 flex flex-col gap-2"
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
          <ScrollArea className="h-full pr-3" type="always">
            <div className="space-y-1">
              {workflows
                .filter((w) =>
                  w.name.toLowerCase().includes(workflowSearch.toLowerCase()),
                )
                .filter((w) => !hiddenWorkflows.includes(String(w.id)))
                .map((w) => (
                  <Button
                    key={w.id}
                    size="sm"
                    className={cn(
                      'w-full justify-start text-xs font-normal bg-card text-foreground',
                      selectedWorkflow?.id === w.id && 'bg-muted font-medium',
                    )}
                    onClick={() => {
                      selectWorkflow(w)
                    }}
                  >
                    <span className="truncate">{w.name}</span>
                    {selectedWorkflow?.id === w.id && (
                      <Check className="ml-auto h-3 w-3 opacity-50" />
                    )}
                  </Button>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="plugins"
          forceMount
          className="flex-1 min-h-0 p-2 mt-0 data-[state=inactive]:hidden"
        >
          <ScrollArea className="h-full" type="always">
            <div className="space-y-4 pr-3">
              {/* Overlay Plugins Toggles */}
              {getComponents('zen-overlay').length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Overlay Panels
                  </div>
                  {getComponents('zen-overlay').map(({ pluginId, def }) => {
                    const isOpen = openPlugins[`${pluginId}-${def.id}`] ?? true
                    return (
                      <div
                        key={`${pluginId}-${def.id}`}
                        className="flex items-center justify-between p-2 border bg-card"
                      >
                        <span className="text-sm font-medium">{def.label}</span>
                        <Switch
                          checked={isOpen}
                          onCheckedChange={(checked) =>
                            setOpenPlugins((prev) => ({
                              ...prev,
                              [`${pluginId}-${def.id}`]: checked,
                            }))
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Toolbox Plugins */}
              {getComponents('zen-toolbox-tab').length > 0 && (
                <div className="space-y-2">
                  {getComponents('zen-toolbox-tab').map(({ pluginId, def }) => {
                    const Component = def.component
                    const pluginApi = extendApiForPlugin(api, pluginId)
                    return (
                      <div
                        key={`${pluginId}-${def.id}`}
                        className="border p-2 bg-card"
                      >
                        <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                          {def.label}
                        </div>
                        <Component api={pluginApi} />
                      </div>
                    )
                  })}
                </div>
              )}

              {getComponents('zen-toolbox-tab').length === 0 &&
                getComponents('zen-overlay').length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                    <Layers className="w-8 h-8 mb-2 opacity-50" />
                    <p>No plugins loaded</p>
                  </div>
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="actions" className="flex-1 min-h-0 p-2 mt-0">
          <ScrollArea className="h-full pr-3" type="always">
            <div className="flex flex-col gap-2">
              {getActions('zen-toolbox-action').length === 0 ? (
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
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/50 data-[state=open]:rounded-b-none">
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
