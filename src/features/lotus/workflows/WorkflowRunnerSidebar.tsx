import React from 'react'
import type { Workflow } from '@/lib/api/endpoints/workflows'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { ScrollArea } from '@embeddr/react-ui/ui'

type WorkflowRunnerSidebarProps = {
  workflows?: Workflow[]
  isLoading: boolean
  selectedId: string | null
  searchValue: string
  onSearchChange: (value: string) => void
  onSelect: (id: string) => void
}

export function WorkflowRunnerSidebar({
  workflows,
  isLoading,
  selectedId,
  searchValue,
  onSearchChange,
  onSelect,
}: WorkflowRunnerSidebarProps) {
  return (
    <Card className="flex-1  h-auto md:h-full  gap-0 shrink-0 flex flex-col overflow-visible min-h-0">
      <CardHeader className="gap-2">
        <CardTitle className="text-base">Workflows</CardTitle>
        <Input
          placeholder="Search workflows"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          Select a workflow to review inputs and run it.
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-1 p-2">
            {isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            )}
            {workflows?.map((workflow) => (
              <Button
                key={workflow.id}
                variant={
                  selectedId === String(workflow.id) ? 'secondary' : 'ghost'
                }
                className="w-full justify-start text-left h-auto py-2"
                onClick={() => onSelect(String(workflow.id))}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-semibold truncate">
                    {workflow.metadata_json?.name || workflow.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {workflow.metadata_json?.workflow?.implementation?.type ||
                      (workflow as any)?.type_name ||
                      'workflow'}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
