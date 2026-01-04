import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGenerationStore } from './generationStore'

// Mock dependencies
vi.mock('@/lib/api/config', () => ({
  BACKEND_URL: 'http://localhost:8000/api/v1',
}))

vi.mock('@/lib/eventBus', () => ({
  globalEventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useGenerationStore', () => {
  beforeEach(() => {
    useGenerationStore.setState({
      workflows: [],
      selectedWorkflow: null,
      workflowInputs: {},
      generations: [],
      isGenerating: false,
      historySkip: 0,
      hasMoreHistory: true,
    })
  })

  it('should set workflows', () => {
    const workflows = [
      {
        id: 1,
        name: 'Workflow 1',
        description: 'desc',
        input_schema: {},
        output_schema: {},
        created_at: '',
        updated_at: '',
      },
    ]

    useGenerationStore.getState().setWorkflows(workflows)

    expect(useGenerationStore.getState().workflows).toEqual(workflows)
  })

  it('should update workflow inputs', () => {
    useGenerationStore.getState().setWorkflowInput('node1', 'seed', 12345)

    expect(useGenerationStore.getState().workflowInputs).toEqual({
      node1: { seed: 12345 },
    })

    // Update another field on same node
    useGenerationStore.getState().setWorkflowInput('node1', 'steps', 20)

    expect(useGenerationStore.getState().workflowInputs).toEqual({
      node1: { seed: 12345, steps: 20 },
    })
  })

  it('should toggle follow latest', () => {
    const initial = useGenerationStore.getState().followLatest

    useGenerationStore.getState().toggleFollowLatest()

    expect(useGenerationStore.getState().followLatest).toBe(!initial)
  })

  it('should handle quick workflow toggling', () => {
    useGenerationStore.getState().toggleQuickWorkflow(101)
    expect(useGenerationStore.getState().quickWorkflowIds).toContain(101)

    useGenerationStore.getState().toggleQuickWorkflow(101)
    expect(useGenerationStore.getState().quickWorkflowIds).not.toContain(101)
  })

  it('should select generation', () => {
    const gen = {
      id: 'gen1',
      workflow_id: 1,
      status: 'completed',
      created_at: '',
      updated_at: '',
      outputs: [],
    }
    useGenerationStore.getState().selectGeneration(gen)
    expect(useGenerationStore.getState().selectedGenerationId).toBe('gen1')
  })

  it('should navigate generations', () => {
    const gens = [
      {
        id: 'gen1',
        workflow_id: 1,
        status: 'completed',
        created_at: '',
        updated_at: '',
        outputs: [],
      },
      {
        id: 'gen2',
        workflow_id: 1,
        status: 'completed',
        created_at: '',
        updated_at: '',
        outputs: [],
      },
      {
        id: 'gen3',
        workflow_id: 1,
        status: 'completed',
        created_at: '',
        updated_at: '',
        outputs: [],
      },
    ]

    useGenerationStore.setState({
      generations: gens,
      selectedGenerationId: 'gen2',
    })

    // Next (newer? depends on sort order, usually index based in store logic)
    // Assuming list is ordered [newest, ..., oldest] or similar.
    // Let's check implementation of selectNextGeneration if possible, but usually it moves index.

    useGenerationStore.getState().selectNextGeneration()
    // If gen2 is index 1, next is index 2 -> gen3
    expect(useGenerationStore.getState().selectedGenerationId).toBe('gen3')

    useGenerationStore.getState().selectPreviousGeneration()
    expect(useGenerationStore.getState().selectedGenerationId).toBe('gen2')
  })
})
