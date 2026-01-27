import React from 'react'
import type { Workflow } from '@/lib/api/endpoints/workflows'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { Checkbox } from '@embeddr/react-ui/components/checkbox'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Merge, Plus, Upload } from 'lucide-react'

type WorkflowSidebarProps = {
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
}

export function WorkflowSidebar({
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
}: WorkflowSidebarProps) {
  return (
    <Card className="flex-1 h-auto md:h-full p-0 gap-0 shrink-0 flex flex-col overflow-visible min-h-0 border-muted/60 bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Workflows</CardTitle>
        <div className="flex items-center gap-2">
          {selectedIds.size >= 2 && (
            <Button size="icon" variant="outline" onClick={onCompose}>
              <Merge className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Create workflow</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onCreate('empty')}>
                Empty workflow
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Templates</DropdownMenuLabel>
              {templates ? (
                Object.keys(templates).map((key) => (
                  <DropdownMenuItem key={key} onClick={() => onCreate(key)}>
                    {key}
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Loading templates...
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onImport}>
                <Upload className="mr-2 h-4 w-4" /> Import workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-2">
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search workflows"
          className="mb-2 text-xs"
        />
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2">
            {isLoading && (
              <div className="text-xs text-muted-foreground">Loading...</div>
            )}
            {workflows?.map((workflow) => (
              <div key={workflow.id} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.has(String(workflow.id))}
                  onCheckedChange={() => onToggleSelection(String(workflow.id))}
                />
                <Button
                  variant={
                    selectedId === String(workflow.id) ? 'secondary' : 'ghost'
                  }
                  className="w-full justify-start text-left h-auto px-2"
                  onClick={() => onSelect(String(workflow.id))}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">
                      {workflow.metadata_json.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {workflow.metadata_json.workflow?.implementation?.type ||
                        (workflow as any)?.type_name ||
                        'workflow'}
                    </span>
                  </div>
                </Button>
              </div>
            ))}
            {!isLoading && workflows && workflows.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No workflows found.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
