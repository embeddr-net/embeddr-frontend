import { useCallback, useEffect, useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { loadThemePacks, type ThemePack } from '@/lib/themePacks'

export function useThemePacks() {
  const themePackSources = useSettingsStore((s) => s.themePackSources)
  const [packs, setPacks] = useState<ThemePack[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await loadThemePacks(themePackSources)
      setPacks(data)
    } finally {
      setIsLoading(false)
    }
  }, [themePackSources])

  useEffect(() => {
    reload()
  }, [reload])

  return { packs, isLoading, reload }
}
