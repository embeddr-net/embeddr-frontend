import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CreateState {
  selectedWorkflowId: string | null
  workflowInputs: Record<string, any>
  // Add other persistent state here as needed (e.g. layout, zoom)

  setSelectedWorkflowId: (id: string | null) => void
  setWorkflowInput: (key: string, value: any) => void
  setWorkflowInputs: (inputs: Record<string, any>) => void
  reset: () => void
}

export const useCreateStore = create<CreateState>()(
  persist(
    (set) => ({
      selectedWorkflowId: null,
      workflowInputs: {},

      setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
      setWorkflowInput: (key, value) =>
        set((state) => ({
          workflowInputs: { ...state.workflowInputs, [key]: value },
        })),
      setWorkflowInputs: (inputs) => set({ workflowInputs: inputs }),
      reset: () => set({ selectedWorkflowId: null, workflowInputs: {} }),
    }),
    {
      name: 'embeddr-create-storage',
    },
  ),
)
