import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from "@embeddr/react-ui/ui";
import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from "lucide-react";
import { PluginConfigCard } from "./PluginSettings";
import type { LotusCapability } from "@/lib/api/types";
import type { PluginCapabilities } from "@/lib/api/endpoints/analysis";
import {
  fetchAnalysisCapabilities,
  fetchAnalysisConfigs,
  setAnalysisConfig,
} from "@/lib/api/endpoints/analysis";
import { embeddrApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface Props {
  scope?: "global" | "collection";
  scopeId?: string | null;
}

interface WorkflowStep {
  id: string;
  pluginName: string;
  label: string;
  description?: string;
  priority: number;
  enabled: boolean;
  originalPriority: number;
  isDirty: boolean;
  tags: Array<string>;
}

const CORE_PRESET = [
  { pluginName: "embeddr-thumbnailer", label: "Thumbnailer", priority: 20 },
  { pluginName: "embeddr-embeddings", label: "Embeddings", priority: 10 },
];

const INGESTION_KEYWORDS = ["ingest", "thumbnail", "embedding", "embed", "scanner"];

const isIngestionCapability = (cap: LotusCapability) => {
  if (cap.tags?.includes("ingest")) return true;
  const id = String(cap.id || "").toLowerCase();
  const title = String(cap.title || "").toLowerCase();
  const slot = String(cap.slot || "").toLowerCase();
  return INGESTION_KEYWORDS.some(
    (key) => id.includes(key) || title.includes(key) || slot.includes(key),
  );
};

const isBackfillCapability = (label?: string) =>
  String(label || "")
    .toLowerCase()
    .includes("backfill");

const isIngestionAnalysisCap = (cap: any) => {
  const tags = cap.tags || [];
  if (tags.includes("ingest")) return true;
  const name = String(cap.name || "").toLowerCase();
  const label = String(cap.label || "").toLowerCase();
  const trigger = String(cap.trigger_event || "").toLowerCase();
  return INGESTION_KEYWORDS.some(
    (key) => name.includes(key) || label.includes(key) || trigger.includes(key),
  );
};

const pickPrimaryCapability = (caps: Array<any>) => {
  if (caps.length === 0) return null;
  const ranked = [...caps].sort((a, b) => {
    const score = (cap: any) => {
      const label = String(cap.label || cap.name || "").toLowerCase();
      let s = 0;
      if (label.includes("generate")) s += 3;
      if (label.includes("thumbnail")) s += 3;
      if (label.includes("embedding")) s += 2;
      if (label.includes("ingest")) s += 2;
      if (label.includes("scan")) s += 1;
      if (isBackfillCapability(label)) s -= 5;
      return s;
    };
    return score(b) - score(a);
  });
  return ranked[0];
};

export const IngestionWorkflowEditor = ({ scope = "global", scopeId }: Props) => {
  const queryClient = useQueryClient();
  const effectiveScopeId = scopeId || undefined;
  const [selectedPluginForConfig, setSelectedPluginForConfig] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);

  // 1. Fetching Data
  const { data: configs, isLoading: loadingConfigs } = useQuery({
    queryKey: ["analysis-config", scope, effectiveScopeId],
    queryFn: () => fetchAnalysisConfigs(scope, effectiveScopeId),
  });

  const { data: capabilities, isLoading: loadingCaps } = useQuery({
    queryKey: ["analysis-capabilities"],
    queryFn: fetchAnalysisCapabilities,
  });

  const { data: lotusCaps, isLoading: loadingLotusCaps } = useQuery({
    queryKey: ["lotus", "capabilities", "ingestion"],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: setAnalysisConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["analysis-config", scope, effectiveScopeId],
      });
    },
  });

  const effectiveCapabilities = useMemo<Array<PluginCapabilities>>(() => {
    if (capabilities && capabilities.length > 0) {
      return capabilities.map((plugin) => ({
        ...plugin,
        capabilities: (plugin.capabilities || []).filter(isIngestionAnalysisCap),
      }));
    }
    const items = lotusCaps?.items || [];
    if (items.length === 0) return [];

    const byPlugin = new Map<string, PluginCapabilities>();
    items.forEach((cap) => {
      if (!isIngestionCapability(cap)) return;
      const pluginName = cap.plugin || cap.id?.split(".")[0];
      if (!pluginName) return;
      if (!byPlugin.has(pluginName)) {
        byPlugin.set(pluginName, {
          plugin_name: pluginName,
          capabilities: [],
        });
      }
      byPlugin.get(pluginName)?.capabilities.push({
        name: cap.id,
        label: cap.title || cap.id,
        supported_types: [],
        trigger_event: cap.kind,
        priority: cap.data?.priority ?? 10,
        tags: cap.tags || [],
      } as any);
    });

    return Array.from(byPlugin.values());
  }, [capabilities, lotusCaps?.items]);

  const presetMissing = useMemo(() => {
    if (!effectiveCapabilities || effectiveCapabilities.length === 0) return [];
    const available = new Set(effectiveCapabilities.map((p) => p.plugin_name));
    return CORE_PRESET.filter((p) => !available.has(p.pluginName)).map((p) => p.pluginName);
  }, [effectiveCapabilities]);

  const handleApplyCorePreset = async () => {
    setApplyingPreset(true);
    try {
      await Promise.all(
        CORE_PRESET.map(async (preset) => {
          const pluginCaps = effectiveCapabilities.find((p) => p.plugin_name === preset.pluginName);
          const capPriority = pluginCaps?.capabilities?.[0]?.priority;
          await mutation.mutateAsync({
            scope,
            scope_id: effectiveScopeId,
            plugin_name: preset.pluginName,
            enabled: true,
            priority: capPriority ?? preset.priority,
          });
        }),
      );
    } finally {
      setApplyingPreset(false);
    }
  };

  // 2. Transforming Data into Linear Workflow
  const { steps, availableSteps } = useMemo(() => {
    if (loadingConfigs || (loadingCaps && loadingLotusCaps))
      return { steps: [], availableSteps: [] };

    if (effectiveCapabilities.length === 0) {
      const enabledConfigs = (configs || []).filter((c) => c.enabled);
      const activeSteps = enabledConfigs.map((cfg) => ({
        id: cfg.plugin_name,
        pluginName: cfg.plugin_name,
        label: cfg.plugin_name,
        description: `Configured step: ${cfg.plugin_name}`,
        priority: cfg.priority ?? 10,
        originalPriority: cfg.priority ?? 10,
        enabled: cfg.enabled,
        isDirty: false,
        tags: [],
      }));
      return {
        steps: activeSteps.sort((a, b) => b.priority - a.priority),
        availableSteps: [],
      };
    }

    const activeSteps: Array<WorkflowStep> = [];
    const inactiveSteps: Array<WorkflowStep> = [];

    effectiveCapabilities.forEach((p: PluginCapabilities) => {
      const caps = (p.capabilities || []).filter(isIngestionAnalysisCap);
      if (caps.length === 0) return;
      const primaryCap = pickPrimaryCapability(caps);
      if (!primaryCap) return;

      const fullId = `${p.plugin_name}:${primaryCap.name}`;
      const cfg = configs?.find((c) => c.plugin_name === fullId || c.plugin_name === p.plugin_name);

      const enabled = cfg ? cfg.enabled : false;
      const priority = cfg?.priority ?? primaryCap.priority ?? 10;

      const step: WorkflowStep = {
        id: p.plugin_name,
        pluginName: p.plugin_name,
        label: primaryCap.label || primaryCap.name || p.plugin_name,
        description: `Provided by ${p.plugin_name}`,
        priority,
        originalPriority: primaryCap.priority ?? 10,
        enabled,
        isDirty: false,
        tags: primaryCap.tags || [],
      };

      if (enabled) activeSteps.push(step);
      else inactiveSteps.push(step);
    });

    // Sort by Priority Descending (Highest runs first)
    return {
      steps: activeSteps.sort((a, b) => b.priority - a.priority),
      availableSteps: inactiveSteps.sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [effectiveCapabilities, configs, loadingConfigs, loadingCaps, loadingLotusCaps]);

  // 3. Handlers
  const handleAdd = (step: WorkflowStep) => {
    // Add to END of list (Lowest priority)
    const lowestPrio = steps.length > 0 ? steps[steps.length - 1].priority : 10;
    const newPrio = Math.max(0, lowestPrio - 1);

    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: step.id,
      enabled: true,
      priority: newPrio,
    });
  };

  const handleRemove = (step: WorkflowStep) => {
    // Just disable it
    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: step.id,
      enabled: false,
      priority: step.priority,
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    const current = newSteps[index];
    const target = newSteps[targetIndex];

    // Swap Priorities logic
    const tempPrio = current.priority;
    current.priority = target.priority;
    target.priority = tempPrio;

    if (current.priority === target.priority) {
      if (direction === "up") current.priority += 1;
      else current.priority -= 1;
    }

    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: current.id,
      enabled: current.enabled,
      priority: current.priority,
    });
    mutation.mutate({
      scope,
      scope_id: effectiveScopeId,
      plugin_name: target.id,
      enabled: target.enabled,
      priority: target.priority,
    });
  };

  if (loadingConfigs || loadingCaps)
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    );

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ingestion Pipeline</CardTitle>
              <CardDescription>
                Customize steps that run when new artifacts are scanned. Steps execute in order from
                Top (High Priority) to Bottom.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleApplyCorePreset}
                disabled={applyingPreset || presetMissing.length > 0}
                className="gap-2"
                title={
                  presetMissing.length > 0
                    ? `Missing plugins: ${presetMissing.join(", ")}`
                    : "Enable thumbnails + embeddings"
                }
              >
                {applyingPreset ? "Applying..." : "Quick setup: core"}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Step
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b font-medium bg-muted/30">Available Actions</div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {availableSteps.length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No additional actions found.
                      </div>
                    )}
                    {availableSteps.map((step) => (
                      <button
                        key={step.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md flex items-center justify-between group"
                        onClick={() => handleAdd(step)}
                      >
                        <span>{step.label}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {step.pluginName}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card transition-all group"
              >
                {/* Ordering Controls */}
                <div className="flex flex-col gap-0 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === 0}
                    onClick={() => handleMove(index, "up")}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === steps.length - 1}
                    onClick={() => handleMove(index, "down")}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>

                {/* Step Icon/Number */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-transparent group-hover:ring-primary/20">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate">{step.label}</h4>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {step.pluginName}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      P{step.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedPluginForConfig(step.pluginName)}
                    title="Configure Step"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(step)}
                    title="Remove Step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {steps.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                Pipeline is empty. Add steps to configure ingestion.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedPluginForConfig}
        onOpenChange={(o) => !o && setSelectedPluginForConfig(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {selectedPluginForConfig}</DialogTitle>
          </DialogHeader>
          {selectedPluginForConfig && (
            <div className="pt-2">
              <PluginConfigCard pluginId={selectedPluginForConfig} showHeader={false} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
