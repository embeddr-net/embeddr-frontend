import React from "react";
import { SystemMetricsWidget } from "@/components/widgets/SystemMetricsWidget";
import { TaskbarWidget } from "@/components/widgets/TaskbarWidget";
import { ZenToggleWidget } from "@/components/widgets/ZenToggleWidget";
import { WindowListWidget } from "@/components/widgets/WindowListWidget";
import { HidePanelsWidget } from "@/components/widgets/HidePanelsWidget";
import { NavWidget } from "@/components/widgets/NavWidget";
import { SettingsWidget } from "@/components/widgets/SettingsWidget";
import { ConnectionWidget } from "@/components/widgets/ConnectionWidget";
import { NotificationsWidget } from "@/components/notifications/NotificationsWidget";
import { WorkspaceWidget } from "@/components/widgets/WorkspaceWidget";

export type CommandBarWidgetScope = "zen" | "global";

export interface CommandBarWidgetDefinition {
  id: string;
  label: string;
  defaultSection: "left" | "center" | "right";
  defaultOrder: number;
  scope?: CommandBarWidgetScope;
  component: React.ReactNode;
}

export const DEFAULT_WIDGETS: Array<CommandBarWidgetDefinition> = [
  {
    id: "nav",
    label: "Navigation",
    defaultSection: "left",
    defaultOrder: 0,
    scope: "global",
    component: <NavWidget />,
  },
  {
    id: "zen-toggle-btn",
    label: "Zen Toggle",
    defaultSection: "left",
    defaultOrder: 1,
    scope: "zen",
    component: <ZenToggleWidget />,
  },
  {
    id: "window-list",
    label: "Window List",
    defaultSection: "left",
    defaultOrder: 5,
    scope: "zen",
    component: <WindowListWidget />,
  },
  {
    id: "hide-all-toggle",
    label: "Hide Toggle",
    defaultSection: "left",
    defaultOrder: 6,
    scope: "zen",
    component: <HidePanelsWidget />,
  },
  {
    id: "workspace",
    label: "Workspace",
    defaultSection: "right",
    defaultOrder: 8,
    scope: "zen",
    component: <WorkspaceWidget />,
  },
  {
    id: "taskbar",
    label: "Taskbar",
    defaultSection: "right",
    defaultOrder: 10,
    scope: "zen",
    component: <TaskbarWidget />,
  },
  {
    id: "notifications",
    label: "Notifications",
    defaultSection: "right",
    defaultOrder: 80,
    scope: "global",
    component: <NotificationsWidget />,
  },
  {
    id: "system-metrics",
    label: "Metrics",
    defaultSection: "right",
    defaultOrder: 85,
    scope: "global",
    component: <SystemMetricsWidget />,
  },
  {
    id: "settings",
    label: "Settings",
    defaultSection: "right",
    defaultOrder: 90,
    scope: "global",
    component: <SettingsWidget />,
  },
  {
    id: "connection",
    label: "Connection",
    defaultSection: "center",
    defaultOrder: 95,
    scope: "global",
    component: <ConnectionWidget />,
  },
];

export const DEFAULT_WIDGETS_BY_ID = DEFAULT_WIDGETS.reduce(
  (acc, widget) => {
    acc[widget.id] = widget;
    return acc;
  },
  {} as Record<string, CommandBarWidgetDefinition>,
);
