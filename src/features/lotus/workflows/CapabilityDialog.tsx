import React, { useEffect, useMemo, useState } from 'react'
import { Badge } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/ui'
import { Textarea } from '@embeddr/react-ui/components/ui'

export type CapabilityPort = {
  name: string
  type?: string
  description?: string
}

type CapabilityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  capabilityId: string
  inputs: CapabilityPort[]
  outputs: CapabilityPort[]
  onAdd: () => void
  onTest?: (inputs: Record<string, any>) => Promise<any>
}

export function CapabilityDialog({
  open,
  onOpenChange,
  title,
  description,
  capabilityId,
  inputs,
  outputs,
  onAdd,
  onTest,
}: CapabilityDialogProps) {
  const defaultInputs = useMemo(() => {
    const seed: Record<string, any> = {}
    inputs.forEach((port) => {
      if (!seed[port.name]) seed[port.name] = ''
    })
    return seed
  }, [inputs])

  const [testInputsJson, setTestInputsJson] = useState('{}')
  const [testOutput, setTestOutput] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTestInputsJson(JSON.stringify(defaultInputs, null, 2))
    setTestOutput(null)
    setTestError(null)
    setIsTesting(false)
  }, [open, capabilityId, defaultInputs])

  const handleTest = async () => {
    if (!onTest) return
    setTestError(null)
    setTestOutput(null)
    let parsed: Record<string, any>
    try {
      parsed = testInputsJson ? JSON.parse(testInputsJson) : {}
    } catch (err) {
      setTestError('Inputs must be valid JSON')
      return
    }
    try {
      setIsTesting(true)
      const result = await onTest(parsed)
      setTestOutput(JSON.stringify(result ?? null, null, 2))
    } catch (err: any) {
      setTestError(err?.message || 'Test failed')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Badge variant="outline" className="font-mono">
              {capabilityId}
            </Badge>
            <Badge variant="secondary">inputs: {inputs.length}</Badge>
            <Badge variant="secondary">outputs: {outputs.length}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground">Inputs</div>
              <div className="space-y-2">
                {inputs.length === 0 && (
                  <div className="text-xs text-muted-foreground">None</div>
                )}
                {inputs.map((port) => (
                  <div
                    key={port.name}
                    className="rounded-md border border-muted/60 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{port.name}</span>
                      <Badge variant="outline">{port.type || 'any'}</Badge>
                    </div>
                    {port.description && (
                      <div className="text-[10px] text-muted-foreground">
                        {port.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground">Outputs</div>
              <div className="space-y-2">
                {outputs.length === 0 && (
                  <div className="text-xs text-muted-foreground">None</div>
                )}
                {outputs.map((port) => (
                  <div
                    key={port.name}
                    className="rounded-md border border-muted/60 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{port.name}</span>
                      <Badge variant="outline">{port.type || 'any'}</Badge>
                    </div>
                    {port.description && (
                      <div className="text-[10px] text-muted-foreground">
                        {port.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] text-muted-foreground">Test Inputs</div>
            <Textarea
              value={testInputsJson}
              onChange={(event) => setTestInputsJson(event.target.value)}
              className="min-h-28 font-mono text-xs"
            />
            {testError && (
              <div className="text-xs text-red-500">{testError}</div>
            )}
            {testOutput && (
              <pre className="max-h-48 overflow-auto rounded-md border border-muted/60 bg-muted/30 p-2 text-[11px]">
                {testOutput}
              </pre>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onTest && (
            <Button variant="outline" onClick={handleTest} disabled={isTesting}>
              {isTesting ? 'Testing...' : 'Test'}
            </Button>
          )}
          <Button onClick={onAdd}>Add to Workflow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
