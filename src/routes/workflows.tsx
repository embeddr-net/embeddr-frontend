import { createFileRoute } from "@tanstack/react-router";
import WorkflowArtifactsPage from "@/pages/WorkflowArtifactsPage";

export const Route = createFileRoute("/workflows")({
  component: WorkflowArtifactsPage,
});
