import { create } from 'zustand'

interface PanelStore {
  activePanelId: string | null
  setActivePanel: (id: string | null) => void
  panelOrder: Array<string>
  bringToFront: (id: string) => void
}

export const usePanelStore = create<PanelStore>((set) => ({
  activePanelId: null,
  panelOrder: [],
  setActivePanel: (id) => set({ activePanelId: id }),
  bringToFront: (id) =>
    set((state) => {
      const newOrder = state.panelOrder.filter((p) => p !== id)
      newOrder.push(id)
      return { activePanelId: id, panelOrder: newOrder }
    }),
}))
