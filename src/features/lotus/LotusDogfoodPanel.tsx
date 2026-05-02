import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@embeddr/react-ui/ui";
import { RefreshCw, Search } from "lucide-react";
import type { LotusResultItem } from "./types";
import { useEmbeddrAPI } from "@/plugins/store";

export function LotusDogfoodPanel() {
  const api = useEmbeddrAPI();
  const [query, setQuery] = useState("");

  const capabilitiesQuery = useQuery({
    queryKey: ["lotus", "capabilities"],
    queryFn: () => api.lotus.list({ limit: 200 }),
  });

  const queryResult = useQuery({
    queryKey: ["lotus", "query", query],
    queryFn: () => api.lotus.query(query, 25),
    enabled: false,
  });

  const capabilities = capabilitiesQuery.data?.items || [];
  const results = queryResult.data?.results || [];

  const counts = useMemo(() => {
    const byKind: Record<string, number> = {};
    for (const item of capabilities) {
      byKind[item.kind] = (byKind[item.kind] || 0) + 1;
    }
    return byKind;
  }, [capabilities]);

  const runQuery = () => {
    if (!query.trim()) return;
    queryResult.refetch();
  };

  return (
    <Card className="border-muted/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Lotus API Dogfood</CardTitle>
          <div className="text-xs text-muted-foreground">
            Uses the shared plugin API hook to list capabilities and run queries.
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => capabilitiesQuery.refetch()}
          disabled={capabilitiesQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(counts).map(([kind, count]) => (
            <Badge key={kind} variant="secondary" className="text-[11px]">
              {kind}: {count}
            </Badge>
          ))}
          <Badge variant="outline" className="text-[11px]">
            total: {capabilities.length}
          </Badge>
        </div>

        <Tabs defaultValue="capabilities" className="w-full">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
          </TabsList>

          <TabsContent value="capabilities" className="mt-3">
            <ScrollArea className="h-48 rounded-md border">
              <div className="flex flex-col gap-2 p-3 text-xs">
                {capabilities.length === 0 ? (
                  <div className="text-muted-foreground">No capabilities registered yet.</div>
                ) : (
                  capabilities.map((cap) => (
                    <div
                      key={cap.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium">{cap.title}</span>
                        <span className="text-[10px] text-muted-foreground">{cap.id}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {cap.kind}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="query" className="mt-3">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try: nav, action, plugin name..."
              />
              <Button onClick={runQuery} disabled={!query.trim()}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
            <ScrollArea className="mt-3 h-40 rounded-md border">
              <div className="flex flex-col gap-2 p-3 text-xs">
                {queryResult.isFetching ? (
                  <div className="text-muted-foreground">Running query...</div>
                ) : results.length === 0 ? (
                  <div className="text-muted-foreground">No results yet.</div>
                ) : (
                  results.map((item: LotusResultItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium">{item.title}</span>
                        <span className="text-[10px] text-muted-foreground">{item.id}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {item.kind}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
