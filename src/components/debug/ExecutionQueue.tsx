import React, { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@embeddr/react-ui/components/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Card, CardHeader, CardTitle } from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { globalEventBus } from '@/lib/eventBus'
import { cn } from '@embeddr/react-ui'
import {
  Loader2,
  Play,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { BASE_URL } from '@/lib/api'

// --- Types ---
interface Execution {
  id: string
  type: string
  plugin_name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled'
  priority: number
  progress: number
  message?: string
  created_at: string
  started_at?: string
  finished_at?: string
  resource_class: string
}

// --- API ---
const fetchExecutions = async (limit = 50): Promise<Execution[]> => {
  // Fetch specific statuses to ensure we don't miss active jobs that might be older than the global limit
  // Parallel fetch: Running (Important), Pending (Important), and Recent History (Context)
  const [running, pending, history] = await Promise.all([
    fetch(BASE_URL + '/api/v2/executions?status=running&limit=100').then((r) =>
      r.ok ? r.json() : [],
    ),
    fetch(BASE_URL + '/api/v2/executions?status=pending&limit=100').then((r) =>
      r.ok ? r.json() : [],
    ),
    fetch(BASE_URL + '/api/v2/executions?limit=' + limit).then((r) =>
      r.ok ? r.json() : [],
    ),
  ])

  // Merge and deduplicate by ID
  const combined = [...running, ...pending, ...history]
  const unique = new Map<string, Execution>()
  combined.forEach((ex) => unique.set(ex.id, ex))

  return Array.from(unique.values())
}

const ExecutionQueue = () => {
  const [executions, setExecutions] = useState<Execution[]>([])

  // Initial fetch
  const { data: initialData, refetch } = useQuery({
    queryKey: ['executions'],
    queryFn: () => fetchExecutions(100),
  })

  // Sync state with React Query initially
  useEffect(() => {
    if (initialData) {
      setExecutions(initialData)
    }
  }, [initialData])

  // WebSocket Handler via Global Event Bus
  useEffect(() => {
    const handleMessage = (msg: { id: string } & any) => {
      // msg is the 'data' payload directly because WebSocketProvider sets msg.data as payload for specific events
      // BUT WAIT: WebSocketProvider emits (msg.type, msg.data)
      const data = msg

      setExecutions((prev) => {
        const index = prev.findIndex((e) => e.id === data.id)

        // 1. New Job
        if (index === -1) {
          // Optimistically add if it looks like a valid execution object
          if (data.status && data.plugin_name && data.type) {
            return [data as Execution, ...prev].slice(0, 200)
          }
          return prev
        }

        // 2. Existing Job Update
        const newArr = [...prev]
        newArr[index] = { ...newArr[index], ...data }
        return newArr
      })
    }

    // Subscribe to all relevant execution events
    const unsubCreated = globalEventBus.on('execution.created', handleMessage)
    const unsubStarted = globalEventBus.on('execution.started', handleMessage)
    const unsubUpdated = globalEventBus.on('execution.updated', handleMessage)
    const unsubCompleted = globalEventBus.on(
      'execution.completed',
      handleMessage,
    )

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

    return () => {
      unsubCreated()
      unsubStarted()
      unsubUpdated()
      unsubCompleted()
      unsubCreatedCol()
      unsubStartedCol()
      unsubUpdatedCol()
      unsubCompletedCol()
    }
  }, [])

  // Triggers
  const spawnStressHelper = async (type: string, inputs: any = {}) => {
    try {
      await fetch(BASE_URL + '/api/v2/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plugin_name: 'embeddr-stress',
          job_type: type,
          inputs,
        }),
      })
    } catch (e) {
      console.error(e)
    }
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

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Execution Queue</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => spawnStressHelper('stress:sleep', { duration: 5 })}
            >
              <Clock className="w-4 h-4 mr-2" /> Sleep 5s
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => spawnStressHelper('stress:fail')}
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Fail
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => spawnStressHelper('stress:spawn', { count: 10 })}
            >
              <Play className="w-4 h-4 mr-2" /> Swarm 10
            </Button>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 overflow-auto pr-2">
        <Accordion
          type="multiple"
          defaultValue={['running', 'pending']}
          className="space-y-4"
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
                emptyMessage="No active jobs running."
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
                emptyMessage="Queue is empty."
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
                emptyMessage="No failed jobs."
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
                emptyMessage="No completed jobs recorded."
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}

const ExecutionTable = ({
  items,
  emptyMessage,
}: {
  items: Execution[]
  emptyMessage: string
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
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Plugin</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((ex) => (
            <TableRow key={ex.id}>
              <TableCell>
                <StatusBadge status={ex.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{ex.type}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {ex.id.slice(0, 8)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {ex.plugin_name}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 min-w-[100px] max-w-[200px]">
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
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
                  <span
                    className="text-[10px] text-muted-foreground truncate"
                    title={ex.message}
                  >
                    {ex.message || `${ex.progress || 0}%`}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {ex.resource_class}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
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

export default ExecutionQueue
