import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Appearance
  backgroundImage: string | null
  setBackgroundImage: (url: string | null) => void

  backgroundOpacity: number
  setBackgroundOpacity: (opacity: number) => void

  backgroundBlur: number
  setBackgroundBlur: (blur: number) => void

  // Visual Effects
  vhsEnabled: boolean
  setVhsEnabled: (enabled: boolean) => void

  effectsEnabled: boolean
  setEffectsEnabled: (enabled: boolean) => void
  globalEffectsEnabled: boolean
  setGlobalEffectsEnabled: (enabled: boolean) => void
  effectToggles: Record<string, boolean>
  setEffectToggle: (id: string, enabled: boolean) => void
  getEffectToggle: (id: string, defaultValue?: boolean) => boolean

  // Panel Chrome
  showPluginLogos: boolean
  setShowPluginLogos: (enabled: boolean) => void

  themeMode: 'light' | 'dark' | 'system'
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void

  // Theme Packs (bound to light/dark modes)
  themePackLightId: string
  setThemePackLightId: (id: string) => void
  themePackDarkId: string
  setThemePackDarkId: (id: string) => void
  themePackSources: string[]
  setThemePackSources: (sources: string[]) => void

  // Command Bar Settings
  commandBarPosition: 'top' | 'bottom'
  setCommandBarPosition: (position: 'top' | 'bottom') => void

  commandBarShowDividers: boolean
  setCommandBarShowDividers: (show: boolean) => void

  commandBarCompact: boolean
  setCommandBarCompact: (compact: boolean) => void

  commandBarHoverParams: { enabled: boolean; delay: number } // e.g., show only on hover
  setCommandBarHoverParams: (params: {
    enabled: boolean
    delay: number
  }) => void

  widgetConfig: Record<
    string,
    { order: number; visible: boolean; section: 'left' | 'center' | 'right' }
  >
  setWidgetConfig: (
    config: Record<
      string,
      { order: number; visible: boolean; section: 'left' | 'center' | 'right' }
    >,
  ) => void
  updateWidgetConfig: (
    id: string,
    update: Partial<{
      order: number
      visible: boolean
      section: 'left' | 'center' | 'right'
    }>,
  ) => void

  dockEnabled: boolean
  setDockEnabled: (enabled: boolean) => void
  dockPlacement: 'bottom' | 'top' | 'left' | 'right'
  setDockPlacement: (placement: 'bottom' | 'top' | 'left' | 'right') => void
  dockAutoHide: boolean
  setDockAutoHide: (enabled: boolean) => void
  dockConfig: Record<string, { order: number; visible: boolean }>
  setDockConfig: (
    config: Record<string, { order: number; visible: boolean }>,
  ) => void
  updateDockConfig: (
    id: string,
    update: Partial<{ order: number; visible: boolean }>,
  ) => void

  // Generic settings map for plugins and other features
  settings: Record<string, any>
  setSetting: (key: string, value: any) => void
  getSetting: (key: string, defaultValue?: any) => any

  // Plugin specific settings namespace
  pluginSettings: Record<string, Record<string, any>>
  setPluginSetting: (pluginId: string, key: string, value: any) => void
  getPluginSetting: (pluginId: string, key: string, defaultValue?: any) => any

  customCss: string
  setCustomCss: (css: string) => void

  customCssEnabled: boolean
  setCustomCssEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      backgroundImage: null,
      setBackgroundImage: (url) => set({ backgroundImage: url }),

      backgroundOpacity: 0.1,
      setBackgroundOpacity: (opacity) => set({ backgroundOpacity: opacity }),

      backgroundBlur: 0,
      setBackgroundBlur: (blur) => set({ backgroundBlur: blur }),

      vhsEnabled: false,
      setVhsEnabled: (enabled) => set({ vhsEnabled: enabled }),

      effectsEnabled: true,
      setEffectsEnabled: (enabled) => set({ effectsEnabled: enabled }),
      globalEffectsEnabled: false,
      setGlobalEffectsEnabled: (enabled) =>
        set({ globalEffectsEnabled: enabled }),
      effectToggles: {},
      setEffectToggle: (id, enabled) =>
        set((state) => ({
          effectToggles: { ...state.effectToggles, [id]: enabled },
        })),
      getEffectToggle: (id, defaultValue = true) => {
        const val = get().effectToggles[id]
        return val !== undefined ? val : defaultValue
      },

      showPluginLogos: true,
      setShowPluginLogos: (enabled) => set({ showPluginLogos: enabled }),

      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),

      themePackLightId: 'embeddr-light',
      setThemePackLightId: (id) => set({ themePackLightId: id }),
      themePackDarkId: 'embeddr-frappe',
      setThemePackDarkId: (id) => set({ themePackDarkId: id }),
      themePackSources: [],
      setThemePackSources: (sources) => set({ themePackSources: sources }),

      commandBarPosition: 'bottom',
      setCommandBarPosition: (pos) => set({ commandBarPosition: pos }),

      commandBarShowDividers: false,
      setCommandBarShowDividers: (show) =>
        set({ commandBarShowDividers: show }),

      commandBarCompact: true,
      setCommandBarCompact: (compact) => set({ commandBarCompact: compact }),

      commandBarHoverParams: { enabled: false, delay: 0 },
      setCommandBarHoverParams: (params) =>
        set({ commandBarHoverParams: params }),

      widgetConfig: {},
      setWidgetConfig: (config) => set({ widgetConfig: config }),
      updateWidgetConfig: (id, update) =>
        set((state) => ({
          widgetConfig: {
            ...state.widgetConfig,
            [id]: { ...(state.widgetConfig[id] || {}), ...update },
          },
        })),

      dockEnabled: true,
      setDockEnabled: (enabled) => set({ dockEnabled: enabled }),
      dockPlacement: 'bottom',
      setDockPlacement: (placement) => set({ dockPlacement: placement }),
      dockAutoHide: true,
      setDockAutoHide: (enabled) => set({ dockAutoHide: enabled }),
      dockConfig: {},
      setDockConfig: (config) => set({ dockConfig: config }),
      updateDockConfig: (id, update) =>
        set((state) => ({
          dockConfig: {
            ...state.dockConfig,
            [id]: { ...(state.dockConfig[id] || {}), ...update },
          },
        })),

      settings: {},
      setSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      getSetting: (key, defaultValue) => {
        const val = get().settings[key]
        return val !== undefined ? val : defaultValue
      },

      pluginSettings: {},
      setPluginSetting: (pluginId, key, value) =>
        set((state) => ({
          pluginSettings: {
            ...state.pluginSettings,
            [pluginId]: {
              ...(state.pluginSettings[pluginId] || {}),
              [key]: value,
            },
          },
        })),
      getPluginSetting: (pluginId, key, defaultValue) => {
        const val = get().pluginSettings[pluginId]?.[key]
        return val !== undefined ? val : defaultValue
      },

      customCss: '',
      setCustomCss: (css) => set({ customCss: css }),

      customCssEnabled: true,
      setCustomCssEnabled: (enabled) => set({ customCssEnabled: enabled }),
    }),
    {
      name: 'embeddr-client-settings',
    },
  ),
)
