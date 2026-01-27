import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@embeddr/react-ui/components/button'
import { Card } from '@embeddr/react-ui/components/card'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Switch } from '@embeddr/react-ui/components/switch'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Separator } from '@embeddr/react-ui/components/separator'
import { embeddrApi } from '@/lib/api/client'
import type { LotusCapability } from '@/lib/api/v2/types'
import {
  PipelineGraphEditor,
  type PipelineStepDraft,
} from '@/features/pipelines/PipelineGraphEditor'

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

const DEFAULT_PAYLOAD_SCHEMA = {
  id: 'Artifact ID',
  uri: 'Artifact URI',
  type_name: 'Artifact Type',
  metadata_json: 'Metadata',
  created_at: 'Timestamp',
}

type StepDraft = PipelineStepDraft

function parseJson(value: string) {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Invalid JSON' }
  }
}

export function PipelineComposer() {
  const navigate = useNavigate()
  const { data: capsData } = useQuery({
    queryKey: ['lotus', 'capabilities', 'composer'],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  })

  const { data: automationsData, refetch: refetchAutomations } = useQuery({
    queryKey: ['system', 'automation', 'list'],
    queryFn: () => embeddrApi.system.listAutomations(),
    staleTime: 15_000,
  })

  const { data: pipelineConfig, refetch: refetchPipeline } = useQuery({
    queryKey: ['system', 'ingestion', 'pipeline'],
    queryFn: () => embeddrApi.system.getIngestionPipeline(),
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

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list')
  const [showSystemDefaults, setShowSystemDefaults] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [triggerEvent, setTriggerEvent] = useState('pipeline.ingest')
  const [artifactType, setArtifactType] = useState('image')
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [inputErrors, setInputErrors] = useState<Record<number, string>>({})

  const selectAutomation = (id: string | null) => {
    setSelectedId(id)
    const rule = automationsData?.items?.find((item) => item.id === id)
    if (!rule) {
      setName('')
      setDescription('')
      setIsActive(true)
      setTriggerEvent('pipeline.ingest')
      setArtifactType('image')
      setSteps([])
      setInputErrors({})
      return
    }

    setName(rule.name)
    setDescription(rule.description || '')
    setIsActive(rule.is_active)
    setTriggerEvent(rule.trigger_event)

    const type = rule.trigger_conditions?.type
    setArtifactType(type || 'any')

    const nextSteps = (rule.actions || []).map((action) => ({
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
    }))
    setSteps(nextSteps)
    setInputErrors({})
  }

  const visibleAutomations = useMemo(() => {
    const items = automationsData?.items || []
    if (showSystemDefaults) return items
    return items.filter((rule) => !rule.name?.startsWith('default.'))
  }, [automationsData, showSystemDefaults])

  const addStep = () => {
    const defaultCap = actionCaps[0]?.id || ''
    setSteps((prev) => [
      ...prev,
      {
        capId: defaultCap,
        inputsText: '{\n  "artifact_id": "${payload.id}"\n}',
      },
    ])
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
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
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
          (cap?.data as any)?.job_type ||
          (cap?.data as any)?.action ||
          step.capId
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

      if (Object.keys(errors).length > 0) {
        setInputErrors(errors)
        throw new Error('Fix invalid inputs JSON before saving.')
      }

      const trigger_conditions =
        artifactType === 'any' ? {} : { type: artifactType }

      return embeddrApi.system.upsertAutomation({
        id: selectedId || undefined,
        name,
        description: description || null,
        is_active: isActive,
        trigger_event: triggerEvent,
        trigger_conditions,
        actions,
      })
    },
    onSuccess: (res) => {
      setSelectedId(res.item.id)
      refetchAutomations()
    },
  })

  const setPipelineMutation = useMutation({
    mutationFn: async (pipelineId?: string | null) => {
      return embeddrApi.system.setIngestionPipeline(pipelineId ?? null)
    },
    onSuccess: () => {
      refetchPipeline()
    },
  })

  const activePipeline = useMemo(() => {
    const pipelineId = pipelineConfig?.pipeline_id
    if (!pipelineId) return null
    return (
      automationsData?.items?.find((item) => item.id === pipelineId) || null
    )
  }, [pipelineConfig, automationsData])

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
      <Card className="p-3 space-y-3">
        <div className="text-xs text-muted-foreground">Automations</div>
        <div className="space-y-2">
          <Button
            variant={selectedId === null ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => selectAutomation(null)}
          >
            New automation
          </Button>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Show system defaults</span>
            <Switch
              checked={showSystemDefaults}
              onCheckedChange={setShowSystemDefaults}
            />
          </div>
          {visibleAutomations.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No automations configured yet.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {visibleAutomations.map((rule) => (
                <Button
                  key={rule.id}
                  variant={selectedId === rule.id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => selectAutomation(rule.id)}
                >
                  {rule.name}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(automationsData?.items || [])
            .filter((rule) => rule.is_active)
            .slice(0, 6)
            .map((rule) => (
              <Badge key={rule.id} variant="secondary" className="text-[10px]">
                {rule.name}
              </Badge>
            ))}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">Automation details</div>
          <div className="flex items-center gap-2 text-xs">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              variant={viewMode === 'graph' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('graph')}
            >
              Graph
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedId}
              onClick={() =>
                selectedId &&
                navigate({
                  to: '/pipelines/$pipelineId',
                  params: { pipelineId: selectedId },
                })
              }
            >
              Full editor
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={activePipeline ? 'default' : 'secondary'}>
            Ingest pipeline: {activePipeline?.name || 'Not set'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedId || setPipelineMutation.isPending}
            onClick={() => setPipelineMutation.mutate(selectedId)}
          >
            Set as ingestion pipeline
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={
              !pipelineConfig?.pipeline_id || setPipelineMutation.isPending
            }
            onClick={() => setPipelineMutation.mutate(null)}
          >
            Clear ingestion pipeline
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Active</Label>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-xs text-muted-foreground">
                {isActive ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Trigger event</Label>
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
            <div className="text-[11px] text-muted-foreground">
              Use “Ingest pipeline (manual)” for the pipeline selected in
              Settings.
            </div>
          </div>
          <div className="space-y-2">
            <Label>Artifact type filter</Label>
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
        </div>

        <Separator />

        {viewMode === 'graph' ? (
          <PipelineGraphEditor
            steps={steps}
            actionCaps={actionCaps}
            onStepChange={updateStep}
            onRemoveStep={removeStep}
            onAddStep={addStep}
            onMoveStep={moveStep}
            pipelineInputs={DEFAULT_PAYLOAD_SCHEMA}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Pipeline nodes</div>
                <div className="text-xs text-muted-foreground">
                  Compose Lotus capabilities as a DAG.
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={addStep}>
                Add node
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="text-xs text-muted-foreground">No nodes yet.</div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card
                    key={`${step.capId}-${index}`}
                    className="p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <Select
                          value={step.capId}
                          onValueChange={(value) =>
                            updateStep(index, { capId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {actionCaps.map((cap) => (
                              <SelectItem key={cap.id} value={cap.id}>
                                {cap.title || cap.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {actionCaps.find((cap) => cap.id === step.capId)
                            ?.plugin || 'plugin'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label>Inputs (JSON)</Label>
                      <Textarea
                        value={step.inputsText}
                        onChange={(e) =>
                          updateStep(index, { inputsText: e.target.value })
                        }
                        className="min-h-24 font-mono text-[11px]"
                      />
                      {inputErrors[index] && (
                        <div className="text-xs text-destructive">
                          {inputErrors[index]}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!name || saveMutation.isPending}
          >
            Save automation
          </Button>
          {saveMutation.isPending && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
      </Card>
    </div>
  )
}
