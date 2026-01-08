import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  useExternalNav,
  useWebSocketStream,
  useWebSocket,
} from '@embeddr/react-ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import type { EmbeddrMessage } from '@embeddr/react-ui/types'
import { IconBrandGithub } from '@tabler/icons-react'
import {
  Activity,
  AlarmClockIcon,
  ArrowDown,
  ArrowUp,
  Filter,
  Monitor,
  Terminal,
  Trash2,
  Send,
  User,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@embeddr/react-ui/components/input'
import { BACKEND_URL } from '@/lib/api/config'

interface LogMessage {
  id: string
  timestamp: Date
  payload: EmbeddrMessage
}

const WebSocketMonitor = () => {
  const [messages, setMessages] = useState<LogMessage[]>([])
  const [filterSource, setFilterSource] = useState<
    'all' | 'embeddr' | 'comfyui'
  >('all')
  const [paused, setPaused] = useState(false)

  // Use the hook instead of direct event bus subscription
  useWebSocketStream((msg) => {
    if (paused) return
    setMessages((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        payload: msg,
      },
      ...prev.slice(0, 49),
    ])
  })

  // Old code removed:
  // useEffect(() => {
  //   const handleMessage = (msg: EmbeddrMessage) => { ... }
  //   const unsubscribe = globalEventBus.on('websocket:message', handleMessage)
  //   return () => unsubscribe()
  // }, [paused])

  const clearMessages = () => setMessages([])

  const filteredMessages = messages.filter((m) => {
    if (filterSource === 'all') return true
    return m.payload.source === filterSource
  })

  return (
    <Card className="flex-1 w-full flex flex-col overflow-hidden h-full">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground ml-1" />
          <CardTitle className="text-sm font-medium">
            WebSocket Stream
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {messages.length} events
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setPaused(!paused)}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? (
              <ArrowDown className="w-4 h-4 text-orange-500" />
            ) : (
              <Activity className="w-4 h-4 text-green-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={clearMessages}
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <select
            className="bg-transparent text-xs border-none outline-none font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            value={filterSource}
            onChange={(e) =>
              setFilterSource(e.target.value as 'all' | 'embeddr' | 'comfyui')
            }
          >
            <option value="all">All Sources</option>
            <option value="embeddr">Embeddr</option>
            <option value="comfyui">ComfyUI</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <ScrollArea
          className="h-full w-full pr-2"
          variant="left-border"
          type="always"
        >
          <div className="flex flex-col p-2 gap-1">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground/50 gap-2">
                <Filter className="w-8 h-8 opacity-20" />
                <span className="text-xs">No events captured yet</span>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <MessageItem key={msg.id} msg={msg} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

const MessageItem = ({ msg }: { msg: LogMessage }) => {
  const [expanded, setExpanded] = useState(false)
  const isComfy = msg.payload.source === 'comfyui'

  return (
    <div className="border bg-card text-xs font-mono group hover:border-primary/20 transition-colors">
      <div
        className="flex items-center gap-3 p-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col items-center justify-center min-w-[2.5rem] text-[10px] text-muted-foreground/70 leading-tight">
          <span>{msg.timestamp.toLocaleTimeString().split(' ')[0]}</span>
          <span>
            .{msg.timestamp.getMilliseconds().toString().padStart(3, '0')}
          </span>
        </div>

        <Badge
          variant="outline"
          className={`h-5 px-1.5 text-[10px] uppercase tracking-wider border-0 ${
            isComfy
              ? 'bg-blue-500/10 text-blue-500'
              : 'bg-purple-500/10 text-purple-500'
          }`}
        >
          {msg.payload.source}
        </Badge>

        <span className="font-semibold text-foreground/90 flex-1 truncate">
          {msg.payload.type}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {expanded ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t bg-muted/30 p-2 overflow-x-auto">
          <pre className="text-[10px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
            {JSON.stringify(msg.payload.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

const ClientsMonitor = () => {
  const { clients, myClientId, refreshClients } = useWebSocket()
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const sendMessage = async () => {
    if (!selectedClient || !message) return
    try {
      await fetch(`${BACKEND_URL}/system/debug/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient,
          message: { type: 'debug_message', data: message },
        }),
      })
      toast.success('Message sent')
      setMessage('')
    } catch (e) {
      toast.error('Failed to send message')
    }
  }

  return (
    <Card className="flex-1 w-full flex flex-col h-full">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Connected Clients
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {clients.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={refreshClients}
          title="Refresh"
        >
          <Activity className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col md:flex-row h-full overflow-hidden">
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border h-full overflow-y-auto bg-muted/30">
          <div className="flex flex-col p-2 gap-1">
            {clients.map((client) => {
              const isMe = client === myClientId
              return (
                <div
                  key={client}
                  className={`p-2  text-xs font-mono cursor-pointer flex items-center gap-2 transition-colors ${
                    selectedClient === client
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <User className={`w-3 h-3 ${isMe ? 'text-green-500' : ''}`} />
                  <span className="truncate flex-1">
                    {client.substring(0, 8)}...
                  </span>
                  {isMe && (
                    <Badge
                      variant="secondary"
                      className="px-1 py-0 text-[9px] h-4"
                    >
                      ME
                    </Badge>
                  )}
                </div>
              )
            })}
            {clients.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No clients connected
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-4">
          {selectedClient ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  Send Message to Client
                </span>
                <div className="text-xs font-mono text-muted-foreground">
                  ID: {selectedClient}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder='{"type": "...", "data": ...} or string'
                  className="font-mono text-xs"
                />
                <Button size="icon" onClick={sendMessage} disabled={!message}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Select a client to inspect
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const DebugPage = () => {
  const { openExternal } = useExternalNav()
  return (
    <div className="w-full h-full p-1 flex flex-col gap-1">
      {/* Test Controls */}
      <Card className="shrink-0">
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Manual Tests</CardTitle>
        </CardHeader>
        <CardContent className="py-1 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast('Beep boop', { icon: '🤖' })}
            className="gap-2"
          >
            <AlarmClockIcon className="w-4 h-4 text-yellow-400" />
            Test Toast
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openExternal('https://github.com/embeddr-net/embeddr-cli')
            }
            className="gap-2"
          >
            <IconBrandGithub className="w-4 h-4" />
            Open GitHub
          </Button>
        </CardContent>
      </Card>

      {/* Tabs for Monitors */}
      <Tabs
        defaultValue="stream"
        className="flex-1 flex flex-col overflow-hidden gap-1!"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="stream" className="gap-2">
            <Terminal className="w-4 h-4" /> Stream
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Monitor className="w-4 h-4" /> Clients
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="stream"
          className="flex-1 overflow-hidden p-0 h-full"
        >
          <WebSocketMonitor />
        </TabsContent>
        <TabsContent
          value="clients"
          className="flex-1 overflow-hidden p-0 h-full"
        >
          <ClientsMonitor />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DebugPage
