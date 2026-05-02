import { Outlet, createFileRoute } from "@tanstack/react-router";

const PipelinesLayout = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/pipelines")({
  component: PipelinesLayout,
});
