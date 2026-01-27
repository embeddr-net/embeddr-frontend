import React from 'react'
import type { Workflow } from '@/lib/api/endpoints/workflows'
import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { ExternalLink, Play } from 'lucide-react'

export type WorkflowPort = {
  name?: string
  type?: string
  exposure?: number | string
  description?: string
  default?: any
}

type WorkflowRunnerDetailsProps = {
  selectedWorkflow: Workflow | null
  workflowInputs: Record<string, WorkflowPort>
  workflowOutputs: Record<string, WorkflowPort>
  normalizeType: (type?: string) => string
  onRun: () => void
}

export function WorkflowRunnerDetails({
  selectedWorkflow,
  workflowInputs,
  workflowOutputs,
  normalizeType,
  onRun,
}: WorkflowRunnerDetailsProps) {
  return (
    <Card className="col-span-4 md:col-span-3 flex flex-col h-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {selectedWorkflow
              ? selectedWorkflow.metadata_json?.name || selectedWorkflow.name
              : 'Select a workflow'}
          </CardTitle>
          {selectedWorkflow?.metadata_json?.description && (
            <p className="text-xs text-muted-foreground">
              {selectedWorkflow.metadata_json.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/workflows">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Editor
            </Link>
          </Button>
          <Button size="sm" onClick={onRun} disabled={!selectedWorkflow}>
            <Play className="h-4 w-4 mr-1" /> Run
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-2">
          {selectedWorkflow ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-card/50">
                  <h3 className="font-medium mb-3">Inputs</h3>
                  <div className="space-y-2">
                    {Object.entries(workflowInputs).map(([key, port]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm p-2 bg-background rounded-md border"
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-muted-foreground">
                            {key}
                          </span>
                          <span className="font-medium">
                            {port.name || key}
                          </span>
                          {port.description && (
                            <span className="text-xs text-muted-foreground">
                              {port.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {normalizeType(port.type)}
                          </Badge>
                          {port.default !== undefined &&
                            port.default !== '' && (
                              <Badge variant="secondary">default</Badge>
                            )}
                        </div>
                      </div>
                    ))}
                    {Object.keys(workflowInputs).length === 0 && (
                      <div className="text-muted-foreground text-sm italic">
                        No inputs defined
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-card/50">
                  <h3 className="font-medium mb-3">Outputs</h3>
                  <div className="space-y-2">
                    {Object.entries(workflowOutputs).map(([key, port]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm p-2 bg-background rounded-md border"
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-muted-foreground">
                            {key}
                          </span>
                          <span className="font-medium">
                            {port.name || key}
                          </span>
                        </div>
                        <Badge variant="outline">
                          {normalizeType(port.type)}
                        </Badge>
                      </div>
                    ))}
                    {Object.keys(workflowOutputs).length === 0 && (
                      <div className="text-muted-foreground text-sm italic">
                        No outputs defined
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a workflow to view details
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
