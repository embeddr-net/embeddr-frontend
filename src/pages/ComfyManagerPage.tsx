import React, { useCallback, useState } from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Eye,
  EyeOff,
  FileJson,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { cn } from '@/lib/utils'
import WorkflowEditor from '@/components/comfy/WorkflowEditor'
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useSyncWorkflows,
  useWorkflows,
} from '@/hooks/useWorkflows'
import {
  usePluginWorkflows,
  useRunPluginWorkflow,
} from '@/hooks/usePluginWorkflows'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useEffect } from 'react'

const ComfyManagerPage = () => {
  const { data: workflows, isLoading } = useWorkflows()
  const {
    data: pluginWorkflows,
    isLoading: isPluginLoading,
    refetch: refetchPlugin,
  } = usePluginWorkflows('embeddr-comfyui')
  const runPluginWorkflow = useRunPluginWorkflow('embeddr-comfyui')

  const createWorkflow = useCreateWorkflow()
  const deleteWorkflow = useDeleteWorkflow()
  const syncWorkflows = useSyncWorkflows()
  const [activeTab, setActiveTab] = useState('saved')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  )
  const [selectedPluginWorkflow, setSelectedPluginWorkflow] = useState<
    string | null
  >(null)

  // Debug listener for generation progress
  useEffect(() => {
    // We can rely on globalEventBus or add specific hooks here if we want to show a toaster
    // globalEventBus.on('embeddr-comfyui:generation.progress', (data) => console.log('Progress', data))
  }, [])

  const [isDragging, setIsDragging] = useState(false)
  const [showDisabled, setShowDisabled] = useState(false)

  const handleSync = async () => {
    try {
      await syncWorkflows.mutateAsync()
      toast.success('Workflows synced from disk')
    } catch (error) {
      toast.error('Failed to sync workflows')
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const jsonFile = files.find(
        (f) => f.type === 'application/json' || f.name.endsWith('.json'),
      )

      if (jsonFile) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const json = JSON.parse(event.target?.result as string)
            if (typeof json !== 'object') {
              throw new Error('Invalid JSON')
            }

            const name = jsonFile.name.replace('.json', '')
            const newWorkflow = await createWorkflow.mutateAsync({
              name,
              graph: json,
              description: 'Imported via drag and drop',
            })

            toast.success(`Imported workflow: ${name}`)
            setSelectedWorkflowId(newWorkflow.id.toString())
          } catch (error) {
            console.error(error)
            toast.error('Failed to parse workflow JSON')
          }
        }
        reader.readAsText(jsonFile)
      }
    },
    [createWorkflow],
  )

  const handleDelete = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this workflow?')) {
      await deleteWorkflow.mutateAsync(id)
      toast.success('Workflow deleted')
      if (selectedWorkflowId === id.toString()) {
        setSelectedWorkflowId(null)
      }
    }
  }

  return (
    <div className="p-1 w-full grid grid-cols-4 grid-rows-[auto_1fr] md:grid-rows-[1fr] gap-1 h-full overflow-visible">
      {/* Left Sidebar */}
      <div className="col-span-4 md:col-span-1 shrink-0! overflow-visible h-auto md:h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 gap-1">
        <Card className="flex-1 h-auto md:h-full p-0! gap-0! shrink-0 flex flex-col overflow-visible min-h-0">
          <div className="flex items-center justify-between shrink-0 border-b border-foreground/10 p-2 bg-muted/35">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Workflows
                </span>
                <div className="flex items-center gap-1">
                  {activeTab === 'saved' && (
                    <>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleSync}
                        title="Sync from Disk"
                        disabled={syncWorkflows.isPending}
                      >
                        <RefreshCw
                          className={cn(
                            'h-3.5 w-3.5',
                            syncWorkflows.isPending && 'animate-spin',
                          )}
                        />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() =>
                          document.getElementById('workflow-upload')?.click()
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {activeTab === 'plugin' && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => refetchPlugin()}
                      title="Refresh Plugins"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <TabsList className="w-full grid grid-cols-2 h-8">
                <TabsTrigger value="saved" className="text-xs">
                  Database
                </TabsTrigger>
                <TabsTrigger value="plugin" className="text-xs">
                  Plugins (MCP)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {/* <ScrollArea className="flex-1 flex-col w-full min-w-0"> */}
          <div className="p-2 flex flex-col space-y-2 w-full max-w-full">
            {activeTab === 'saved' ? (
              isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : workflows?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No workflows found.
                </div>
              ) : (
                workflows
                  ?.filter((w) => showDisabled || w.is_active !== false)
                  .map((workflow) => (
                    <div
                      key={workflow.id}
                      className={cn(
                        'group flex items-center justify-between p-2 cursor-pointer hover:bg-accent/50 transition-colors border bg-card w-full max-w-full overflow-hidden',
                        selectedWorkflowId === workflow.id.toString()
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'text-muted-foreground border hover:border-border',
                      )}
                      onClick={() =>
                        setSelectedWorkflowId(workflow.id.toString())
                      }
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileJson
                          className={cn(
                            'w-4 h-4 shrink-0',
                            !workflow.is_active && 'opacity-50',
                          )}
                        />
                        <span
                          className={cn(
                            'truncate text-sm font-medium',
                            !workflow.is_active && 'opacity-50',
                          )}
                        >
                          {workflow.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive ml-2"
                        onClick={(e) => handleDelete(e, workflow.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
              )
            ) : isPluginLoading ? (
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
                    setSelectedWorkflowId(null) // Deselect DB workflow
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
          <div
            className={`flex-1 m-0 overflow-y-auto border border-foreground/10 bg-card relative flex flex-col ${isDragging ? 'bg-primary/5' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary m-4">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h3 className="text-lg font-semibold">
                    Drop Workflow JSON here
                  </h3>
                </div>
              </div>
            )}

            <ScrollArea
              className="h-full pl-1 pr-4"
              variant="left-border"
              type="always"
            >
              {selectedWorkflowId ? (
                <div className="p-1">
                  <WorkflowEditor workflowId={parseInt(selectedWorkflowId)} />
                </div>
              ) : selectedPluginWorkflow ? (
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-4">
                    {selectedPluginWorkflow}
                  </h2>
                  <div className="p-4 border rounded-md bg-card">
                    <p className="text-sm text-muted-foreground mb-4">
                      This workflow is provided by the ComfyUI Plugin. It is
                      executed remotely via the new V2 Plugin Architecture.
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
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-8 text-center min-h-[400px]">
                  <FileJson className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">
                    No Workflow Selected
                  </h3>
                  <p className="max-w-sm">
                    Select a workflow from the sidebar or drag and drop a
                    ComfyUI JSON file here to get started.
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
