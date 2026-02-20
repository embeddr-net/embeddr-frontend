import React, { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@embeddr/react-ui/components/ui'
import { Input } from '@embeddr/react-ui/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/ui'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import { Card, CardHeader, CardTitle } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import { Separator } from '@embeddr/react-ui/components/ui'
import { globalEventBus } from '@/lib/eventBus'
import { cn } from '@embeddr/react-ui'
import {
  Loader2,
  Play,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RotateCw,
  XCircle,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import type { Execution, ExecutionEvent } from '@/lib/api/types'
import { embeddrApi } from '@/lib/api/client'
import { useDebounce } from '@/hooks/use-debounce'
import {
  useCreateExecution,
  useExecutionEvents,
  useExecutions,
} from '@/hooks/useExecutions'

const ExecutionQueue = () => {
  const defaultAfter = useMemo(() => {
    const d = new Date()
    d.setHours(d.getHours() - 24)
    return toLocalInputValue(d)
  }, [])

  const [filters, setFilters] = useState({
    status: 'all',
    plugin_name: '',
    type: '',
    query: '',
    created_after: defaultAfter,
    created_before: '',
  })
  const [limit, setLimit] = useState(200)
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const debouncedQuery = useDebounce(filters.query, 300)

  const execFilters = useMemo(
    () => ({
      limit,
      offset,
      status: filters.status !== 'all' ? filters.status : undefined,
      plugin_name: filters.plugin_name || undefined,
      type: filters.type || undefined,
      q: debouncedQuery || undefined,
      created_after: toIsoIfPresent(filters.created_after),
      created_before: toIsoIfPresent(filters.created_before),
    }),
    [
      limit,
      offset,
      filters.status,
      filters.plugin_name,
      filters.type,
      debouncedQuery,
      filters.created_after,
      filters.created_before,
    ],
  )

  const {
    data: executions = [],
    refetch,
    isLoading,
  } = useExecutions(execFilters)
  const queryClient = useQueryClient()
  const { mutateAsync: createExecution } = useCreateExecution()
  const [rootEvents, setRootEvents] = useState<
    Record<string, ExecutionEvent[]>
  >({})
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [rowEvents, setRowEvents] = useState<Record<string, ExecutionEvent[]>>(
    {},
  )
  const selectedExecution = useMemo(
    () => executions.find((ex) => ex.id === selectedId) || null,
    [executions, selectedId],
  )
  const { data: events = [], isLoading: eventsLoading } = useExecutionEvents(
    selectedId,
    { limit: 200, offset: 0 },
  )
  const executionTree = useMemo(
    () => buildExecutionTree(executions),
    [executions],
  )
  const executionMap = useMemo(() => {
    const map = new Map<string, Execution>()
    executions.forEach((ex) => map.set(ex.id, ex))
    return map
  }, [executions])
  const selectedRootId = useMemo(() => {
    if (!selectedExecution) return null
    return findRootId(selectedExecution.id, executionMap)
  }, [selectedExecution, executionMap])

  // WebSocket Handler via Global Event Bus
  useEffect(() => {
    const handleMessage = (msg: { id: string } & any) => {
      // msg is the 'data' payload directly because WebSocketProvider sets msg.data as payload for specific events
      // BUT WAIT: WebSocketProvider emits (msg.type, msg.data)
      const data = msg

      if (!data?.id) return
      const exec = data as Execution
      queryClient.setQueriesData(
        { queryKey: ['executions'] },
        (old: Execution[] | undefined) => {
          if (!old) return old
          const next = [...old]
          const index = next.findIndex((e) => e.id === exec.id)
          const merged = index >= 0 ? { ...next[index], ...exec } : exec
          if (index >= 0) {
            next[index] = merged
          } else if (matchesFilters(merged, execFilters)) {
            next.unshift(merged)
          }
          return next
        },
      )
    }

    // Subscribe to all relevant execution events
    const unsubCreated = globalEventBus.on('execution.created', handleMessage)
    const unsubStarted = globalEventBus.on('execution.started', handleMessage)
    const unsubUpdated = globalEventBus.on('execution.updated', handleMessage)
    const unsubCompleted = globalEventBus.on(
      'execution.completed',
      handleMessage,
    )
    const unsubWaiting = globalEventBus.on('execution.waiting', handleMessage)
    const unsubResumed = globalEventBus.on('execution.resumed', handleMessage)
    const unsubFailed = globalEventBus.on('execution.failed', handleMessage)

    // Also support colon syntax if backend uses it
    const unsubCreatedCol = globalEventBus.on(
      'execution:created',
      handleMessage,
    )
    const unsubStartedCol = globalEventBus.on(
      'execution:started',
      handleMessage,
    )
    const unsubUpdatedCol = globalEventBus.on(
      'execution:updated',
      handleMessage,
    )
    const unsubCompletedCol = globalEventBus.on(
      'execution:completed',
      handleMessage,
    )
    const unsubWaitingCol = globalEventBus.on(
      'execution:waiting',
      handleMessage,
    )
    const unsubResumedCol = globalEventBus.on(
      'execution:resumed',
      handleMessage,
    )
    const unsubFailedCol = globalEventBus.on('execution:failed', handleMessage)

    return () => {
      unsubCreated()
      unsubStarted()
      unsubUpdated()
      unsubCompleted()
      unsubWaiting()
      unsubResumed()
      unsubFailed()
      unsubCreatedCol()
      unsubStartedCol()
      unsubUpdatedCol()
      unsubCompletedCol()
      unsubWaitingCol()
      unsubResumedCol()
      unsubFailedCol()
    }
  }, [execFilters, queryClient])

  useEffect(() => {
    if (!selectedRootId) return
    const subtreeIds = collectSubtreeIds(executionTree, selectedRootId)
    if (subtreeIds.length === 0) return
    let cancelled = false

    const loadEvents = async () => {
      const results = await Promise.all(
        subtreeIds.map(async (id) => {
          try {
            const res = await embeddrApi.executions.events(id, {
              limit: 500,
              offset: 0,
            })
            return [id, res.items || []] as const
          } catch {
            return [id, [] as ExecutionEvent[]] as const
          }
        }),
      )
      if (cancelled) return
      const map: Record<string, ExecutionEvent[]> = {}
      results.forEach(([id, events]) => {
        map[id] = events
      })
      setRootEvents(map)
    }

    loadEvents()
    return () => {
      cancelled = true
    }
  }, [selectedRootId, executionTree])

  // Triggers
  const spawnStressHelper = async (type: string, inputs: any = {}) => {
    await createExecution({
      plugin_name: 'embeddr-stress',
      job_type: type,
      inputs,
    })
  }

  // --- Grouping Logic ---
  const groups = useMemo(() => {
    // Running: Earliest started first (Oldest active job at top)
    const running = executions
      .filter((e) => e.status === 'running')
      .sort(
        (a, b) =>
          new Date(a.started_at || a.created_at).getTime() -
          new Date(b.started_at || b.created_at).getTime(),
      )
    const pending = executions
      .filter((e) => e.status === 'pending')
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    const completed = executions
      .filter((e) => e.status === 'completed')
      .sort(
        (a, b) =>
          new Date(b.finished_at || b.created_at).getTime() -
          new Date(a.finished_at || a.created_at).getTime(),
      )
    const failed = executions
      .filter((e) => ['failed', 'canceled'].includes(e.status))
      .sort(
        (a, b) =>
          new Date(b.finished_at || b.created_at).getTime() -
          new Date(a.finished_at || a.created_at).getTime(),
      )

    return { running, pending, completed, failed }
  }, [executions])

  const toggleRow = async (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
    if (!rowEvents[id]) {
      try {
        const res = await embeddrApi.executions.events(id, {
          limit: 200,
          offset: 0,
        })
        setRowEvents((prev) => ({ ...prev, [id]: res.items || [] }))
      } catch {
        setRowEvents((prev) => ({ ...prev, [id]: [] }))
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <Card className="shrink-0">
        <CardHeader className="flex flex-col gap-1 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Execution Queue</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  spawnStressHelper('stress:sleep', { duration: 5 })
                }
                className="h-8 text-xs"
              >
                <Clock className="w-4 h-4 mr-2" /> Sleep 5s
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => spawnStressHelper('stress:fail')}
                className="h-8 text-xs"
              >
                <AlertTriangle className="w-4 h-4 mr-2" /> Fail
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => spawnStressHelper('stress:spawn', { count: 10 })}
                className="h-8 text-xs"
              >
                <Play className="w-4 h-4 mr-2" /> Swarm 10
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                className="h-8 text-xs"
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-2 text-muted-foreground" />
                <Input
                  placeholder="Search type, plugin, message"
                  value={filters.query}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, query: e.target.value }))
                  }
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Input
                placeholder="Plugin"
                value={filters.plugin_name}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    plugin_name: e.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="lg:col-span-1">
              <Input
                placeholder="Type"
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, type: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="lg:col-span-1">
              <Input
                type="datetime-local"
                value={filters.created_after}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    created_after: e.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="lg:col-span-1">
              <Input
                type="datetime-local"
                value={filters.created_before}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    created_before: e.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Filter className="w-3 h-3" />
            <span>Limit</span>
            <Input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 50)}
              className="w-20 h-7 text-xs"
            />
            <span>Offset</span>
            <Input
              type="number"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value) || 0)}
              className="w-20 h-7 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="h-7 text-xs"
            >
              Apply
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-1 lg:grid-cols-[2fr_1fr]">
        <div className="flex-1 min-w-0 min-h-0">
          <ScrollArea
            className="h-full pr-3 "
            variant="left-border"
            type="always"
          >
            <Accordion
              type="multiple"
              defaultValue={['running', 'pending']}
              className="space-y-1"
            >
              {/* Running Section */}
              <AccordionItem
                value="running"
                className="border rounded-md px-4 bg-background"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="font-semibold">Running</span>
                    <Badge variant="secondary" className="ml-2">
                      {groups.running.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ExecutionTable
                    items={groups.running}
                    emptyMessage={
                      isLoading ? 'Loading...' : 'No active jobs running.'
                    }
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    expandedRows={expandedRows}
                    rowEvents={rowEvents}
                    onToggleRow={toggleRow}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Pending Section */}
              <AccordionItem
                value="pending"
                className="border rounded-md px-4 bg-background"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold">Pending</span>
                    <Badge variant="secondary" className="ml-2">
                      {groups.pending.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ExecutionTable
                    items={groups.pending}
                    emptyMessage={isLoading ? 'Loading...' : 'Queue is empty.'}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    expandedRows={expandedRows}
                    rowEvents={rowEvents}
                    onToggleRow={toggleRow}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Failed/Canceled Section */}
              <AccordionItem
                value="failed"
                className="border rounded-md px-4 bg-background"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="font-semibold">Failed / Canceled</span>
                    <Badge variant="secondary" className="ml-2">
                      {groups.failed.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ExecutionTable
                    items={groups.failed}
                    emptyMessage={isLoading ? 'Loading...' : 'No failed jobs.'}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    expandedRows={expandedRows}
                    rowEvents={rowEvents}
                    onToggleRow={toggleRow}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Completed Section */}
              <AccordionItem
                value="completed"
                className="border rounded-md px-4 bg-background border-b-2!"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="font-semibold">Completed</span>
                    <Badge variant="secondary" className="ml-2">
                      {groups.completed.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ExecutionTable
                    items={groups.completed}
                    emptyMessage={
                      isLoading ? 'Loading...' : 'No completed jobs recorded.'
                    }
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    expandedRows={expandedRows}
                    rowEvents={rowEvents}
                    onToggleRow={toggleRow}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
        </div>

        <div className="flex flex-col gap-2 min-w-0 min-h-0 rounded-md overflow-hidden">
          <ScrollArea
            className="h-full pr-3"
            variant="left-border"
            type="always"
          >
            <div className="h-fit border pr-3 bg-card rounded-md">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Execution Timeline</CardTitle>
              </CardHeader>
              <div className="px-4 pb-4">
                {!selectedExecution ? (
                  <div className="text-sm text-muted-foreground">
                    Select a job to inspect inputs, outputs, and event trace.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <PhoenixTimeline
                      rootId={selectedRootId}
                      executionTree={executionTree}
                      eventsByExecution={rootEvents}
                      onSelect={setSelectedId}
                      selectedId={selectedId}
                    />

                    <Separator />

                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">ID</span>
                      <span className="text-sm font-mono">
                        {selectedExecution.id}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Type</span>
                        <div className="font-medium text-sm">
                          {selectedExecution.type}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Plugin</span>
                        <div className="font-medium text-sm">
                          {selectedExecution.plugin_name}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status</span>
                        <div className="mt-1">
                          <StatusBadge status={selectedExecution.status} />
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Resource</span>
                        <div className="font-medium text-sm">
                          {selectedExecution.resource_class}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <Accordion type="multiple" className="space-y-2">
                      <AccordionItem
                        value="inputs"
                        className="border rounded-md"
                      >
                        <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                          Inputs
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <ScrollArea
                            className="h-40 rounded-md border bg-muted/40"
                            variant="left-border"
                            type="always"
                          >
                            <div className="p-2 pr-4">
                              <JsonBlock
                                value={selectedExecution.inputs || {}}
                                scrollable={false}
                              />
                            </div>
                          </ScrollArea>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem
                        value="outputs"
                        className="border rounded-md"
                      >
                        <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                          Outputs
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <ScrollArea
                            className="h-40 rounded-md border bg-muted/40"
                            variant="left-border"
                            type="always"
                          >
                            <div className="p-2 pr-4">
                              <JsonBlock
                                value={selectedExecution.outputs || {}}
                                scrollable={false}
                              />
                            </div>
                          </ScrollArea>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem
                        value="events"
                        className="border rounded-md"
                      >
                        <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                          Event Trace
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <ScrollArea
                            className="h-64 rounded-md border"
                            variant="left-border"
                            type="always"
                          >
                            <div className="p-2 space-y-2 pr-4">
                              {eventsLoading ? (
                                <div className="text-xs text-muted-foreground">
                                  Loading events...
                                </div>
                              ) : events.length === 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  No events recorded.
                                </div>
                              ) : (
                                events.map((event) => (
                                  <EventRow key={event.id} event={event} />
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

const ExecutionTable = ({
  items,
  emptyMessage,
  selectedId,
  onSelect,
  expandedRows,
  rowEvents,
  onToggleRow,
}: {
  items: Execution[]
  emptyMessage: string
  selectedId: string | null
  onSelect: (id: string) => void
  expandedRows: Record<string, boolean>
  rowEvents: Record<string, ExecutionEvent[]>
  onToggleRow: (id: string) => void
}) => {
  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center italic">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-30">Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Plugin</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((ex) => (
            <React.Fragment key={ex.id}>
              <TableRow
                className={cn(
                  'cursor-pointer',
                  selectedId === ex.id && 'bg-muted/40',
                )}
                onClick={() => onSelect(ex.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleRow(ex.id)
                      }}
                    >
                      {expandedRows[ex.id] ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                    <StatusBadge status={ex.status} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-xs truncate">
                      {ex.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {ex.id.slice(0, 8)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground truncate max-w-35">
                  {ex.plugin_name}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 min-w-22.5 max-w-40">
                    <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          ex.status === 'failed'
                            ? 'bg-destructive'
                            : 'bg-primary',
                        )}
                        style={{ width: `${ex.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {ex.message || `${ex.progress || 0}%`}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {ex.resource_class}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-[11px] text-muted-foreground">
                  <div className="flex flex-col">
                    <span>
                      {new Date(
                        ex.finished_at || ex.started_at || ex.created_at,
                      ).toLocaleTimeString()}
                    </span>
                    {ex.finished_at && ex.started_at && (
                      <span className="text-[10px] opacity-70">
                        {(
                          (new Date(ex.finished_at).getTime() -
                            new Date(ex.started_at).getTime()) /
                          1000
                        ).toFixed(1)}
                        s
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {expandedRows[ex.id] ? (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={6} className="py-2">
                    <div className="text-[11px] text-muted-foreground mb-1">
                      Tool calls
                    </div>
                    <div className="space-y-1">
                      {(rowEvents[ex.id] || [])
                        .filter((event) =>
                          event.event_type.startsWith('tool.call'),
                        )
                        .map((event) => (
                          <ToolEventRow key={event.id} event={event} />
                        ))}
                      {(rowEvents[ex.id] || []).filter((event) =>
                        event.event_type.startsWith('tool.call'),
                      ).length === 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          No tool calls.
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 shadow-none border-0"
        >
          Pending
        </Badge>
      )
    case 'running':
      return (
        <Badge
          variant="default"
          className="bg-blue-500 hover:bg-blue-600 animate-pulse shadow-none border-0"
        >
          Running
        </Badge>
      )
    case 'completed':
      return (
        <Badge
          variant="secondary"
          className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none border-0"
        >
          Done
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="shadow-none border-0">
          Failed
        </Badge>
      )
    case 'canceled':
      return (
        <Badge variant="outline" className="shadow-none">
          Canceled
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="shadow-none">
          {status}
        </Badge>
      )
  }
}

const PhoenixTimeline = ({
  rootId,
  executionTree,
  eventsByExecution,
  onSelect,
  selectedId,
}: {
  rootId: string | null
  executionTree: ExecutionNode[]
  eventsByExecution: Record<string, ExecutionEvent[]>
  onSelect: (id: string) => void
  selectedId: string | null
}) => {
  const rootNode = rootId ? findNode(executionTree, rootId) : executionTree[0]

  if (!rootNode) {
    return (
      <div className="text-xs text-muted-foreground">
        Select a job to view its timeline.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        Root timeline
      </div>
      <div className="rounded-md border p-2 space-y-2">
        <TimelineRow
          node={rootNode}
          depth={0}
          eventsByExecution={eventsByExecution}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      </div>
    </div>
  )
}

const TimelineRow = ({
  node,
  depth,
  eventsByExecution,
  onSelect,
  selectedId,
}: {
  node: ExecutionNode
  depth: number
  eventsByExecution: Record<string, ExecutionEvent[]>
  onSelect: (id: string) => void
  selectedId: string | null
}) => {
  const events = eventsByExecution[node.execution.id] || []
  const toolEvents = events.filter((event) =>
    event.event_type.startsWith('tool.call'),
  )

  return (
    <div className="space-y-1">
      <button
        className={cn(
          'flex w-full items-center justify-between rounded-md px-2 py-1 text-xs',
          selectedId === node.execution.id
            ? 'bg-muted/50'
            : 'hover:bg-muted/30',
        )}
        onClick={() => onSelect(node.execution.id)}
      >
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: depth * 12 }}
        >
          <StatusBadge status={node.execution.status} />
          <div className="min-w-0 text-left">
            <div className="font-medium truncate">{node.execution.type}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {node.execution.plugin_name} • {node.execution.id.slice(0, 8)}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {formatDuration(
            node.execution.started_at,
            node.execution.finished_at,
          )}
        </div>
      </button>

      {toolEvents.length > 0 ? (
        <div className="ml-6 space-y-1">
          {toolEvents.map((event) => (
            <ToolEventRow key={event.id} event={event} />
          ))}
        </div>
      ) : null}

      {node.children.map((child) => (
        <TimelineRow
          key={child.execution.id}
          node={child}
          depth={depth + 1}
          eventsByExecution={eventsByExecution}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  )
}

const ToolEventRow = ({ event }: { event: ExecutionEvent }) => {
  const icon = getToolEventIcon(event.event_type)
  const label = event.message || event.event_type
  const toolName = event.payload?.tool
  const toolArgs = event.payload?.args
  const canReplay =
    event.event_type === 'tool.call.start' && typeof toolName === 'string'

  const replayTool = async () => {
    if (!canReplay) return
    try {
      if (toolName.startsWith('ui:') || toolName.startsWith('ui.')) {
        const resultId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `replay-${Date.now()}`

        await embeddrApi.lotus.dispatch(resultId, 'action', {
          plugin_name: 'core',
          action_name: 'event.emit',
          inputs: {
            event_type: toolName,
            payload: toolArgs ?? {},
            source: 'execution-queue',
          },
        })
        return
      }

      await embeddrApi.lotus.invoke(toolName, toolArgs ?? {})
    } catch (error: any) {
      const msg = String(error?.message || error)
      if (msg.includes('Only action capabilities can be invoked')) {
        const resultId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `replay-${Date.now()}`

        await embeddrApi.lotus.dispatch(resultId, 'action', {
          plugin_name: 'core',
          action_name: 'event.emit',
          inputs: {
            event_type: toolName,
            payload: toolArgs ?? {},
            source: 'execution-queue',
          },
        })
        return
      }

      throw error
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed px-2 py-1 text-[11px]">
      {icon}
      <span className="truncate">{label}</span>
      {canReplay && (
        <Button
          size="sm"
          variant="ghost"
          onClick={replayTool}
          className="h-6 px-2 text-[10px] gap-1"
          title="Replay tool call"
        >
          <RotateCw className="h-3 w-3" />
          Replay
        </Button>
      )}
      <span className="ml-auto text-[10px] text-muted-foreground">
        {new Date(event.created_at).toLocaleTimeString()}
      </span>
    </div>
  )
}

const getToolEventIcon = (eventType: string) => {
  if (eventType === 'tool.call.start') {
    return <Play className="h-3 w-3 text-blue-400" />
  }
  if (eventType === 'tool.call.result') {
    return <CheckCircle2 className="h-3 w-3 text-emerald-400" />
  }
  if (eventType === 'tool.call.error') {
    return <AlertTriangle className="h-3 w-3 text-rose-400" />
  }
  return <Clock className="h-3 w-3 text-muted-foreground" />
}

type ExecutionNode = {
  execution: Execution
  children: ExecutionNode[]
}

const buildExecutionTree = (items: Execution[]): ExecutionNode[] => {
  const nodes = new Map<string, ExecutionNode>()
  items.forEach((ex) => {
    nodes.set(ex.id, { execution: ex, children: [] })
  })

  const roots: ExecutionNode[] = []
  nodes.forEach((node) => {
    const parentId = node.execution.parent_execution_id
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)?.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortNodes = (list: ExecutionNode[]) => {
    list.sort(
      (a, b) =>
        new Date(b.execution.created_at).getTime() -
        new Date(a.execution.created_at).getTime(),
    )
    list.forEach((node) => sortNodes(node.children))
  }

  sortNodes(roots)
  return roots
}

const findRootId = (id: string, map: Map<string, Execution>) => {
  let current = map.get(id)
  while (current?.parent_execution_id && map.has(current.parent_execution_id)) {
    current = map.get(current.parent_execution_id)
  }
  return current?.id || id
}

const findNode = (nodes: ExecutionNode[], id: string): ExecutionNode | null => {
  for (const node of nodes) {
    if (node.execution.id === id) return node
    const child = findNode(node.children, id)
    if (child) return child
  }
  return null
}

const collectSubtreeIds = (nodes: ExecutionNode[], rootId: string) => {
  const root = findNode(nodes, rootId)
  if (!root) return []
  const ids: string[] = []
  const walk = (node: ExecutionNode) => {
    ids.push(node.execution.id)
    node.children.forEach(walk)
  }
  walk(root)
  return ids
}

const formatDuration = (start?: string, end?: string) => {
  if (!start || !end) return '—'
  const duration = (new Date(end).getTime() - new Date(start).getTime()) / 1000
  if (duration < 1) return `${(duration * 1000).toFixed(0)}ms`
  if (duration < 60) return `${duration.toFixed(1)}s`
  return `${(duration / 60).toFixed(1)}m`
}

const EventRow = ({ event }: { event: ExecutionEvent }) => {
  const canReplay =
    event.event_type.startsWith('ui:') || event.event_type.startsWith('ui.')

  const replayEvent = async () => {
    if (!canReplay) return
    const resultId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `replay-${Date.now()}`

    await embeddrApi.lotus.dispatch(resultId, 'action', {
      plugin_name: 'core',
      action_name: 'event.emit',
      inputs: {
        event_type: event.event_type,
        payload: event.payload ?? {},
        source: 'execution-queue',
      },
    })
  }

  const color =
    event.level === 'error'
      ? 'text-destructive'
      : event.level === 'warning'
        ? 'text-yellow-500'
        : 'text-muted-foreground'
  return (
    <div className="flex flex-col gap-1 text-[11px] border-b pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('font-medium truncate', color)}>
            {event.event_type}
          </span>
          {canReplay && (
            <Button
              size="sm"
              variant="ghost"
              onClick={replayEvent}
              className="h-6 px-2 text-[10px] gap-1"
              title="Replay event"
            >
              <RotateCw className="h-3 w-3" />
              Replay
            </Button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {new Date(event.created_at).toLocaleTimeString()}
        </span>
      </div>
      {event.message && (
        <div className="text-xs wrap-break-word break-all whitespace-pre-wrap max-w-full">
          {event.message}
        </div>
      )}
      {event.payload && <KeyValueList value={event.payload} />}
    </div>
  )
}

const JsonBlock = ({
  value,
  scrollable = true,
}: {
  value: Record<string, any> | any
  scrollable?: boolean
}) => {
  return (
    <div
      className={cn(
        'mt-1 rounded-md p-2 text-[11px] min-w-0 max-w-full',
        scrollable && 'bg-muted/40 max-h-40 overflow-auto',
      )}
    >
      <KeyValueList value={value} />
    </div>
  )
}

const KeyValueList = ({ value }: { value: any }) => {
  if (value === null || value === undefined) {
    return <div className="text-muted-foreground">(empty)</div>
  }

  if (typeof value !== 'object') {
    return (
      <div className="wrap-break-word whitespace-pre-wrap">{String(value)}</div>
    )
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value)

  if (entries.length === 0) {
    return <div className="text-muted-foreground">(empty)</div>
  }

  return (
    <div className="space-y-1 min-w-0 max-w-full">
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 min-w-0"
        >
          <div className="text-[10px] uppercase text-muted-foreground truncate">
            {key}
          </div>
          <div className="text-[11px] wrap-break-word break-all whitespace-pre-wrap min-w-0 max-w-full">
            {typeof val === 'object' && val !== null
              ? JSON.stringify(val)
              : String(val)}
          </div>
        </div>
      ))}
    </div>
  )
}

const toLocalInputValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

const toIsoIfPresent = (value: string) => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

const matchesFilters = (execution: Execution, filters: any) => {
  if (filters.status && execution.status !== filters.status) return false
  if (
    filters.plugin_name &&
    !execution.plugin_name.includes(filters.plugin_name)
  )
    return false
  if (filters.type && !execution.type.includes(filters.type)) return false
  if (filters.created_after) {
    const after = new Date(filters.created_after).getTime()
    const created = new Date(execution.created_at).getTime()
    if (!Number.isNaN(after) && created < after) return false
  }
  if (filters.created_before) {
    const before = new Date(filters.created_before).getTime()
    const created = new Date(execution.created_at).getTime()
    if (!Number.isNaN(before) && created > before) return false
  }
  if (filters.q) {
    const q = String(filters.q).toLowerCase()
    const hay =
      `${execution.type} ${execution.plugin_name} ${execution.message || ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

export default ExecutionQueue
