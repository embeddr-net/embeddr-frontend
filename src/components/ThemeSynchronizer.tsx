import { useEffect, useMemo, useRef } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useThemePacks } from '@/hooks/useThemePacks'
import { applyThemePackCss } from '@/lib/themePacks'

const CUSTOM_CSS_ID = 'embeddr-custom-css'

export function ThemeSynchronizer() {
  const {
    themeMode,
    themePackLightId,
    themePackDarkId,
    customCss,
    customCssEnabled,
  } = useSettingsStore()
  const { packs } = useThemePacks()
  const appliedTokensRef = useRef<Set<string>>(new Set())

  const resolveMode = useMemo(() => {
    if (themeMode !== 'system') return themeMode
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }, [themeMode])

  const activePackId =
    resolveMode === 'dark' ? themePackDarkId : themePackLightId
  const activePack =
    activePackId && activePackId !== 'default'
      ? packs.find((pack) => pack.id === activePackId) || null
      : null

  const getTokensForMode = (
    pack: typeof activePack,
    modeKey: 'light' | 'dark',
  ) => {
    if (!pack?.tokens) return null
    return (
      pack.tokens[modeKey] ||
      pack.tokens[modeKey === 'dark' ? 'light' : 'dark'] ||
      null
    )
  }

  useEffect(() => {
    const root = document.documentElement
    const appRoot = document.getElementById('embeddr-app-root')

    const modeKey = resolveMode === 'dark' ? 'dark' : 'light'

    // Remove tokens from previous pack
    appliedTokensRef.current.forEach((key) => {
      root.style.removeProperty(key)
      appRoot?.style.removeProperty(key)
    })
    appliedTokensRef.current.clear()

    const tokens = getTokensForMode(activePack, modeKey)
    if (tokens) {
      Object.entries(tokens).forEach(([key, value]) => {
        root.style.setProperty(key, value)
        appRoot?.style.setProperty(key, value)
        appliedTokensRef.current.add(key)
      })
    }

    applyThemePackCss(activePack)

    if (typeof document !== 'undefined') {
      const existing = document.getElementById(CUSTOM_CSS_ID)
      if (existing?.parentElement) {
        existing.parentElement.removeChild(existing)
      }
      if (customCssEnabled && customCss?.trim()) {
        const style = document.createElement('style')
        style.id = CUSTOM_CSS_ID
        style.textContent = customCss
        document.head.appendChild(style)
      }
    }

    // Also style element might be needed if we want to ensure it sticks,
    // but setting on root style is usually enough for variables.

    return () => {
      // Cleanup? usually not needed as we just overwrite.
    }
  }, [activePack, resolveMode, customCss, customCssEnabled])

  useEffect(() => {
    if (themeMode !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const modeKey = mediaQuery.matches ? 'dark' : 'light'
      const packId = modeKey === 'dark' ? themePackDarkId : themePackLightId
      const nextPack =
        packId && packId !== 'default'
          ? packs.find((pack) => pack.id === packId) || null
          : null

      const nextAppRoot = document.getElementById('embeddr-app-root')
      appliedTokensRef.current.forEach((key) => {
        document.documentElement.style.removeProperty(key)
        nextAppRoot?.style.removeProperty(key)
      })
      appliedTokensRef.current.clear()

      const nextTokens = getTokensForMode(nextPack, modeKey)
      if (nextTokens) {
        Object.entries(nextTokens).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value)
          nextAppRoot?.style.setProperty(key, value)
          appliedTokensRef.current.add(key)
        })
      }

      applyThemePackCss(nextPack)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeMode, packs, themePackDarkId, themePackLightId])

  return null
}
