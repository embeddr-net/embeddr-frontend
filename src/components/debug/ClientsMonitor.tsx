import React, { useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@embeddr/react-ui";
import { Activity, Monitor, Send, User } from "lucide-react";
import { Input } from "@embeddr/react-ui/ui";
import { toast } from "sonner";
import { BACKEND_URL } from "@/lib/api/config";
import { useUserStore } from "@/store/userStore";
import { useWebSocket } from "@/providers/WebSocketProvider";

export const ClientsMonitor = () => {
  const { clients, myClientId, refreshClients, sessions } = useWebSocket();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const apiKey = useUserStore((state) => state.apiKey);

  const sendMessage = async () => {
    if (!selectedClient || !message) return;
    try {
      await fetch(`${BACKEND_URL}/system/debug/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
        body: JSON.stringify({
          client_id: selectedClient,
          message: { type: "debug_message", data: message },
        }),
      });
      toast.success("Message sent");
      setMessage("");
    } catch (e) {
      toast.error("Failed to send message");
    }
  };

  return (
    <Card className="flex-1 w-full flex flex-col h-full">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Connected Clients</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {clients.length}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={refreshClients} title="Refresh">
          <Activity className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col md:flex-row h-full overflow-hidden">
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border h-full overflow-y-auto bg-muted/30">
          <div className="flex flex-col p-2 gap-1">
            {clients.map((client) => {
              const isMe = client === myClientId;
              const session = sessions.find((item) => item.client_id === client);
              return (
                <div
                  key={client}
                  className={`p-2  text-xs font-mono cursor-pointer flex items-center gap-2 transition-colors ${
                    selectedClient === client
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <User className={`w-3 h-3 ${isMe ? "text-green-500" : ""}`} />
                  <span className="truncate flex-1">
                    {session?.username
                      ? `${session.username} (${client.substring(0, 8)}...)`
                      : `${client.substring(0, 8)}...`}
                  </span>
                  {isMe && (
                    <Badge variant="secondary" className="px-1 py-0 text-[9px] h-4">
                      ME
                    </Badge>
                  )}
                </div>
              );
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
                <span className="text-sm font-medium">Send Message to Client</span>
                <div className="text-xs font-mono text-muted-foreground">ID: {selectedClient}</div>
                {sessions.find((item) => item.client_id === selectedClient) && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {(() => {
                      const session = sessions.find((item) => item.client_id === selectedClient);
                      if (!session) return null;
                      return (
                        <>
                          {session.username && <div>user: {session.username}</div>}
                          {session.user_id && <div>user_id: {session.user_id}</div>}
                          {session.address && <div>ip: {session.address}</div>}
                          {session.origin && (
                            <div className="truncate">origin: {session.origin}</div>
                          )}
                          {session.user_agent && (
                            <div className="truncate">ua: {session.user_agent}</div>
                          )}
                          {session.connected_at && (
                            <div>connected: {new Date(session.connected_at).toLocaleString()}</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
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
  );
};
