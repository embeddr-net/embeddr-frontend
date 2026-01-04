import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { useMemo } from 'react'
import { useWorkflow } from '@/hooks/useWorkflows'

interface NodeSelectorProps {
  workflowId: number | null
  value: string | null
  onChange: (value: string) => void
  nodeType?: string | Array<string>
  disabled?: boolean
  label?: string
}

export function NodeSelector({
  workflowId,
  value,
  onChange,
  nodeType,
  disabled,
  label = 'Select a node',
}: NodeSelectorProps) {
  const { data: workflow, isLoading } = useWorkflow(workflowId)

  const nodes = useMemo(() => {
    if (!workflow?.data) return []

    let nodeList: Array<any> = []

    // Handle UI format
    if (workflow.data.nodes && Array.isArray(workflow.data.nodes)) {
      nodeList = workflow.data.nodes.map((n: any) => ({
        id: n.id.toString(),
        type: n.type,
        title: n.title || n.type,
      }))
    }
    // Handle API format
    else {
      nodeList = Object.entries(workflow.data).map(
        ([id, n]: [string, any]) => ({
          id,
          type: n.class_type,
          title: n._meta?.title || n.class_type,
        }),
      )
    }

    if (nodeType) {
      const types = Array.isArray(nodeType) ? nodeType : [nodeType]
      return nodeList.filter((n) => types.includes(n.type))
    }

    return nodeList
  }, [workflow, nodeType])

  return (
    <Select
      value={value || ''}
      onValueChange={onChange}
      disabled={disabled || isLoading || !workflowId}
    >
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {nodes.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            No matching nodes found
          </div>
        ) : (
          nodes.map((node) => (
            <SelectItem key={node.id} value={node.id}>
              {node.title} ({node.id})
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
