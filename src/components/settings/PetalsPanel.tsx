import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@embeddr/react-ui/ui";
import { ChevronDown, ChevronRight, Cpu, Download, Loader2, RefreshCw } from "lucide-react";
import type {
  InstallPluginDepsResult,
  PetalInfo,
  PetalPluginHealth,
} from "@/lib/api/endpoints/petals";
import { fetchPetals, installPetalPluginDeps } from "@/lib/api/endpoints/petals";

function isDegraded(status: string) {
  return status === "degraded" || status === "failed";
}

function formatRelativeTime(iso?: string) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const delta = Math.max(0, Date.now() - then);
  const s = Math.round(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function PluginHealthRow({
  item,
  petalID,
  canInstall,
}: {
  item: PetalPluginHealth;
  petalID: string;
  canInstall: boolean;
}) {
  const degraded = isDegraded(item.status);
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<InstallPluginDepsResult | null>(null);
  const [showOutput, setShowOutput] = useState(false);

  const install = useMutation({
    mutationFn: (opts: { upgrade: boolean }) =>
      installPetalPluginDeps(petalID, item.name, { upgrade: opts.upgrade }),
    onSuccess: (result) => {
      setLastResult(result);
      // Refetch the petal list so plugin_health updates
      queryClient.invalidateQueries({ queryKey: ["petals"] });
    },
    onError: (err) => {
      setLastResult({
        ok: false,
        plugin: item.name,
        install: {
          ok: false,
          stdout: "",
          stderr: err instanceof Error ? err.message : String(err),
          command: "",
          returncode: -1,
        },
        health: null,
      });
    },
  });

  return (
    <div
      className={`rounded-md border p-2 text-xs ${
        degraded ? "border-destructive/30 bg-destructive/10" : "border-border/50 bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium font-mono">{item.name}</span>
        <Badge
          variant="outline"
          className={degraded ? "border-destructive/40 text-destructive" : "text-muted-foreground"}
        >
          {item.status}
        </Badge>
      </div>
      {item.error && <div className="mt-1 text-destructive/80">{item.error}</div>}
      {item.missing_deps && item.missing_deps.length > 0 && (
        <div className="mt-1 text-muted-foreground">
          Missing: <span className="font-mono">{item.missing_deps.join(", ")}</span>
        </div>
      )}
      {item.dep_hints && item.dep_hints.length > 0 && (
        <div className="mt-1 text-muted-foreground">
          Hint: <span className="font-mono">{item.dep_hints.join(", ")}</span>
        </div>
      )}
      {canInstall && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={degraded ? "default" : "outline"}
            className="h-6 gap-1 px-2 text-[11px]"
            disabled={install.isPending}
            onClick={() => install.mutate({ upgrade: false })}
          >
            {install.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            {degraded ? "Install deps" : "Reinstall"}
          </Button>
          {!degraded && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-[11px]"
              disabled={install.isPending}
              onClick={() => install.mutate({ upgrade: true })}
            >
              {install.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Update
            </Button>
          )}
          {lastResult && (
            <button
              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setShowOutput((v) => !v)}
            >
              {showOutput ? "Hide output" : "Show output"}
            </button>
          )}
        </div>
      )}
      {lastResult && showOutput && (
        <div className="mt-2 space-y-1.5">
          <div className={`text-[11px] ${lastResult.ok ? "text-green-500" : "text-destructive"}`}>
            {lastResult.ok
              ? "Install succeeded"
              : `Install failed (rc=${lastResult.install.returncode})`}
          </div>
          {lastResult.install.command && (
            <div className="rounded border border-border/50 bg-muted/30 p-1.5 font-mono text-[10px] text-muted-foreground">
              $ {lastResult.install.command}
            </div>
          )}
          {(lastResult.install.stdout || lastResult.install.stderr) && (
            <pre className="max-h-48 overflow-auto rounded border border-border/50 bg-muted/30 p-1.5 font-mono text-[10px] whitespace-pre-wrap text-muted-foreground">
              {lastResult.install.stdout}
              {lastResult.install.stderr &&
                (lastResult.install.stdout ? "\n\n" : "") + lastResult.install.stderr}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function isLocalPetal(petal: PetalInfo): boolean {
  if (!petal.http_url) return false;
  try {
    const url = new URL(petal.http_url);
    const host = url.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
  } catch {
    return false;
  }
}

function PetalCard({ petal }: { petal: PetalInfo }) {
  const [expanded, setExpanded] = useState(false);
  const health = petal.plugin_health || [];
  const degraded = health.filter((h) => isDegraded(h.status));
  const healthy = health.filter((h) => !isDegraded(h.status));
  const canInstall = isLocalPetal(petal);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 truncate">
              <Cpu className="h-4 w-4 shrink-0" />
              <span className="truncate">{petal.name}</span>
            </CardTitle>
            <CardDescription className="mt-1 font-mono text-xs">{petal.id}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {petal.stale ? (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">stale</Badge>
            ) : (
              <Badge variant="outline" className="border-green-500/30 text-green-500">
                healthy
              </Badge>
            )}
            {petal.draining && <Badge variant="outline">draining</Badge>}
            <Badge variant="outline">{petal.active_jobs} jobs</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border border-border/60 bg-muted/30 p-2">
            <div className="text-muted-foreground">Plugins</div>
            <div className="text-base font-semibold">{petal.plugins.length}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/30 p-2">
            <div className="text-muted-foreground">Capabilities</div>
            <div className="text-base font-semibold">{petal.capabilities.length}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/30 p-2">
            <div className="text-muted-foreground">Last heartbeat</div>
            <div className="text-sm font-medium">{formatRelativeTime(petal.last_heartbeat)}</div>
          </div>
        </div>

        {degraded.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-destructive">
              Degraded plugins ({degraded.length})
            </div>
            {degraded.map((item) => (
              <PluginHealthRow
                key={`${petal.id}-${item.name}`}
                item={item}
                petalID={petal.id}
                canInstall={canInstall}
              />
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-start px-2 text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronDown className="mr-1 h-3 w-3" />
          ) : (
            <ChevronRight className="mr-1 h-3 w-3" />
          )}
          {expanded ? "Hide details" : "Show details"}
        </Button>

        {expanded && (
          <div className="space-y-3 border-t border-border/60 pt-3 text-xs">
            {petal.http_url && (
              <div>
                <div className="text-muted-foreground">HTTP URL</div>
                <div className="font-mono">{petal.http_url}</div>
              </div>
            )}
            {petal.connected_at && (
              <div>
                <div className="text-muted-foreground">Connected at</div>
                <div className="font-mono">{petal.connected_at}</div>
              </div>
            )}
            {petal.max_concurrent_jobs != null && (
              <div>
                <div className="text-muted-foreground">Max concurrent jobs</div>
                <div className="font-mono">{petal.max_concurrent_jobs}</div>
              </div>
            )}
            {petal.capabilities.length > 0 && (
              <div>
                <div className="mb-1 text-muted-foreground">Capabilities</div>
                <div className="flex flex-wrap gap-1">
                  {petal.capabilities.map((c) => (
                    <Badge key={c} variant="outline" className="font-mono text-[10px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {healthy.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-muted-foreground">Plugins ({healthy.length})</div>
                {healthy.map((item) => (
                  <PluginHealthRow
                    key={`${petal.id}-${item.name}-ok`}
                    item={item}
                    petalID={petal.id}
                    canInstall={canInstall}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PetalsPanel() {
  const {
    data: petals,
    refetch,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["petals"],
    queryFn: fetchPetals,
    refetchInterval: 15000,
  });

  const degradedCount =
    petals?.reduce(
      (sum, p) => sum + (p.plugin_health || []).filter((h) => isDegraded(h.status)).length,
      0,
    ) ?? 0;

  return (
    <Card className="my-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Petals
            </CardTitle>
            <CardDescription>
              Connected compute nodes that host plugins and run executions.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{petals?.length ?? 0} connected</Badge>
          {degradedCount > 0 ? (
            <Badge className="border-destructive/40 bg-destructive/10 text-destructive">
              {degradedCount} degraded plugin{degradedCount === 1 ? "" : "s"}
            </Badge>
          ) : petals && petals.length > 0 ? (
            <Badge variant="outline" className="border-green-500/30 text-green-500">
              all healthy
            </Badge>
          ) : null}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load petals: {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {!petals || petals.length === 0 ? (
          <div className="rounded-md border border-border/60 p-6 text-center text-sm text-muted-foreground">
            No connected petals.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {petals.map((petal) => (
              <PetalCard key={petal.id} petal={petal} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
