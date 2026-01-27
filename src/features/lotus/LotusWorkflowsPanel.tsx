import React, { useEffect, useMemo, useState } from 'react'
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
import { useEmbeddrAPI } from '@/plugins/store'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@embeddr/react-ui/components/button'
import { Checkbox } from '@embeddr/react-ui/components/checkbox'
import { Input } from '@embeddr/react-ui/components/input'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { toast } from 'sonner'
import type { LotusResultItem } from './types'
import { type PrimitiveDefinition } from './workflows/PrimitiveCard'
import { WorkflowEditorLayout } from './workflows/WorkflowEditorLayout'

const EXPOSURE_OPTIONS = [
  { label: 'internal', value: 0 },
  { label: 'ui', value: 1 },
  { label: 'api', value: 2 },
  { label: 'mcp', value: 4 },
]

function normalizeExposure(value: any): number {
  if (typeof value === 'string') {
    const match = EXPOSURE_OPTIONS.find((opt) => opt.label === value)
    return match?.value ?? 0
  }
  if (typeof value === 'number') {
    if (EXPOSURE_OPTIONS.some((opt) => opt.value === value)) return value
    if (value & 1) return 1
    if (value & 2) return 2
    if (value & 4) return 4
  }
  return 0
}

function getInputEntries(meta: any) {
  const workflowInputs = meta?.workflow?.inputs
  if (workflowInputs && typeof workflowInputs === 'object') {
    return Object.entries(workflowInputs).map(([key, port]: any) => ({
      key,
      port: {
        ...port,
        name: port.name || key,
        exposure: normalizeExposure(port.exposure),
        default: port.default ?? '',
      },
      source: 'workflow' as const,
    }))
  }

  const exposed = meta?.interface?.exposed_inputs
  if (Array.isArray(exposed)) {
    return exposed.map((port: any) => {
      const key = port.label || `${port.node}_${port.port}`
      return {
        key,
        port: {
          ...port,
          name: port.label || key,
          exposure: normalizeExposure(port.exposure),
          default: port.default ?? port.value ?? '',
        },
        source: 'interface' as const,
      }
    })
  }

  return []
}

function ensureFlowDraft(meta: any) {
  const next = JSON.parse(JSON.stringify(meta))
  next.workflow = next.workflow || {
    schema_version: '1.0',
    inputs: {},
    outputs: {},
    side_effects: [],
    implementation: {
      type: 'lotus-composed',
      payload: { steps: [] },
    },
  }
  next.workflow.implementation = next.workflow.implementation || {
    type: 'lotus-composed',
    payload: { steps: [] },
  }
  if (next.workflow.implementation.type !== 'lotus-composed') {
    next.workflow.implementation.type = 'lotus-composed'
  }
  next.workflow.implementation.payload =
    next.workflow.implementation.payload || {}
  next.workflow.implementation.payload.steps =
    next.workflow.implementation.payload.steps || []
  return next
}

export function LotusWorkflowsPanel() {
  const api = useEmbeddrAPI()
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
  const [draftMeta, setDraftMeta] = useState<any | null>(null)
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)
  const [runInputs, setRunInputs] = useState<Record<string, any>>({})
  const [searchValue, setSearchValue] = useState('')
  const [actionSearchValue, setActionSearchValue] = useState('')
  const [runInputsJson, setRunInputsJson] = useState('{}')
  const [stepOutputs, setStepOutputs] = useState<Record<number, any>>({})

  const capsQuery = useQuery({
    queryKey: ['lotus', 'caps', 'workflow-editor'],
    queryFn: () =>
      api.lotus.list({ limit: 200 }) as Promise<{ items: LotusResultItem[] }>,
  })

  const actionCaps = useMemo(() => {
    const items = capsQuery.data?.items || []
    const needle = actionSearchValue.trim().toLowerCase()
    return items.filter((item) => {
      if (item.kind !== 'action') return false
      if (!needle) return true
      const label = `${item.title || ''} ${item.id || ''}`.toLowerCase()
      return label.includes(needle)
    })
  }, [capsQuery.data, actionSearchValue])

  const capsById = useMemo(() => {
    const map = new Map<string, LotusResultItem>()
    ;(capsQuery.data?.items || []).forEach((item) => {
      map.set(item.id, item)
    })
    return map
  }, [capsQuery.data])

  const artifactTypeOptions = useMemo(() => {
    const base = [
      'text',
      'number',
      'boolean',
      'image',
      'artifact',
      'artifact_ref',
    ]
    const items = capsQuery.data?.items || []
    const found = new Set<string>()
    items
      .filter((item) => item.kind === 'artifact_type')
      .forEach((item) => {
        const types = (item.data?.types || []) as Array<{ name?: string }>
        types.forEach((t) => {
          if (t.name) found.add(t.name)
        })
      })
    return [...new Set([...base, ...Array.from(found)])]
  }, [capsQuery.data])

  const primitiveLibrary = useMemo<PrimitiveDefinition[]>(
    () => [
      {
        id: 'embeddr-core.wait',
        title: 'Wait',
        description: 'Pause execution for a duration in milliseconds.',
        inputs: [{ name: 'duration_ms', type: 'number' }],
        outputs: [],
      },
      {
        id: 'embeddr-core.event.emit',
        title: 'Emit Event',
        description: 'Publish an event to the global event bus.',
        inputs: [
          { name: 'event_type', type: 'string' },
          { name: 'payload', type: 'object' },
          { name: 'source', type: 'string' },
        ],
        outputs: [],
      },
      {
        id: 'embeddr-core.event.wait',
        title: 'Wait for Event',
        description: 'Block until a matching event arrives (or timeout).',
        inputs: [
          { name: 'event_type', type: 'string' },
          { name: 'match', type: 'object' },
          { name: 'timeout_ms', type: 'number' },
        ],
        outputs: [
          { name: 'payload', type: 'object' },
          { name: 'source', type: 'string' },
          { name: 'timestamp', type: 'number' },
        ],
      },
    ],
    [],
  )

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return []
    const needle = searchValue.trim().toLowerCase()
    if (!needle) return workflows
    return workflows.filter((workflow) =>
      workflow.metadata_json?.name?.toLowerCase().includes(needle),
    )
  }, [searchValue, workflows])

  const selectedWorkflow = useMemo(
    () => workflows?.find((w) => String(w.id) === selectedId) || null,
    [workflows, selectedId],
  )

  const inputEntries = useMemo(
    () => (draftMeta ? getInputEntries(draftMeta) : []),
    [draftMeta],
  )

  useEffect(() => {
    if (!selectedWorkflow) {
      setDraftMeta(null)
      return
    }
    setDraftMeta(JSON.parse(JSON.stringify(selectedWorkflow.metadata_json)))
  }, [selectedWorkflow])

  const handleCreate = async (template?: string) => {
    try {
      await createWorkflow.mutateAsync({
        name: template ? `New ${template}` : 'New Workflow',
        template,
      })
      toast.success('Workflow created')
      refetch()
    } catch (e) {
      toast.error('Failed to create workflow')
    }
  }

  const handleDuplicate = async () => {
    if (!selectedId) return
    try {
      await duplicateWorkflow.mutateAsync(selectedId)
      toast.success('Workflow duplicated')
      refetch()
    } catch (e) {
      toast.error('Failed to duplicate workflow')
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
      toast.error('Failed to compose workflows')
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm('Delete this workflow?')) return
    try {
      await deleteWorkflow.mutateAsync(selectedId)
      toast.success('Workflow deleted')
      setSelectedId(null)
      refetch()
    } catch (e) {
      toast.error('Failed to delete workflow')
    }
  }

  const handleSave = async () => {
    if (!selectedWorkflow || !draftMeta) return
    try {
      await updateWorkflowMetadata.mutateAsync({
        id: selectedWorkflow.id,
        metadata: draftMeta,
      })
      toast.success('Workflow saved')
      refetch()
    } catch (e) {
      toast.error('Failed to save workflow')
    }
  }

  const handleRun = async () => {
    if (!selectedWorkflow) return
    const workflowTypeName = (selectedWorkflow as any)?.type_name as
      | string
      | undefined
    let inputs = runInputs
    if (inputEntries.length === 0) {
      try {
        inputs = runInputsJson ? JSON.parse(runInputsJson) : {}
      } catch (e) {
        toast.error('Run inputs must be valid JSON')
        return
      }
    }
    try {
      if (
        typeof workflowTypeName === 'string' &&
        workflowTypeName.startsWith('action:comfy.workflow')
      ) {
        const result = await api.lotus.invoke('embeddr-comfyui.run_workflow', {
          workflow_id: selectedWorkflow.id,
          inputs,
          client_id: 'embeddr-lotus-workflows',
        })
        if (result?.status === 'error') {
          toast.error(result?.message || 'Workflow failed')
          return
        }
      } else {
        await runWorkflow.mutateAsync({
          id: selectedWorkflow.id,
          inputs,
        })
      }
      toast.success('Workflow started')
      setIsRunDialogOpen(false)
    } catch (e) {
      toast.error('Failed to run workflow')
    }
  }

  const resolveTemplateValue = (
    value: any,
    inputs: Record<string, any>,
    outputs: Array<Record<string, any>>,
  ): any => {
    if (typeof value === 'string') {
      return value.replace(/\$\{([^}]+)\}/g, (_, path) => {
        if (path.startsWith('inputs.')) {
          const key = path.slice('inputs.'.length)
          return String(inputs[key] ?? '')
        }
        if (path.startsWith('steps.')) {
          const parts = path.split('.')
          const idx = Number(parts[1])
          if (Number.isNaN(idx) || !outputs[idx]) return ''
          const field = parts.slice(2).join('.')
          return String(outputs[idx]?.[field] ?? '')
        }
        return ''
      })
    }
    if (Array.isArray(value)) {
      return value.map((v) => resolveTemplateValue(v, inputs, outputs))
    }
    if (value && typeof value === 'object') {
      const resolved: Record<string, any> = {}
      Object.entries(value).forEach(([k, v]) => {
        resolved[k] = resolveTemplateValue(v, inputs, outputs)
      })
      return resolved
    }
    return value
  }

  const handleTestStep = async (index: number) => {
    if (!draftMeta?.workflow?.implementation?.payload?.steps) return
    const step = draftMeta.workflow.implementation.payload.steps[index]
    if (!step?.capability_id) return

    let contextInputs: Record<string, any> = runInputs
    if (inputEntries.length === 0) {
      try {
        contextInputs = runInputsJson ? JSON.parse(runInputsJson) : {}
      } catch (e) {
        toast.error('Run inputs must be valid JSON')
        return
      }
    }

    const outputsList = Array.from(
      { length: index },
      (_, i) => stepOutputs[i] || {},
    )
    const resolvedInputs = resolveTemplateValue(
      step.inputs || {},
      contextInputs,
      outputsList,
    )

    try {
      const result = await api.lotus.invoke(step.capability_id, resolvedInputs)
      setStepOutputs((prev) => ({ ...prev, [index]: result }))
      toast.success(`Step ${index + 1} executed`)
    } catch (e: any) {
      toast.error(`Step failed: ${e?.message || e}`)
    }
  }

  const handleInvokeCapability = async (
    capabilityId: string,
    inputs: Record<string, any>,
  ) => {
    const result = await api.lotus.invoke(capabilityId, inputs)
    if (result?.status === 'error') {
      throw new Error(result?.message || 'Capability failed')
    }
    return result
  }

  const getActionInputOptions = (capId: string) => {
    const cap = capsById.get(capId)
    const schema = cap?.data?.input?.schema as
      | { properties?: Record<string, any> }
      | undefined
    const props = schema?.properties || {}
    return Object.entries(props).map(([key, meta]) => ({
      key,
      label: meta?.title || key,
      type: meta?.type || 'any',
    }))
  }

  const handleImport = () => {
    toast.error('No compatible workflow importer found')
  }

  const handleAddStep = (capabilityId: string) => {
    if (!draftMeta) return
    const next = ensureFlowDraft(draftMeta)
    next.workflow.implementation.payload.steps.push({
      capability_id: capabilityId,
      inputs: {},
    })
    setDraftMeta(next)
  }

  const handleRemoveStep = (index: number) => {
    if (!draftMeta?.workflow?.implementation?.payload?.steps) return
    const next = JSON.parse(JSON.stringify(draftMeta))
    next.workflow.implementation.payload.steps.splice(index, 1)
    setDraftMeta(next)
  }

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!draftMeta?.workflow?.implementation?.payload?.steps) return
    const next = JSON.parse(JSON.stringify(draftMeta))
    const steps = next.workflow.implementation.payload.steps
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= steps.length) return
    const [removed] = steps.splice(index, 1)
    steps.splice(targetIndex, 0, removed)
    setDraftMeta(next)
  }

  const handleStepInputChange = (index: number, key: string, value: string) => {
    if (!draftMeta?.workflow?.implementation?.payload?.steps) return
    const next = JSON.parse(JSON.stringify(draftMeta))
    const step = next.workflow.implementation.payload.steps[index]
    step.inputs = step.inputs || {}
    step.inputs[key] = value
    setDraftMeta(next)
  }

  const handleAddStepInput = (index: number) => {
    if (!draftMeta?.workflow?.implementation?.payload?.steps) return
    const next = JSON.parse(JSON.stringify(draftMeta))
    const step = next.workflow.implementation.payload.steps[index]
    step.inputs = step.inputs || {}
    const base = 'input'
    let suffix = 1
    while (step.inputs[`${base}_${suffix}`] !== undefined) suffix += 1
    step.inputs[`${base}_${suffix}`] = ''
    setDraftMeta(next)
  }

  const handleRemoveStepInput = (index: number, key: string) => {
    if (!draftMeta?.workflow?.implementation?.payload?.steps) return
    const next = JSON.parse(JSON.stringify(draftMeta))
    const step = next.workflow.implementation.payload.steps[index]
    if (step?.inputs?.[key] !== undefined) {
      delete step.inputs[key]
      setDraftMeta(next)
    }
  }

  const handleAddPort = (kind: 'inputs' | 'outputs') => {
    if (!draftMeta) return
    const next = ensureFlowDraft(draftMeta)
    next.workflow[kind] = next.workflow[kind] || {}
    const base = kind === 'inputs' ? 'input' : 'output'
    let suffix = 1
    while (next.workflow[kind][`${base}_${suffix}`]) suffix += 1
    const name = `${base}_${suffix}`
    next.workflow[kind][name] = {
      name,
      type: kind === 'inputs' ? 'text' : 'image',
      description: '',
      default: '',
      exposure: 1,
    }
    if (kind === 'outputs') {
      next.workflow.output_bindings = next.workflow.output_bindings || {}
      next.workflow.output_bindings[name] = ''
    }
    setDraftMeta(next)
  }

  const handleRemovePort = (kind: 'inputs' | 'outputs', key: string) => {
    if (!draftMeta?.workflow?.[kind]) return
    const next = JSON.parse(JSON.stringify(draftMeta))
    delete next.workflow[kind][key]
    if (kind === 'outputs' && next.workflow.output_bindings) {
      delete next.workflow.output_bindings[key]
    }
    setDraftMeta(next)
  }

  const handleUpdatePort = (
    kind: 'inputs' | 'outputs',
    key: string,
    updates: Record<string, any>,
  ) => {
    if (!draftMeta?.workflow?.[kind]) return
    const next = JSON.parse(JSON.stringify(draftMeta))
    next.workflow[kind][key] = {
      ...next.workflow[kind][key],
      ...updates,
      name: updates.name ?? next.workflow[kind][key]?.name ?? key,
    }
    setDraftMeta(next)
  }

  const handleUpdateOutputBinding = (key: string, value: string) => {
    if (!draftMeta) return
    const next = ensureFlowDraft(draftMeta)
    next.workflow.output_bindings = next.workflow.output_bindings || {}
    next.workflow.output_bindings[key] = value
    setDraftMeta(next)
  }

  const handlePromoteToInput = (index: number, key: string) => {
    if (!draftMeta?.workflow?.implementation?.payload?.steps) return
    const next = ensureFlowDraft(draftMeta)
    const portName = key
    next.workflow.inputs = next.workflow.inputs || {}
    if (!next.workflow.inputs[portName]) {
      next.workflow.inputs[portName] = {
        name: portName,
        type: 'text',
        description: 'Workflow input',
        default: '',
        exposure: 1,
      }
    }
    const step = next.workflow.implementation.payload.steps[index]
    step.inputs = step.inputs || {}
    step.inputs[key] = `\${'{'}inputs.${portName}\${'}'}`
    setDraftMeta(next)
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  if (!draftMeta && selectedWorkflow) {
    return null
  }

  return (
    <>
      <WorkflowEditorLayout
        workflows={filteredWorkflows}
        isLoading={isLoading}
        selectedId={selectedId}
        selectedIds={selectedIds}
        searchValue={searchValue}
        templates={templates || null}
        onSearchChange={setSearchValue}
        onSelect={setSelectedId}
        onToggleSelection={toggleSelection}
        onCompose={handleCompose}
        onCreate={handleCreate}
        onImport={handleImport}
        selectedWorkflow={selectedWorkflow}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onSave={handleSave}
        onRun={() => setIsRunDialogOpen(true)}
        draftMeta={draftMeta}
        setDraftMeta={setDraftMeta}
        primitiveLibrary={primitiveLibrary}
        capsById={capsById}
        actionCaps={actionCaps}
        actionSearchValue={actionSearchValue}
        setActionSearchValue={setActionSearchValue}
        artifactTypeOptions={artifactTypeOptions}
        stepOutputs={stepOutputs}
        onRunComfy={() => setIsRunDialogOpen(true)}
        onAddStep={handleAddStep}
        onAddPort={handleAddPort}
        onRemovePort={handleRemovePort}
        onUpdatePort={handleUpdatePort}
        onUpdateOutputBinding={handleUpdateOutputBinding}
        onPromoteToInput={handlePromoteToInput}
        onMoveStep={handleMoveStep}
        onRemoveStep={handleRemoveStep}
        onStepInputChange={handleStepInputChange}
        onAddStepInput={handleAddStepInput}
        onRemoveStepInput={handleRemoveStepInput}
        onTestStep={handleTestStep}
        onInvokeCapability={handleInvokeCapability}
        getActionInputOptions={getActionInputOptions}
        ensureFlowDraft={ensureFlowDraft}
      />

      <Dialog open={isRunDialogOpen} onOpenChange={setIsRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {inputEntries.length > 0 ? (
              inputEntries.map(({ key, port }) => {
                if ((normalizeExposure(port.exposure) & 1) === 0) return null
                return (
                  <div key={key} className="space-y-1">
                    <span className="text-xs font-medium">{port.name}</span>
                    {port.type === 'boolean' ? (
                      <Checkbox
                        checked={Boolean(runInputs[key])}
                        onCheckedChange={(value) =>
                          setRunInputs((prev) => ({
                            ...prev,
                            [key]: Boolean(value),
                          }))
                        }
                      />
                    ) : (
                      <Input
                        value={runInputs[key] ?? ''}
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
              })
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-medium">Run inputs (JSON)</span>
                <Textarea
                  value={runInputsJson}
                  onChange={(event) => setRunInputsJson(event.target.value)}
                  className="min-h-28 font-mono text-xs"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRun}>Run</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
