import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRouterState } from "@tanstack/react-router";
import type React from "react";
import { useCommandBarStore } from "@/store/commandBarStore";
// import { ClockWidget } from '@/components/widgets/ClockWidget'
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_WIDGETS, DEFAULT_WIDGETS_BY_ID } from "@/lib/commandBar/defaultWidgets";

export function useDefaultWidgets() {
  const registerWidget = useCommandBarStore((s) => s.registerWidget);
  const unregisterWidget = useCommandBarStore((s) => s.unregisterWidget);
  const widgetConfig = useSettingsStore(useShallow((s) => s.widgetConfig));
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isZenPage = pathname === "/";

  const getOrder = (id: string, defaultOrder: number) => {
    const cfg = widgetConfig[id];
    return cfg?.order ?? defaultOrder;
  };

  const getSection = (id: string, defaultLoc: "left" | "center" | "right") => {
    const cfg = widgetConfig[id];
    return cfg?.section ?? defaultLoc;
  };

  const isVisible = (id: string) => {
    const cfg = widgetConfig[id];
    return cfg?.visible ?? true;
  };

  useEffect(() => {
    const register = (
      id: string,
      component: React.ReactNode,
      defaultLoc: "left" | "center" | "right",
      defaultOrder: number,
    ) => {
      if (!isVisible(id)) return;
      registerWidget({
        id,
        component,
        location: getSection(id, defaultLoc),
        order: getOrder(id, defaultOrder),
      });
    };

    const isWidgetActive = (id: string) => {
      const def = DEFAULT_WIDGETS_BY_ID[id];
      if (!def) return true;
      if (def.scope === "zen") return isZenPage;
      return true;
    };

    DEFAULT_WIDGETS.forEach((widget) => {
      if (!isWidgetActive(widget.id)) {
        unregisterWidget(widget.id);
        return;
      }
      register(widget.id, widget.component, widget.defaultSection, widget.defaultOrder);
    });

    Object.keys(widgetConfig).forEach((id) => {
      if (!isWidgetActive(id) || !isVisible(id)) {
        unregisterWidget(id);
      }
    });
  }, [registerWidget, unregisterWidget, widgetConfig, isZenPage]); // Re-run when config or route changes
}
