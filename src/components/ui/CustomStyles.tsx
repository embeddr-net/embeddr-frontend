import React, { useMemo } from "react";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * Injects user-provided CSS into the document head.
 * This allows for deep styling of the UI using stable classes like
 * .embeddr-panel, .embeddr-command-bar, or .embeddr-panel-plugin-id
 */
export const CustomStyles: React.FC = () => {
  const customCss = useSettingsStore((s) => s.customCss);
  const customCssEnabled = useSettingsStore((s) => s.customCssEnabled);

  const sanitizedCss = useMemo(() => {
    if (!customCss || customCssEnabled === false) return "";
    // Basic sanitization or processing could go here if needed
    return customCss;
  }, [customCss, customCssEnabled]);

  if (!sanitizedCss) return null;

  return <style id="embeddr-custom-styles" dangerouslySetInnerHTML={{ __html: sanitizedCss }} />;
};
