import { useMemo } from "react";
import { usePluginStore } from "@/plugins/store";

const DEFAULT_WORKFLOW_PROVIDER_PLUGIN_ID = "embeddr-comfyui";

const pluginSupportsWorkflowRun = (plugin: any): boolean => {
  if (!plugin) return false;

  const actions = Array.isArray(plugin.actions) ? plugin.actions : [];
  return actions.some((action: any) => {
    const id = String(action?.id || "");
    const actionName = String(action?.action || action?.name || "");
    const dataAction = String(action?.data?.action || "");

    return (
      id.endsWith(".run_workflow") ||
      actionName === "run_workflow" ||
      actionName === "comfy_run_workflow" ||
      dataAction === "run_workflow"
    );
  });
};

export const resolveWorkflowProviderPluginId = (
  plugins: Record<string, any>,
  activePlugins: Array<string>,
): string => {
  for (const pluginId of activePlugins) {
    if (pluginSupportsWorkflowRun(plugins[pluginId])) {
      return pluginId;
    }
  }

  return plugins[DEFAULT_WORKFLOW_PROVIDER_PLUGIN_ID]
    ? DEFAULT_WORKFLOW_PROVIDER_PLUGIN_ID
    : activePlugins[0] || DEFAULT_WORKFLOW_PROVIDER_PLUGIN_ID;
};

export const getWorkflowProviderPluginId = (): string => {
  const state = usePluginStore.getState();
  return resolveWorkflowProviderPluginId(state.plugins, state.activePlugins);
};

export const useWorkflowProviderPluginId = (): string => {
  const plugins = usePluginStore((s) => s.plugins);
  const activePlugins = usePluginStore((s) => s.activePlugins);

  return useMemo(
    () => resolveWorkflowProviderPluginId(plugins, activePlugins),
    [plugins, activePlugins],
  );
};

export const getWorkflowEventSourceAliases = (pluginId?: string | null) => {
  const resolvedPluginId = pluginId || getWorkflowProviderPluginId();
  const aliases = new Set<string>();

  aliases.add(resolvedPluginId);

  if (resolvedPluginId.startsWith("embeddr-")) {
    aliases.add(resolvedPluginId.replace(/^embeddr-/, ""));
  }

  if (resolvedPluginId === DEFAULT_WORKFLOW_PROVIDER_PLUGIN_ID) {
    aliases.add("comfyui");
  }

  return Array.from(aliases);
};
