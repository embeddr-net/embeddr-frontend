import { create } from 'zustand'
import { type ReactNode } from 'react'

export type WidgetLocation = 'left' | 'center' | 'right'

export interface WidgetDefinition {
  id: string
  component: ReactNode
  location: WidgetLocation
  order?: number // Lower number = closer to left (for that section)
}

type CommandBarState = {
  // Page controls are treated as high-priority 'left' content
  pageControls: ReactNode | null
  setPageControls: (controls: ReactNode | null) => void

  // Dynamic widgets registry
  widgets: WidgetDefinition[]
  registerWidget: (widget: WidgetDefinition) => void
  unregisterWidget: (id: string) => void
}

export const useCommandBarStore = create<CommandBarState>((set) => ({
  pageControls: null,
  widgets: [],
  setPageControls: (controls) => set({ pageControls: controls }),
  registerWidget: (widget) =>
    set((state) => {
      // Remove existing if same ID, then add
      const others = state.widgets.filter((w) => w.id !== widget.id)
      return { widgets: [...others, widget] }
    }),
  unregisterWidget: (id) =>
    set((state) => ({
      widgets: state.widgets.filter((w) => w.id !== id),
    })),
}))
