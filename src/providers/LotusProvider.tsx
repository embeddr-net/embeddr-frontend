import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { useHotkey } from '@tanstack/react-hotkeys'
import { ZenSettingsDialog } from '@/components/create/zen/ZenSettingsDialog'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { LotusFinder } from '@/features/lotus/LotusFinder'
import {
  getEffectiveHotkeyBinding,
  HOTKEY_OVERRIDES_STORAGE_KEY,
  type HotkeyOverrides,
} from '@/lib/hotkeys/registry'

interface LotusContextType {
  finderOpen: boolean
  setFinderOpen: (open: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  settingsTab: string
  setSettingsTab: (tab: string) => void
  hiddenWorkflows: string[]
  setHiddenWorkflows: (workflows: string[]) => void
  pinnedWorkflows: string[]
  setPinnedWorkflows: (workflows: string[]) => void
}

const LotusContext = createContext<LotusContextType | undefined>(undefined)

export function useLotus() {
  const ctx = useContext(LotusContext)
  if (!ctx) throw new Error('useLotus must be used within LotusProvider')
  return ctx
}

export function LotusProvider({ children }: { children: ReactNode }) {
  const [finderOpen, setFinderOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('profile')

  // Keep your existing lifted state
  const [hiddenWorkflows, setHiddenWorkflows] = useLocalStorage<string[]>(
    'zen-hidden-workflows',
    [],
  )
  const [pinnedWorkflows, setPinnedWorkflows] = useLocalStorage<string[]>(
    'zen-pinned-workflows',
    [],
  )
  const [hotkeyOverrides] = useLocalStorage<HotkeyOverrides>(
    HOTKEY_OVERRIDES_STORAGE_KEY,
    {},
  )

  useHotkey(
    getEffectiveHotkeyBinding('lotus.finder.toggle', hotkeyOverrides),
    () => {
      setFinderOpen((value) => !value)
    },
    { preventDefault: true },
  )

  useHotkey(
    getEffectiveHotkeyBinding('lotus.settings.open', hotkeyOverrides),
    () => {
      setSettingsOpen(true)
    },
    { preventDefault: true },
  )

  useHotkey(
    getEffectiveHotkeyBinding('lotus.finder.close', hotkeyOverrides),
    () => {
      setFinderOpen(false)
    },
    { enabled: finderOpen },
  )

  return (
    <LotusContext.Provider
      value={{
        finderOpen,
        setFinderOpen,
        settingsOpen,
        setSettingsOpen,
        settingsTab,
        setSettingsTab,
        hiddenWorkflows,
        setHiddenWorkflows,
        pinnedWorkflows,
        setPinnedWorkflows,
      }}
    >
      {children}

      <LotusFinder open={finderOpen} onOpenChange={setFinderOpen} />

      <ZenSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        activeTab={settingsTab}
        onActiveTabChange={setSettingsTab}
      />
    </LotusContext.Provider>
  )
}
