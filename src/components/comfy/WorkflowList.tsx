import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { FileJson, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Workflow } from '@/lib/api/endpoints/workflows'
import { cn } from '@/lib/utils'
import { useDeleteWorkflow } from '@/hooks/useWorkflows'

interface WorkflowListProps {
  workflows: Array<Workflow>
  selectedId: number | null
  onSelect: (id: number | null) => void
}

export default function WorkflowList({
  workflows,
  selectedId,
  onSelect,
}: WorkflowListProps) {
  const deleteWorkflow = useDeleteWorkflow()

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this workflow?')) {
      await deleteWorkflow.mutateAsync(id)
      toast.success('Workflow deleted')
      if (selectedId === id) {
        onSelect(null)
      }
    }
  }

  if (workflows.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No workflows found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          className={cn(
            'group flex items-center justify-between p-2 cursor-pointer hover:bg-accent/50 transition-colors',
            selectedId === workflow.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground',
          )}
          onClick={() => onSelect(workflow.id)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <FileJson className="w-4 h-4 shrink-0" />
            <span className="truncate text-sm font-medium">
              {workflow.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 h-6 w-6"
            onClick={(e) => handleDelete(e, workflow.id)}
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  )
}
