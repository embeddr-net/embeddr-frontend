import React, { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { DynamicPluginComponent } from "@/plugins/DynamicLoader";
import { extendApiForPlugin, useEmbeddrAPI, usePluginStore } from "@/plugins/store";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

export const DockManager: React.FC = () => {
  const api = useEmbeddrAPI();
  const { dockEnabled, dockPlacement, dockAutoHide, dockConfig } = useSettingsStore(
    useShallow((s) => ({
      dockEnabled: s.dockEnabled,
      dockPlacement: s.dockPlacement,
      dockAutoHide: s.dockAutoHide,
      dockConfig: s.dockConfig,
    })),
  );
  const { plugins, activePlugins } = usePluginStore(
    useShallow((s) => ({ plugins: s.plugins, activePlugins: s.activePlugins })),
  );

  const dockComponents = useMemo(() => {
    const out: Array<{ pluginId: string; def: any }> = [];
    activePlugins.forEach((pluginId) => {
      const plugin = plugins[pluginId];
      if (!plugin?.components) return;
      plugin.components.forEach((comp: any) => {
        if (comp.location === "zen-dock") {
          out.push({ pluginId, def: comp });
        }
      });
    });
    return out
      .map(({ pluginId, def }) => {
        const base = def?.id || def?.exportName || def?.label || "dock";
        const id = `dock:${pluginId}/${base}`;
        const config = dockConfig[id] || {};
        const order = config.order ?? def?.props?.order ?? 50;
        const visible = config.visible ?? true;
        return { pluginId, def, id, order, visible };
      })
      .filter((item) => item.visible)
      .sort((a, b) => a.order - b.order);
  }, [activePlugins, plugins, dockConfig]);

  if (!dockEnabled || !dockComponents.length) return null;

  const placementClass =
    dockPlacement === "top"
      ? "inset-x-0 top-[var(--layout-screen-safe-top)]"
      : dockPlacement === "left"
        ? "left-3 top-1/2 -translate-y-1/2"
        : dockPlacement === "right"
          ? "right-3 top-1/2 -translate-y-1/2"
          : "inset-x-0 bottom-[var(--layout-screen-safe-bottom)]";

  const axisClass = dockPlacement === "left" || dockPlacement === "right" ? "flex-col" : "flex-row";

  return (
    <div
      className={cn("group fixed z-[55] flex items-end justify-center pb-3", placementClass)}
      style={{
        paddingBottom: "max(0.75rem, var(--layout-screen-safe-bottom))",
      }}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-3 py-2 shadow-lg backdrop-blur transition-all",
          axisClass,
          dockAutoHide &&
            "opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto",
        )}
      >
        {dockComponents.map(({ pluginId, def, id }) => {
          const apiForPlugin = extendApiForPlugin(api, pluginId);
          const componentName = def.exportName || def.id || def.label;
          return (
            <DynamicPluginComponent
              key={id}
              pluginId={pluginId}
              componentName={componentName}
              api={apiForPlugin}
              {...(def.props || {})}
            />
          );
        })}
      </div>
    </div>
  );
};
