import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useWindowStore, type WindowState } from '@/store/windowStore'

type WorkspaceId = string

export type WorkspaceLayout = {
  windows: Record<string, WindowState>
  panelOrder: string[]
  backdropWindowId: string | null
  showZenToolbar: boolean
}

export type Workspace = {
  id: WorkspaceId
  name: string
  layout: WorkspaceLayout
  isTemplate: boolean
  createdAt: number
  updatedAt: number
}

export type WorkspaceStoreState = {
  workspaces: Record<string, Workspace>
  activeWorkspaceId: WorkspaceId | null

  ensureDefaultWorkspace: () => void
  listWorkspaces: () => Workspace[]
  getWorkspace: (id: WorkspaceId) => Workspace | null

  createWorkspace: (
    name: string,
    options?: { fromCurrent?: boolean; isTemplate?: boolean },
  ) => WorkspaceId
  saveWorkspace: (id: WorkspaceId) => void
  saveActiveWorkspace: () => void
  setActiveWorkspace: (id: WorkspaceId) => void
  renameWorkspace: (id: WorkspaceId, name: string) => void
  cloneWorkspace: (id: WorkspaceId, name?: string) => WorkspaceId | null
  deleteWorkspace: (id: WorkspaceId) => void
  setTemplate: (id: WorkspaceId, isTemplate: boolean) => void
}

const STORAGE_KEY = 'embeddr-workspace-store'

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone !== 'undefined') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

const captureLayout = (): WorkspaceLayout => {
  const state = useWindowStore.getState()
  return deepClone({
    windows: state.windows,
    panelOrder: state.panelOrder,
    backdropWindowId: state.backdropWindowId,
    showZenToolbar: state.showZenToolbar,
  })
}

const applyLayout = (layout: WorkspaceLayout) => {
  const cloned = deepClone(layout)
  useWindowStore.setState({
    windows: cloned.windows || {},
    panelOrder: cloned.panelOrder || [],
    backdropWindowId: cloned.backdropWindowId ?? null,
    showZenToolbar: cloned.showZenToolbar ?? true,
  })
}

const createWorkspaceFromLayout = (
  name: string,
  layout: WorkspaceLayout,
  isTemplate: boolean,
): Workspace => {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    layout: deepClone(layout),
    isTemplate,
    createdAt: now,
    updatedAt: now,
  }
}

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  persist(
    (set, get) => ({
      workspaces: {},
      activeWorkspaceId: null,

      ensureDefaultWorkspace: () => {
        set((state) => {
          if (Object.keys(state.workspaces).length > 0) return {}
          const layout = captureLayout()
          const ws = createWorkspaceFromLayout('Default', layout, false)
          return {
            workspaces: { [ws.id]: ws },
            activeWorkspaceId: ws.id,
          }
        })
      },

      listWorkspaces: () => {
        const { workspaces } = get()
        return Object.values(workspaces).sort(
          (a, b) => b.updatedAt - a.updatedAt,
        )
      },

      getWorkspace: (id) => get().workspaces[id] ?? null,

      createWorkspace: (name, options) => {
        const { fromCurrent = true, isTemplate = false } = options || {}
        const layout = fromCurrent
          ? captureLayout()
          : {
              windows: {},
              panelOrder: [],
              backdropWindowId: null,
              showZenToolbar: true,
            }
        const ws = createWorkspaceFromLayout(name, layout, isTemplate)
        set((state) => ({
          workspaces: { ...state.workspaces, [ws.id]: ws },
          activeWorkspaceId: state.activeWorkspaceId ?? ws.id,
        }))
        return ws.id
      },

      saveWorkspace: (id) => {
        const ws = get().workspaces[id]
        if (!ws) return
        const layout = captureLayout()
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [id]: {
              ...ws,
              layout,
              updatedAt: Date.now(),
            },
          },
        }))
      },

      saveActiveWorkspace: () => {
        const id = get().activeWorkspaceId
        if (id) get().saveWorkspace(id)
      },

      setActiveWorkspace: (id) => {
        const ws = get().workspaces[id]
        if (!ws) return
        set({ activeWorkspaceId: id })
        applyLayout(ws.layout)
      },

      renameWorkspace: (id, name) => {
        const ws = get().workspaces[id]
        if (!ws) return
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [id]: { ...ws, name, updatedAt: Date.now() },
          },
        }))
      },

      cloneWorkspace: (id, name) => {
        const ws = get().workspaces[id]
        if (!ws) return null
        const clone = createWorkspaceFromLayout(
          name ?? `${ws.name} Copy`,
          ws.layout,
          ws.isTemplate,
        )
        set((state) => ({
          workspaces: { ...state.workspaces, [clone.id]: clone },
        }))
        return clone.id
      },

      deleteWorkspace: (id) => {
        set((state) => {
          if (!state.workspaces[id]) return {}
          const { [id]: _, ...remaining } = state.workspaces
          let nextActive = state.activeWorkspaceId
          if (state.activeWorkspaceId === id) {
            nextActive = Object.keys(remaining)[0] ?? null
          }
          return { workspaces: remaining, activeWorkspaceId: nextActive }
        })

        const nextId = get().activeWorkspaceId
        if (nextId) {
          const next = get().workspaces[nextId]
          if (next) applyLayout(next.layout)
        }
      },

      setTemplate: (id, isTemplate) => {
        const ws = get().workspaces[id]
        if (!ws) return
        set((state) => ({
          workspaces: {
            ...state.workspaces,
            [id]: { ...ws, isTemplate, updatedAt: Date.now() },
          },
        }))
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    },
  ),
)

const syncFromStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed?.state) {
      useWorkspaceStore.setState(parsed.state)
    }
  } catch (e) {
    console.warn('[WorkspaceStore] Failed to sync from storage', e)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', syncFromStorage)
  window.addEventListener('local-storage', syncFromStorage)
}
