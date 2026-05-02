import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Badge, Button, Card, Popover, PopoverContent, PopoverTrigger } from "@embeddr/react-ui/ui";
import { AlertTriangle, Bell, RefreshCw, Settings } from "lucide-react";
import type { LotusCapability } from "@/lib/api/types";
import { embeddrApi } from "@/lib/api/client";
import { useEmbeddrAPI } from "@/plugins/store";
import { useUserStore } from "@/store/userStore";

const REQUIRED_CAPS = [
  {
    key: "preview.thumbnail",
    label: "Thumbnail generator",
    match: (cap: LotusCapability) =>
      cap.id?.includes("thumbnail") || cap.slot === "preview.thumbnail",
  },
  {
    key: "search.text",
    label: "Text search",
    match: (cap: LotusCapability) => cap.id === "search.text" || cap.slot === "search.text",
  },
];

type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  level: "info" | "warning";
  actionLabel?: string;
  onAction?: () => void;
};

export function NotificationsWidget() {
  const api = useEmbeddrAPI();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiKey = useUserStore((state) => state.apiKey);

  const { data: sysInfo } = useQuery({
    queryKey: ["system", "info", "notifications"],
    queryFn: () => embeddrApi.system.info(),
    staleTime: 60_000,
  });

  const { data: capsData, isLoading: capsLoading } = useQuery({
    queryKey: ["lotus", "capabilities", "notifications"],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  });

  const missingCaps = useMemo(() => {
    const caps = capsData?.items || [];
    return REQUIRED_CAPS.filter((required) => !caps.some((cap) => required.match(cap)));
  }, [capsData]);

  const notifications = useMemo<Array<NotificationItem>>(() => {
    const items: Array<NotificationItem> = [];

    // Only warn about missing API key if system info indicates auth is required.
    // In open mode, no key is needed — suppress the warning.
    const authMode = (sysInfo as any)?.auth_mode;
    if (!apiKey && authMode && authMode !== "open") {
      items.push({
        id: "missing-api-key",
        title: "Client key not set",
        description: "Add a client key to enable authenticated requests.",
        level: "warning",
        actionLabel: "Open onboarding",
        onAction: () => navigate({ to: "/onboarding" }),
      });
    }

    missingCaps.forEach((cap) => {
      items.push({
        id: `missing-${cap.key}`,
        title: `Missing ${cap.label}`,
        description: "A required capability is not available.",
        level: "warning",
        actionLabel: "Open Lotus",
        onAction: () => navigate({ to: "/lotus" }),
      });
    });

    return items;
  }, [api, apiKey, sysInfo, missingCaps, navigate]);

  const warningCount = notifications.filter((n) => n.level === "warning").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-6 w-6" aria-label="Notifications">
          {warningCount > 0 ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          {warningCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-3 min-w-3 rounded-full px-0.5 text-[8px]">
              {warningCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-90 p-0">
        <Card className="border-0 shadow-none">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">
                {capsLoading
                  ? "Checking system status..."
                  : warningCount > 0
                    ? `${warningCount} warnings detected`
                    : "All systems nominal"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["lotus", "capabilities", "notifications"],
                })
              }
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-80 overflow-auto p-3 space-y-2">
            {notifications.length === 0 && !capsLoading && (
              <div className="text-sm text-muted-foreground">No alerts right now.</div>
            )}
            {notifications.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    )}
                  </div>
                  {item.actionLabel && item.onAction && (
                    <Button size="sm" variant="secondary" onClick={item.onAction}>
                      <Settings className="mr-2 h-4 w-4" />
                      {item.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
