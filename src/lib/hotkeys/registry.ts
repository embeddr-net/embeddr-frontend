import type { Hotkey } from '@tanstack/react-hotkeys'

export type HotkeyActionId =
  | 'lotus.finder.toggle'
  | 'lotus.settings.open'
  | 'lotus.finder.close'

export interface HotkeyBinding {
  id: HotkeyActionId
  combo: Hotkey
  description: string
  scope: 'global'
}

export type HotkeyOverrides = Partial<Record<HotkeyActionId, Hotkey>>

export const HOTKEY_OVERRIDES_STORAGE_KEY = 'zen-hotkey-overrides'

const HOTKEY_REGISTRY: Record<HotkeyActionId, HotkeyBinding> = {
  'lotus.finder.toggle': {
    id: 'lotus.finder.toggle',
    combo: 'Mod+K',
    description: 'Toggle Lotus Finder',
    scope: 'global',
  },
  'lotus.settings.open': {
    id: 'lotus.settings.open',
    combo: 'Mod+,',
    description: 'Open Zen Settings',
    scope: 'global',
  },
  'lotus.finder.close': {
    id: 'lotus.finder.close',
    combo: 'Escape',
    description: 'Close Lotus Finder',
    scope: 'global',
  },
}

export const getHotkeyBinding = (actionId: HotkeyActionId): Hotkey => {
  return HOTKEY_REGISTRY[actionId].combo
}

export const getDefaultHotkeyBinding = (actionId: HotkeyActionId): Hotkey => {
  return HOTKEY_REGISTRY[actionId].combo
}

export const getEffectiveHotkeyBinding = (
  actionId: HotkeyActionId,
  overrides?: HotkeyOverrides,
): Hotkey => {
  const override = overrides?.[actionId]
  if (override) return override
  return HOTKEY_REGISTRY[actionId].combo
}

export const listHotkeyBindings = () => {
  return Object.values(HOTKEY_REGISTRY)
}
