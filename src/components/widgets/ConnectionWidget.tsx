import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useGenerationStore } from '@/store/generationStore'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/ui'
import { Separator } from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import {
  Server,
  Database,
  Images,
  Layers,
  FolderOpen,
  Wifi,
  WifiOff,
  Activity,
  ExternalLink,
} from 'lucide-react'
import { fetchSystemInfo } from '@/lib/api/endpoints/system'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1) return '<1ms'
  return `${Math.round(ms)}ms`
}

/** Tiny stat row used inside the popover */
function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="font-mono text-foreground/80">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function ConnectionWidget() {
  const { isConnected, isAlive } = useWebSocket()
  const { queueStatus } = useGenerationStore()
  const navigate = useNavigate()

  // Fetch system info – refetch every 60s while popover is rendered
  const { data: sysInfo } = useQuery({
    queryKey: ['system', 'info'],
    queryFn: fetchSystemInfo,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })

  // Three states: connected+alive, connected but stale, disconnected
  const connectionStatus = !isConnected
    ? 'disconnected'
    : isAlive
      ? 'connected'
      : 'stale'

  const statusColor =
    {
      connected: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      stale: 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]',
      disconnected: 'bg-red-500',
    }[connectionStatus] ?? 'bg-gray-500'

  const statusLabel =
    {
      connected: 'Connected',
      stale: 'Stale',
      disconnected: 'Disconnected',
    }[connectionStatus] ?? connectionStatus

  const instanceName = sysInfo?.instance?.name || 'Embeddr'
  const instanceLogo = sysInfo?.instance?.logo_url

  // Database health indicator
  const dbOk = sysInfo?.db?.connected ?? false

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="flex items-center justify-center w-6 h-6 cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
          title={`${instanceName} — ${statusLabel}`}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-500',
              statusColor,
            )}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="end" side="top">
        {/* ─── Instance banner ─────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
          {instanceLogo ? (
            <img
              src={instanceLogo}
              alt=""
              className="h-7 w-7 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
              <Server className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm leading-none truncate">
                {instanceName}
              </h4>
              {sysInfo?.version && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-mono"
                >
                  v{sysInfo.version}
                </Badge>
              )}
            </div>
            {sysInfo?.instance?.description && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {sysInfo.instance.description}
              </p>
            )}
          </div>
          {sysInfo?.dev_mode && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 shrink-0 border-amber-500/50 text-amber-500"
            >
              DEV
            </Badge>
          )}
        </div>

        <Separator />

        {/* ─── Connection & DB health ──────────────────────────── */}
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              WebSocket
            </span>
            <span
              className={cn(
                'font-mono',
                connectionStatus === 'connected' && 'text-emerald-500',
                connectionStatus === 'stale' && 'text-yellow-500',
                connectionStatus === 'disconnected' && 'text-red-500',
              )}
            >
              {statusLabel}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Database
                className={cn(
                  'h-3 w-3',
                  dbOk ? 'text-emerald-500' : 'text-red-500',
                )}
              />
              Database
            </span>
            <span className="font-mono text-foreground/80">
              {sysInfo
                ? dbOk
                  ? formatLatency(sysInfo.db?.latency_ms)
                  : 'error'
                : '…'}
            </span>
          </div>

          {queueStatus && queueStatus.remaining > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="h-3 w-3 text-blue-400" />
                Queue
              </span>
              <span className="font-mono text-foreground/80">
                {queueStatus.remaining} item
                {queueStatus.remaining !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ─── Stats ───────────────────────────────────────────── */}
        {sysInfo?.stats && (
          <>
            <Separator />
            <div className="px-3 py-2 space-y-1.5">
              {sysInfo.stats.artifacts != null && (
                <StatRow
                  icon={Layers}
                  label="Artifacts"
                  value={sysInfo.stats.artifacts.toLocaleString()}
                />
              )}
              <StatRow
                icon={Images}
                label="Images"
                value={sysInfo.stats.images.toLocaleString()}
              />
              <StatRow
                icon={FolderOpen}
                label="Libraries"
                value={sysInfo.stats.libraries.toLocaleString()}
              />
            </div>
          </>
        )}

        {/* ─── Footer link to debug page ───────────────────────── */}
        <Separator />
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          onClick={() => navigate({ to: '/debug' })}
        >
          <ExternalLink className="h-3 w-3" />
          Open Debug Panel
        </button>
      </PopoverContent>
    </Popover>
  )
}
