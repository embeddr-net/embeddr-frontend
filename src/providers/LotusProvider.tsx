import React, { createContext, useContext, useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { ReactNode } from "react";
import type { HotkeyOverrides } from "@/lib/hotkeys/registry";
import { ZenSettingsDialog } from "@/components/create/zen/ZenSettingsDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LotusFinder } from "@/features/lotus/LotusFinder";
import { HOTKEY_OVERRIDES_STORAGE_KEY, getEffectiveHotkeyBinding } from "@/lib/hotkeys/registry";

interface LotusContextType {
  finderOpen: boolean;
  setFinderOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  hiddenWorkflows: Array<string>;
  setHiddenWorkflows: (workflows: Array<string>) => void;
  pinnedWorkflows: Array<string>;
  setPinnedWorkflows: (workflows: Array<string>) => void;
}

const LotusContext = createContext<LotusContextType | undefined>(undefined);

export function useLotus() {
  const ctx = useContext(LotusContext);
  if (!ctx) throw new Error("useLotus must be used within LotusProvider");
  return ctx;
}

export function LotusProvider({ children }: { children: ReactNode }) {
  const [finderOpen, setFinderOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");

  // Keep your existing lifted state
  const [hiddenWorkflows, setHiddenWorkflows] = useLocalStorage<Array<string>>(
    "zen-hidden-workflows",
    [],
  );
  const [pinnedWorkflows, setPinnedWorkflows] = useLocalStorage<Array<string>>(
    "zen-pinned-workflows",
    [],
  );
  const [hotkeyOverrides] = useLocalStorage<HotkeyOverrides>(HOTKEY_OVERRIDES_STORAGE_KEY, {});

  useHotkey(
    getEffectiveHotkeyBinding("lotus.finder.toggle", hotkeyOverrides),
    () => {
      setFinderOpen((value) => !value);
    },
    { preventDefault: true },
  );

  useHotkey(
    getEffectiveHotkeyBinding("lotus.settings.open", hotkeyOverrides),
    () => {
      setSettingsOpen(true);
    },
    { preventDefault: true },
  );

  useHotkey(
    getEffectiveHotkeyBinding("lotus.finder.close", hotkeyOverrides),
    () => {
      setFinderOpen(false);
    },
    { enabled: finderOpen },
  );

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
  );
}
