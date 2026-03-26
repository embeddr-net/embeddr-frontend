import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WindowState {
  id: string;
  title: string;
  componentId: string; // Key to look up the renderer
  props?: any;
  isMinimized: boolean;
  isPinned: boolean;
  tabs?: string[];
  activeTabId?: string;
  groupHostId?: string;
  positionMode?: "absolute" | "anchored";
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  openRevision?: number;
  zIndex: number;
}

interface WindowStore {
  windows: Record<string, WindowState>;
  panelOrder: string[]; // For Z-index management
  activeGroupId: string | null; // For tab groups if we implement them
  layouts: Record<string, Record<string, WindowState>>;
  backdropWindowId: string | null; // NEW: Tracks which window is in backdrop mode
  showZenToolbar: boolean; // NEW: Tracks visibility of the Zen Toolbar
  arePanelsHidden: boolean; // New: Global visibility toggle
  mergeHoverTargetId: string | null;
  hoverPanelId: string | null;

  openWindow: (wm: {
    id: string;
    title: string;
    componentId: string;
    props?: any;
  }) => void;
  spawnWindow: (componentId: string, title: string, props?: any) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  togglePin: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  setBackdrop: (id: string | null) => void; // NEW: Setter for backdrop
  toggleZenToolbar: () => void; // NEW: Toggle Zen Toolbar
  closeAll: () => void;
  toggleHidePanels: () => void;
  mergeWindows: (sourceId: string, targetId: string) => void;
  detachTab: (tabId: string, position?: { x: number; y: number }) => void;
  moveTab: (hostId: string, tabId: string, targetIndex: number) => void;
  setActiveTab: (hostId: string, tabId: string) => void;
  setMergeHoverTarget: (id: string | null) => void;
  setHoverPanelId: (id: string | null) => void;

  // Layouts
  saveLayout: (name: string) => void;
  loadLayout: (name: string) => void;
  deleteLayout: (name: string) => void;
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
};

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
      mergeHoverTargetId: null,
      hoverPanelId: null,

      toggleZenToolbar: () =>
        set((state) => ({ showZenToolbar: !state.showZenToolbar })),
      setBackdrop: (id: string | null) => set({ backdropWindowId: id }),
      setHoverPanelId: (id: string | null) => set({ hoverPanelId: id }),

      openWindow: ({ id, title, componentId, props }) =>
        set((state) => {
          const safeTitle = title?.trim() || "Untitled Panel";
          const defaultPosition = props?.defaultPosition as
            | { x: number; y: number }
            | undefined;
          const defaultSize = props?.defaultSize as
            | { width: number; height: number }
            | undefined;
          // If already exists, just bring to front and ensure not minimized
          if (state.windows[id]) {
            const newOrder = state.panelOrder.filter((p) => p !== id);
            newOrder.push(id);
            return {
              windows: {
                ...state.windows,
                [id]: {
                  ...state.windows[id],
                  title: safeTitle,
                  isMinimized: false,
                  props: { ...state.windows[id].props, ...props },
                  position: state.windows[id].position ?? defaultPosition,
                  size: state.windows[id].size ?? defaultSize,
                  openRevision: (state.windows[id].openRevision ?? 0) + 1,
                },
              },
              panelOrder: newOrder,
            };
          }
          console.debug(`[WindowStore] Opening window ${id} (${componentId})`);

          const newOrder = [...state.panelOrder, id];
          return {
            windows: {
              ...state.windows,
              [id]: {
                id,
                title: safeTitle,
                componentId,
                props,
                isMinimized: false,
                isPinned: false,
                position: defaultPosition,
                size: defaultSize,
                openRevision: 1,
                zIndex: newOrder.length,
              },
            },
            panelOrder: newOrder,
          };
        }),

      spawnWindow: (componentId, title, props) => {
        const panelMode = props?.panelMode || props?.instanceMode;
        if (panelMode === "single") {
          const existing = Object.values(get().windows).find(
            (window) => window.componentId === componentId,
          );
          if (existing) {
            get().restoreWindow(existing.id);
            get().bringToFront(existing.id);
            if (props) {
              get().updateWindow(existing.id, {
                title: title?.trim() || existing.title,
                props: { ...existing.props, ...props },
              });
            }
            return;
          }
        }
        const id = `${componentId}-${Math.random().toString(36).substring(2, 9)}`;
        console.debug(`[WindowStore] Spawning window ${id} (${componentId})`);

        // Add some jitter to position to prevent perfect overlap
        const existingCount = Object.keys(get().windows).length;
        const offset = (existingCount % 10) * 25;

        const finalProps = {
          ...props,
          defaultPosition: props?.defaultPosition
            ? {
                x: props.defaultPosition.x + offset,
                y: props.defaultPosition.y + offset,
              }
            : { x: 50 + offset, y: 50 + offset },
        };

        get().openWindow({
          id,
          title: title?.trim() || "Untitled Panel",
          componentId,
          props: finalProps,
        });
      },

      closeWindow: (id) =>
        set((state) => {
          const current = state.windows[id];
          const tabsToClose = current?.tabs ? current.tabs : [id];
          const { [id]: _, ...remainingWindows } = state.windows;
          const nextWindows = { ...remainingWindows };
          for (const tabId of tabsToClose) {
            delete nextWindows[tabId];
          }
          console.debug(`[WindowStore] Closing window ${id}`);
          return {
            windows: nextWindows,
            panelOrder: state.panelOrder.filter(
              (p) => !tabsToClose.includes(p),
            ),
          };
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
          const newOrder = state.panelOrder.filter((p) => p !== id);
          newOrder.push(id);
          return {
            windows: {
              ...state.windows,
              [id]: { ...state.windows[id], isMinimized: false },
            },
            panelOrder: newOrder,
          };
        }),

      bringToFront: (id) =>
        set((state) => {
          // If the window is not in the store, we can still track its order
          // (This handles core tools that are rendered manually)
          if (state.panelOrder[state.panelOrder.length - 1] === id) return {};
          const newOrder = state.panelOrder.filter((p) => p !== id);
          console.debug(`[WindowStore] Bringing window ${id} to front`);
          newOrder.push(id);
          return { panelOrder: newOrder };
        }),

      togglePin: (id) =>
        set((state) => {
          // ensure window exists in store to toggle pin
          const window = state.windows[id] || {
            id,
            title: id,
            componentId: "unknown",
            isPinned: false,
            isMinimized: false,
            zIndex: 20,
          };

          return {
            windows: {
              ...state.windows,
              [id]: {
                ...window,
                isPinned: !window.isPinned,
              },
            },
          };
        }),

      updateWindow: (id, updates) =>
        set((state) => {
          const win = state.windows[id];
          if (!win) return {};

          const shouldLog =
            typeof window !== "undefined" &&
            localStorage.getItem("embeddr_debug_panels") === "1";

          if (shouldLog && (updates.position || updates.size)) {
            console.debug("[WindowStore] updateWindow", {
              id,
              prevPosition: win.position,
              nextPosition: updates.position ?? win.position,
              prevSize: win.size,
              nextSize: updates.size ?? win.size,
              positionMode: updates.positionMode ?? win.positionMode,
            });
          }

          const normalizedUpdates = {
            ...updates,
            title:
              updates.title !== undefined
                ? updates.title?.trim() || "Untitled Panel"
                : win.title,
          };

          // Deep check to avoid redundant updates and potential loops
          const hasChanges = Object.entries(normalizedUpdates).some(
            ([key, value]) => {
              const uKey = key as keyof WindowState;
              return JSON.stringify(win[uKey]) !== JSON.stringify(value);
            },
          );

          if (!hasChanges) return {};

          return {
            windows: {
              ...state.windows,
              [id]: { ...win, ...normalizedUpdates },
            },
          };
        }),

      closeAll: () => set({ windows: {}, panelOrder: [] }),

      toggleHidePanels: () =>
        set((state) => ({ arePanelsHidden: !state.arePanelsHidden })),

      setMergeHoverTarget: (id) => set({ mergeHoverTargetId: id }),

      setActiveTab: (hostId, tabId) =>
        set((state) => {
          const host = state.windows[hostId];
          if (!host?.tabs || !host.tabs.includes(tabId)) return {};
          return {
            windows: {
              ...state.windows,
              [hostId]: { ...host, activeTabId: tabId },
            },
          };
        }),

      mergeWindows: (sourceId, targetId) =>
        set((state) => {
          if (sourceId === targetId) return {};
          const source = state.windows[sourceId];
          const target = state.windows[targetId];
          if (!source || !target) return {};

          const targetTabs = target.tabs ?? [targetId];
          const sourceTabs = source.tabs ?? [sourceId];
          const mergedTabs = Array.from(
            new Set([...targetTabs, ...sourceTabs]),
          );

          const nextWindows = { ...state.windows };
          nextWindows[targetId] = {
            ...target,
            tabs: mergedTabs,
            activeTabId: source.activeTabId || sourceId,
          };

          for (const tabId of mergedTabs) {
            if (tabId === targetId) continue;
            const tab = nextWindows[tabId];
            if (!tab) continue;
            nextWindows[tabId] = {
              ...tab,
              groupHostId: targetId,
              isMinimized: true,
            };
          }

          const filteredOrder = state.panelOrder.filter(
            (p) => !mergedTabs.includes(p) || p === targetId,
          );
          const newOrder = filteredOrder.filter((p) => p !== targetId);
          newOrder.push(targetId);

          return {
            windows: nextWindows,
            panelOrder: newOrder,
          };
        }),

      detachTab: (tabId, position) =>
        set((state) => {
          const tab = state.windows[tabId];
          if (!tab) return {};

          const hostId = tab.groupHostId ?? (tab.tabs ? tabId : null);
          if (!hostId) return {};
          const host = state.windows[hostId];
          if (!host?.tabs) return {};

          const hostFallbackPosition =
            host.position || host.props?.defaultPosition || tab.position;

          const remainingTabs = host.tabs.filter((id) => id !== tabId);
          const nextWindows = { ...state.windows };

          if (tabId === hostId && remainingTabs.length > 0) {
            const newHostId = remainingTabs[0];
            const newTabs = remainingTabs;
            const newHost = nextWindows[newHostId];
            if (!newHost) return {};
            nextWindows[newHostId] = {
              ...newHost,
              tabs: newTabs,
              activeTabId:
                host.activeTabId && host.activeTabId !== hostId
                  ? host.activeTabId
                  : newHostId,
              groupHostId: undefined,
              isMinimized: false,
              position: hostFallbackPosition,
              size: host.size,
            };
            for (const id of newTabs) {
              if (id === newHostId) continue;
              const child = nextWindows[id];
              if (!child) continue;
              nextWindows[id] = {
                ...child,
                groupHostId: newHostId,
                isMinimized: true,
              };
            }
            nextWindows[hostId] = {
              ...host,
              tabs: undefined,
              activeTabId: undefined,
              groupHostId: undefined,
              isMinimized: false,
              position: position ?? host.position,
              positionMode: position ? "absolute" : host.positionMode,
            };

            const newOrder = state.panelOrder.filter((p) => p !== hostId);
            if (!newOrder.includes(newHostId)) newOrder.push(newHostId);
            return { windows: nextWindows, panelOrder: newOrder };
          }

          nextWindows[hostId] = {
            ...host,
            tabs: remainingTabs.length > 1 ? remainingTabs : undefined,
            activeTabId:
              host.activeTabId === tabId ? remainingTabs[0] : host.activeTabId,
            position:
              tabId === hostId
                ? (position ?? hostFallbackPosition)
                : hostFallbackPosition,
            positionMode:
              tabId === hostId && position ? "absolute" : host.positionMode,
          };
          nextWindows[tabId] = {
            ...tab,
            groupHostId: undefined,
            isMinimized: false,
            position: position ?? tab.position,
            positionMode: position ? "absolute" : tab.positionMode,
          };

          if (remainingTabs.length <= 1) {
            const onlyId = remainingTabs[0];
            if (onlyId) {
              nextWindows[onlyId] = {
                ...nextWindows[onlyId],
                groupHostId: undefined,
                isMinimized: false,
                tabs: undefined,
                activeTabId: undefined,
              };
            }
          }

          const newOrder = state.panelOrder.filter((p) => p !== tabId);
          newOrder.push(tabId);
          return { windows: nextWindows, panelOrder: newOrder };
        }),

      moveTab: (hostId, tabId, targetIndex) =>
        set((state) => {
          const host = state.windows[hostId];
          if (!host?.tabs || !host.tabs.includes(tabId)) return {};
          const currentIndex = host.tabs.indexOf(tabId);
          const nextTabs = host.tabs.filter((id) => id !== tabId);
          const adjustedIndex =
            targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
          const clampedIndex = Math.max(
            0,
            Math.min(adjustedIndex, nextTabs.length),
          );
          nextTabs.splice(clampedIndex, 0, tabId);
          return {
            windows: {
              ...state.windows,
              [hostId]: {
                ...host,
                tabs: nextTabs,
              },
            },
          };
        }),

      saveLayout: (name) =>
        set((state) => ({
          layouts: {
            ...state.layouts,
            [name]: { ...state.windows },
          },
        })),

      loadLayout: (name) =>
        set((state) => {
          const layout = state.layouts[name];
          if (!layout) return {};
          return {
            windows: { ...layout },
            panelOrder: Object.keys(layout),
          };
        }),

      deleteLayout: (name) =>
        set((state) => {
          const { [name]: _, ...remainingLayouts } = state.layouts;
          return { layouts: remainingLayouts };
        }),
    }),
    {
      name: "embeddr-window-store", // localstorage key
    },
  ),
);
