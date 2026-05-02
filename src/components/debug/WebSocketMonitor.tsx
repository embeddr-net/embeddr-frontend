import React, { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
} from "@embeddr/react-ui";
import { Activity, ArrowDown, ArrowUp, Filter, Terminal, Trash2, Zap } from "lucide-react";
import type { EmbeddrMessage } from "@embeddr/react-ui/types";
import { globalEventBus } from "@/lib/eventBus";

interface LogMessage {
  id: string;
  timestamp: Date;
  payload: EmbeddrMessage;
}

const MessageItem = ({ msg }: { msg: LogMessage }) => {
  const [expanded, setExpanded] = useState(false);
  const isComfy = msg.payload.source === "comfyui";

  return (
    <div className="border bg-card text-xs font-mono group hover:border-primary/20 transition-colors rounded-md">
      <div
        className="flex items-center gap-3 p-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col items-center justify-center min-w-10 text-[10px] text-muted-foreground/70 leading-tight">
          <span>{msg.timestamp.toLocaleTimeString().split(" ")[0]}</span>
          <span>.{msg.timestamp.getMilliseconds().toString().padStart(3, "0")}</span>
        </div>

        <Badge
          variant="outline"
          className={`h-5 px-1.5 text-[10px] uppercase tracking-wider border-0 ${
            isComfy ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
          }`}
        >
          {msg.payload.source}
        </Badge>

        <span className="font-semibold text-foreground/90 flex-1 truncate">{msg.payload.type}</span>

        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {expanded ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        </Button>
      </div>

      {expanded && (
        <div className="border-t bg-muted/30 p-2 overflow-x-auto">
          <pre className="text-[10px] text-card-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
            {JSON.stringify(msg.payload.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const WebSocketMonitor = () => {
  const [messages, setMessages] = useState<Array<LogMessage>>([]);
  const [filterSource, setFilterSource] = useState<"all" | "embeddr" | "comfyui">("all");
  const [paused, setPaused] = useState(false);

  const sendTestEvent = () => {
    globalEventBus.emit("websocket:message", {
      source: "test",
      type: "test_event",
      data: { message: "Hello from Monitor", timestamp: new Date() },
    });
  };

  // Use globalEventBus directly for debugging to bypass hook complexity within the UI library
  useEffect(() => {
    const handler = (msg: unknown) => {
      if (paused) return;
      const payload = msg as EmbeddrMessage;
      setMessages((prev) => [
        {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
          payload,
        },
        ...prev.slice(0, 49),
      ]);
    };

    return globalEventBus.on("websocket:message", handler);
  }, [paused]);

  const clearMessages = () => setMessages([]);

  const filteredMessages = messages.filter((m) => {
    if (filterSource === "all") return true;
    return m.payload.source === filterSource;
  });

  return (
    <Card className="flex-1 w-full flex flex-col overflow-hidden h-full py-0!">
      <CardHeader className="py-2 pb-2! px-4 flex flex-row items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground ml-1" />
          <CardTitle className="text-sm font-medium">WebSocket Stream</CardTitle>
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
            title={paused ? "Resume" : "Pause"}
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
            onClick={sendTestEvent}
            title="Inject Test Event"
          >
            <Zap className="w-4 h-4 text-yellow-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={sendTestEvent}
            title="Inject Test Event"
          >
            <Zap className="w-4 h-4 text-yellow-500" />
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
            onChange={(e) => setFilterSource(e.target.value as "all" | "embeddr" | "comfyui")}
          >
            <option value="all">All Sources</option>
            <option value="embeddr">Embeddr</option>
            <option value="comfyui">ComfyUI</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 relative">
        <ScrollArea className="h-full w-full pr-2" type="always">
          <div className="flex flex-col p-2 gap-1">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground/50 gap-2">
                <Filter className="w-8 h-8 opacity-20" />
                <span className="text-xs">No events captured yet</span>
              </div>
            ) : (
              filteredMessages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
