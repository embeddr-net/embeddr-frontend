import React from "react";
import { SystemResourceBar } from "@embeddr/react-ui";

export function SystemResourcesWidget() {
  return (
    <div className="flex items-center">
      <SystemResourceBar variant="compact" />
    </div>
  );
}
