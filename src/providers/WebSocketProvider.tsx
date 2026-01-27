import React, { createContext, useContext, useEffect, useRef } from 'react'
import { BASE_URL } from '@/lib/api/config'
import { globalEventBus } from '@/lib/eventBus'
import type { EmbeddrMessage } from '@embeddr/zen-ui'

const WebSocketContext = createContext<{
  isConnected: boolean
  lastMessage: EmbeddrMessage | null
}>({
  isConnected: false,
  lastMessage: null,
})

export const useWebSocket = () => useContext(WebSocketContext)

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectedRef = useRef(false)
  const shouldReconnectRef = useRef(true)
  const [isConnected, setIsConnected] = React.useState(false)
  const [lastMessage, setLastMessage] = React.useState<EmbeddrMessage | null>(
    null,
  )

  const connect = () => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    // Handle relative or absolute URLs
    let root = BASE_URL
    if (!root || root.startsWith('/')) {
      root = window.location.origin + (root || '')
    }

    let wsUrl = root.replace(/^http/, 'ws').replace(/\/$/, '')
    wsUrl = `${wsUrl}/ws`

    console.log('[WebSocketProvider] Connecting to', wsUrl)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocketProvider] Connected')
      setIsConnected(true)
      isConnectedRef.current = true
      globalEventBus.emit('websocket:connected')

      // Request initial status
      ws.send(JSON.stringify({ type: 'request_status' }))
    }

    ws.onclose = () => {
      console.log('[WebSocketProvider] Disconnected')
      setIsConnected(false)
      isConnectedRef.current = false
      globalEventBus.emit('websocket:disconnected')
      wsRef.current = null

      // Reconnect
      if (!shouldReconnectRef.current) return
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = setTimeout(connect, 5000)
    }

    ws.onerror = (err) => {
      console.error('[WebSocketProvider] Error', err)
      // Usually close will be called after error
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as EmbeddrMessage
        setLastMessage(msg)
        // Emit raw for monitors
        globalEventBus.emit('websocket:message', msg)

        // Emit by type for specific listeners
        if (msg.type) {
          globalEventBus.emit(msg.type, msg.data)
        }

        // Emit by source ("comfyui" vs "embeddr")
        if (msg.source) {
          // e.g. "comfyui:progress"
          if (msg.type) {
            globalEventBus.emit(`${msg.source}:${msg.type}`, msg.data)
          }
        }
      } catch (e) {
        console.error('[WebSocketProvider] Message parse error', e)
      }
    }
  }

  useEffect(() => {
    shouldReconnectRef.current = true
    connect() //TODO: Renable once ready

    const handleUnload = () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.onopen = null
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close()
        wsRef.current = null
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleUnload()
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibility)

    // Listen for outbound requests from stores/components
    const sendHandler = (payload: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload))
      } else {
        console.warn(
          '[WebSocketProvider] Cannot send, socket not open',
          payload,
        )
      }
    }

    const unsubscribeSend = globalEventBus.on('websocket:send', sendHandler)

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        // Prevent event handlers from firing during cleanup to avoid
        // "disconnected" events during Strict Mode double-invocations
        wsRef.current.onopen = null
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close()
        wsRef.current = null
      }
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribeSend()
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  )
}
