import React, { useEffect, useMemo } from "react";
import { Button } from "@embeddr/react-ui/ui";
import { Box } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useRouterState } from "@tanstack/react-router";
import { useCommandBarStore } from "@/store/commandBarStore";
import { usePluginStore } from "@/plugins/store";
import { usePluginLogos } from "@/hooks/usePluginLogos";
import { lucideIconFromName } from "@/lib/lucide";
import { useWindowStore } from "@/store/windowStore";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettingsStore } from "@/store/settingsStore";

export function usePinnedPanelWidgets() {
  const registerWidget = useCommandBarStore((s) => s.registerWidget);
  const unregisterWidget = useCommandBarStore((s) => s.unregisterWidget);
  const getComponents = usePluginStore((s) => s.getComponents);
  const activePlugins = usePluginStore((s) => s.activePlugins);
  const plugins = usePluginStore((s) => s.plugins);
  const { logos } = usePluginLogos();
  const spawnWindow = useWindowStore((s) => s.spawnWindow);
  const showZenToolbar = useWindowStore((s) => s.showZenToolbar);
  const [pinnedPanels] = useLocalStorage<Array<string>>("zen-pinned-panels", []);
  const { widgetConfig } = useSettingsStore(useShallow((s) => ({ widgetConfig: s.widgetConfig })));
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isZenPage = pathname === "/";

  const pinnedPanelDefs = useMemo(() => {
    if (!pinnedPanels.length) return [];
    const overlays = getComponents("zen-overlay").filter(({ def }) => !def.options?.spawnOnly);
    const map = new Map(
      overlays.map(({ pluginId, def }) => [`${pluginId}-${def.id}`, { pluginId, def }]),
    );
    return pinnedPanels.map((id) => map.get(id)).filter(Boolean) as Array<{
      pluginId: string;
      def: any;
    }>;
  }, [getComponents, pinnedPanels, activePlugins, plugins]);

  useEffect(() => {
    const getOrder = (id: string, defaultOrder: number) => widgetConfig[id]?.order ?? defaultOrder;
    const getSection = (id: string, defaultSection: "left" | "center" | "right") =>
      widgetConfig[id]?.section ?? defaultSection;
    const isVisible = (id: string) => widgetConfig[id]?.visible ?? true;

    if (!isZenPage || !showZenToolbar) {
      pinnedPanelDefs.forEach(({ pluginId, def }) => {
        const widgetId = `pinned-panel:${pluginId}-${def.id}`;
        unregisterWidget(widgetId);
      });
      return;
    }

    pinnedPanelDefs.forEach(({ pluginId, def }, index) => {
      const componentId = `${pluginId}-${def.id}`;
      const widgetId = `pinned-panel:${componentId}`;
      if (!isVisible(widgetId)) {
        unregisterWidget(widgetId);
        return;
      }

      const PanelIcon = lucideIconFromName(def.icon) || Box;
      const logoUrl = logos?.[pluginId];

      registerWidget({
        id: widgetId,
        location: getSection(widgetId, "left"),
        order: getOrder(widgetId, 100 + index),
        component: (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={() => {
              const componentName = def.exportName || def.component;
              if (!componentName) return;
              spawnWindow(componentId, def.label, {
                pluginId,
                componentName,
                defaultPosition: def.defaultPosition,
                defaultSize: def.defaultSize,
                panelMode: def.options?.instanceMode,
                hideHeader: def.options?.hideHeader,
                transparent: def.options?.transparent,
              });
            }}
            title={def.label || def.id}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-4 h-4 rounded-sm object-contain" />
            ) : (
              <PanelIcon className="w-4 h-4" />
            )}
          </Button>
        ),
      });
    });

    return () => {
      pinnedPanelDefs.forEach(({ pluginId, def }) => {
        const widgetId = `pinned-panel:${pluginId}-${def.id}`;
        unregisterWidget(widgetId);
      });
    };
  }, [
    pinnedPanelDefs,
    logos,
    registerWidget,
    unregisterWidget,
    spawnWindow,
    widgetConfig,
    isZenPage,
    showZenToolbar,
  ]);
}
