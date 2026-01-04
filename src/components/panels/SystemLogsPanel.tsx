import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Loader2 } from 'lucide-react'
import { fetchSystemLogs } from '@/lib/api'

export function SystemLogsPanel({ isActive }: { isActive: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['system-logs-viewer'],
    queryFn: () => fetchSystemLogs(100),
    refetchInterval: isActive ? 2000 : false,
    enabled: isActive,
  })

  // Auto-scroll to bottom using scrollIntoView
  useEffect(() => {
    if (isActive && logs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isActive])

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          System Logs (Last 100 lines)
        </span>
        {isLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-h-0 relative">
        <ScrollArea
          type="always"
          variant="left-border"
          className="h-full w-full bg-black/90 text-white font-mono text-xs"
        >
          <div className="p-4">
            {logs?.map((log: string, i: number) => (
              <div
                key={i}
                className="whitespace-pre-wrap border-b border-white/10 py-0.5 last:border-0 break-all"
              >
                {log}
              </div>
            ))}
            {(!logs || logs.length === 0) && !isLoading && (
              <div className="text-muted-foreground italic py-2">
                No logs available...
              </div>
            )}
            {/* Anchor for auto-scrolling */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
