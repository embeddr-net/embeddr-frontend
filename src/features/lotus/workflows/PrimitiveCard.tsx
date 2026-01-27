import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'

export type PrimitivePort = {
  name: string
  type: string
}

export type PrimitiveDefinition = {
  id: string
  title: string
  description: string
  inputs: PrimitivePort[]
  outputs: PrimitivePort[]
}

type PrimitiveCardProps = {
  primitive: PrimitiveDefinition
  onAdd: () => void
  disabled?: boolean
}

export function PrimitiveCard({
  primitive,
  onAdd,
  disabled,
}: PrimitiveCardProps) {
  return (
    <div className="rounded-md border border-muted/60 p-2 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="text-xs font-medium truncate">{primitive.title}</div>
          <div className="text-[10px] text-muted-foreground max-h-8 overflow-hidden">
            {primitive.description}
          </div>
        </div>
        {disabled && <Badge variant="secondary">not loaded</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground">Inputs</div>
          <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
            {primitive.inputs.length === 0 && (
              <Badge variant="secondary">none</Badge>
            )}
            {primitive.inputs.map((port) => (
              <Badge key={`in-${port.name}`} variant="outline">
                {port.name}:{port.type}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground">Outputs</div>
          <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
            {primitive.outputs.length === 0 && (
              <Badge variant="secondary">none</Badge>
            )}
            {primitive.outputs.map((port) => (
              <Badge key={`out-${port.name}`} variant="outline">
                {port.name}:{port.type}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={onAdd}
        disabled={disabled}
      >
        Add to Flow
      </Button>
    </div>
  )
}
