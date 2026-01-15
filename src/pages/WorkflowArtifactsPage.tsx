import React, { useState } from 'react'
import {
  useWorkflows,
  useCreateWorkflow,
  useDuplicateWorkflow,
  useComposeWorkflows,
  useUpdateWorkflowMetadata,
  useRunWorkflow,
  useDeleteWorkflow,
  useWorkflowTemplates,
} from '@/hooks/useWorkflows'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@embeddr/react-ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { Checkbox } from '@embeddr/react-ui/components/checkbox'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Badge } from '@embeddr/react-ui/components/badge'
import {
  Upload as UploadIcon,
  FileCode,
  ArrowRight,
  Copy,
  Trash2,
  Play,
  Plus,
  Merge,
  Eye,
  Image as ImageIcon,
  Folder,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'

import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import { CollectionSelectorDialog } from '@/components/dialogs/CollectionSelectorDialog'
import { UploadDialog } from '@/components/upload/UploadDialog'

// Constants matching backend bitmask
const EXPOSURE_INTERNAL = 0
const EXPOSURE_UI = 1
const EXPOSURE_API = 2
const EXPOSURE_MCP = 4

function getExposureLabel(val: number | string) {
  if (typeof val === 'string') return val // legacy
  if (val === EXPOSURE_INTERNAL) return 'Internal'
  let parts = []
  if (val & EXPOSURE_UI) parts.push('UI')
  if (val & EXPOSURE_API) parts.push('API')
  if (val & EXPOSURE_MCP) parts.push('MCP')
  return parts.join('+') || 'Hidden'
}

// Helper to normalize inputs from various V2/legacy schemas
function getWorkflowInputs(meta: any) {
  // 1. Check for modern V2 "interface.exposed_inputs" (Array)
  const iface = meta.interface || meta.graph?.interface
  if (iface?.exposed_inputs && Array.isArray(iface.exposed_inputs)) {
    const inputs: Record<string, any> = {}
    iface.exposed_inputs.forEach((inp: any) => {
      // Use label or node_port as key
      const key = inp.label || `${inp.node}_${inp.port}`
      inputs[key] = {
        name: inp.label || key,
        type: inp.type,
        // Default to Internal (0) if not specified, unless parser set it.
        // But UI should probably show everything?
        // User wants to "toggle things on and off".
        // Let's ensure a default exposure if missing.
        exposure: inp.exposure !== undefined ? inp.exposure : 1, // Default visible if parser didn't set
        description: inp.port,
        ...inp,
      }
    })
    return inputs
  }

  // 2. Legacy schema "workflow.inputs" (Dict)
  if (meta.workflow?.inputs) {
    return meta.workflow.inputs
  }

  return {}
}

function getWorkflowOutputs(meta: any) {
  // 1. Modern V2
  const iface = meta.interface || meta.graph?.interface
  if (iface?.exposed_outputs && Array.isArray(iface.exposed_outputs)) {
    const outputs: Record<string, any> = {}
    iface.exposed_outputs.forEach((out: any) => {
      const key = out.label || `${out.node}_${out.port}`
      outputs[key] = {
        name: out.label || key,
        type: out.type,
        ...out,
      }
    })
    return outputs
  }

  // 2. Legacy
  if (meta.workflow?.outputs) {
    return meta.workflow.outputs
  }

  return {}
}

export default function WorkflowArtifactsPage() {
  const { data: workflows, isLoading, refetch } = useWorkflows()
  const createWorkflow = useCreateWorkflow()
  const duplicateWorkflow = useDuplicateWorkflow()
  const composeWorkflows = useComposeWorkflows()
  const updateWorkflowMetadata = useUpdateWorkflowMetadata()
  const runWorkflow = useRunWorkflow()
  const deleteWorkflow = useDeleteWorkflow()
  const { data: templates } = useWorkflowTemplates()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)
  const [runInputs, setRunInputs] = useState<Record<string, any>>({})

  // Image Choosing State
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false)
  const [imageSelectorTarget, setImageSelectorTarget] = useState<string | null>(
    null,
  )
  const [isCollectionSelectorOpen, setIsCollectionSelectorOpen] =
    useState(false)
  const [collectionSelectorTarget, setCollectionSelectorTarget] = useState<
    string | null
  >(null)

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])

  // New: Capture the target key for upload too, so we can auto-assign after upload
  const [uploadTargetKey, setUploadTargetKey] = useState<string | null>(null)

  const selectedWorkflow = workflows?.find((w) => w.id === selectedId)
  const workflowInputs = selectedWorkflow
    ? getWorkflowInputs(selectedWorkflow.metadata_json)
    : {}
  const workflowOutputs = selectedWorkflow
    ? getWorkflowOutputs(selectedWorkflow.metadata_json)
    : {}

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleCollectionSelect = (id: string) => {
    if (collectionSelectorTarget) {
      setRunInputs((prev) => ({ ...prev, [collectionSelectorTarget]: id }))
    }
    setIsCollectionSelectorOpen(false)
    setCollectionSelectorTarget(null)
  }

  const handleCreate = async (template?: string) => {
    try {
      await createWorkflow.mutateAsync({
        name: template ? `New ${template}` : 'Untitled Workflow',
        template,
        description: 'Created via V2 UI',
      })
      toast.success('Workflow created')
      refetch()
    } catch (e) {
      toast.error('Failed to create')
    }
  }

  const handleDuplicate = async () => {
    if (!selectedId) return
    try {
      await duplicateWorkflow.mutateAsync(selectedId)
      toast.success('Duplicated')
      refetch()
    } catch (e) {
      toast.error('Failed to duplicate')
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm('Are you sure you want to delete this workflow?')) return
    try {
      await deleteWorkflow.mutateAsync(selectedId)
      toast.success('Deleted')
      setSelectedId(null)
      refetch()
    } catch (e) {
      toast.error('Failed to delete')
    }
  }

  const handleCompose = async () => {
    if (selectedIds.size < 2) return
    try {
      await composeWorkflows.mutateAsync({
        ids: Array.from(selectedIds),
        name: `Composed (${selectedIds.size})`,
      })
      toast.success('Composed workflow created')
      setSelectedIds(new Set())
      refetch()
    } catch (e) {
      toast.error('Failed to compose')
    }
  }

  const handleRun = async () => {
    if (!selectedWorkflow) return
    try {
      const res = await runWorkflow.mutateAsync({
        id: selectedWorkflow.id,
        inputs: runInputs,
      })
      toast.success(`Run queued: ${res.prompt_id}`)
      setIsRunDialogOpen(false)
    } catch (e) {
      toast.error('Execution failed')
    }
  }

  const toggleExposure = async (portName: string, current: any) => {
    if (!selectedWorkflow) return
    // Simple cycle compatible with bitmasks for now, or just strings if legacy
    // Let's assume using updated bit constants: UI=1, API=2, MCP=4
    // If current is string, convert to int first?
    // For this quick UI, let's keep it simple: Cycle 0 -> 1 (UI) -> 3 (UI+API) -> 7 (ALL) -> 0
    let val = 0
    if (typeof current === 'string') {
      if (current === 'ui') val = 1
      else if (current === 'api') val = 2
      else if (current === 'mcp') val = 4
    } else {
      val = current
    }

    let next = 0
    if (val === 0)
      next = 1 // -> UI
    else if (val === 1)
      next = 3 // -> UI + API
    else if (val === 3)
      next = 7 // -> ALL
    else next = 0 // -> Internal

    // Copy safely
    const newMeta = JSON.parse(JSON.stringify(selectedWorkflow.metadata_json))

    let found = false

    // 1. Try V2 Interface
    if (
      newMeta.interface?.exposed_inputs &&
      Array.isArray(newMeta.interface.exposed_inputs)
    ) {
      const idx = newMeta.interface.exposed_inputs.findIndex(
        (i: any) => i.label === portName || `${i.node}_${i.port}` === portName,
      )
      if (idx >= 0) {
        newMeta.interface.exposed_inputs[idx].exposure = next
        found = true
      }
    }

    // 2. Try Graph Interface
    if (
      !found &&
      newMeta.graph?.interface?.exposed_inputs &&
      Array.isArray(newMeta.graph.interface.exposed_inputs)
    ) {
      const idx = newMeta.graph.interface.exposed_inputs.findIndex(
        (i: any) => i.label === portName || `${i.node}_${i.port}` === portName,
      )
      if (idx >= 0) {
        newMeta.graph.interface.exposed_inputs[idx].exposure = next
        found = true
      }
    }

    // 3. Fallback Legacy
    if (
      !found &&
      newMeta.workflow?.inputs &&
      newMeta.workflow.inputs[portName]
    ) {
      newMeta.workflow.inputs[portName].exposure = next
      found = true
    }

    if (found) {
      await updateWorkflowMetadata.mutateAsync({
        id: selectedWorkflow.id,
        metadata: newMeta,
      })
      refetch()
    } else {
      toast.error('Could not find input definition to update')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        const name = file.name.replace('.json', '')
        await createWorkflow.mutateAsync({
          name,
          graph: json,
          description: 'Imported from file',
        })
        toast.success(`Imported ${name}`)
      } catch (err) {
        toast.error('Failed to parse or upload workflow')
        console.error(err)
      }
    }
    reader.readAsText(file)
  }

  const handleImageSelect = (image: any) => {
    if (imageSelectorTarget) {
      setRunInputs((prev) => ({ ...prev, [imageSelectorTarget]: image.id }))
    }
    setIsImageSelectorOpen(false)
    setImageSelectorTarget(null)
  }

  const handleUploadClick = (key: string) => {
    // Create a hidden file input or just trigger click on one
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = false
    input.onchange = (e: any) => {
      if (e.target.files?.length) {
        setUploadFiles(Array.from(e.target.files))
        setUploadTargetKey(key)
        setIsUploadDialogOpen(true)
      }
    }
    input.click()
  }

  // Monitor workflow inputs to see if any are newly updated by background upload?
  // No, we need a way to know when upload finishes.
  // Ideally UploadDialog would have an onUploadComplete callback.
  // But wait, the UploadDialog in this codebase might not expose that easily without modification.
  // For now, let's assume the user has to pick the image from the selector AFTER upload,
  // OR we rely on generic library refresh.
  // To make it better: "Upload straight then in there" -> upload dialog -> success -> auto select.

  // We can wrap UploadDialog? No, let's check UploadDialog source again.
  // It does toast.success. It doesn't seem to emit the created artifact ID back.
  // We might just let them upload, then use the selector.
  // Or improvements: modify UploadDialog to accept onComplete.

  return (
    <div className=" w-full  p-1 h-full grid grid-cols-1 md:grid-cols-3 gap-1">
      {/* List */}
      <Card className="md:col-span-1 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-2">
          <CardTitle>Actions</CardTitle>
          <div className="flex gap-1 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="outline" title="New Workflow">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Create New</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleCreate('empty')}>
                  Empty Workflow
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>From Template</DropdownMenuLabel>
                {templates &&
                  Object.entries(templates).map(([key, _]) => {
                    if (key === 'empty') return null
                    return (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleCreate(key)}
                      >
                        {key}
                        {/* {label && <span className="ml-auto text-xs text-muted-foreground">{label}</span>} */}
                      </DropdownMenuItem>
                    )
                  })}
                {!templates && (
                  <div className="p-2 text-xs text-muted-foreground">
                    Loading templates...
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedIds.size >= 2 && (
              <Button
                size="icon-sm"
                variant="secondary"
                onClick={handleCompose}
                title="Compose"
              >
                <Merge className="h-4 w-4" />
              </Button>
            )}
            <div className="relative">
              <input
                type="file"
                accept=".json"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
              <Button size="icon-sm" variant="outline" title="Import JSON">
                <UploadIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 p-2">
              {isLoading && <div className="p-4 text-center">Loading...</div>}
              {workflows?.map((w) => (
                <div key={w.id} className="flex gap-2 items-center">
                  <Checkbox
                    checked={selectedIds.has(w.id.toString())}
                    onCheckedChange={() => toggleSelection(w.id.toString())}
                  />
                  <Button
                    variant={selectedId === w.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => setSelectedId(w.id.toString())}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold truncate">
                        {w.metadata_json.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate font-mono">
                        {w.metadata_json.workflow?.implementation?.type ||
                          'legacy'}
                      </span>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details / Editor */}
      <Card className="md:col-span-2 h-full flex flex-col">
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle>
            {selectedWorkflow
              ? selectedWorkflow.metadata_json.name
              : 'Select a Workflow'}
          </CardTitle>
          {selectedWorkflow && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-1" /> Duplicate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setRunInputs({}) // Reset or Default
                  setIsRunDialogOpen(true)
                }}
              >
                <Play className="h-4 w-4 mr-1" /> Run
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {selectedWorkflow ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inputs Editor */}
                <div className="p-4 border rounded-lg bg-card/50">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FileCode className="h-4 w-4" /> Inputs
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(workflowInputs).map(([key, port]: any) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm p-2 bg-background rounded-md border"
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-muted-foreground">
                            {key}
                          </span>
                          <span className="font-medium">{port.name}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline">{port.type}</Badge>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="h-6 w-auto text-xs px-1"
                            onClick={() => toggleExposure(key, port.exposure)}
                            title="Toggle Exposure"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {getExposureLabel(port.exposure)}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {Object.keys(workflowInputs).length === 0 && (
                      <div className="text-muted-foreground text-sm italic">
                        No inputs defined
                      </div>
                    )}
                  </div>
                </div>

                {/* Outputs */}
                <div className="p-4 border rounded-lg bg-card/50">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" /> Outputs
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(workflowOutputs).map(([key, port]: any) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm p-2 bg-background rounded-md border"
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-muted-foreground">
                            {key}
                          </span>
                          <span className="font-medium">{port.name}</span>
                        </div>
                        <Badge variant="outline">{port.type}</Badge>
                      </div>
                    ))}
                    {Object.keys(workflowOutputs).length === 0 && (
                      <div className="text-muted-foreground text-sm italic">
                        No outputs defined
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Implementation Details */}
              <div className="p-4 border rounded-lg bg-slate-950 text-slate-50 font-mono text-xs overflow-auto max-h-60">
                <pre>
                  {JSON.stringify(
                    selectedWorkflow.metadata_json.workflow?.implementation,
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select or create a workflow to edit
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries(workflowInputs).map(([key, port]: any) => {
              const exposure = port.exposure !== undefined ? port.exposure : 1
              if ((exposure & EXPOSURE_UI) === 0) return null
              return (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">
                    {port.name} ({port.type})
                  </label>
                  {port.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={runInputs[key] || false}
                        onCheckedChange={(c) =>
                          setRunInputs((prev) => ({ ...prev, [key]: !!c }))
                        }
                      />
                      <span className="text-sm">Enabled</span>
                    </div>
                  ) : port.type === 'collection_id' ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Collection ID"
                        value={runInputs[key] || ''}
                        onChange={(e) =>
                          setRunInputs((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCollectionSelectorTarget(key)
                          setIsCollectionSelectorOpen(true)
                        }}
                        title="Pick Collection"
                      >
                        <Folder className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : port.type === 'image' || port.type === 'artifact_refs' ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="UUID or Path"
                        value={runInputs[key] || ''}
                        onChange={(e) =>
                          setRunInputs((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setImageSelectorTarget(key)
                          setIsImageSelectorOpen(true)
                        }}
                        title="Pick from Library"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleUploadClick(key)}
                        title="Upload New"
                      >
                        <UploadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      placeholder={port.description || key}
                      value={runInputs[key] || ''}
                      onChange={(e) =>
                        setRunInputs((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              )
            })}
            {Object.keys(workflowInputs).length === 0 && (
              <div className="text-muted-foreground text-center italic">
                No configurable inputs
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRun}>Execute</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageSelectorDialog
        open={isImageSelectorOpen}
        onOpenChange={setIsImageSelectorOpen}
        onSelect={handleImageSelect}
        title={`Select Image for ${imageSelectorTarget}`}
      />

      <CollectionSelectorDialog
        open={isCollectionSelectorOpen}
        onOpenChange={setIsCollectionSelectorOpen}
        onSelect={handleCollectionSelect}
        title={`Select Collection for ${collectionSelectorTarget}`}
      />

      <UploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        files={uploadFiles}
      />
    </div>
  )
}
