import React, { useMemo, useState } from 'react'
import type { Workflow } from '@/lib/api/endpoints/workflows'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Separator } from '@embeddr/react-ui/components/separator'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import type { LotusResultItem } from '../types'
import { type PrimitiveDefinition } from './PrimitiveCard'
import { CapabilityDialog, type CapabilityPort } from './CapabilityDialog'
import { WorkflowGraphPreview } from './WorkflowGraphPreview'

type EditorContentProps = {
  selectedWorkflow: Workflow | null
  draftMeta: any | null
  setDraftMeta: (next: any) => void
  primitiveLibrary: PrimitiveDefinition[]
  capsById: Map<string, LotusResultItem>
  actionCaps: LotusResultItem[]
  actionSearchValue: string
  setActionSearchValue: (value: string) => void
  artifactTypeOptions: string[]
  stepOutputs: Record<number, any>
  onRunComfy: () => void
  onAddStep: (capabilityId: string) => void
  onAddPort: (kind: 'inputs' | 'outputs') => void
  onRemovePort: (kind: 'inputs' | 'outputs', key: string) => void
  onUpdatePort: (
    kind: 'inputs' | 'outputs',
    key: string,
    updates: Record<string, any>,
  ) => void
  onUpdateOutputBinding: (key: string, value: string) => void
  onPromoteToInput: (index: number, key: string) => void
  onMoveStep: (index: number, direction: 'up' | 'down') => void
  onRemoveStep: (index: number) => void
  onStepInputChange: (index: number, key: string, value: string) => void
  onAddStepInput: (index: number) => void
  onRemoveStepInput: (index: number, key: string) => void
  onTestStep: (index: number) => void
  onInvokeCapability: (
    capId: string,
    inputs: Record<string, any>,
  ) => Promise<any>
  getActionInputOptions: (
    capId: string,
  ) => Array<{ key: string; label: string; type: string }>
  ensureFlowDraft: (meta: any) => any
}

export function WorkflowEditorContent({
  selectedWorkflow,
  draftMeta,
  setDraftMeta,
  primitiveLibrary,
  capsById,
  actionCaps,
  actionSearchValue,
  setActionSearchValue,
  artifactTypeOptions,
  stepOutputs,
  onRunComfy,
  onAddStep,
  onAddPort,
  onRemovePort,
  onUpdatePort,
  onUpdateOutputBinding,
  onPromoteToInput,
  onMoveStep,
  onRemoveStep,
  onStepInputChange,
  onAddStepInput,
  onRemoveStepInput,
  onTestStep,
  onInvokeCapability,
  getActionInputOptions,
  ensureFlowDraft,
}: EditorContentProps) {
  const [selectedCapability, setSelectedCapability] = useState<{
    id: string
    title: string
    description?: string
    inputs: CapabilityPort[]
    outputs: CapabilityPort[]
  } | null>(null)

  const actionOutputOptions = useMemo(() => {
    const map = new Map<string, CapabilityPort[]>()
    capsById.forEach((cap) => {
      const schema = cap?.data?.output?.schema as
        | { properties?: Record<string, any> }
        | undefined
      const props = schema?.properties || {}
      const outputs = Object.entries(props).map(([key, meta]) => ({
        name: key,
        type: meta?.type || 'any',
        description: meta?.title || meta?.description,
      }))
      map.set(cap.id, outputs)
    })
    return map
  }, [capsById])

  const openCapabilityDialog = (capability: {
    id: string
    title: string
    description?: string
    inputs: CapabilityPort[]
    outputs: CapabilityPort[]
  }) => {
    setSelectedCapability(capability)
  }

  const handleDialogAdd = () => {
    if (!selectedCapability) return
    onAddStep(selectedCapability.id)
    setSelectedCapability(null)
  }

  const handleDialogTest = async (inputs: Record<string, any>) => {
    if (!selectedCapability) return null
    return onInvokeCapability(selectedCapability.id, inputs)
  }

  return (
    <ScrollArea className="h-full pr-2">
      {!selectedWorkflow && (
        <div className="text-muted-foreground">Select a workflow to edit.</div>
      )}
      {selectedWorkflow && draftMeta && (
        <>
          {!draftMeta.workflow && (
            <div className="rounded-md border border-muted/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
              This workflow is provided by a plugin interface. Input/output
              editing is read-only until it is migrated to the workflow schema.
            </div>
          )}
          {!draftMeta.workflow && draftMeta.interface && (
            <div className="rounded-md border border-muted/60 bg-card/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">ComfyUI Workflow</div>
                <Badge variant="outline">interface</Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="text-[11px] text-muted-foreground">
                  Inputs: {draftMeta.interface?.exposed_inputs?.length || 0}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Outputs: {draftMeta.interface?.exposed_outputs?.length || 0}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Payload: {draftMeta.payload ? 'yes' : 'no'}
                </div>
              </div>
              {draftMeta.interface?.exposed_inputs?.length ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-muted-foreground">
                    Exposed Inputs
                  </div>
                  {draftMeta.interface.exposed_inputs.map(
                    (inp: any, idx: number) => (
                      <div
                        key={`${inp.label || inp.port}-${idx}`}
                        className="rounded-md border border-muted/60 p-2 text-[11px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {inp.label || `${inp.node}_${inp.port}`}
                          </span>
                          <Badge variant="secondary">{inp.type || 'any'}</Badge>
                        </div>
                        {inp.description && (
                          <div className="text-[10px] text-muted-foreground">
                            {inp.description}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">
                  No exposed inputs detected for this workflow.
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={onRunComfy}>
                  Run Comfy Workflow
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-[11px] text-muted-foreground">Name</span>
              <Input
                value={draftMeta.name || ''}
                onChange={(event) =>
                  setDraftMeta({
                    ...draftMeta,
                    name: event.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] text-muted-foreground">
                Description
              </span>
              <Input
                value={draftMeta.description || ''}
                onChange={(event) =>
                  setDraftMeta({
                    ...draftMeta,
                    description: event.target.value,
                  })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Primitives</span>
                  <Badge variant="outline">{primitiveLibrary.length}</Badge>
                </div>
                <div className="space-y-1">
                  {primitiveLibrary.map((primitive) => {
                    const isLoaded = capsById.has(primitive.id)
                    return (
                      <Button
                        key={primitive.id}
                        variant="ghost"
                        className="w-full justify-between text-left h-auto px-2"
                        onClick={() =>
                          openCapabilityDialog({
                            id: primitive.id,
                            title: primitive.title,
                            description: primitive.description,
                            inputs: primitive.inputs,
                            outputs: primitive.outputs,
                          })
                        }
                      >
                        <span className="text-xs font-medium">
                          {primitive.title}
                        </span>
                        {!isLoaded && (
                          <Badge variant="secondary">not loaded</Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Action Library</span>
                <Badge variant="outline">{actionCaps.length}</Badge>
              </div>
              <Input
                value={actionSearchValue}
                onChange={(event) => setActionSearchValue(event.target.value)}
                placeholder="Search actions"
                className="text-xs"
              />
              <ScrollArea className="h-80">
                <div className="space-y-2 pr-2">
                  {actionCaps.map((cap) => (
                    <div
                      key={cap.id}
                      className="rounded-md border border-muted/60 p-2"
                    >
                      <div className="text-xs font-medium">
                        {cap.title || cap.id}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {cap.description || cap.id}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() =>
                          openCapabilityDialog({
                            id: cap.id,
                            title: cap.title || cap.id,
                            description: cap.description,
                            inputs: getActionInputOptions(cap.id).map(
                              (opt) => ({
                                name: opt.key,
                                type: opt.type,
                                description: opt.label,
                              }),
                            ),
                            outputs: actionOutputOptions.get(cap.id) || [],
                          })
                        }
                        disabled={!draftMeta}
                      >
                        Preview & Add
                      </Button>
                    </div>
                  ))}
                  {actionCaps.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      No Lotus actions found.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-muted/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Workflow Ports</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddPort('inputs')}
                    >
                      Add input
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddPort('outputs')}
                    >
                      Add output
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="text-[11px] text-muted-foreground">
                      Inputs
                    </div>
                    {Object.entries(draftMeta.workflow?.inputs || {}).map(
                      ([key, port]) => (
                        <div
                          key={key}
                          className="rounded-md border border-muted/60 p-2 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={(port as any).name || key}
                              onChange={(event) =>
                                onUpdatePort('inputs', key, {
                                  name: event.target.value,
                                })
                              }
                              className="text-xs"
                            />
                            <Select
                              value={(port as any).type || 'text'}
                              onValueChange={(value) =>
                                onUpdatePort('inputs', key, {
                                  type: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-35 text-xs">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {artifactTypeOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onRemovePort('inputs', key)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ),
                    )}
                    {Object.keys(draftMeta.workflow?.inputs || {}).length ===
                      0 && (
                      <div className="text-xs text-muted-foreground">
                        No workflow inputs defined.
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] text-muted-foreground">
                      Outputs
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Bind outputs to a step result (stored for composition).
                    </div>
                    {Object.entries(draftMeta.workflow?.outputs || {}).map(
                      ([key, port]) => (
                        <div
                          key={key}
                          className="rounded-md border border-muted/60 p-2 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={(port as any).name || key}
                              onChange={(event) =>
                                onUpdatePort('outputs', key, {
                                  name: event.target.value,
                                })
                              }
                              className="text-xs"
                            />
                            <Select
                              value={(port as any).type || 'image'}
                              onValueChange={(value) =>
                                onUpdatePort('outputs', key, {
                                  type: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-35 text-xs">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {artifactTypeOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onRemovePort('outputs', key)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <Input
                            value={
                              draftMeta.workflow?.output_bindings?.[key] || ''
                            }
                            onChange={(event) =>
                              onUpdateOutputBinding(key, event.target.value)
                            }
                            placeholder="binding (e.g. ${'{'}steps.0.image_id${'}'})"
                            className="text-xs"
                          />
                        </div>
                      ),
                    )}
                    {Object.keys(draftMeta.workflow?.outputs || {}).length ===
                      0 && (
                      <div className="text-xs text-muted-foreground">
                        No workflow outputs defined.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Flow</span>
                <Badge variant="outline">
                  {draftMeta.workflow?.implementation?.payload?.steps?.length ||
                    0}
                </Badge>
              </div>
              {!draftMeta.workflow && (
                <Button
                  variant="outline"
                  onClick={() => setDraftMeta(ensureFlowDraft(draftMeta))}
                >
                  Convert to Flow
                </Button>
              )}
              {draftMeta.workflow && (
                <div className="space-y-2">
                  <WorkflowGraphPreview
                    steps={
                      draftMeta.workflow?.implementation?.payload?.steps || []
                    }
                    capsById={capsById}
                    workflowInputs={draftMeta.workflow?.inputs || {}}
                    workflowOutputs={draftMeta.workflow?.outputs || {}}
                    outputBindings={draftMeta.workflow?.output_bindings || {}}
                  />
                  {(
                    draftMeta.workflow.implementation?.payload?.steps || []
                  ).map((step: any, index: number) => {
                    const cap = capsById.get(step.capability_id)
                    const capPlugin = (cap as any)?.plugin
                    const actionInputs = getActionInputOptions(
                      step.capability_id,
                    )
                    const workflowInputs = Object.keys(
                      draftMeta.workflow?.inputs || {},
                    )
                    const previousOutputs = Array.from(
                      { length: index },
                      (_, i) =>
                        Object.keys(stepOutputs[i] || {}).map((k) => ({
                          key: `steps.${i}.${k}`,
                          label: `Step ${i + 1}: ${k}`,
                        })),
                    ).flat()
                    return (
                      <div
                        key={`${step.capability_id}-${index}`}
                        className="rounded-md border border-muted/60 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-muted-foreground">
                              Step {index + 1}
                            </div>
                            <div className="text-sm font-medium">
                              {cap?.title || step.capability_id}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {capPlugin && (
                                <Badge variant="outline">{capPlugin}</Badge>
                              )}
                              <span className="font-mono">
                                {step.capability_id}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onMoveStep(index, 'up')}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onMoveStep(index, 'down')}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onRemoveStep(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(step.inputs || {}).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="grid gap-2 md:grid-cols-2"
                              >
                                <Select
                                  value={key}
                                  onValueChange={(nextKey) => {
                                    const next = JSON.parse(
                                      JSON.stringify(draftMeta),
                                    )
                                    const inputs =
                                      next.workflow.implementation.payload
                                        .steps[index].inputs || {}
                                    delete inputs[key]
                                    inputs[nextKey] = value
                                    next.workflow.implementation.payload.steps[
                                      index
                                    ].inputs = inputs
                                    setDraftMeta(next)
                                  }}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Action input" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {actionInputs.map((opt) => (
                                      <SelectItem key={opt.key} value={opt.key}>
                                        {opt.label} ({opt.type})
                                      </SelectItem>
                                    ))}
                                    {actionInputs.length === 0 && (
                                      <SelectItem value={key}>{key}</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                <div className="flex gap-2">
                                  <Input
                                    value={String(value ?? '')}
                                    onChange={(event) =>
                                      onStepInputChange(
                                        index,
                                        key,
                                        event.target.value,
                                      )
                                    }
                                    className="text-xs"
                                  />
                                  <Select
                                    onValueChange={(picked) =>
                                      onStepInputChange(
                                        index,
                                        key,
                                        `\${'{'}${picked}\${'}'}`,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-22.5 text-xs">
                                      <SelectValue placeholder="Bind" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {workflowInputs.map((port) => (
                                        <SelectItem
                                          key={`inputs.${port}`}
                                          value={`inputs.${port}`}
                                        >
                                          inputs.{port}
                                        </SelectItem>
                                      ))}
                                      {previousOutputs.map((opt) => (
                                        <SelectItem
                                          key={opt.key}
                                          value={opt.key}
                                        >
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() =>
                                      onRemoveStepInput(index, key)
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onPromoteToInput(index, key)}
                                    title="Promote to workflow input"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ),
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddStepInput(index)}
                          >
                            Add input mapping
                          </Button>
                          <div className="text-[10px] text-muted-foreground">
                            Use ${'{inputs.name}'} or ${'{steps.0.output}'} in
                            values.
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onTestStep(index)}
                            >
                              Test Step
                            </Button>
                            {stepOutputs[index] && (
                              <span className="text-[10px] text-muted-foreground">
                                Output captured
                              </span>
                            )}
                          </div>
                          {stepOutputs[index] && (
                            <div className="rounded-md border border-muted/60 bg-muted/40 p-2 text-[10px] font-mono whitespace-pre-wrap">
                              {JSON.stringify(stepOutputs[index], null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {(draftMeta.workflow.implementation?.payload?.steps || [])
                    .length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      Add actions from the library to build a flow.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {selectedCapability && (
        <CapabilityDialog
          open={!!selectedCapability}
          onOpenChange={(open) => {
            if (!open) setSelectedCapability(null)
          }}
          title={selectedCapability.title}
          description={selectedCapability.description}
          capabilityId={selectedCapability.id}
          inputs={selectedCapability.inputs}
          outputs={selectedCapability.outputs}
          onAdd={handleDialogAdd}
          onTest={handleDialogTest}
        />
      )}
    </ScrollArea>
  )
}
