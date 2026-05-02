import React, { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@embeddr/react-ui";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, KeyRound, RefreshCcw, User2 } from "lucide-react";
import { embeddrApi } from "@/lib/api/client";

const FieldRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-mono text-foreground truncate">{value || "-"}</span>
  </div>
);

export const AuthSessionDebug = () => {
  const [showRaw, setShowRaw] = useState(false);
  const sessionQuery = useQuery({
    queryKey: ["debug", "auth-session"],
    queryFn: () => embeddrApi.security.whoami(),
  });

  const data = sessionQuery.data;

  return (
    <Card className="flex-1 w-full flex flex-col h-full">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <User2 className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Auth Session</CardTitle>
          {data && (
            <Badge variant="outline" className="font-mono text-xs">
              {data.auth_mode}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => sessionQuery.refetch()} title="Refresh">
          <RefreshCcw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-4 flex flex-col gap-4">
        {sessionQuery.isLoading && (
          <div className="text-sm text-muted-foreground">Loading session...</div>
        )}
        {sessionQuery.isError && (
          <div className="text-sm text-destructive">Failed to load session.</div>
        )}
        {!data && !sessionQuery.isLoading && !sessionQuery.isError && (
          <div className="text-sm text-muted-foreground">No session data.</div>
        )}
        {data && (
          <div className="grid gap-4">
            <div className="rounded-md border bg-muted/10 p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Auth Chain
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {data.auth_enabled ? "enabled" : "open"}
                </Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center">
                <div className="rounded border bg-card p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Operator</div>
                  <div className="text-sm font-medium truncate">
                    {data.operator?.name || "unknown"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {data.operator?.id || "-"}
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">→</div>
                <div className="rounded border bg-card p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Client</div>
                  <div className="text-sm font-medium truncate">
                    {data.user?.username || "unknown"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {data.user?.id || "-"}
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">→</div>
                <div className="rounded border bg-card p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Credential</div>
                  <div className="text-sm font-medium truncate">
                    {data.client_key?.name || "unknown"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {data.client_key?.id || "-"}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Operator
                </div>
                <FieldRow label="id" value={data.operator?.id} />
                <FieldRow label="name" value={data.operator?.name} />
                <FieldRow label="display" value={data.operator?.display_name || undefined} />
                <FieldRow label="root" value={data.operator?.is_root ? "true" : "false"} />
              </div>
              <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Client
                </div>
                <FieldRow label="id" value={data.user?.id} />
                <FieldRow label="username" value={data.user?.username} />
                <FieldRow label="display" value={data.user?.display_name || undefined} />
                <FieldRow label="admin" value={data.user?.is_admin ? "true" : "false"} />
              </div>
              <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Client Credential
                  </span>
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <FieldRow label="id" value={data.client_key?.id} />
                <FieldRow label="name" value={data.client_key?.name} />
                <FieldRow label="prefix" value={data.client_key?.key_prefix || undefined} />
                <FieldRow label="active" value={data.client_key?.is_active ? "true" : "false"} />
                <FieldRow label="last_used" value={data.client_key?.last_used_at || undefined} />
                <FieldRow label="expires" value={data.client_key?.expires_at || undefined} />
              </div>
            </div>
            <Separator />
            <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Permissions
              </div>
              {data.permissions.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.permissions.map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-[10px] font-mono">
                      {perm}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No permissions</div>
              )}
            </div>
            <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Raw Session
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowRaw((prev) => !prev)}>
                  {showRaw ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {showRaw && (
                <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
