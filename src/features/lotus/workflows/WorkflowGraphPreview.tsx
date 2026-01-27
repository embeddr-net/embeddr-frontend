import React, { useMemo } from 'react'
import { Badge } from '@embeddr/react-ui/components/badge'

function extractBindings(value: unknown): string[] {
  if (typeof value !== 'string') return []
  const matches = Array.from(value.matchAll(/\$\{([^}]+)\}/g))
  return matches.map((match) => match[1])
}

type GraphPreviewProps = {
  steps: Array<any>
  capsById: Map<string, any>
  workflowInputs: Record<string, any>
  workflowOutputs: Record<string, any>
  outputBindings: Record<string, string>
}

export function WorkflowGraphPreview({
  steps,
  capsById,
  workflowInputs,
  workflowOutputs,
  outputBindings,
}: GraphPreviewProps) {
  const nodes = useMemo(() => {
    const base = Object.keys(workflowInputs).map((key) => ({
      id: `inputs.${key}`,
      label: `Input: ${key}`,
    }))
    const stepNodes = steps.map((step, index) => ({
      id: `step.${index}`,
      label: `Step ${index + 1}: ${capsById.get(step.capability_id)?.title || step.capability_id}`,
    }))
    const outputNodes = Object.keys(workflowOutputs).map((key) => ({
      id: `outputs.${key}`,
      label: `Output: ${key}`,
    }))
    return [...base, ...stepNodes, ...outputNodes]
  }, [workflowInputs, workflowOutputs, steps, capsById])

  const links = useMemo(() => {
    const edges: Array<{ from: string; to: string; label: string }> = []
    steps.forEach((step, index) => {
      const inputs = step.inputs || {}
      Object.entries(inputs).forEach(([inputKey, value]) => {
        extractBindings(value).forEach((binding) => {
          if (binding.startsWith('inputs.')) {
            edges.push({
              from: binding,
              to: `step.${index}`,
              label: inputKey,
            })
            return
          }
          if (binding.startsWith('steps.')) {
            const parts = binding.split('.')
            const sourceIndex = Number(parts[1])
            if (!Number.isNaN(sourceIndex)) {
              edges.push({
                from: `step.${sourceIndex}`,
                to: `step.${index}`,
                label: inputKey,
              })
            }
          }
        })
      })
    })

    Object.entries(outputBindings || {}).forEach(([outputKey, binding]) => {
      extractBindings(binding).forEach((token) => {
        if (token.startsWith('inputs.') || token.startsWith('steps.')) {
          const source = token.startsWith('inputs.')
            ? token
            : `step.${token.split('.')[1]}`
          edges.push({
            from: source,
            to: `outputs.${outputKey}`,
            label: outputKey,
          })
        }
      })
    })

    return edges
  }, [steps, outputBindings])

  return (
    <div className="rounded-md border border-muted/60 p-3 space-y-3">
      <div className="text-xs font-medium">Graph Preview (beta)</div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-[11px] text-muted-foreground">Nodes</div>
          <div className="flex flex-wrap gap-1">
            {nodes.length === 0 && <Badge variant="secondary">No nodes</Badge>}
            {nodes.map((node) => (
              <Badge key={node.id} variant="outline">
                {node.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] text-muted-foreground">Links</div>
          <div className="space-y-1">
            {links.length === 0 && (
              <Badge variant="secondary">No links yet</Badge>
            )}
            {links.map((edge, index) => (
              <div
                key={`${edge.from}-${edge.to}-${index}`}
                className="text-[10px]"
              >
                <span className="font-mono">{edge.from}</span> →{' '}
                <span className="font-mono">{edge.to}</span>{' '}
                <Badge variant="secondary" className="ml-1">
                  {edge.label}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
