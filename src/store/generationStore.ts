import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import type { Generation, Workflow } from '@/lib/api/types'
import { BACKEND_URL } from '@/lib/api/config'
import { globalEventBus } from '@/lib/eventBus'
// import type { EmbeddrMessage } from '@embeddr/react-ui/types/websocket'
// Using any for message type to avoid build issues with deep imports
type EmbeddrMessage = any

interface GenerationState {
  // Data
  workflows: Array<Workflow>
  selectedWorkflow: Workflow | null
  workflowInputs: Record<string, any> // Map of nodeId -> inputs
  savedInputs: Record<string, Record<string, any>> // Map of workflowId -> inputs
  generations: Array<Generation>
  selectedGenerationId: string | null

  // UI State
  isGenerating: boolean
  isLoadingWorkflows: boolean
  isLoadingHistory: boolean
  hasMoreHistory: boolean
  historySkip: number
  followLatest: boolean
  lastWorkflowId: string | null
  quickWorkflowIds: Array<number>
  // socket: WebSocket | null // Deprecated
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
  queueStatus: { remaining: number } | null
  currentPreview: string | null

  // Actions
  setWorkflows: (workflows: Array<Workflow>) => void
  selectWorkflow: (workflow: Workflow) => void
  setWorkflowInput: (nodeId: string, field: string, value: any) => void
  selectGeneration: (generation: Generation) => void
  toggleFollowLatest: () => void
  selectNextGeneration: () => void
  selectPreviousGeneration: () => void
  toggleQuickWorkflow: (workflowId: number) => void
  // connectWebSocket: () => void
  initEventListeners: () => void

  // Async Actions
  fetchWorkflows: () => Promise<void>
  fetchHistory: (skip?: number) => Promise<void>
  loadMoreHistory: () => void
  generate: (patch?: {
    nodeId: string
    field: string
    value: any
  }) => Promise<void>
  retry: (generationId: string) => void
  updateWorkflowMeta: (workflowId: number, meta: any) => Promise<void>
}

export const useGenerationStore = create<GenerationState>()(
  persist(
    (set, get) => ({
      // Initial State
      workflows: [],
      selectedWorkflow: null,
      workflowInputs: {},
      savedInputs: {},
      generations: [],
      selectedGenerationId: null,
      isGenerating: false,
      isLoadingWorkflows: false,
      isLoadingHistory: false,
      hasMoreHistory: true,
      historySkip: 0,
      followLatest: true,
      lastWorkflowId: null,
      quickWorkflowIds: [],
      // socket: null,
      connectionStatus: 'disconnected',
      queueStatus: null,
      currentPreview: null,

      // Actions
      setWorkflows: (workflows) => set({ workflows }),

      initEventListeners: () => {
        const { connectionStatus } = get()
        if (connectionStatus === 'connected') return // Already initialized?

        // WebSocket Status
        globalEventBus.on('websocket:connected', () => {
          set({ connectionStatus: 'connected' })
          // Request status
          globalEventBus.emit('websocket:send', { type: 'request_status' })
        })

        globalEventBus.on('websocket:disconnected', () => {
          set({ connectionStatus: 'disconnected' })
        })

        // Embeddr Events
        globalEventBus.on('generation_submitted', (genData: unknown) => {
          const payload = genData as Generation
          set((state) => {
            const exists = state.generations.some((g) => g.id === payload.id)
            if (exists) {
              return {
                generations: state.generations.map((g) =>
                  g.id === payload.id ? { ...g, ...payload } : g,
                ),
              }
            } else {
              const newGen = { ...payload, images: [] }
              return {
                generations: [newGen, ...state.generations],
              }
            }
          })
        })

        globalEventBus.on('status_response', (data: any) => {
          const { queue_status, running_generations } = data

          if (queue_status) {
            set({ queueStatus: queue_status })
          }

          if (running_generations && Array.isArray(running_generations)) {
            set((state) => {
              const currentIds = new Set(state.generations.map((g) => g.id))
              const newGenerations = [...state.generations]
              let hasRunning = false

              running_generations.forEach((gen: any) => {
                let images = gen.images || []
                let outputs = gen.outputs
                if (typeof outputs === 'string') {
                  try {
                    outputs = JSON.parse(outputs)
                  } catch (e) {
                    outputs = []
                  }
                }
                if (!Array.isArray(outputs)) outputs = []

                if (images.length === 0 && outputs.length > 0) {
                  images = outputs
                    .filter(
                      (o: any) => o.type === 'image' && o.comfy_type !== 'temp',
                    )
                    .map(
                      (o: any) =>
                        `${BACKEND_URL}/comfy/view?filename=${o.filename}&subfolder=${o.subfolder || ''}&type=${o.comfy_type || 'output'}`,
                    )
                  const embeddrImages = outputs
                    .filter((o: any) => o.type === 'embeddr_id')
                    .map((o: any) => `${BACKEND_URL}/images/${o.value}/file`)
                  images = embeddrImages.length > 0 ? embeddrImages : images
                }

                const normalizedGen = {
                  ...gen,
                  outputs,
                  images,
                }

                if (['pending', 'processing'].includes(normalizedGen.status)) {
                  hasRunning = true
                }

                if (currentIds.has(gen.id)) {
                  const index = newGenerations.findIndex((g) => g.id === gen.id)
                  if (index !== -1) {
                    newGenerations[index] = {
                      ...newGenerations[index],
                      ...normalizedGen,
                    }
                  }
                } else {
                  newGenerations.unshift(normalizedGen)
                }
              })

              newGenerations.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )

              return {
                generations: newGenerations,
                isGenerating: hasRunning,
              }
            })
          }
        })

        // ComfyUI Events (via Provider mapping to comfyui:type)
        globalEventBus.on('comfyui:status', (data: any) => {
          const remaining = data?.status?.exec_info?.queue_remaining
          if (typeof remaining === 'number') {
            set({ queueStatus: { remaining } })
          }
        })

        globalEventBus.on('comfyui:execution_start', (data: any) => {
          console.log('Execution started for prompt:', data.prompt_id)
          set((state) => ({
            isGenerating: true,
            currentPreview: null,
            generations: state.generations.map((g) =>
              g.prompt_id === data.prompt_id
                ? { ...g, status: 'processing' }
                : g,
            ),
          }))
          globalEventBus.emit('generation:start', data.prompt_id)
        })

        globalEventBus.on('comfyui:preview', (data: any) => {
          set((state) => ({
            currentPreview: data,
            generations: state.generations.map((g) =>
              g.status === 'processing' ? { ...g, preview_url: data } : g,
            ),
          }))
        })

        globalEventBus.on('comfyui:execution_error', (data: any) => {
          set((state) => ({
            isGenerating: false,
            currentPreview: null,
            generations: state.generations.map((g) =>
              g.prompt_id === data.prompt_id
                ? {
                    ...g,
                    status: 'failed',
                    error_message: data.exception_message,
                  }
                : g,
            ),
          }))
          globalEventBus.emit('generation:error', {
            prompt_id: data.prompt_id,
            error: data.exception_message,
          })
        })

        globalEventBus.on('comfyui:executed', (data: any) => {
          const { generations, followLatest } = get()
          const gen = generations.find((g) => g.prompt_id === data.prompt_id)
          if (gen) {
            const images = (data.output.images || [])
              .filter((o: any) => o.type !== 'temp')
              .map(
                (o: any) =>
                  `${BACKEND_URL}/comfy/view?filename=${o.filename}&subfolder=${o.subfolder || ''}&type=${o.type || 'output'}`,
              )

            let embeddrIds = data.output.embeddr_ids || []
            if (data.output.embeddr_id) {
              if (Array.isArray(data.output.embeddr_id)) {
                embeddrIds = [...embeddrIds, ...data.output.embeddr_id]
              } else {
                embeddrIds = [...embeddrIds, data.output.embeddr_id]
              }
            }

            const embeddrImages = embeddrIds.map(
              (id: any) => `${BACKEND_URL}/images/${id}/file`,
            )

            const allImages = embeddrImages.length > 0 ? embeddrImages : images

            const normalizedOutputs = [
              ...(data.output.images || []).map((img: any) => ({
                type: 'image',
                filename: img.filename,
                subfolder: img.subfolder || '',
                comfy_type: img.type || 'output',
              })),
              ...embeddrIds.map((id: any) => ({
                type: 'embeddr_id',
                value: id,
              })),
            ]

            const wasCompleted = gen.status === 'completed'

            set((state) => ({
              isGenerating: false,
              currentPreview: null,
              generations: state.generations.map((g) =>
                g.prompt_id === data.prompt_id
                  ? {
                      ...g,
                      status: 'completed',
                      images: [...(g.images || []), ...allImages],
                      outputs: [...(g.outputs || []), ...normalizedOutputs],
                    }
                  : g,
              ),
            }))

            const isLatest =
              get().generations.length > 0 && get().generations[0].id === gen.id

            if (get().followLatest && isLatest) {
              set({ selectedGenerationId: gen.id })
            }

            if (!wasCompleted) {
              globalEventBus.emit('generation:complete', {
                id: gen.id,
                prompt_id: data.prompt_id,
              })
            }
          } else {
            globalEventBus.emit('generation:complete', {
              id: null,
              prompt_id: data.prompt_id,
            })
          }
        })
      },

      selectWorkflow: (workflow) => {
        const { savedInputs } = get()
        set({
          selectedWorkflow: workflow,
          lastWorkflowId: workflow.id.toString(),
          workflowInputs: savedInputs[workflow.id] || {},
        })
      },

      setWorkflowInput: (nodeId, field, value) => {
        set((state) => {
          const newInputs = {
            ...state.workflowInputs,
            [nodeId]: {
              ...state.workflowInputs[nodeId],
              [field]: value,
            },
          }

          const newSavedInputs = state.selectedWorkflow
            ? {
                ...state.savedInputs,
                [state.selectedWorkflow.id]: newInputs,
              }
            : state.savedInputs

          return {
            workflowInputs: newInputs,
            savedInputs: newSavedInputs,
          }
        })
      },

      selectGeneration: (generation) => {
        console.log(
          '[GenerationStore] selectGeneration called for:',
          generation.id,
        )
        set({
          selectedGenerationId: generation.id,
          followLatest: false,
        })
      },

      toggleFollowLatest: () =>
        set((state) => ({ followLatest: !state.followLatest })),

      selectNextGeneration: () => {
        const { generations, selectedGenerationId } = get()
        if (!selectedGenerationId || generations.length === 0) return
        const index = generations.findIndex(
          (g) => g.id === selectedGenerationId,
        )
        if (index !== -1 && index < generations.length - 1) {
          get().selectGeneration(generations[index + 1])
        }
      },

      selectPreviousGeneration: () => {
        const { generations, selectedGenerationId } = get()
        if (!selectedGenerationId || generations.length === 0) return
        const index = generations.findIndex(
          (g) => g.id === selectedGenerationId,
        )
        if (index > 0) {
          get().selectGeneration(generations[index - 1])
        }
      },

      toggleQuickWorkflow: (workflowId) => {
        set((state) => {
          const ids = state.quickWorkflowIds || []
          if (ids.includes(workflowId)) {
            return { quickWorkflowIds: ids.filter((id) => id !== workflowId) }
          }
          return { quickWorkflowIds: [...ids, workflowId] }
        })
      },

      // Async Actions
      fetchWorkflows: async () => {
        set({ isLoadingWorkflows: true })
        try {
          const res = await fetch(`${BACKEND_URL}/workflows`)
          if (!res.ok) throw new Error('Failed to fetch workflows')
          const data = await res.json()
          set({ workflows: data })

          const { lastWorkflowId } = get()
          if (data.length > 0) {
            const last = data.find(
              (w: any) => w.id.toString() === lastWorkflowId,
            )
            get().selectWorkflow(last || data[0])
          }
        } catch (error) {
          console.error(error)
          toast.error('Failed to load workflows')
        } finally {
          set({ isLoadingWorkflows: false })
        }
      },

      fetchHistory: async (skip = 0) => {
        const { isLoadingHistory } = get()
        if (isLoadingHistory) return
        set({ isLoadingHistory: true })

        try {
          const res = await fetch(
            `${BACKEND_URL}/generations?limit=20&skip=${skip}`,
          )
          if (!res.ok) return
          const data = await res.json()

          if (data.length < 20) {
            set({ hasMoreHistory: false })
          }

          // Map backend Generation to frontend Generation
          // The backend returns the exact shape we want now, mostly
          const historyItems: Array<Generation> = data.map((gen: any) => {
            // Extract images from outputs if not present
            let images = gen.images || []

            // Ensure outputs is an array (handle potential JSON string from some DBs)
            let outputs = gen.outputs
            if (typeof outputs === 'string') {
              try {
                outputs = JSON.parse(outputs)
              } catch (e) {
                console.error('Failed to parse outputs JSON', e)
                outputs = []
              }
            }
            if (!Array.isArray(outputs)) outputs = []

            if (images.length === 0 && outputs.length > 0) {
              images = outputs
                .filter(
                  (o: any) => o.type === 'image' && o.comfy_type !== 'temp',
                )
                .map(
                  (o: any) =>
                    `${BACKEND_URL}/comfy/view?filename=${o.filename}&subfolder=${o.subfolder || ''}&type=${o.comfy_type || 'output'}`,
                )

              const embeddrImages = outputs
                .filter((o: any) => o.type === 'embeddr_id')
                .map((o: any) => `${BACKEND_URL}/images/${o.value}/file`)

              // Prioritize embeddr images, fallback to comfy images if no embeddr images
              images = embeddrImages.length > 0 ? embeddrImages : images
            }

            return {
              ...gen,
              outputs, // Ensure we store the parsed outputs
              images,
            }
          })

          set((state) => {
            const newItems = historyItems.filter(
              (newItem) => !state.generations.some((p) => p.id === newItem.id),
            )

            let newGenerations
            if (skip > 0) {
              newGenerations = [...state.generations, ...newItems]
            } else {
              // If we are fetching fresh history (skip=0), we replace everything except
              // BUT we should preserve any locally pending items that might not be in the DB yet?
              // Actually, if the DB fetch returns empty, we shouldn't wipe everything if we just created one.
              // But usually DB is source of truth.
              // Let's try to merge instead of replace if we have pending items

              const pendingItems = state.generations.filter(
                (g) =>
                  g.status === 'pending' ||
                  g.status === 'queued' ||
                  g.status === 'processing',
              )

              // If historyItems is empty, maybe something is wrong?
              if (historyItems.length === 0 && pendingItems.length > 0) {
                console.warn(
                  'Fetch returned empty but we have pending items. Keeping pending items.',
                )
                newGenerations = pendingItems
              } else {
                // Merge pending items that are NOT in historyItems (to avoid duplicates if they ARE in historyItems)
                const missingPending = pendingItems.filter(
                  (p) => !historyItems.some((h) => h.id === p.id),
                )
                newGenerations = [...missingPending, ...historyItems]
              }
            }

            // Auto-select latest logic
            if (state.followLatest && newGenerations.length > 0) {
              const latestCompleted = newGenerations.find(
                (g) => g.status === 'completed',
              )
              if (
                latestCompleted &&
                state.selectedGenerationId !== latestCompleted.id
              ) {
                return {
                  generations: newGenerations,
                  selectedGenerationId: latestCompleted.id,
                  historySkip: skip + 20,
                }
              }
            }

            return { generations: newGenerations, historySkip: skip + 20 }
          })
        } catch (error) {
          console.error('Failed to load history', error)
        } finally {
          set({ isLoadingHistory: false })
        }
      },

      loadMoreHistory: () => {
        const { hasMoreHistory, isLoadingHistory, historySkip, fetchHistory } =
          get()
        if (hasMoreHistory && !isLoadingHistory) {
          fetchHistory(historySkip)
        }
      },

      generate: async (patch) => {
        const { selectedWorkflow, workflowInputs } = get()
        if (!selectedWorkflow) return

        const validNodeIds = new Set<string>()
        if (selectedWorkflow.data) {
          if (Array.isArray((selectedWorkflow.data as any).nodes)) {
            ;(selectedWorkflow.data as any).nodes.forEach((n: any) =>
              validNodeIds.add(String(n.id)),
            )
          } else {
            Object.keys(selectedWorkflow.data).forEach((id) =>
              validNodeIds.add(String(id)),
            )
          }
        }

        let currentInputs = workflowInputs
        if (patch) {
          currentInputs = {
            ...currentInputs,
            [patch.nodeId]: {
              ...(currentInputs[patch.nodeId] || {}),
              [patch.field]: patch.value,
            },
          }
          // Also update state immediately
          get().setWorkflowInput(patch.nodeId, patch.field, patch.value)
        }

        const cleanInputs = Object.entries(currentInputs).reduce(
          (acc, [key, val]) => {
            if (validNodeIds.has(key)) {
              acc[key] = val
            }
            return acc
          },
          {} as Record<string, any>,
        )

        const generationId = uuidv4()
        const newGeneration: Generation = {
          id: generationId,
          status: 'pending',
          prompt: selectedWorkflow.name,
          created_at: new Date().toISOString(),
          workflow_id: selectedWorkflow.id,
          inputs: cleanInputs,
        }

        set((state) => ({
          isGenerating: true,
          generations: [newGeneration, ...state.generations],
        }))

        try {
          set((state) => ({
            generations: state.generations.map((g) =>
              g.id === generationId ? { ...g, status: 'processing' } : g,
            ),
          }))

          const res = await fetch(`${BACKEND_URL}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: generationId,
              workflow_id: selectedWorkflow.id,
              inputs: cleanInputs,
            }),
          })

          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.detail || 'Generation failed')
          }

          const newGenData = await res.json()

          // Replace the temporary optimistic generation with the real one from DB
          set((state) => ({
            generations: state.generations.map((g) =>
              g.id === generationId ? { ...newGenData, status: 'queued' } : g,
            ),
          }))
        } catch (error: any) {
          console.error(error)
          set((state) => ({
            isGenerating: false,
            generations: state.generations.map((g) =>
              g.id === generationId
                ? {
                    ...g,
                    status: 'failed' as const,
                    error_message: error.message,
                  }
                : g,
            ),
          }))
          toast.error(`Generation failed: ${error.message}`)
        }
      },

      retry: (generationId) => {
        const { generations, selectedWorkflow, generate, setWorkflowInput } =
          get()
        const gen = generations.find((g) => g.id === generationId)
        if (
          gen &&
          selectedWorkflow &&
          selectedWorkflow.id === gen.workflow_id
        ) {
          // Restore inputs
          // We need to iterate and set inputs
          Object.entries(gen.inputs).forEach(([nodeId, inputs]) => {
            Object.entries(inputs as any).forEach(([field, value]) => {
              setWorkflowInput(nodeId, field, value)
            })
          })
          generate()
        } else {
          toast.error('Cannot retry: Workflow may have changed')
        }
      },

      updateWorkflowMeta: async (workflowId, meta) => {
        try {
          const res = await fetch(`${BACKEND_URL}/workflows/${workflowId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata: meta }),
          })

          if (!res.ok) throw new Error('Failed to update workflow')

          const updatedWorkflow = await res.json()

          set((state) => {
            const newWorkflows = state.workflows.map((w) =>
              w.id === workflowId ? updatedWorkflow : w,
            )
            const newSelected =
              state.selectedWorkflow?.id === workflowId
                ? updatedWorkflow
                : state.selectedWorkflow
            return { workflows: newWorkflows, selectedWorkflow: newSelected }
          })
          toast.success('Workflow configuration saved')
        } catch (error) {
          console.error(error)
          toast.error('Failed to save configuration')
        }
      },
    }),
    {
      name: 'embeddr-generation-store',
      partialize: (state) => ({
        savedInputs: state.savedInputs,
        selectedGenerationId: state.selectedGenerationId,
        lastWorkflowId: state.lastWorkflowId,
        followLatest: state.followLatest,
        quickWorkflowIds: state.quickWorkflowIds,
      }),
    },
  ),
)
