import React, { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";

const ZenPage = React.lazy(() => import("@/pages/ZenPage"));

export const Route = createFileRoute("/")({
  component: () => (
    <Suspense fallback={<AppLoadingScreen />}>
      <ZenPage />
    </Suspense>
  ),
});
