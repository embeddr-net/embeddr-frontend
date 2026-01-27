import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WindowState {
  id: string
  title: string
  componentId: string // Key to look up the renderer
  props?: any
  isMinimized: boolean
  isPinned: boolean
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  zIndex: number
}

interface WindowStore {
  windows: Record<string, WindowState>
  panelOrder: string[] // For Z-index management
  activeGroupId: string | null // For tab groups if we implement them
  layouts: Record<string, Record<string, WindowState>>
  backdropWindowId: string | null // NEW: Tracks which window is in backdrop mode
  showZenToolbar: boolean // NEW: Tracks visibility of the Zen Toolbar
  arePanelsHidden: boolean // New: Global visibility toggle

  openWindow: (wm: {
    id: string
    title: string
    componentId: string
    props?: any
  }) => void
  spawnWindow: (componentId: string, title: string, props?: any) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  bringToFront: (id: string) => void
  togglePin: (id: string) => void
  updateWindow: (id: string, updates: Partial<WindowState>) => void
  setBackdrop: (id: string | null) => void // NEW: Setter for backdrop
  toggleZenToolbar: () => void // NEW: Toggle Zen Toolbar
  closeAll: () => void
  toggleHidePanels: () => void

  // Layouts
  saveLayout: (name: string) => void
  loadLayout: (name: string) => void
  deleteLayout: (name: string) => void
}

const INITIAL_WINDOWS: Record<string, WindowState> = {
  // 'zen-toolbox': {
  //   id: 'zen-toolbox',
  //   title: 'Toolbox',
  //   componentId: 'core-toolbox',
  //   isMinimized: false,
  //   isPinned: false,
  //   zIndex: 20,
  // },
  // 'zen-settings': {
  //   id: 'zen-settings',
  //   title: 'Settings',
  //   componentId: 'core-settings',
  //   isMinimized: false,
  //   isPinned: false,
  //   zIndex: 20,
  // },
  // 'zen-queue': {
  //   id: 'zen-queue',
  //   title: 'Queue',
  //   componentId: 'core-queue',
  //   isMinimized: false,
  //   isPinned: false,
  //   zIndex: 20,
  // },
  // 'zen-images': {
  //   id: 'zen-images',
  //   title: 'Images',
  //   componentId: 'core-image-browser',
  //   isMinimized: false,
  //   isPinned: false,
  //   zIndex: 20,
  // },
}

export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      windows: INITIAL_WINDOWS,
      panelOrder: Object.keys(INITIAL_WINDOWS),
      activeGroupId: null,
      layouts: {},
      backdropWindowId: null,
      showZenToolbar: true,
      arePanelsHidden: false,

      toggleZenToolbar: () =>
        set((state) => ({ showZenToolbar: !state.showZenToolbar })),
      setBackdrop: (id: string | null) => set({ backdropWindowId: id }),

      openWindow: ({ id, title, componentId, props }) =>
        set((state) => {
          // If already exists, just bring to front and ensure not minimized
          if (state.windows[id]) {
            const newOrder = state.panelOrder.filter((p) => p !== id)
            newOrder.push(id)
            return {
              windows: {
                ...state.windows,
                [id]: {
                  ...state.windows[id],
                  isMinimized: false,
                  props: { ...state.windows[id].props, ...props },
                },
              },
              panelOrder: newOrder,
            }
          }
          console.debug(`[WindowStore] Opening window ${id} (${componentId})`)

          const newOrder = [...state.panelOrder, id]
          return {
            windows: {
              ...state.windows,
              [id]: {
                id,
                title,
                componentId,
                props,
                isMinimized: false,
                isPinned: false,
                zIndex: newOrder.length,
              },
            },
            panelOrder: newOrder,
          }
        }),

      spawnWindow: (componentId, title, props) => {
        const id = `${componentId}-${Math.random().toString(36).substring(2, 9)}`
        console.debug(`[WindowStore] Spawning window ${id} (${componentId})`)

        // Add some jitter to position to prevent perfect overlap
        const existingCount = Object.keys(get().windows).length
        const offset = (existingCount % 10) * 25

        const finalProps = {
          ...props,
          defaultPosition: props?.defaultPosition
            ? {
                x: props.defaultPosition.x + offset,
                y: props.defaultPosition.y + offset,
              }
            : { x: 50 + offset, y: 50 + offset },
        }

        get().openWindow({ id, title, componentId, props: finalProps })
      },

      closeWindow: (id) =>
        set((state) => {
          const { [id]: _, ...remainingWindows } = state.windows
          console.debug(`[WindowStore] Closing window ${id}`)
          return {
            windows: remainingWindows,
            panelOrder: state.panelOrder.filter((p) => p !== id),
          }
        }),

      minimizeWindow: (id) =>
        set((state) => ({
          windows: {
            ...state.windows,
            [id]: { ...state.windows[id], isMinimized: true },
          },
        })),

      restoreWindow: (id) =>
        set((state) => {
          const newOrder = state.panelOrder.filter((p) => p !== id)
          newOrder.push(id)
          return {
            windows: {
              ...state.windows,
              [id]: { ...state.windows[id], isMinimized: false },
            },
            panelOrder: newOrder,
          }
        }),

      bringToFront: (id) =>
        set((state) => {
          // If the window is not in the store, we can still track its order
          // (This handles core tools that are rendered manually)
          if (state.panelOrder[state.panelOrder.length - 1] === id) return {}
          const newOrder = state.panelOrder.filter((p) => p !== id)
          console.debug(`[WindowStore] Bringing window ${id} to front`)
          newOrder.push(id)
          return { panelOrder: newOrder }
        }),

      togglePin: (id) =>
        set((state) => {
          // ensure window exists in store to toggle pin
          const window = state.windows[id] || {
            id,
            title: id,
            componentId: 'unknown',
            isPinned: false,
            isMinimized: false,
            zIndex: 20,
          }

          return {
            windows: {
              ...state.windows,
              [id]: {
                ...window,
                isPinned: !window.isPinned,
              },
            },
          }
        }),

      updateWindow: (id, updates) =>
        set((state) => {
          const win = state.windows[id]
          if (!win) return {}

          // Deep check to avoid redundant updates and potential loops
          const hasChanges = Object.entries(updates).some(([key, value]) => {
            const uKey = key as keyof WindowState
            return JSON.stringify(win[uKey]) !== JSON.stringify(value)
          })

          if (!hasChanges) return {}

          return {
            windows: {
              ...state.windows,
              [id]: { ...win, ...updates },
            },
          }
        }),

      closeAll: () => set({ windows: {}, panelOrder: [] }),

      toggleHidePanels: () =>
        set((state) => ({ arePanelsHidden: !state.arePanelsHidden })),

      saveLayout: (name) =>
        set((state) => ({
          layouts: {
            ...state.layouts,
            [name]: { ...state.windows },
          },
        })),

      loadLayout: (name) =>
        set((state) => {
          const layout = state.layouts[name]
          if (!layout) return {}
          return {
            windows: { ...layout },
            panelOrder: Object.keys(layout),
          }
        }),

      deleteLayout: (name) =>
        set((state) => {
          const { [name]: _, ...remainingLayouts } = state.layouts
          return { layouts: remainingLayouts }
        }),
    }),
    {
      name: 'embeddr-window-store', // localstorage key
    },
  ),
)
