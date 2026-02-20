import React from 'react'
import type { Workflow } from '@/lib/api/endpoints/workflows'
import type { LotusResultItem } from '../types'
import { Card, CardContent } from '@embeddr/react-ui/components/ui'
import { WorkflowSidebar } from './WorkflowSidebar'
import { WorkflowEditorHeader } from './WorkflowEditorHeader'
import { WorkflowEditorContent } from './WorkflowEditorContent'
import type { PrimitiveDefinition } from './PrimitiveCard'

type WorkflowEditorLayoutProps = {
  workflows?: Workflow[]
  isLoading: boolean
  selectedId: string | null
  selectedIds: Set<string>
  searchValue: string
  templates?: Record<string, any> | null
  onSearchChange: (value: string) => void
  onSelect: (id: string) => void
  onToggleSelection: (id: string) => void
  onCompose: () => void
  onCreate: (template?: string) => void
  onImport: () => void
  selectedWorkflow: Workflow | null
  onDuplicate: () => void
  onDelete: () => void
  onSave: () => void
  onRun: () => void
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

export function WorkflowEditorLayout({
  workflows,
  isLoading,
  selectedId,
  selectedIds,
  searchValue,
  templates,
  onSearchChange,
  onSelect,
  onToggleSelection,
  onCompose,
  onCreate,
  onImport,
  selectedWorkflow,
  onDuplicate,
  onDelete,
  onSave,
  onRun,
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
}: WorkflowEditorLayoutProps) {
  return (
    <div className="p-1 w-full grid grid-cols-4 grid-rows-[auto_1fr] md:grid-rows-[1fr] gap-1 h-full overflow-visible">
      <div className="col-span-4 md:col-span-1 shrink-0 overflow-visible h-auto md:h-full border-none ring-0 shadow-none bg-transparent p-0 min-h-0">
        <WorkflowSidebar
          workflows={workflows}
          isLoading={isLoading}
          selectedId={selectedId}
          selectedIds={selectedIds}
          searchValue={searchValue}
          templates={templates}
          onSearchChange={onSearchChange}
          onSelect={onSelect}
          onToggleSelection={onToggleSelection}
          onCompose={onCompose}
          onCreate={onCreate}
          onImport={onImport}
        />
      </div>
      <Card className="col-span-4 md:col-span-3 flex grow flex-col overflow-hidden h-full border-muted/60 bg-transparent">
        <WorkflowEditorHeader
          selectedWorkflow={selectedWorkflow}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onSave={onSave}
          onRun={onRun}
        />
        <CardContent className="flex-1 overflow-hidden p-3 text-xs">
          <WorkflowEditorContent
            selectedWorkflow={selectedWorkflow}
            draftMeta={draftMeta}
            setDraftMeta={setDraftMeta}
            primitiveLibrary={primitiveLibrary}
            capsById={capsById}
            actionCaps={actionCaps}
            actionSearchValue={actionSearchValue}
            setActionSearchValue={setActionSearchValue}
            artifactTypeOptions={artifactTypeOptions}
            stepOutputs={stepOutputs}
            onRunComfy={onRunComfy}
            onAddStep={onAddStep}
            onAddPort={onAddPort}
            onRemovePort={onRemovePort}
            onUpdatePort={onUpdatePort}
            onUpdateOutputBinding={onUpdateOutputBinding}
            onPromoteToInput={onPromoteToInput}
            onMoveStep={onMoveStep}
            onRemoveStep={onRemoveStep}
            onStepInputChange={onStepInputChange}
            onAddStepInput={onAddStepInput}
            onRemoveStepInput={onRemoveStepInput}
            onTestStep={onTestStep}
            onInvokeCapability={onInvokeCapability}
            getActionInputOptions={getActionInputOptions}
            ensureFlowDraft={ensureFlowDraft}
          />
        </CardContent>
      </Card>
    </div>
  )
}
