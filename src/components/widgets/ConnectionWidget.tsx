import React from 'react'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useGenerationStore } from '@/store/generationStore'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/popover'

export function ConnectionWidget() {
  const { isConnected } = useWebSocket()
  const { queueStatus } = useGenerationStore()
  const connectionStatus = isConnected ? 'connected' : 'disconnected'
  const navigate = useNavigate()

  const statusColor =
    {
      connected: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      connecting: 'bg-yellow-500',
      disconnected: 'bg-red-500',
    }[connectionStatus] || 'bg-gray-500'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="flex items-center justify-center w-6 h-6 cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
          title={`WebSocket: ${connectionStatus}`}
        >
          <div
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-500',
              statusColor,
            )}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-4" align="end" side="top">
        <div
          className="grid gap-2 cursor-pointer"
          onClick={() => navigate({ to: '/debug' })}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">System Status</h4>
            <div className={cn('w-2 h-2 rounded-full', statusColor)} />
          </div>

          <div className="text-xs text-muted-foreground space-y-1 mt-2">
            <div className="flex justify-between">
              <span>WebSocket</span>
              <span className="font-mono">{connectionStatus}</span>
            </div>
            {queueStatus && (
              <div className="flex justify-between">
                <span>Queue</span>
                <span className="font-mono">{queueStatus.remaining} items</span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
