import React, { useMemo, useState } from 'react'
import { useWorkflows, useRunWorkflow } from '@/hooks/useWorkflows'
import { useEmbeddrAPI } from '@/plugins/store'
import { Button } from '@embeddr/react-ui/components/button'
import { Checkbox } from '@embeddr/react-ui/components/checkbox'
import { Input } from '@embeddr/react-ui/components/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Image as ImageIcon, Folder } from 'lucide-react'
import { toast } from 'sonner'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import { CollectionSelectorDialog } from '@/components/dialogs/CollectionSelectorDialog'
import { UploadDialog } from '@/components/upload/UploadDialog'
import { WorkflowRunnerLayout } from './workflows/WorkflowRunnerLayout'
import type { WorkflowPort as RunnerPort } from './workflows/WorkflowRunnerDetails'

const EXPOSURE_UI = 1

type WorkflowPort = RunnerPort

type WorkflowMeta = {
  name?: string
  description?: string
  interface?: {
    exposed_inputs?: Array<Record<string, any>>
    exposed_outputs?: Array<Record<string, any>>
  }
  graph?: {
    interface?: {
      exposed_inputs?: Array<Record<string, any>>
      exposed_outputs?: Array<Record<string, any>>
    }
  }
  workflow?: {
    inputs?: Record<string, WorkflowPort>
    outputs?: Record<string, WorkflowPort>
    implementation?: {
      type?: string
    }
  }
}

function getWorkflowInputs(meta: WorkflowMeta | undefined) {
  const iface = meta?.interface || meta?.graph?.interface
  if (iface?.exposed_inputs && Array.isArray(iface.exposed_inputs)) {
    const inputs: Record<string, WorkflowPort> = {}
    iface.exposed_inputs.forEach((inp: any) => {
      const key = inp.label || `${inp.node}_${inp.port}`
      inputs[key] = {
        name: inp.label || key,
        type: inp.type,
        exposure: inp.exposure !== undefined ? inp.exposure : 1,
        description: inp.port,
        default: inp.default ?? inp.value,
        ...inp,
      }
    })
    return inputs
  }

  if (meta?.workflow?.inputs) {
    return meta.workflow.inputs
  }

  return {}
}

function getWorkflowOutputs(meta: WorkflowMeta | undefined) {
  const iface = meta?.interface || meta?.graph?.interface
  if (iface?.exposed_outputs && Array.isArray(iface.exposed_outputs)) {
    const outputs: Record<string, WorkflowPort> = {}
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

  if (meta?.workflow?.outputs) {
    return meta.workflow.outputs
  }

  return {}
}

function normalizeType(type?: string) {
  if (!type) return 'string'
  const lower = type.toLowerCase()
  if (
    lower === 'image' ||
    lower === 'artifact' ||
    lower === 'artifact_ref' ||
    lower === 'artifact_refs'
  ) {
    return 'artifact'
  }
  if (lower === 'collection_id') return 'collection'
  return lower
}

export function LotusWorkflowsUserPanel() {
  const api = useEmbeddrAPI()
  const { data: workflows, isLoading } = useWorkflows()
  const runWorkflow = useRunWorkflow()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)
  const [runInputs, setRunInputs] = useState<Record<string, any>>({})

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

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return []
    const needle = searchValue.trim().toLowerCase()
    if (!needle) return workflows
    return workflows.filter((workflow) =>
      String(workflow.metadata_json?.name || '')
        .toLowerCase()
        .includes(needle),
    )
  }, [searchValue, workflows])

  const selectedWorkflow = useMemo(
    () => workflows?.find((w) => String(w.id) === selectedId) || null,
    [workflows, selectedId],
  )

  const workflowInputs = useMemo(
    () =>
      selectedWorkflow ? getWorkflowInputs(selectedWorkflow.metadata_json) : {},
    [selectedWorkflow],
  )

  const workflowOutputs = useMemo(
    () =>
      selectedWorkflow
        ? getWorkflowOutputs(selectedWorkflow.metadata_json)
        : {},
    [selectedWorkflow],
  )

  const handleRun = async () => {
    if (!selectedWorkflow) return
    const workflowTypeName = (selectedWorkflow as any)?.type_name as
      | string
      | undefined
    try {
      if (
        typeof workflowTypeName === 'string' &&
        workflowTypeName.startsWith('action:comfy.workflow')
      ) {
        const result = await api.lotus.invoke('embeddr-comfyui.run_workflow', {
          workflow_id: selectedWorkflow.id,
          inputs: runInputs,
          client_id: 'embeddr-lotus-workflows-user',
        })
        if (result?.status === 'error') {
          toast.error(result?.message || 'Workflow failed')
          return
        }
      } else {
        await runWorkflow.mutateAsync({
          id: selectedWorkflow.id,
          inputs: runInputs,
        })
      }
      toast.success('Workflow started')
      setIsRunDialogOpen(false)
    } catch (err) {
      toast.error('Failed to run workflow')
    }
  }

  const handleImageSelect = (image: any) => {
    if (imageSelectorTarget) {
      setRunInputs((prev) => ({ ...prev, [imageSelectorTarget]: image.id }))
    }
    setIsImageSelectorOpen(false)
    setImageSelectorTarget(null)
  }

  const handleCollectionSelect = (id: string) => {
    if (collectionSelectorTarget) {
      setRunInputs((prev) => ({ ...prev, [collectionSelectorTarget]: id }))
    }
    setIsCollectionSelectorOpen(false)
    setCollectionSelectorTarget(null)
  }

  const handleUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = false
    input.onchange = (event: any) => {
      if (event.target.files?.length) {
        setUploadFiles(Array.from(event.target.files))
        setIsUploadDialogOpen(true)
      }
    }
    input.click()
  }

  return (
    <>
      <WorkflowRunnerLayout
        workflows={filteredWorkflows}
        isLoading={isLoading}
        selectedId={selectedId}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSelect={setSelectedId}
        selectedWorkflow={selectedWorkflow}
        workflowInputs={workflowInputs}
        workflowOutputs={workflowOutputs}
        normalizeType={normalizeType}
        onRun={() => {
          setRunInputs({})
          setIsRunDialogOpen(true)
        }}
      />

      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries(workflowInputs).map(([key, port]) => {
              const exposure = port.exposure !== undefined ? port.exposure : 1
              if (
                typeof exposure === 'number' &&
                (exposure & EXPOSURE_UI) === 0
              ) {
                return null
              }
              const displayType = normalizeType(port.type)
              return (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">
                    {port.name || key} ({displayType})
                  </label>
                  {displayType === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={runInputs[key] || false}
                        onCheckedChange={(checked) =>
                          setRunInputs((prev) => ({
                            ...prev,
                            [key]: !!checked,
                          }))
                        }
                      />
                      <span className="text-sm">Enabled</span>
                    </div>
                  ) : displayType === 'collection' ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Collection ID"
                        value={runInputs[key] || ''}
                        onChange={(event) =>
                          setRunInputs((prev) => ({
                            ...prev,
                            [key]: event.target.value,
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
                  ) : displayType === 'artifact' ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Artifact ID or path"
                        value={runInputs[key] || ''}
                        onChange={(event) =>
                          setRunInputs((prev) => ({
                            ...prev,
                            [key]: event.target.value,
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
                        onClick={handleUploadClick}
                        title="Upload New"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      placeholder={port.description || key}
                      value={runInputs[key] || ''}
                      onChange={(event) =>
                        setRunInputs((prev) => ({
                          ...prev,
                          [key]: event.target.value,
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
    </>
  )
}
