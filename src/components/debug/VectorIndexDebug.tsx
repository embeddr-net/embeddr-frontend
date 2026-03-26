import React from 'react'
import { Button } from '@embeddr/react-ui/ui'
import { Card } from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import { Checkbox } from '@embeddr/react-ui/ui'
import { Separator } from '@embeddr/react-ui/ui'
import { RefreshCcw, Database, AlertTriangle } from 'lucide-react'
import { embeddrApi } from '@/lib/api/client'

const DEFAULT_CONFIG = {
  backend: 'db',
  chroma_mode: 'http',
  chroma_host: 'localhost',
  chroma_port: 8000,
  chroma_path: './chroma',
  chroma_collection_prefix: 'embeddr_',
  log_search: false,
}

type VectorIndexConfig = typeof DEFAULT_CONFIG

type StatusResponse = {
  ok: boolean
  active?: string
  available?: string[]
  embeddings?: {
    total?: number
    embedding_table?: number
    feature_ref?: number
  }
}

type StatsResponse = {
  ok: boolean
  source?: string
  total?: number
  sources?: {
    embedding_table?: number
    feature_ref?: number
  }
}

export const VectorIndexDebug = () => {
  const [config, setConfig] = React.useState<VectorIndexConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = React.useState<StatusResponse | null>(null)
  const [stats, setStats] = React.useState<StatsResponse | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [confirmReindex, setConfirmReindex] = React.useState(false)
  const [reindexing, setReindexing] = React.useState(false)
  const [reindexResult, setReindexResult] = React.useState<any>(null)

  const loadConfig = React.useCallback(async () => {
    const data = await embeddrApi.lotus.invoke('embeddr-core.config.get', {
      plugin_name: 'embeddr-vector-index',
      config_id: 'embeddr-vector-index.config',
      scope: 'global',
    })
    const value = (data as any)?.value ?? {}
    setConfig({ ...DEFAULT_CONFIG, ...value })
  }, [])

  const loadStatus = React.useCallback(async () => {
    const data = await embeddrApi.lotus.invoke(
      'embeddr-vector-index.status',
      {},
    )
    setStatus(data as StatusResponse)
  }, [])

  const loadStats = React.useCallback(async () => {
    const data = await embeddrApi.lotus.invoke('embeddr-vector-index.stats', {
      source: 'auto',
      group_by: ['model', 'space'],
    })
    setStats(data as StatsResponse)
  }, [])

  const refreshAll = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadConfig(), loadStatus(), loadStats()])
    } catch (err: any) {
      setError(err?.message || 'Failed to load vector index state')
    } finally {
      setLoading(false)
    }
  }, [loadConfig, loadStatus, loadStats])

  React.useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const saveConfig = async () => {
    setError(null)
    try {
      await embeddrApi.lotus.invoke('embeddr-core.config.set', {
        plugin_name: 'embeddr-vector-index',
        config_id: 'embeddr-vector-index.config',
        scope: 'global',
        value: config,
      })
      await loadStatus()
    } catch (err: any) {
      setError(err?.message || 'Failed to save config')
    }
  }

  const runReindex = async () => {
    if (!confirmReindex) {
      setError('Confirm reindex before running.')
      return
    }
    setReindexing(true)
    setError(null)
    try {
      const result = await embeddrApi.lotus.invoke(
        'embeddr-vector-index.reindex',
        {
          confirm: true,
        },
      )
      setReindexResult(result)
      if ((result as any)?.ok === false) {
        setError((result as any)?.error || 'Reindex failed')
      }
      await loadStatus()
      await loadStats()
    } catch (err: any) {
      setError(err?.message || 'Reindex failed')
    } finally {
      setReindexing(false)
    }
  }

  const availableBackends = status?.available ?? []
  const backendAvailable = availableBackends.includes(config.backend)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Vector Index Debug</div>
            <div className="text-xs text-muted-foreground">
              Switch backend, inspect counts, and reindex quickly.
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={refreshAll} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs p-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Status</span>
            <div className="flex items-center gap-2">
              {!backendAvailable && (
                <Badge variant="destructive" className="text-xs">
                  Missing backend
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {status?.active || config.backend}
              </Badge>
            </div>
          </div>
          <div className="grid gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total embeddings</span>
              <span className="font-semibold">
                {status?.embeddings?.total ?? stats?.total ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Embedding table</span>
              <span className="font-semibold">
                {status?.embeddings?.embedding_table ?? stats?.sources?.embedding_table ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Feature refs</span>
              <span className="font-semibold">
                {status?.embeddings?.feature_ref ?? stats?.sources?.feature_ref ?? 0}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-3 space-y-3">
          <div className="text-sm font-semibold">Backend Config</div>
          <div className="grid gap-2 text-xs">
            <Select
              value={config.backend}
              onValueChange={(value) =>
                setConfig((prev) => ({ ...prev, backend: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="db">DB (default)</SelectItem>
                <SelectItem value="pgvector">Postgres pgvector</SelectItem>
                <SelectItem value="chroma">Chroma</SelectItem>
              </SelectContent>
            </Select>
            {config.backend === 'chroma' && (
              <>
                <Select
                  value={config.chroma_mode}
                  onValueChange={(value) =>
                    setConfig((prev) => ({ ...prev, chroma_mode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chroma mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                  </SelectContent>
                </Select>
                {config.chroma_mode === 'http' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={config.chroma_host}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          chroma_host: e.target.value,
                        }))
                      }
                      placeholder="Host"
                    />
                    <Input
                      value={String(config.chroma_port)}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          chroma_port: Number(e.target.value || 0),
                        }))
                      }
                      placeholder="Port"
                    />
                  </div>
                ) : (
                  <Input
                    value={config.chroma_path}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        chroma_path: e.target.value,
                      }))
                    }
                    placeholder="Local path"
                  />
                )}
                <Input
                  value={config.chroma_collection_prefix}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      chroma_collection_prefix: e.target.value,
                    }))
                  }
                  placeholder="Collection prefix"
                />
              </>
            )}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={config.log_search}
                onCheckedChange={() =>
                  setConfig((prev) => ({
                    ...prev,
                    log_search: !prev.log_search,
                  }))
                }
              />
              Log search timing
            </label>
            <Button size="sm" onClick={saveConfig}>
              Save config
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Reindex</div>
            <div className="text-xs text-muted-foreground">
              Rebuild the selected backend from stored embeddings.
            </div>
          </div>
          <Badge variant="destructive" className="text-xs">
            Destructive
          </Badge>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-muted-foreground">
            <Checkbox
              checked={confirmReindex}
              onCheckedChange={() => setConfirmReindex(!confirmReindex)}
            />
            Confirm reindex
          </label>
          <Button
            size="sm"
            variant="destructive"
            onClick={runReindex}
            disabled={reindexing}
          >
            {reindexing ? 'Reindexing…' : 'Run reindex'}
          </Button>
        </div>
        {reindexResult && (
          <pre className="rounded-md border bg-muted/40 p-2 text-[10px] whitespace-pre-wrap max-h-50 overflow-auto">
            {JSON.stringify(reindexResult, null, 2)}
          </pre>
        )}
      </Card>
    </div>
  )
}
