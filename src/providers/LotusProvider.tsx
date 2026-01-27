import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ZenSettingsDialog } from '@/components/create/zen/ZenSettingsDialog'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { LotusFinder } from '@/features/lotus/LotusFinder'

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
  const [settingsTab, setSettingsTab] = useState('general')

  // Keep your existing lifted state
  const [hiddenWorkflows, setHiddenWorkflows] = useLocalStorage<string[]>(
    'zen-hidden-workflows',
    [],
  )
  const [pinnedWorkflows, setPinnedWorkflows] = useLocalStorage<string[]>(
    'zen-pinned-workflows',
    [],
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K -> Finder
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setFinderOpen((v) => !v)
        return
      }

      // Cmd/Ctrl+, -> Settings (nice convention)
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSettingsOpen(true)
        return
      }

      // Escape closes finder if open
      if (e.key === 'Escape') {
        setFinderOpen(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

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
        hiddenWorkflows={hiddenWorkflows}
        setHiddenWorkflows={setHiddenWorkflows}
        activeTab={settingsTab}
        onActiveTabChange={setSettingsTab}
      />
    </LotusContext.Provider>
  )
}
