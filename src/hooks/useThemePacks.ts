import { useCallback, useEffect, useState } from "react";
import type { ThemePack } from "@/lib/themePacks";
import { useSettingsStore } from "@/store/settingsStore";
import { useUserStore } from "@/store/userStore";
import { loadThemePacks } from "@/lib/themePacks";

export function useThemePacks() {
  const themePackSources = useSettingsStore((s) => s.themePackSources);
  const apiKey = useUserStore((s) => s.apiKey);
  const [packs, setPacks] = useState<Array<ThemePack>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await loadThemePacks(themePackSources);
      setPacks(data);
    } finally {
      setIsLoading(false);
    }
  }, [themePackSources]);

  useEffect(() => {
    reload();
  }, [reload, apiKey]);

  return { packs, isLoading, reload };
}
