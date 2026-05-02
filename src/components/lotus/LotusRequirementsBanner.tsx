import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card } from "@embeddr/react-ui/ui";
import { RefreshCw, Settings, X } from "lucide-react";
import type { LotusCapability } from "@/lib/api/types";
import { embeddrApi } from "@/lib/api/client";
import { useEmbeddrAPI } from "@/plugins/store";

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

export function LotusRequirementsBanner() {
  const api = useEmbeddrAPI();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["lotus", "capabilities", "requirements"],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  });

  const missing = React.useMemo(() => {
    const caps = data?.items || [];
    return REQUIRED_CAPS.filter((required) => !caps.some((cap) => required.match(cap)));
  }, [data]);

  if (dismissed || isLoading || missing.length === 0) return null;

  return (
    <div className="px-2 pb-2">
      <Card className="flex flex-col gap-2 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold">
            Missing core capabilities for a healthy Lotus setup
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {missing.map((req) => (
            <Badge key={req.key} variant="secondary" className="text-xs">
              {req.label}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              api.windows.spawn("embeddr-core-control-panel", "Control Panel", {
                defaultTab: "config",
              })
            }
          >
            <Settings className="mr-2 h-4 w-4" />
            Open Config
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["lotus", "capabilities", "requirements"],
              })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </Card>
    </div>
  );
}
