import { createFileRoute } from "@tanstack/react-router";
import PluginPage from "@/pages/PluginPage";

const PluginPageRoute = () => {
  const { pluginId, pageId } = Route.useParams();
  return <PluginPage pluginId={pluginId} pageId={pageId} />;
};

export const Route = createFileRoute("/plugins/$pluginId/$pageId")({
  component: PluginPageRoute,
});
