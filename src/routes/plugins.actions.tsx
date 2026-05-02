import { createFileRoute } from "@tanstack/react-router";
import { PluginActionsPage } from "@/pages/PluginActionsPage";

export const Route = createFileRoute("/plugins/actions")({
  component: PluginActionsPage,
});
