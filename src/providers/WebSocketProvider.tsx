import React, { createContext, useContext, useEffect, useRef } from 'react'
import { BACKEND_URL, BASE_URL } from '@/lib/api/config'
import { globalEventBus } from '@/lib/eventBus'
import type { EmbeddrMessage } from '@embeddr/zen-shell'
import { useUserStore } from '@/store/userStore'

export type ClientSessionInfo = {
  client_id: string
  user_id?: string | null
  username?: string | null
  api_key_id?: string | null
  address?: string | null
  user_agent?: string | null
  origin?: string | null
  forwarded_for?: string | null
  path?: string | null
}

const WebSocketContext = createContext<{
  isConnected: boolean
  lastMessage: EmbeddrMessage | null
  myClientId: string | null
  clients: string[]
  sessions: ClientSessionInfo[]
  refreshClients: () => Promise<void>
}>({
  isConnected: false,
  lastMessage: null,
  myClientId: null,
  clients: [],
  sessions: [],
  refreshClients: async () => {},
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
  const [clients, setClients] = React.useState<string[]>([])
  const [sessions, setSessions] = React.useState<ClientSessionInfo[]>([])
  const [myClientId, setMyClientId] = React.useState<string | null>(null)

  const refreshClients = React.useCallback(async () => {
    try {
      const root = BACKEND_URL
      const baseUrl =
        !root || root.startsWith('/')
          ? window.location.origin + (root || '')
          : root
      const url = baseUrl.endsWith('/')
        ? `${baseUrl}system/debug/clients`
        : `${baseUrl}/system/debug/clients`
      const apiKey = useUserStore.getState().apiKey
      const res = await fetch(url, {
        headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
      })
      if (!res.ok) return
      const data = await res.json()
      setClients(Array.isArray(data.clients) ? data.clients : [])
      setSessions(Array.isArray(data.sessions) ? data.sessions : [])
    } catch (e) {
      console.warn('[WebSocketProvider] Failed to fetch clients', e)
    }
  }, [])

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

    const apiKey = useUserStore.getState().apiKey
    if (apiKey) {
      wsUrl += `?api_key=${encodeURIComponent(apiKey)}`
    }

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
          if (msg.type === 'client_hello') {
            const payload = msg.data as {
              client_id?: string
            }
            if (payload?.client_id) {
              setMyClientId(payload.client_id)
            }
          }
          if (
            msg.type === 'client_connected' ||
            msg.type === 'client_disconnected'
          ) {
            refreshClients()
          }
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
    refreshClients()

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

  // Watch for client key changes to trigger reconnect
  const apiKey = useUserStore((state) => state.apiKey)
  useEffect(() => {
    if (wsRef.current) {
      console.log('[WebSocketProvider] Client key updated, cycling connection.')
      // Prevent the onclose handler from scheduling a delayed reconnect
      // we want to reconnect immediately with the new key
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)

      wsRef.current.onclose = null // detach old handler
      wsRef.current.close()

      shouldReconnectRef.current = true
      // Short delay to ensure socket closes
      setTimeout(() => connect(), 100)
    } else if (apiKey) {
      // If not connected but key provided, try connecting
      connect()
    }
  }, [apiKey])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        lastMessage,
        myClientId,
        clients,
        sessions,
        refreshClients,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}
