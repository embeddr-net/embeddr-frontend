export type ThemePackTokens = {
  light?: Record<string, string>
  dark?: Record<string, string>
}

export type ThemePack = {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  preview?: string
  iconUrl?: string
  bannerUrl?: string
  tokens?: ThemePackTokens
  css?: string
  cssUrl?: string
}

type ThemePackManifest = ThemePack & {
  icon?: string
  banner?: string
  cssFile?: string
}

export type ThemePackIndex = {
  packs: ThemePack[]
}

import { fetchWithAuth } from '@/lib/api/fetch'
import { BACKEND_URL } from '@/lib/api/config'

const THEME_STYLE_ID = 'embeddr-theme-pack-css'

export async function loadThemePacks(
  sources: string[] = [],
): Promise<ThemePack[]> {
  const packs = new Map<string, ThemePack>()

  const addPack = (pack?: ThemePack) => {
    if (!pack || !pack.id) return
    packs.set(pack.id, pack)
  }

  const addIndex = (index?: ThemePackIndex) => {
    if (!index?.packs) return
    index.packs.forEach((pack) => addPack(pack))
  }

  try {
    const baseUrl = (BACKEND_URL || '').replace(/\/+$/, '')
    const hasApiPrefix = /\/api\/v1$/.test(baseUrl)
    const apiBase = baseUrl ? `${baseUrl}${hasApiPrefix ? '' : '/api/v1'}` : ''
    const assetBase = baseUrl ? baseUrl.replace(/\/api\/v1$/, '') : ''
    const themeUrl = apiBase ? `${apiBase}/themes` : '/api/v1/themes'
    const res = await fetchWithAuth(themeUrl, { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as ThemePackIndex
      const normalized: ThemePackIndex = {
        packs: (data.packs || []).map((pack) => ({
          ...pack,
          iconUrl:
            pack.iconUrl && pack.iconUrl.startsWith('/') && assetBase
              ? `${assetBase}${pack.iconUrl}`
              : pack.iconUrl,
          bannerUrl:
            pack.bannerUrl && pack.bannerUrl.startsWith('/') && assetBase
              ? `${assetBase}${pack.bannerUrl}`
              : pack.bannerUrl,
          cssUrl:
            pack.cssUrl && pack.cssUrl.startsWith('/') && assetBase
              ? `${assetBase}${pack.cssUrl}`
              : pack.cssUrl,
        })),
      }
      addIndex(normalized)
    }
  } catch {
    // ignore missing bundled packs
  }

  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      const data = (await res.json()) as ThemePackIndex | ThemePackManifest
      if ('packs' in data) {
        addIndex(data)
      } else {
        const baseUrl = new URL(url, window.location.href)
        const withResolvedAssets: ThemePack = {
          ...data,
          iconUrl:
            data.iconUrl ||
            (data.icon ? new URL(data.icon, baseUrl).toString() : undefined),
          bannerUrl:
            data.bannerUrl ||
            (data.banner
              ? new URL(data.banner, baseUrl).toString()
              : undefined),
          cssUrl:
            data.cssUrl ||
            (data.cssFile
              ? new URL(data.cssFile, baseUrl).toString()
              : undefined),
        }
        addPack(withResolvedAssets)
      }
    } catch {
      // ignore invalid sources
    }
  }

  return Array.from(packs.values())
}

export function applyThemePackCss(pack?: ThemePack | null) {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(THEME_STYLE_ID)
  if (existing?.parentElement) {
    existing.parentElement.removeChild(existing)
  }

  if (!pack) return

  if (pack.css) {
    const style = document.createElement('style')
    style.id = THEME_STYLE_ID
    style.textContent = pack.css
    document.head.appendChild(style)
    return
  }

  if (pack.cssUrl) {
    const link = document.createElement('link')
    link.id = THEME_STYLE_ID
    link.rel = 'stylesheet'
    link.href = pack.cssUrl
    document.head.appendChild(link)
  }
}

export function applyThemePackTokens(
  root: HTMLElement,
  pack: ThemePack | null | undefined,
  mode: 'light' | 'dark',
) {
  if (!pack?.tokens) return
  const tokens = mode === 'dark' ? pack.tokens.dark : pack.tokens.light
  if (!tokens) return
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}
