import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@embeddr/react-ui/components/ui'
import { Card } from '@embeddr/react-ui/components/ui'
import { Input } from '@embeddr/react-ui/components/ui'
import { Label } from '@embeddr/react-ui/components/ui'
import { Switch } from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/ui'
import { Separator } from '@embeddr/react-ui/components/ui'
import { Textarea } from '@embeddr/react-ui/components/ui'
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from '@embeddr/react-ui/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/ui'
import { PipelineGraphEditor } from '@/features/pipelines/PipelineGraphEditor'
import type { AutomationListResponse, LotusCapability } from '@/lib/api/types'
import { embeddrApi } from '@/lib/api/client'
import { usePluginWorkflows } from '@/hooks/usePluginWorkflows'

const TRIGGER_OPTIONS = [
  { label: 'Ingest pipeline (manual)', value: 'pipeline.ingest' },
  { label: 'Artifact created', value: 'artifact.created' },
  { label: 'Artifact updated', value: 'artifact.updated' },
  { label: 'Relation added', value: 'relation.added' },
]

const TYPE_OPTIONS = [
  { label: 'Any', value: 'any' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
]

type StepDraft = {
  capId: string
  inputsText: string
  ui?: {
    x?: number
    y?: number
    outgoing?: Array<
      number | { to: number; inputKey?: string; outputKey?: string }
    >
  }
}

function parseJson(value: string) {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Invalid JSON' }
  }
}

function getSchemaProps(cap?: LotusCapability) {
  const schema = (cap?.data as any)?.input?.schema || {}
  const props = schema?.properties || {}
  return props
}

function normalizeInputValue(value: any, schema: any) {
  if (value !== undefined) return value
  if (schema?.default !== undefined) return schema.default
  if (schema?.type === 'boolean') return false
  if (schema?.type === 'array') return []
  if (schema?.type === 'object') return {}
  return ''
}

function normalizeExposure(value: any) {
  if (value === 'ui' || value === 'api' || value === 'mcp') return value
  if (value === 'internal') return 'internal'
  if (typeof value === 'number') {
    if (value & 1) return 'ui'
    if (value & 2) return 'api'
    if (value & 4) return 'mcp'
  }
  return 'internal'
}

function resolvePipelineValue(value: any, payload: Record<string, any>): any {
  if (Array.isArray(value)) {
    return value.map((entry) => resolvePipelineValue(entry, payload))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        resolvePipelineValue(entry, payload),
      ]),
    )
  }
  if (typeof value !== 'string') return value

  const lookup = (key: string) => {
    return key.split('.').reduce((acc: any, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return acc[part]
      }
      return undefined
    }, payload)
  }

  const withTemplates = value.replace(
    /\$\{(payload|inputs)\.([^}]+)\}/g,
    (match, _prefix, key) => {
      const resolved = lookup(key)
      return resolved === undefined ? match : String(resolved)
    },
  )

  if (withTemplates.includes('$payload.')) {
    if (withTemplates.startsWith('$payload.')) {
      const key = withTemplates.slice('$payload.'.length)
      if (key) {
        const resolved = lookup(key)
        if (resolved !== undefined) return resolved
      }
    }
  }

  return withTemplates
}

export default function PipelineGraphPage({
  pipelineId,
}: {
  pipelineId: string
}) {
  const navigate = useNavigate()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [triggerEvent, setTriggerEvent] = useState('pipeline.ingest')
  const [artifactType, setArtifactType] = useState('any')
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [inputErrors, setInputErrors] = useState<Record<number, string>>({})
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [runInputValues, setRunInputValues] = useState<Record<string, any>>({})
  const [addInputOpen, setAddInputOpen] = useState(false)
  const [newInput, setNewInput] = useState({
    name: '',
    type: 'string',
    required: false,
    exposed: true,
  })

  const { data: capsData } = useQuery({
    queryKey: ['lotus', 'capabilities', 'composer'],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  })

  const { data: automationsData, refetch: refetchAutomations } =
    useQuery<AutomationListResponse>({
      queryKey: ['system', 'automation', 'list'],
      queryFn: () => embeddrApi.system.listAutomations(),
      staleTime: 15_000,
    })

  const actionCaps = useMemo(() => {
    const caps = (capsData?.items || []) as LotusCapability[]
    const allowed = caps.filter((cap) => {
      const slot = String(cap.slot || '')
      if (cap.kind === 'action' || cap.kind === 'feature') return true
      if (cap.kind === 'workflow') return true
      if (slot.startsWith('event.') || slot.startsWith('workflow.')) return true
      if (slot.startsWith('artifact.')) return true
      return false
    })
    return allowed.sort((a, b) =>
      String(a.title || a.id).localeCompare(String(b.title || b.id)),
    )
  }, [capsData])

  useEffect(() => {
    if (actionCaps.length === 0) return
    setSteps((prev) => {
      let changed = false
      const next = prev.map((step) => {
        const cap =
          actionCaps.find((item) => item.id === step.capId) ||
          actionCaps.find((item) => item.data?.action === step.capId)
        if (!cap || cap.id === step.capId) return step
        changed = true
        return { ...step, capId: cap.id }
      })
      return changed ? next : prev
    })
  }, [actionCaps])

  const selectedRule = useMemo(() => {
    return (
      automationsData?.items?.find((item) => item.id === pipelineId) || null
    )
  }, [automationsData, pipelineId])

  useEffect(() => {
    if (!selectedRule) {
      setName('')
      setDescription('')
      setIsActive(true)
      setTriggerEvent('pipeline.ingest')
      setArtifactType('any')
      setSteps([])
      setInputErrors({})
      setSelectedIndex(null)
      return
    }

    setName(selectedRule.name)
    setDescription(selectedRule.description || '')
    setIsActive(selectedRule.is_active)
    setTriggerEvent(selectedRule.trigger_event)
    setArtifactType(
      selectedRule.trigger_conditions?.type_name ||
        selectedRule.trigger_conditions?.type ||
        'any',
    )
    setSteps(
      (selectedRule.actions || []).map((action: any) => ({
        capId: String(action.job_type || ''),
        inputsText: JSON.stringify(action.inputs ?? {}, null, 2),
        ui: action.ui?.position
          ? {
              ...action.ui.position,
              outgoing: action.ui.outgoing || undefined,
            }
          : action.ui?.outgoing
            ? { x: 0, y: 0, outgoing: action.ui.outgoing }
            : undefined,
      })),
    )
    setInputErrors({})
  }, [selectedRule?.id])

  const { data: comfyWorkflows } = usePluginWorkflows()
  const pluginContext = useMemo(
    () => ({ comfyWorkflows: comfyWorkflows || [] }),
    [comfyWorkflows],
  )

  const addStep = () => {
    const defaultCap = actionCaps[0]?.id || ''
    setSteps((prev) => {
      const next = [
        ...prev,
        {
          capId: defaultCap,
          inputsText: '{\n  "artifact_id": "${payload.id}"\n}',
        },
      ]
      setSelectedIndex(next.length - 1)
      return next
    })
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    setSteps((prev) => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, ...patch } : step)),
    )
  }

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, idx) => idx !== index))
    if (selectedIndex === index) {
      setSelectedIndex(null)
    }
  }

  const buildAutomationMetadata = (inputsSchema: Record<string, any>) => {
    const baseMeta = (selectedRule?.metadata_json || {}) as Record<string, any>
    const workflow = { ...(baseMeta.workflow || {}), inputs: inputsSchema }
    return { ...baseMeta, workflow }
  }

  const buildActions = () => {
    const errors: Record<number, string> = {}
    const actions = steps.map((step, idx) => {
      const parsed = parseJson(step.inputsText)
      if (!parsed.ok) {
        errors[idx] = parsed.error
      }
      const cap =
        actionCaps.find((item) => item.id === step.capId) ||
        actionCaps.find((item) => item.data?.action === step.capId)
      const jobType =
        (cap?.data as any)?.job_type || (cap?.data as any)?.action || step.capId
      return {
        plugin_name: cap?.plugin,
        job_type: jobType,
        inputs: parsed.ok ? parsed.value : {},
        ui: step.ui
          ? {
              position: { x: step.ui.x, y: step.ui.y },
              outgoing: step.ui.outgoing || undefined,
            }
          : undefined,
      }
    })
    return { actions, errors }
  }

  const persistAutomation = async (inputsSchema: Record<string, any>) => {
    const { actions, errors } = buildActions()
    if (Object.keys(errors).length > 0) {
      setInputErrors(errors)
      throw new Error('Fix invalid inputs JSON before saving.')
    }
    const trigger_conditions =
      artifactType === 'any' ? {} : { type_name: artifactType }
    return await embeddrApi.system.upsertAutomation({
      id: pipelineId,
      name,
      description: description || null,
      is_active: isActive,
      trigger_event: triggerEvent,
      trigger_conditions,
      actions,
      metadata_json: buildAutomationMetadata(inputsSchema),
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await persistAutomation(pipelineInputsSchema || {})
    },
    onSuccess: () => {
      refetchAutomations()
    },
  })

  const [pipelineInputsSchema, setPipelineInputsSchema] = useState<any>(
    selectedRule?.metadata_json?.workflow?.inputs || {},
  )
  useEffect(() => {
    if (!selectedRule) {
      setPipelineInputsSchema({})
      return
    }
    setPipelineInputsSchema(selectedRule.metadata_json?.workflow?.inputs || {})
  }, [selectedRule?.id, selectedRule?.metadata_json])

  const [inputExposureDraft, setInputExposureDraft] = useState<
    Record<string, string>
  >({})
  useEffect(() => {
    const draft: Record<string, string> = {}
    for (const [key, port] of Object.entries(pipelineInputsSchema || {})) {
      draft[key] = normalizeExposure((port as any).exposure)
    }
    setInputExposureDraft(draft)
  }, [pipelineInputsSchema])

  useEffect(() => {
    if (!runDialogOpen) return
    const initial: Record<string, any> = {}
    for (const [key, port] of Object.entries(
      pipelineInputsSchema as Record<string, any>,
    )) {
      const p = port as Record<string, any>
      initial[key] =
        p.default ??
        (p.type === 'boolean'
          ? false
          : p.type === 'number' || p.type === 'integer'
            ? 0
            : p.type === 'array'
              ? []
              : p.type === 'object'
                ? {}
                : '')
    }
    setRunInputValues(initial)
  }, [runDialogOpen, pipelineInputsSchema])

  const runMutation = useMutation({
    mutationFn: async () => {
      if (steps.length === 0) {
        throw new Error('Add at least one step before running.')
      }
      const errors: Record<number, string> = {}
      const parsedInputs = steps.map((step, idx) => {
        const parsed = parseJson(step.inputsText)
        if (!parsed.ok) {
          errors[idx] = parsed.error
        }
        return parsed
      })
      if (Object.keys(errors).length > 0) {
        setInputErrors(errors)
        throw new Error('Fix invalid inputs JSON before running.')
      }
      const payload = { ...runInputValues }
      const results = []
      for (let idx = 0; idx < steps.length; idx += 1) {
        const step = steps[idx]
        const cap =
          actionCaps.find((item) => item.id === step.capId) ||
          actionCaps.find((item) => item.data?.action === step.capId)
        if (!cap) {
          throw new Error(`Capability not found for step ${idx + 1}`)
        }
        const resolvedInputs = resolvePipelineValue(
          parsedInputs[idx].value ?? {},
          payload,
        )
        const result = await embeddrApi.lotus.invoke(cap.id, resolvedInputs)
        results.push(result)
      }
      return results
    },
    onSuccess: () => {
      toast.success(`Pipeline run queued (${steps.length} steps)`)
    },
    onError: (err: any) => {
      toast.error('Failed to run pipeline: ' + (err?.message || err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await embeddrApi.system.deleteAutomation(pipelineId)
    },
    onSuccess: () => {
      toast.success('Pipeline deleted')
      navigate({ to: '/pipelines' })
    },
    onError: (err: any) => {
      toast.error('Failed to delete pipeline: ' + (err?.message || err))
    },
  })

  const saveExposure = async () => {
    if (!selectedRule) return
    const newInputs: Record<string, any> = {}
    for (const [key, port] of Object.entries(pipelineInputsSchema || {})) {
      newInputs[key] = {
        ...(port as Record<string, any>),
        exposure: inputExposureDraft[key],
      }
    }
    try {
      await persistAutomation(newInputs)
      setPipelineInputsSchema(newInputs)
      refetchAutomations()
      toast.success('Input exposure updated')
    } catch (err: any) {
      toast.error('Failed to update exposure: ' + (err?.message || err))
    }
  }

  const selectedStep = selectedIndex !== null ? steps[selectedIndex] : null
  const selectedCap = selectedStep
    ? actionCaps.find((cap) => cap.id === selectedStep.capId) ||
      actionCaps.find((cap) => cap.data?.action === selectedStep.capId)
    : undefined

  const schemaProps = useMemo(() => {
    return getSchemaProps(selectedCap)
  }, [selectedCap])

  const parsedInputs = useMemo(() => {
    if (!selectedStep) return {}
    const parsed = parseJson(selectedStep.inputsText)
    return parsed.ok ? parsed.value : {}
  }, [selectedStep])

  const updateInputValue = (key: string, value: any) => {
    if (selectedIndex === null) return
    const current = parseJson(steps[selectedIndex]?.inputsText || '{}')
    const next = current.ok ? { ...current.value } : {}
    next[key] = value
    updateStep(selectedIndex, {
      inputsText: JSON.stringify(next, null, 2),
    })
  }

  return (
    <>
      <ResizablePanelGroup className="flex h-full min-h-0 p-2">
        <ResizablePanel
          defaultSize="70%"
          minSize="40%"
          className="flex min-h-0"
        >
          <Card className="flex h-full min-h-0 flex-1 flex-col p-2">
            <div className="flex-1 min-h-0">
              <PipelineGraphEditor
                steps={steps}
                actionCaps={actionCaps}
                onStepChange={updateStep}
                onRemoveStep={removeStep}
                onAddStep={addStep}
                onMoveStep={moveStep}
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
                hideInputsButton
                pipelineInputs={pipelineInputsSchema}
                pluginContext={pluginContext}
              />
            </div>
          </Card>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize="30%"
          minSize="18%"
          maxSize="45%"
          className="flex min-h-0"
        >
          <Card className="flex h-full min-h-0 w-full flex-col">
            <div className="border-b border-muted/60 p-3 space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: '/pipelines' })}
              >
                Back
              </Button>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  Save pipeline
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRunDialogOpen(true)}
                >
                  Run pipeline
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm('Are you sure you want to delete this pipeline?')
                    ) {
                      deleteMutation.mutate()
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
                {selectedCap && (
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedCap.title || selectedCap.id}
                  </Badge>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-4 p-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-20"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={artifactType} onValueChange={setArtifactType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Input Exposure Editor</Label>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setAddInputOpen(true)}
                  >
                    Add Input
                  </Button>
                </div>
                {Object.entries(pipelineInputsSchema).length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No inputs defined.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(pipelineInputsSchema).map(
                      ([key, port]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-32 text-xs">
                            {port.name || key}
                          </span>
                          <select
                            className="border rounded px-1 py-0.5 text-xs"
                            value={inputExposureDraft[key]}
                            onChange={(e) =>
                              setInputExposureDraft((draft) => ({
                                ...draft,
                                [key]: e.target.value,
                              }))
                            }
                          >
                            <option value="ui">ui</option>
                            <option value="api">api</option>
                            <option value="mcp">mcp</option>
                            <option value="internal">internal</option>
                          </select>
                        </div>
                      ),
                    )}
                    <Button size="sm" className="mt-2" onClick={saveExposure}>
                      Save Exposure
                    </Button>
                  </div>
                )}
                <Dialog open={addInputOpen} onOpenChange={setAddInputOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Pipeline Input</DialogTitle>
                    </DialogHeader>
                    <form
                      className="flex flex-col gap-4 py-2"
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (!newInput.name.trim()) {
                          toast.error('Input name is required')
                          return
                        }
                        if (pipelineInputsSchema[newInput.name]) {
                          toast.error('Input name must be unique')
                          return
                        }
                        const newSchema = {
                          ...pipelineInputsSchema,
                          [newInput.name]: {
                            name: newInput.name,
                            type: newInput.type,
                            required: newInput.required,
                            exposure: newInput.exposed ? 'ui' : 'internal',
                          },
                        }
                        try {
                          await persistAutomation(newSchema)
                          setPipelineInputsSchema(newSchema)
                          setNewInput({
                            name: '',
                            type: 'string',
                            required: false,
                            exposed: true,
                          })
                          setAddInputOpen(false)
                          refetchAutomations()
                          toast.success('Input added')
                        } catch (err: any) {
                          toast.error(
                            'Failed to add input: ' + (err?.message || err),
                          )
                        }
                      }}
                    >
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Name
                        </label>
                        <Input
                          value={newInput.name}
                          onChange={(e) =>
                            setNewInput((v) => ({ ...v, name: e.target.value }))
                          }
                          placeholder="input_name"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Type
                        </label>
                        <select
                          className="border rounded px-1 py-0.5 text-xs"
                          value={newInput.type}
                          onChange={(e) =>
                            setNewInput((v) => ({
                              ...v,
                              type: e.target.value,
                            }))
                          }
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="file">File</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newInput.required}
                          onChange={(e) =>
                            setNewInput((ni) => ({
                              ...ni,
                              required: e.target.checked,
                            }))
                          }
                          id="required"
                        />
                        <label htmlFor="required" className="text-sm">
                          Required
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newInput.exposed}
                          onChange={(e) =>
                            setNewInput((ni) => ({
                              ...ni,
                              exposed: e.target.checked,
                            }))
                          }
                          id="exposed"
                        />
                        <label htmlFor="exposed" className="text-sm">
                          Exposed (UI)
                        </label>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setAddInputOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Add</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <div className="text-sm font-medium mt-6">Node inspector</div>
                {selectedStep ? (
                  <div className="space-y-3">
                    {inputErrors[selectedIndex ?? -1] && (
                      <Badge variant="destructive">Invalid JSON</Badge>
                    )}
                    {Object.keys(schemaProps).length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No schema available. Edit JSON directly below.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(schemaProps).map(([key, schema]) => {
                          const typedSchema = schema as any
                          const currentValue = normalizeInputValue(
                            parsedInputs[key],
                            typedSchema,
                          )
                          if (typedSchema.type === 'boolean') {
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between"
                              >
                                <Label className="text-sm">
                                  {typedSchema.title || key}
                                </Label>
                                <Switch
                                  checked={Boolean(currentValue)}
                                  onCheckedChange={(value) =>
                                    updateInputValue(key, value)
                                  }
                                />
                              </div>
                            )
                          }
                          if (
                            typedSchema.type === 'number' ||
                            typedSchema.type === 'integer'
                          ) {
                            return (
                              <div key={key} className="space-y-1">
                                <Label className="text-sm">
                                  {typedSchema.title || key}
                                </Label>
                                <Input
                                  type="number"
                                  value={currentValue ?? ''}
                                  onChange={(event) =>
                                    updateInputValue(
                                      key,
                                      Number(event.target.value),
                                    )
                                  }
                                />
                              </div>
                            )
                          }
                          if (
                            typedSchema.type === 'object' ||
                            typedSchema.type === 'array'
                          ) {
                            return (
                              <div key={key} className="space-y-1">
                                <Label className="text-sm">
                                  {typedSchema.title || key}
                                </Label>
                                <Textarea
                                  value={JSON.stringify(
                                    currentValue ??
                                      (typedSchema.type === 'array' ? [] : {}),
                                    null,
                                    2,
                                  )}
                                  onChange={(event) => {
                                    try {
                                      const parsed = JSON.parse(
                                        event.target.value,
                                      )
                                      updateInputValue(key, parsed)
                                    } catch {
                                      updateInputValue(key, event.target.value)
                                    }
                                  }}
                                  className="min-h-20 font-mono text-[11px]"
                                />
                              </div>
                            )
                          }
                          return (
                            <div key={key} className="space-y-1">
                              <Label className="text-sm">
                                {typedSchema.title || key}
                              </Label>
                              <div className="flex gap-1.5">
                                <Input
                                  value={currentValue ?? ''}
                                  onChange={(event) =>
                                    updateInputValue(key, event.target.value)
                                  }
                                  className="flex-1"
                                />
                                {Object.keys(pipelineInputsSchema || {})
                                  .length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0 w-9 px-0"
                                      >
                                        <span className="text-xs">{`{ }`}</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {Object.keys(pipelineInputsSchema).map(
                                        (vKey) => (
                                          <DropdownMenuItem
                                            key={vKey}
                                            onClick={() =>
                                              updateInputValue(
                                                key,
                                                `\${payload.${vKey}}`,
                                              )
                                            }
                                          >
                                            {vKey}
                                          </DropdownMenuItem>
                                        ),
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm">Raw JSON</Label>
                      <Textarea
                        value={selectedStep.inputsText}
                        onChange={(event) =>
                          updateStep(selectedIndex ?? 0, {
                            inputsText: event.target.value,
                          })
                        }
                        className="min-h-40 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Select a node to edit inputs.
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Run pipeline</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              await runMutation.mutateAsync()
              setRunDialogOpen(false)
            }}
          >
            {Object.entries(pipelineInputsSchema).length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No inputs defined for this pipeline.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(pipelineInputsSchema).map(
                  ([key, port]: [string, any]) => {
                    const exposure = normalizeExposure(port.exposure)
                    const isEditable = exposure !== 'internal'
                    if (!isEditable) {
                      return (
                        <div key={key} className="space-y-1 opacity-60">
                          <Label className="text-sm">
                            {port.label || port.title || port.name || key}{' '}
                            <span className="text-xs text-muted-foreground">
                              (internal)
                            </span>
                          </Label>
                          <Input
                            value={runInputValues[key] ?? ''}
                            disabled
                            readOnly
                          />
                        </div>
                      )
                    }
                    if (port.type === 'boolean') {
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <Label className="text-sm">
                            {port.label || port.title || port.name || key}
                          </Label>
                          <Switch
                            checked={!!runInputValues[key]}
                            onCheckedChange={(v) =>
                              setRunInputValues((vals) => ({
                                ...vals,
                                [key]: v,
                              }))
                            }
                          />
                        </div>
                      )
                    }
                    if (port.type === 'number' || port.type === 'integer') {
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-sm">
                            {port.label || port.title || port.name || key}
                          </Label>
                          <Input
                            type="number"
                            value={runInputValues[key] ?? ''}
                            onChange={(e) =>
                              setRunInputValues((vals) => ({
                                ...vals,
                                [key]: Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                      )
                    }
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-sm">
                          {port.label || port.title || port.name || key}
                        </Label>
                        <Input
                          value={runInputValues[key] ?? ''}
                          onChange={(e) =>
                            setRunInputValues((vals) => ({
                              ...vals,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )
                  },
                )}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setRunDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={runMutation.isPending}>
                Run
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
