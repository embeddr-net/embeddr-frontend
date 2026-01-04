import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { useWorkflows } from '@/hooks/useWorkflows'

interface WorkflowSelectorProps {
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

export function WorkflowSelector({
  value,
  onChange,
  disabled,
}: WorkflowSelectorProps) {
  const { data: workflows, isLoading } = useWorkflows()

  return (
    <Select
      value={value?.toString()}
      onValueChange={(v) => onChange(parseInt(v))}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a workflow" />
      </SelectTrigger>
      <SelectContent>
        {workflows?.map((wf) => (
          <SelectItem key={wf.id} value={wf.id.toString()}>
            {wf.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
