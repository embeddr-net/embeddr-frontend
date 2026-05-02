import { createFileRoute } from "@tanstack/react-router";
import { ActionGraphPage } from "@/pages/ActionGraphPage";

export const Route = createFileRoute("/actions/")({
  component: ActionGraphPage,
});
