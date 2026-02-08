import React, { useState } from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { FileJson, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@embeddr/react-ui/components/card'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { cn } from '@/lib/utils'
import {
  usePluginWorkflows,
  useRunPluginWorkflow,
} from '@/hooks/usePluginWorkflows'
import { useEffect } from 'react'

const ComfyManagerPage = () => {
  const {
    data: pluginWorkflows,
    isLoading: isPluginLoading,
    refetch: refetchPlugin,
  } = usePluginWorkflows('embeddr-comfyui')
  const runPluginWorkflow = useRunPluginWorkflow('embeddr-comfyui')
  const [selectedPluginWorkflow, setSelectedPluginWorkflow] = useState<
    string | null
  >(null)

  // Debug listener for generation progress
  useEffect(() => {
    // We can rely on globalEventBus or add specific hooks here if we want to show a toaster
    // globalEventBus.on('embeddr-comfyui:generation.progress', (data) => console.log('Progress', data))
  }, [])

  return (
    <div className="p-1 w-full grid grid-cols-4 grid-rows-[auto_1fr] md:grid-rows-[1fr] gap-1 h-full overflow-visible">
      {/* Left Sidebar */}
      <div className="col-span-4 md:col-span-1 shrink-0! overflow-visible h-auto md:h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 gap-1">
        <Card className="flex-1 h-auto md:h-full p-0! gap-0! shrink-0 flex flex-col overflow-visible min-h-0">
          <div className="flex items-center justify-between shrink-0 border-b border-foreground/10 p-2 bg-muted/35">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Plugin Workflows
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => refetchPlugin()}
              title="Refresh Plugins"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {/* <ScrollArea className="flex-1 flex-col w-full min-w-0"> */}
          <div className="p-2 flex flex-col space-y-2 w-full max-w-full">
            {isPluginLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading Plugin Workflows...
              </div>
            ) : pluginWorkflows?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No plugin workflows found.
              </div>
            ) : (
              pluginWorkflows?.map((workflow) => (
                <div
                  key={workflow.name}
                  className={cn(
                    'group flex items-center justify-between p-2 cursor-pointer hover:bg-accent/50 transition-colors border bg-card w-full max-w-full overflow-hidden',
                    selectedPluginWorkflow === workflow.name
                      ? 'bg-primary/10 text-primary border-primary/50'
                      : 'text-muted-foreground border hover:border-border',
                  )}
                  onClick={() => {
                    setSelectedPluginWorkflow(workflow.name)
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileJson className="w-4 h-4 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-medium">
                        {workflow.name}
                      </span>
                      {workflow.description && (
                        <span className="truncate text-xs text-muted-foreground/70">
                          {workflow.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* </ScrollArea> */}
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="col-span-4 md:col-span-3 flex grow flex-col overflow-hidden h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0">
        <div className="h-full flex flex-col w-full! min-h-0 gap-1! space-y-0!">
          <div className="flex-1 m-0 overflow-y-auto border border-foreground/10 bg-card relative flex flex-col">
            <ScrollArea
              className="h-full pl-1 pr-4"
              variant="left-border"
              type="always"
            >
              {selectedPluginWorkflow ? (
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-4">
                    {selectedPluginWorkflow}
                  </h2>
                  <div className="p-4 border rounded-md bg-card">
                    <p className="text-sm text-muted-foreground mb-4">
                      This workflow is provided by the ComfyUI Plugin. It is
                      executed remotely via the plugin architecture.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          await runPluginWorkflow.mutateAsync({
                            workflowName: selectedPluginWorkflow,
                            inputs: {},
                          })
                          toast.success('Plugin Workflow Started')
                        } catch (e) {
                          toast.error('Failed to start workflow')
                        }
                      }}
                      disabled={runPluginWorkflow.isPending}
                    >
                      {runPluginWorkflow.isPending
                        ? 'Running...'
                        : 'Run Workflow (Default Inputs)'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-8 text-center min-h-100">
                  <FileJson className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">
                    No Workflow Selected
                  </h3>
                  <p className="max-w-sm">
                    Select a plugin workflow from the sidebar to get started.
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ComfyManagerPage
