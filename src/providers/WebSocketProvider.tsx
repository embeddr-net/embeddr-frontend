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
  connected_at?: string | null
  is_admin?: boolean | null
}

// ---------------------------------------------------------------------------
// Heartbeat / keep-alive constants
// ---------------------------------------------------------------------------

/** How often to send a ping while the tab is visible (ms) */
const PING_INTERVAL_MS = 25_000
/** How long to wait for a pong before declaring the connection dead (ms) */
const PONG_TIMEOUT_MS = 20_000
/** Reconnect delay after a detected dead connection (ms) */
const RECONNECT_DELAY_MS = 2_000
/** Maximum reconnect back-off (ms) */
const MAX_RECONNECT_DELAY_MS = 30_000

const WebSocketContext = createContext<{
  isConnected: boolean
  /** Whether we have recently received a pong / message — true liveness */
  isAlive: boolean
  lastMessage: EmbeddrMessage | null
  myClientId: string | null
  clients: string[]
  sessions: ClientSessionInfo[]
  refreshClients: () => Promise<void>
}>({
  isConnected: false,
  isAlive: false,
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
  const wsUrlRef = useRef<string>('')
  const intentionallyClosingSocketsRef = useRef<WeakSet<WebSocket>>(new WeakSet())
  const initialConnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const hasHandledInitialApiKeyRef = useRef(false)
  const lastApiKeyRef = useRef<string | null | undefined>(undefined)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const authBlockedRef = useRef(false)
  const missedHeartbeatRef = useRef(0)

  const isConnectedRef = useRef(false)
  const shouldReconnectRef = useRef(true)
  /** Monotonically increasing reconnect delay for exponential back-off */
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS)
  /** Timestamp of last confirmed liveness (message or pong) */
  const lastAliveRef = useRef<number>(0)

  const [isConnected, setIsConnected] = React.useState(false)
  const [isAlive, setIsAlive] = React.useState(false)
  const [lastMessage, setLastMessage] = React.useState<EmbeddrMessage | null>(
    null,
  )
  const [clients, setClients] = React.useState<string[]>([])
  const [sessions, setSessions] = React.useState<ClientSessionInfo[]>([])
  const [myClientId, setMyClientId] = React.useState<string | null>(null)

  const sanitizeWsUrl = React.useCallback((url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.searchParams.has('api_key')) {
        parsed.searchParams.set('api_key', '***')
      }
      return parsed.toString()
    } catch {
      return url.replace(/([?&]api_key=)[^&]+/i, '$1***')
    }
  }, [])

  // ----- Helpers -----

  const markAlive = () => {
    lastAliveRef.current = Date.now()
    missedHeartbeatRef.current = 0
    if (!isConnectedRef.current) return
    setIsAlive(true)
  }

  const clearHeartbeat = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current)
      pongTimeoutRef.current = null
    }
  }

  const teardownSocketForCleanup = (socket: WebSocket) => {
    intentionallyClosingSocketsRef.current.add(socket)
    socket.onopen = null
    socket.onclose = null
    socket.onerror = null
    socket.onmessage = null
    if (socket.readyState === WebSocket.CONNECTING) {
      return
    }
    socket.close()
  }

  /** Force-close the current socket and schedule a reconnect */
  const forceReconnect = (reason: string) => {
    console.warn(`[WebSocketProvider] Force reconnect: ${reason}`)
    clearHeartbeat()
    setIsAlive(false)
    if (wsRef.current) {
      intentionallyClosingSocketsRef.current.add(wsRef.current)
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    isConnectedRef.current = false
    globalEventBus.emit('websocket:disconnected')

    if (!shouldReconnectRef.current) return
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    reconnectTimeoutRef.current = setTimeout(connect, reconnectDelayRef.current)
    // Exponential back-off (capped)
    reconnectDelayRef.current = Math.min(
      reconnectDelayRef.current * 1.5,
      MAX_RECONNECT_DELAY_MS,
    )
  }

  /** Start periodic ping while the tab is visible */
  const startHeartbeat = () => {
    clearHeartbeat()
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    pingIntervalRef.current = setInterval(() => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        clearHeartbeat()
        return
      }

      // Send text "ping" — server replies with text "pong"
      try {
        ws.send('ping')
      } catch {
        forceReconnect('ping send failed')
        return
      }

      // If we don't get any message within PONG_TIMEOUT_MS, the conn is dead
      if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current)
      pongTimeoutRef.current = setTimeout(() => {
        const elapsed = Date.now() - lastAliveRef.current
        if (elapsed >= PONG_TIMEOUT_MS) {
          missedHeartbeatRef.current += 1
          if (missedHeartbeatRef.current >= 2) {
            forceReconnect(`no pong/message in ${elapsed}ms`)
            return
          }
          console.warn(
            `[WebSocketProvider] Missed heartbeat ${missedHeartbeatRef.current}/2 (${elapsed}ms).`,
          )
        }
      }, PONG_TIMEOUT_MS)
    }, PING_INTERVAL_MS)
  }

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
    wsUrlRef.current = wsUrl

    console.log('[WebSocketProvider] Connecting to', sanitizeWsUrl(wsUrl))
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (wsRef.current !== ws) return
      console.log('[WebSocketProvider] Connected')
      missedHeartbeatRef.current = 0
      authBlockedRef.current = false
      shouldReconnectRef.current = true
      setIsConnected(true)
      isConnectedRef.current = true
      reconnectDelayRef.current = RECONNECT_DELAY_MS // reset back-off
      markAlive()
      globalEventBus.emit('websocket:connected')

      // Request initial status
      ws.send(JSON.stringify({ type: 'request_status' }))

      // Start heartbeat pings
      startHeartbeat()
    }

    ws.onclose = (event) => {
      if (wsRef.current !== ws) return
      const apiKey = useUserStore.getState().apiKey
      const closeInfo = {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        url: sanitizeWsUrl(wsUrlRef.current),
        apiKeyPresent: Boolean(apiKey),
      }
      console.log('[WebSocketProvider] Disconnected', closeInfo)
      setIsConnected(false)
      setIsAlive(false)
      isConnectedRef.current = false
      clearHeartbeat()
      globalEventBus.emit('websocket:disconnected')
      wsRef.current = null

      // 1008 = policy violation (commonly auth failure).
      // If there's no API key yet, pause reconnect spam until a key appears.
      if (event.code === 1008 && !apiKey) {
        authBlockedRef.current = true
        shouldReconnectRef.current = false
        console.warn(
          '[WebSocketProvider] WebSocket rejected by policy (likely auth required). Waiting for API key before reconnecting.',
          closeInfo,
        )
        return
      }

      // Reconnect with back-off
      if (!shouldReconnectRef.current) return
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = setTimeout(
        connect,
        reconnectDelayRef.current,
      )
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 1.5,
        MAX_RECONNECT_DELAY_MS,
      )
    }

    ws.onerror = (err) => {
      if (wsRef.current !== ws) return
      if (intentionallyClosingSocketsRef.current.has(ws)) return
      const apiKey = useUserStore.getState().apiKey
      const readyState = wsRef.current?.readyState
      console.error('[WebSocketProvider] Error', {
        event: err,
        url: sanitizeWsUrl(wsUrlRef.current),
        apiKeyPresent: Boolean(apiKey),
        readyState,
      })
      // Usually close will be called after error
    }

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return
      // Handle text "pong" from server (heartbeat reply)
      if (event.data === 'pong') {
        markAlive()
        return
      }

      try {
        const msg = JSON.parse(event.data) as EmbeddrMessage
        markAlive() // any valid message proves liveness
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
            globalEventBus.emit(`source:${msg.source}:${msg.type}`, msg.data)
          }
        }
      } catch (e) {
        console.error('[WebSocketProvider] Message parse error', e)
      }
    }
  }

  useEffect(() => {
    shouldReconnectRef.current = true
    // Defer initial connect one tick so React Strict Mode's throwaway mount
    // doesn't create+close a CONNECTING socket and trigger browser WS noise.
    initialConnectTimeoutRef.current = setTimeout(() => {
      initialConnectTimeoutRef.current = null
      if (!shouldReconnectRef.current) return
      connect()
    }, 0)

    const handleUnload = () => {
      shouldReconnectRef.current = false
      clearHeartbeat()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        teardownSocketForCleanup(wsRef.current)
        wsRef.current = null
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible — check if the socket is still alive
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          // Socket is gone or closed — reconnect immediately
          console.log(
            '[WebSocketProvider] Tab visible, socket gone — reconnecting',
          )
          shouldReconnectRef.current = true
          reconnectDelayRef.current = RECONNECT_DELAY_MS
          if (reconnectTimeoutRef.current)
            clearTimeout(reconnectTimeoutRef.current)
          connect()
        } else {
          // Socket looks open — send a ping to verify it's actually alive
          console.log(
            '[WebSocketProvider] Tab visible, verifying connection...',
          )
          try {
            ws.send('ping')
          } catch {
            forceReconnect('ping on visibility failed')
            return
          }

          // Start heartbeat again (may have been paused)
          startHeartbeat()

          // Set a short pong timeout to force-reconnect if dead
          if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current)
          pongTimeoutRef.current = setTimeout(() => {
            const elapsed = Date.now() - lastAliveRef.current
            if (elapsed >= PONG_TIMEOUT_MS) {
              missedHeartbeatRef.current += 1
              if (missedHeartbeatRef.current >= 2) {
                forceReconnect(`no pong after tab refocus (${elapsed}ms)`)
              }
            }
          }, PONG_TIMEOUT_MS)
        }
      }
      // When tab goes hidden: keep the socket open, just stop pinging.
      // The browser may throttle timers anyway, and this avoids the
      // previous bug of permanently killing the connection.
      if (document.visibilityState === 'hidden') {
        clearHeartbeat()
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
      clearHeartbeat()
      if (initialConnectTimeoutRef.current) {
        clearTimeout(initialConnectTimeoutRef.current)
        initialConnectTimeoutRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        // Prevent event handlers from firing during cleanup to avoid
        // "disconnected" events during Strict Mode double-invocations
        teardownSocketForCleanup(wsRef.current)
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
    if (!hasHandledInitialApiKeyRef.current) {
      hasHandledInitialApiKeyRef.current = true
      lastApiKeyRef.current = apiKey

      if (apiKey && authBlockedRef.current) {
        authBlockedRef.current = false
        shouldReconnectRef.current = true
        reconnectDelayRef.current = RECONNECT_DELAY_MS
        if (reconnectTimeoutRef.current)
          clearTimeout(reconnectTimeoutRef.current)
        connect()
      }
      return
    }

    if (lastApiKeyRef.current === apiKey) {
      return
    }
    lastApiKeyRef.current = apiKey

    if (apiKey && authBlockedRef.current) {
      authBlockedRef.current = false
      shouldReconnectRef.current = true
      reconnectDelayRef.current = RECONNECT_DELAY_MS
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      connect()
      return
    }

    if (wsRef.current) {
      console.log('[WebSocketProvider] Client key updated, cycling connection.')
      clearHeartbeat()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)

      intentionallyClosingSocketsRef.current.add(wsRef.current)
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      wsRef.current.close()
      wsRef.current = null

      shouldReconnectRef.current = true
      reconnectDelayRef.current = RECONNECT_DELAY_MS
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
        isAlive,
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
