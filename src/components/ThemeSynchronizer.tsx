import { useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/hooks/useTheme'
import { themes, type ThemeColor } from '@/lib/themes'

export function ThemeSynchronizer() {
  const { themeColor } = useSettingsStore()
  const { theme: mode } = useTheme()

  useEffect(() => {
    const root = document.documentElement

    // Apply Colors
    const theme = themes[themeColor as ThemeColor] || themes.zinc

    const isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    const cssVars = isDark ? theme.cssVars.dark : theme.cssVars.light

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Also style element might be needed if we want to ensure it sticks,
    // but setting on root style is usually enough for variables.

    return () => {
      // Cleanup? usually not needed as we just overwrite.
    }
  }, [themeColor, mode])

  useEffect(() => {
    if (mode !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const isDark = mediaQuery.matches
      const theme = themes[themeColor as ThemeColor] || themes.zinc
      const cssVars = isDark ? theme.cssVars.dark : theme.cssVars.light

      Object.entries(cssVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mode, themeColor])

  return null
}
