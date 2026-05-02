import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Play, Puzzle, Zap } from "lucide-react";
import { embeddrApi } from "@/lib/api/client";
import { useEmbeddrAPI } from "@/plugins/store";
import { useWebSocket } from "@/providers/WebSocketProvider";

export function SystemMetricsWidget() {
  const api = useEmbeddrAPI();
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();

  // Track active count from WS events directly (no round-trip needed)
  const [wsActiveCount, setWsActiveCount] = React.useState<number | null>(null);

  const capsQuery = useQuery({
    queryKey: ["lotus", "capabilities", "global_bar"],
    queryFn: () => api.lotus.list({ limit: 200 }),
    staleTime: 60000,
  });

  const pluginsQuery = useQuery({
    queryKey: ["plugins", "loaded"],
    queryFn: () => embeddrApi.plugins.list(),
    staleTime: 60000,
  });

  const artifactsQuery = useQuery({
    queryKey: ["artifacts", "count"],
    queryFn: () => embeddrApi.artifacts.list({ limit: 1, offset: 0 }),
    staleTime: 30000,
  });

  // Baseline query — syncs on page load and acts as fallback
  const activeQuery = useQuery({
    queryKey: ["executions", "active-count"],
    queryFn: async () => {
      const res = await embeddrApi.executions.activeCount();
      return res?.active ?? 0;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  React.useEffect(() => {
    if (!lastMessage?.type) return;
    const type = lastMessage.type as string;
    const data = lastMessage.data as any;

    // Artifact count changes
    if (
      type === "dataset:items_added" ||
      type === "dataset:item_updated" ||
      type === "artifact.created" ||
      type === "artifact.ingested"
    ) {
      queryClient.invalidateQueries({ queryKey: ["artifacts", "count"] });
    }

    // Execution lifecycle events carry active_count directly
    if (
      type === "execution.created" ||
      type === "execution.started" ||
      type === "execution.completed" ||
      type === "execution.failed"
    ) {
      const count = data?.active_count;
      if (typeof count === "number") {
        setWsActiveCount(count);
      } else {
        // Fallback: invalidate the query to re-fetch
        queryClient.invalidateQueries({ queryKey: ["executions", "active-count"] });
      }
    }
  }, [lastMessage, queryClient]);

  // Prefer WS-pushed count, fall back to query
  const activeCount = wsActiveCount ?? activeQuery.data ?? 0;
  const capsCount = capsQuery.data?.total ?? capsQuery.data?.items?.length ?? 0;

  return (
    <div className="flex items-center gap-2 text-muted-foreground select-none px-1 embeddr-system-metrics">
      <div
        className="flex items-center gap-1.5"
        title={artifactsQuery.data?.total + " Total Artifacts"}
      >
        <Database className="w-3 h-3 text-primary/70" />
        <span className="font-mono hover:text-primary hover:font-bold ">
          {artifactsQuery.data?.total ?? 0}
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={pluginsQuery.data?.length + " Loaded Plugins"}
      >
        <Puzzle className="w-3 h-3 text-blue-400/70" />
        <span className="font-mono hover:text-primary hover:font-bold ">
          {pluginsQuery.data?.length ?? 0}
        </span>
      </div>
      <div className="flex items-center gap-1.5" title={capsCount + " Capabilities"}>
        <Zap className="w-3 h-3 text-yellow-500/70" />
        <span className="font-mono hover:text-primary hover:font-bold ">{capsCount}</span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={`${activeCount} active execution${activeCount !== 1 ? "s" : ""}`}
      >
        <Play
          className={`w-3 h-3 ${activeCount > 0 ? "text-emerald-400 animate-pulse" : "text-emerald-400/70"}`}
        />
        <span
          className={`font-mono hover:text-primary hover:font-bold ${activeCount > 0 ? "text-emerald-400" : ""}`}
        >
          {activeCount}
        </span>
      </div>
    </div>
  );
}
