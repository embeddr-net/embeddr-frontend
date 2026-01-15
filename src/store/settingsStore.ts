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

  // Theme Customization
  themeColor: string
  setThemeColor: (color: string) => void

  // Generic settings map for plugins and other features
  settings: Record<string, any>
  setSetting: (key: string, value: any) => void
  getSetting: (key: string, defaultValue?: any) => any

  // Plugin specific settings namespace
  pluginSettings: Record<string, Record<string, any>>
  setPluginSetting: (pluginId: string, key: string, value: any) => void
  getPluginSetting: (pluginId: string, key: string, defaultValue?: any) => any
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

      themeColor: 'zinc',
      setThemeColor: (color) => set({ themeColor: color }),

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
    }),
    {
      name: 'embeddr-client-settings',
    },
  ),
)
