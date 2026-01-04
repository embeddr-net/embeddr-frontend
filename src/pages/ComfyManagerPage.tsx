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

const ComfyManagerPage = () => {
  const { data: workflows, isLoading } = useWorkflows()
  const createWorkflow = useCreateWorkflow()
  const deleteWorkflow = useDeleteWorkflow()
  const syncWorkflows = useSyncWorkflows()
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    null,
  )
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
              data: json,
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

  const handleDelete = async (e: React.MouseEvent, id: number) => {
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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Workflows
            </span>
            <div className="flex items-center gap-1">
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
                className={cn('h-6 w-6', showDisabled && 'text-primary')}
                onClick={() => setShowDisabled(!showDisabled)}
                title={
                  showDisabled
                    ? 'Hide disabled workflows'
                    : 'Show disabled workflows'
                }
              >
                {showDisabled ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
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
              <input
                id="workflow-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = async (event) => {
                      try {
                        const json = JSON.parse(event.target?.result as string)
                        const name = file.name.replace('.json', '')
                        const newWorkflow = await createWorkflow.mutateAsync({
                          name,
                          data: json,
                          description: 'Imported from file',
                        })
                        toast.success(`Imported workflow: ${name}`)
                        setSelectedWorkflowId(newWorkflow.id.toString())
                      } catch (error) {
                        toast.error('Failed to parse workflow JSON')
                      }
                    }
                    reader.readAsText(file)
                  }
                }}
              />
            </div>
          </div>
          {/* <ScrollArea className="flex-1 flex-col w-full min-w-0"> */}
          <div className="p-2 flex flex-row space-x-2 space-y-0 md:flex-col md:space-y-2 md:space-x-0 w-full max-w-full">
            {isLoading ? (
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
