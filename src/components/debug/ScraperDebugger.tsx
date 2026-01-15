import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { scraperApi, type SpiderDefinition } from '@/lib/api/endpoints/scraper'
import { BACKEND_V2_URL } from '@/lib/api/config'
import { useWebSocket } from '@/providers/WebSocketProvider'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Label } from '@embeddr/react-ui/components/label'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Separator } from '@embeddr/react-ui/components/separator'
import {
  Loader2,
  Play,
  Terminal,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Bug,
  RefreshCw,
  FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ScraperDebugger() {
  const {
    data: spiders,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['scraper', 'spiders'],
    queryFn: scraperApi.getSpiders,
    retry: 1,
    refetchInterval: 10000,
  })

  const [selectedSpiderName, setSelectedSpiderName] = useState<string | null>(
    null,
  )
  const selectedSpider = spiders?.find((s) => s.name === selectedSpiderName)

  return (
    <div className="flex flex-col h-full bg-background/95">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Bug className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Scraper Control Plane
            </h2>
            <p className="text-xs text-muted-foreground">
              Orchestrated via Spine Execution
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
            </div>
          ) : !isError ? (
            <Badge
              variant="outline"
              className="border-green-600/50 text-green-600 bg-green-900/10 gap-1"
            >
              <CheckCircle2 className="h-3 w-3" /> Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" /> Offline
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            title="Refresh Spiders"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Spiders List */}
        <div className="w-64 border-r flex flex-col bg-muted/10">
          <div className="p-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Available Spiders
          </div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 p-2">
              {spiders?.map((spider) => (
                <button
                  key={spider.name}
                  onClick={() => setSelectedSpiderName(spider.name)}
                  className={cn(
                    'flex flex-col items-start px-3 py-2 rounded-md transition-colors text-left',
                    selectedSpiderName === spider.name
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-accent text-foreground/80',
                  )}
                >
                  <span className="font-medium text-sm">{spider.name}</span>
                  {spider.default_args &&
                    Object.keys(spider.default_args).length > 0 && (
                      <span className="text-[10px] opacity-60 mt-0.5">
                        Configurable
                      </span>
                    )}
                </button>
              ))}
              {!loading && (!spiders || spiders.length === 0) && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No spiders found. Check scraperd.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {selectedSpider ? (
            <SpiderRunner spider={selectedSpider} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-4">
              <div className="h-24 w-24 rounded-full bg-accent/20 flex items-center justify-center">
                <Play className="h-10 w-10 ml-1" />
              </div>
              <p>Select a spider to configure and run via ExecutionSpine</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SpiderRunner({ spider }: { spider: SpiderDefinition }) {
  // Update defaults
  const getDefaultArgsStr = (s: SpiderDefinition) => {
    if (s.name.includes('fourchan') && !s.default_args) {
      return '{\n  "url": "https://boards.4channel.org/g/thread/100000000"\n}'
    }
    if (s.default_args && Object.keys(s.default_args).length > 0) {
      return JSON.stringify(s.default_args, null, 2)
    }
    return '{}'
  }

  // State for raw JSON mode
  const [jsonArgs, setJsonArgs] = useState<string>(getDefaultArgsStr(spider))

  // State for Form mode (parsed from defaults + jsonArgs on init)
  const [formArgs, setFormArgs] = useState<Record<string, any>>({})
  const [mode, setMode] = useState<'form' | 'json'>(
    spider.metadata?.arguments ? 'form' : 'json',
  )

  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [view, setView] = useState<'status' | 'logs'>('status')

  // Watch for job updates via WebSocket
  const { lastMessage } = useWebSocket()
  const [jobState, setJobState] = useState<any>(null)
  const [logFilename, setLogFilename] = useState<string | null>(null)

  useEffect(() => {
    if (lastMessage && activeJobId) {
      const { type, data } = lastMessage as any
      if (type.startsWith('execution.') && data.id === activeJobId) {
        setJobState(data)

        // Parse logs filename from progress message if available
        // Format: "Spider started | Log: {filename}" or "Crawling... | Log: {filename}"
        if (data.message) {
          // Regex to capture "Log: <filename>" allowing for spaces and pipe
          const logMatch = data.message.match(/\|\s*Log:\s*([\w\-.]+\.log)/i)
          if (logMatch && logMatch[1]) {
            const f = logMatch[1].trim()
            if (f && f !== logFilename) {
              console.log('[ScraperDebugger] Found log file:', f)
              setLogFilename(f)
            }
          }
        }
      }
    }
  }, [lastMessage, activeJobId, logFilename])

  // Reset on selection change
  useEffect(() => {
    setJsonArgs(getDefaultArgsStr(spider))
    // Initialize form defaults
    const defaults: Record<string, any> = { ...spider.default_args }
    if (spider.metadata?.arguments) {
      spider.metadata.arguments.forEach((arg) => {
        if (arg.default !== undefined && defaults[arg.name] === undefined) {
          defaults[arg.name] = arg.default
        }
      })
    }
    setFormArgs(defaults)
    setMode(spider.metadata?.arguments ? 'form' : 'json')
    setActiveJobId(null)
    setJobState(null)
    setLogFilename(null)
    setView('status')
  }, [spider])

  // Submit Job to Spine via /api/v2/executions
  const { mutate: runJob, isPending } = useMutation({
    mutationFn: async () => {
      let finalArgs = {}

      if (mode === 'json') {
        try {
          finalArgs = JSON.parse(jsonArgs)
        } catch (e) {
          throw new Error('Invalid JSON arguments')
        }
      } else {
        finalArgs = formArgs
      }

      const res = await fetch(`${BACKEND_V2_URL}/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plugin_name: 'embeddr-scraper',
          job_type: 'scraper:crawl',
          inputs: {
            spider: spider.name,
            args: finalArgs,
          },
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Spine Job Submitted', {
        description: `Job ID: ${data.id}`,
      })
      setActiveJobId(data.id)
      setJobState(data) // Initial state
    },
    onError: (err) => {
      toast.error('Failed to submit job', { description: err.message })
    },
  })

  return (
    <div className="flex flex-col h-full">
      {/* Configuration Header */}
      <div className="border-b p-4 bg-muted/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-primary/80 uppercase tracking-widest pl-1">
            Spider Configuration
          </label>
          {spider.metadata?.arguments && (
            <div className="flex bg-muted rounded-md p-0.5 text-xs">
              <button
                onClick={() => setMode('form')}
                className={cn(
                  'px-3 py-1 rounded-sm transition-all',
                  mode === 'form'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Form
              </button>
              <button
                onClick={() => setMode('json')}
                className={cn(
                  'px-3 py-1 rounded-sm transition-all',
                  mode === 'json'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                JSON
              </button>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 max-w-2xl">
            {mode === 'json' ? (
              <div>
                <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">
                  Arguments (JSON)
                </Label>
                <div className="relative">
                  <textarea
                    className="w-full font-mono text-xs p-3 rounded-md bg-background border border-primary/20 focus:ring-2 focus:ring-primary/20 outline-none resize-none h-[120px]"
                    value={jsonArgs}
                    onChange={(e) => setJsonArgs(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 bg-card p-4 rounded-md border border-border/50">
                {spider.metadata?.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {spider.metadata.description}
                  </p>
                )}
                {spider.metadata?.arguments?.map((arg) => (
                  <div key={arg.name} className="flex flex-col gap-1.5">
                    <Label
                      htmlFor={arg.name}
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      {arg.label || arg.name}
                      {arg.type === 'string' && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded">
                          STR
                        </span>
                      )}
                    </Label>
                    {arg.description && (
                      <p className="text-xs text-muted-foreground/80 mb-0.5">
                        {arg.description}
                      </p>
                    )}

                    {arg.type === 'select' && arg.options ? (
                      <select
                        id={arg.name}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={formArgs[arg.name] || ''}
                        onChange={(e) =>
                          setFormArgs({
                            ...formArgs,
                            [arg.name]: e.target.value,
                          })
                        }
                      >
                        {arg.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : arg.type === 'boolean' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id={arg.name}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={!!formArgs[arg.name]}
                          onChange={(e) =>
                            setFormArgs({
                              ...formArgs,
                              [arg.name]: e.target.checked,
                            })
                          }
                        />
                        <span className="text-sm">Enabled</span>
                      </div>
                    ) : (
                      <input
                        id={arg.name}
                        type={arg.type === 'int' ? 'number' : 'text'}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={formArgs[arg.name] || ''}
                        onChange={(e) =>
                          setFormArgs({
                            ...formArgs,
                            [arg.name]: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0 pt-6">
            <Button
              onClick={() => runJob()}
              disabled={
                isPending || (jobState && jobState.status === 'running')
              }
              size="lg"
              className="w-32 shadow-lg hover:shadow-xl transition-all"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4 fill-current" />
              )}
              Start Job
            </Button>
            {jobState && (
              <div
                className={cn(
                  'flex items-center gap-2 bg-background border rounded px-2 py-1 text-xs justify-center font-mono',
                  jobState.status === 'running'
                    ? 'border-blue-500/50 text-blue-500'
                    : jobState.status === 'completed'
                      ? 'border-green-500/50 text-green-500'
                      : 'border-red-500/50 text-red-500',
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full animate-pulse',
                    jobState.status === 'running'
                      ? 'bg-blue-500'
                      : jobState.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-red-500',
                  )}
                />
                {jobState.status.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 border-b bg-card">
          <div className="flex items-center gap-4 px-2">
            <div className="text-sm font-medium text-muted-foreground mr-2">
              Execution Monitor{' '}
              {activeJobId && (
                <span className="font-mono text-xs opacity-50 ml-1">
                  #{activeJobId.slice(0, 8)}
                </span>
              )}
            </div>
            {jobState && (
              <>
                <div
                  className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[300px]"
                  title={jobState.message}
                >
                  {jobState.message || 'Initializing...'}
                </div>
              </>
            )}
          </div>

          <div className="flex bg-muted rounded-md p-0.5">
            <button
              onClick={() => setView('status')}
              className={cn(
                'px-3 py-1 text-xs rounded-sm transition-all',
                view === 'status'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'hover:text-foreground text-muted-foreground',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 inline-block mr-1.5" />
              Status
            </button>
            <button
              onClick={() => setView('logs')}
              disabled={!logFilename}
              className={cn(
                'px-3 py-1 text-xs rounded-sm transition-all flex items-center',
                view === 'logs'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'hover:text-foreground text-muted-foreground',
                !logFilename && 'opacity-50 cursor-not-allowed',
              )}
              title={
                logFilename
                  ? 'View live logs'
                  : 'Logs available once job is running'
              }
            >
              <List className="h-3.5 w-3.5 inline-block mr-1.5" />
              Logs
              {logFilename && (
                <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-green-500 block" />
              )}
            </button>
            {/* Debug Info for dev */}
            {activeJobId && !logFilename && jobState?.message && (
              <div className="hidden">{jobState.message}</div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-muted/10">
          {view === 'logs' && logFilename ? (
            <LogViewer filename={logFilename} />
          ) : jobState ? (
            <div className="p-4 space-y-4">
              <Card className="max-w-md mx-auto mt-10">
                <CardHeader>
                  <CardTitle className="text-lg">Job Details</CardTitle>
                  <CardDescription>
                    {jobState.id ? `ID: ${jobState.id}` : 'Job pending...'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Plugin:</span>
                    <span>{jobState.plugin_name}</span>
                    <span className="text-muted-foreground">Type:</span>
                    <span>{jobState.type || jobState.job_type}</span>
                    <span className="text-muted-foreground">Created:</span>
                    <span>
                      {new Date(jobState.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {(jobState.status === 'completed' ||
                    jobState.status === 'failed') && (
                    <div
                      className={cn(
                        'p-2 rounded text-center text-sm font-medium animate-in fade-in zoom-in',
                        jobState.status === 'completed'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-red-500/10 text-red-600',
                      )}
                    >
                      Run {jobState.status}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
              <p>No active job selected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LogViewer({ filename }: { filename: string }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { data: logs } = useQuery({
    queryKey: ['scraper', 'logs', filename],
    queryFn: scraperApi.getLog.bind(null, filename),
    refetchInterval: 1000, // Poll every second for live logs
  })

  // Auto-scroll
  useEffect(() => {
    if (logs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  return (
    <ScrollArea className="h-full bg-black/90 text-green-400 font-mono text-xs">
      <div className="p-4 whitespace-pre-wrap">
        {logs || 'Waiting for logs...'}
        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  )
}
