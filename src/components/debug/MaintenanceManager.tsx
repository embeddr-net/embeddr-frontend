import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import type {
  MaintenanceFixTypesResponse,
  MaintenancePruneResponse,
  MaintenanceRunResponse,
  MaintenanceScript,
} from '@/lib/api/types'
import { Button } from '@embeddr/react-ui/components/ui'
import { Checkbox } from '@embeddr/react-ui/components/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@embeddr/react-ui/components/ui'
import {
  Loader2,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  FileType,
  Wrench,
  CheckCircle2,
  ScrollText,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'

interface OrphanItem {
  id: string
  uri: string
  type: string
  metadata: any
  reason: string
}

export const MaintenanceManager = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<
    'orphans' | 'missing' | 'fix_types' | 'scripts'
  >('orphans')
  const queryClient = useQueryClient()
  const [scriptLogs, setScriptLogs] = useState<string[]>([])

  // Queries for Orphans/Missing
  const { data, isLoading, refetch } = useQuery<
    OrphanItem[] | MaintenanceScript[]
  >({
    queryKey: ['maintenance', mode],
    queryFn: () => {
      if (mode === 'orphans') return embeddrApi.maintenance.getOrphans(500)
      if (mode === 'missing') return embeddrApi.maintenance.scanMissing(100)
      if (mode === 'scripts') return embeddrApi.maintenance.listScripts()
      return Promise.resolve([]) // No data fetch for type fixing view
    },
    enabled: mode !== 'fix_types',
  })

  // Safe cast for scripts
  const scripts = mode === 'scripts' ? (data as MaintenanceScript[]) || [] : []
  const orphans = mode !== 'scripts' ? (data as OrphanItem[]) || [] : []

  // Run Script
  const runScriptMutation = useMutation({
    mutationFn: (vars: { name: string; dryRun: boolean }) =>
      embeddrApi.maintenance.runScript(vars.name, vars.dryRun),
    onSuccess: (res: MaintenanceRunResponse, vars) => {
      if (vars.dryRun) {
        toast('Dry Run Complete', {
          description: `Would modify ${res.updated} items`,
        })
      } else {
        toast.success(`Executed ${vars.name}`, {
          description: `Updated ${res.updated} items`,
        })
      }
      setScriptLogs(res.logs || [])
    },
    onError: (err) => {
      toast.error('Failed to run script')
      console.error(err)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => embeddrApi.maintenance.prune(ids),
    onSuccess: (data: MaintenancePruneResponse) => {
      toast.success(`Deleted ${data.deleted} artifacts`)
      setSelectedIds(new Set())
      refetch()
    },
    onError: (err) => {
      toast.error('Failed to prune artifacts')
      console.error(err)
    },
  })

  // Type Fix Mutation
  const fixTypesMutation = useMutation({
    mutationFn: () => embeddrApi.maintenance.fixTypes(20000),
    onSuccess: (data: MaintenanceFixTypesResponse) => {
      toast.success(
        `Type fix complete. Scanned: ${data.scanned}, Updated: ${data.updated}`,
      )
    },
    onError: (err) => {
      toast.error('Failed to fix types')
      console.error(err)
    },
  })

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === orphans.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orphans.map((o) => o.id)))
    }
  }

  const handleDelete = () => {
    if (selectedIds.size === 0) return
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} artifacts? This cannot be undone.`,
      )
    )
      return

    deleteMutation.mutate(Array.from(selectedIds))
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gray-500" />
            System Maintenance
          </h2>
          <div className="flex gap-1 ml-4 bg-muted p-1 rounded-lg">
            <Button
              variant={mode === 'orphans' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('orphans')}
              className="text-xs"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              DB Orphans
            </Button>
            <Button
              variant={mode === 'missing' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('missing')}
              className="text-xs"
            >
              <FileType className="w-3 h-3 mr-1" />
              Missing Files
            </Button>
            <Button
              variant={mode === 'fix_types' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('fix_types')}
              className="text-xs"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Fix Types
            </Button>
            <Button
              variant={mode === 'scripts' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMode('scripts')}
              className="text-xs"
            >
              <ScrollText className="w-3 h-3 mr-1" />
              Scripts
            </Button>
          </div>
        </div>

        {mode !== 'fix_types' && mode !== 'scripts' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCcw
                className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Rescan
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={selectedIds.size === 0 || deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {mode === 'orphans' &&
          'Artifacts listed here have no parent folders or collections. They might have been created by errors or lost during restructuring.'}
        {mode === 'missing' &&
          "Scanning specifically for items where the file on disk cannot be found based on the 'uri' field."}
        {mode === 'fix_types' &&
          'Infers and fixes Artifact Type (image/video) based on file extensions in the URI. Use this if videos are showing up as images.'}
        {mode === 'scripts' &&
          'Execute specialized maintenance scripts for data migration and cleanup.'}
      </p>

      {mode === 'scripts' ? (
        <div className="flex gap-4 h-full overflow-hidden">
          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Script Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scripts.map((script) => (
                  <TableRow key={script.name}>
                    <TableCell className="font-mono text-xs">
                      {script.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {script.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            runScriptMutation.mutate({
                              name: script.name,
                              dryRun: true,
                            })
                          }
                          disabled={runScriptMutation.isPending}
                        >
                          Dry Run
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `Run ${script.name}? This will modify data.`,
                              )
                            ) {
                              runScriptMutation.mutate({
                                name: script.name,
                                dryRun: false,
                              })
                            }
                          }}
                          disabled={runScriptMutation.isPending}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Run
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {scriptLogs.length > 0 && (
            <div className="w-100 border rounded-md flex flex-col">
              <div className="p-2 bg-muted text-xs font-semibold border-b">
                Execution Logs
              </div>
              <ScrollArea className="flex-1 p-2 font-mono text-xs">
                {scriptLogs.map((log, i) => (
                  <div key={i} className="mb-1">
                    {log}
                  </div>
                ))}
              </ScrollArea>
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setScriptLogs([])}
                >
                  Clear Logs
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : mode === 'fix_types' ? (
        <div className="border rounded-md p-8 flex flex-col items-center justify-center gap-4 bg-card">
          <Wrench className="w-12 h-12 text-muted-foreground opacity-20" />
          <div className="text-center max-w-md">
            <h3 className="text-lg font-medium">Auto-Correct Artifact Types</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This process will iterate through all artifacts and update their
              Type (image vs video) based on the file extension found in the
              URI.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supported video extensions: .webm, .mp4, .mkv, .mov, .avi
            </p>
          </div>
          <Button
            onClick={() => fixTypesMutation.mutate()}
            disabled={fixTypesMutation.isPending}
            className="mt-4"
          >
            {fixTypesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fixing...
              </>
            ) : (
              'Run Type Fixer'
            )}
          </Button>
        </div>
      ) : (
        <div className="border rounded-md flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-7.5">
                  <Checkbox
                    checked={
                      orphans.length > 0 && selectedIds.size === orphans.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>URI / Name</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-25">ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && orphans.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No issues found in this batch.
                  </TableCell>
                </TableRow>
              )}
              {orphans.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelection(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-100">
                    <div className="flex flex-col">
                      <span className="font-medium truncate text-xs">
                        {item.uri || 'No URI'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.metadata?.label || item.metadata?.filename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.reason === 'missing_file'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {item.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {item.id.substring(0, 8)}...
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
