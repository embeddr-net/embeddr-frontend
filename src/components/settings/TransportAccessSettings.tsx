import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Input,
  Label,
  ScrollArea,
  Switch,
} from "@embeddr/react-ui/ui";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { embeddrApi } from "@/lib/api/client";

type TransportDescriptor = {
  key: string;
  label: string;
  plugin: string | null;
};

type TransportPolicy = {
  enabled: boolean;
  default_allow: Record<string, boolean>;
  plugin_allow: Record<string, Record<string, boolean>>;
  capability_allow: Record<string, Record<string, boolean>>;
};

const POLICY_CONFIG_ID = "embeddr-core.transport.policy";

function normalizeMap(
  map: Record<string, Record<string, boolean>>,
  key: string,
  transport: string,
  value: boolean,
  fallback: boolean,
) {
  const next = { ...map };
  const existing = { ...(next[key] || {}) };
  if (value === fallback) {
    delete existing[transport];
  } else {
    existing[transport] = value;
  }
  if (Object.keys(existing).length === 0) {
    delete next[key];
  } else {
    next[key] = existing;
  }
  return next;
}

export function TransportAccessSettings() {
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState<TransportPolicy>({
    enabled: false,
    default_allow: {},
    plugin_allow: {},
    capability_allow: {},
  });
  const [capSearch, setCapSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: policyResponse, isLoading: isPolicyLoading } = useQuery({
    queryKey: ["config", "transport-policy"],
    queryFn: () => embeddrApi.config.get("embeddr-core", { config_id: POLICY_CONFIG_ID }),
  });

  const { data: pluginsResponse } = useQuery({
    queryKey: ["plugins", "list"],
    queryFn: () => embeddrApi.plugins.list(),
  });

  const { data: pluginLogos } = useQuery({
    queryKey: ["plugins", "logos"],
    queryFn: () => embeddrApi.plugins.listLogos(),
  });

  const { data: capsResponse } = useQuery({
    queryKey: ["lotus", "caps", "actions"],
    queryFn: () => embeddrApi.lotus.list({ kind: "action", limit: 500 }),
  });

  const { data: transportCapsResponse } = useQuery({
    queryKey: ["lotus", "caps", "transport"],
    queryFn: () => embeddrApi.lotus.list({ kind: "transport", limit: 200 }),
  });

  const transports = useMemo<Array<TransportDescriptor>>(() => {
    const base: Array<TransportDescriptor> = [
      { key: "api", label: "API", plugin: null },
      { key: "lotus", label: "Lotus", plugin: null },
    ];

    const items = transportCapsResponse?.items || [];
    const derived = items.map((cap) => {
      const tags = Array.isArray(cap.tags) ? cap.tags : [];
      const tagKey = tags.find((tag) => tag && tag !== "transport");
      let key = tagKey || cap.data?.transport || cap.id || "";

      if (!tagKey && typeof cap.id === "string" && cap.id.endsWith(".transport")) {
        const baseId = cap.id.slice(0, -".transport".length);
        const last = baseId.split(".").pop() || baseId;
        key = last.replace("embeddr-transport-", "");
      }

      const label = cap.ui?.badge || cap.title || key || "Transport";
      return {
        key,
        label,
        plugin: cap.plugin || null,
      };
    });

    const seen = new Set<string>(base.map((item) => item.key));
    const merged = [...base];
    for (const transport of derived) {
      if (!transport.key || seen.has(transport.key)) continue;
      seen.add(transport.key);
      merged.push(transport);
    }
    return merged;
  }, [transportCapsResponse]);

  const defaultAllowFallback = useMemo(() => {
    const map: Record<string, boolean> = {};
    transports.forEach((transport) => {
      map[transport.key] = false;
    });
    return map;
  }, [transports]);

  const basePolicy = useMemo<TransportPolicy>(() => {
    const value = policyResponse?.value;
    if (!value || typeof value !== "object") {
      return {
        enabled: false,
        default_allow: { ...defaultAllowFallback },
        plugin_allow: {},
        capability_allow: {},
      };
    }
    return {
      enabled: Boolean(value.enabled),
      default_allow: {
        ...defaultAllowFallback,
        ...(value.default_allow || {}),
      },
      plugin_allow: value.plugin_allow || {},
      capability_allow: value.capability_allow || {},
    };
  }, [policyResponse, defaultAllowFallback]);

  useEffect(() => {
    setPolicy(basePolicy);
  }, [basePolicy]);

  const saveMutation = useMutation({
    mutationFn: (payload: TransportPolicy) =>
      embeddrApi.config.put("embeddr-core", {
        value: payload,
        config_id: POLICY_CONFIG_ID,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["config", "transport-policy"],
      });
    },
  });

  const isDirty = JSON.stringify(policy) !== JSON.stringify(basePolicy);

  const plugins = useMemo(() => {
    const items = (pluginsResponse || []) as Array<{
      id?: string;
      name?: string;
    }>;
    return items
      .map((plugin) => plugin.name || plugin.id || "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [pluginsResponse]);

  const enabledTransports = useMemo(() => {
    const set = new Set(plugins);
    return transports.filter((transport) => !transport.plugin || set.has(transport.plugin));
  }, [plugins, transports]);

  const resolveLogo = (pluginName?: string | null) => {
    if (!pluginName) return null;
    return pluginLogos?.logos?.[pluginName] || null;
  };

  const renderLogo = (pluginName?: string | null) => {
    const logo = resolveLogo(pluginName);
    const fallback = pluginName ? pluginName.slice(0, 2).toUpperCase() : "NA";
    return (
      <Avatar className="h-6 w-6">
        <AvatarImage src={logo || undefined} alt={pluginName || "Plugin"} />
        <AvatarFallback className="text-[10px]">{fallback}</AvatarFallback>
      </Avatar>
    );
  };

  const caps = useMemo(() => {
    const items = capsResponse?.items || [];
    const search = capSearch.trim().toLowerCase();
    const filtered = search
      ? items.filter((cap) =>
          `${cap.id} ${cap.title} ${cap.plugin || ""}`.toLowerCase().includes(search),
        )
      : items;
    return filtered;
  }, [capsResponse, capSearch]);

  const updateDefaultAllow = (transport: string, value: boolean) => {
    setPolicy((prev) => ({
      ...prev,
      default_allow: { ...prev.default_allow, [transport]: value },
    }));
  };

  const updatePluginAllow = (pluginName: string, transport: string, value: boolean) => {
    setPolicy((prev) => ({
      ...prev,
      plugin_allow: normalizeMap(
        prev.plugin_allow,
        pluginName,
        transport,
        value,
        prev.default_allow?.[transport] ?? false,
      ),
    }));
  };

  const updateCapabilityAllow = (capId: string, transport: string, value: boolean) => {
    setPolicy((prev) => ({
      ...prev,
      capability_allow: normalizeMap(
        prev.capability_allow,
        capId,
        transport,
        value,
        prev.default_allow?.[transport] ?? false,
      ),
    }));
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Transport Access</h3>
        <p className="text-xs text-muted-foreground">
          Control which transports (API, Lotus, MCP, CLI) can invoke plugin capabilities. When
          enabled, this policy applies as the base allow list even for admin client keys.
        </p>
      </div>

      {isPolicyLoading && <div className="text-xs text-muted-foreground">Loading policy…</div>}

      {/* Policy enable + default transport toggles */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Enable policy</div>
            <div className="text-xs text-muted-foreground">
              Enforce transport allow lists for Lotus actions.
            </div>
          </div>
          <Switch
            checked={policy.enabled}
            onCheckedChange={(value) => setPolicy((prev) => ({ ...prev, enabled: Boolean(value) }))}
          />
        </div>

        <div
          className={cn(
            "space-y-3 transition-opacity",
            !policy.enabled && "opacity-40 pointer-events-none",
          )}
        >
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Default transport access
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {enabledTransports.map((transport) => (
              <div
                key={transport.key}
                className="flex items-center justify-between gap-3 rounded border border-border/60 p-3"
              >
                <div className="flex items-center gap-2">
                  {renderLogo(transport.plugin)}
                  <div className="text-sm font-medium">{transport.label}</div>
                </div>
                <Switch
                  checked={Boolean(policy.default_allow?.[transport.key])}
                  onCheckedChange={(value) => updateDefaultAllow(transport.key, Boolean(value))}
                />
              </div>
            ))}
          </div>
          {enabledTransports.length === 1 && (
            <p className="text-xs text-muted-foreground">
              Only the API transport is available. Install transport plugins to manage MCP/CLI
              access.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPolicy(basePolicy)}
            disabled={!isDirty}
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(policy)}
            disabled={!isDirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save policy"}
          </Button>
        </div>
      </Card>

      {/* Advanced overrides — collapsed by default */}
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Advanced overrides
        <span className="text-xs font-normal ml-1">(per-plugin and per-capability)</span>
      </button>

      {showAdvanced && (
        <div
          className={cn(
            "grid grid-cols-1 xl:grid-cols-2 gap-4 transition-opacity",
            !policy.enabled && "opacity-40 pointer-events-none",
          )}
        >
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Plugin overrides</div>
              <Badge variant="outline">{plugins.length} plugins</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Override default access per plugin. Switches shown in{" "}
              <span className="text-foreground">bold</span> differ from the default.
            </p>
            <ScrollArea className="h-90 pr-2">
              <div className="space-y-2">
                {plugins.map((plugin) => (
                  <div
                    key={plugin}
                    className="flex items-center justify-between gap-3 rounded border border-border/60 p-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {renderLogo(plugin)}
                      <div className="text-xs font-medium truncate">{plugin}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {enabledTransports.map((transport) => {
                        const fallback = policy.default_allow?.[transport.key] ?? false;
                        const explicit = policy.plugin_allow?.[plugin]?.[transport.key];
                        const checked = explicit ?? fallback;
                        const hasOverride = explicit !== undefined;
                        return (
                          <div
                            key={`${plugin}-${transport.key}`}
                            className="flex items-center gap-1"
                          >
                            <Label
                              className={cn(
                                "text-[10px] uppercase",
                                hasOverride
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              {transport.label}
                            </Label>
                            <Switch
                              checked={checked}
                              onCheckedChange={(value) =>
                                updatePluginAllow(plugin, transport.key, Boolean(value))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {plugins.length === 0 && (
                  <div className="text-xs text-muted-foreground">No plugins found.</div>
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Capability overrides</div>
              <Badge variant="outline">{caps.length} actions</Badge>
            </div>
            <Input
              value={capSearch}
              onChange={(event) => setCapSearch(event.target.value)}
              placeholder="Filter by id or title…"
            />
            <ScrollArea className="h-80 pr-2">
              <div className="space-y-2">
                {caps.map((cap) => (
                  <div
                    key={cap.id}
                    className="flex items-center justify-between gap-3 rounded border border-border/60 p-2"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {renderLogo(cap.plugin)}
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{cap.id}</div>
                        {cap.title && cap.title !== cap.id && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {cap.title}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {enabledTransports.map((transport) => {
                        const fallback = policy.default_allow?.[transport.key] ?? false;
                        const explicit = policy.capability_allow?.[cap.id]?.[transport.key];
                        const checked = explicit ?? fallback;
                        const hasOverride = explicit !== undefined;
                        return (
                          <div
                            key={`${cap.id}-${transport.key}`}
                            className="flex items-center gap-1"
                          >
                            <Label
                              className={cn(
                                "text-[10px] uppercase",
                                hasOverride
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              {transport.label}
                            </Label>
                            <Switch
                              checked={checked}
                              onCheckedChange={(value) =>
                                updateCapabilityAllow(cap.id, transport.key, Boolean(value))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {caps.length === 0 && (
                  <div className="text-xs text-muted-foreground">No action capabilities found.</div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}
