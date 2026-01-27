import { useMemo, useRef, useState, useEffect } from 'react'
import type React from 'react'
import dagre from 'dagre'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import type { LotusCapability } from '@/lib/api/v2/types'
import { PipelineGraphNode } from '@/features/pipelines/PipelineGraphNode'

type PipelineOutgoingEdge =
  | number
  | { to: number; inputKey?: string; outputKey?: string }

export type PipelineStepDraft = {
  capId: string
  inputsText: string
  ui?: { x?: number; y?: number; outgoing?: PipelineOutgoingEdge[] }
}

type PipelineGraphEditorProps = {
  steps: PipelineStepDraft[]
  actionCaps: LotusCapability[]
  onStepChange: (index: number, patch: Partial<PipelineStepDraft>) => void
  onRemoveStep: (index: number) => void
  onAddStep: () => void
  onMoveStep: (index: number, direction: 'up' | 'down') => void
  selectedIndex?: number | null
  onSelectIndex?: (index: number | null) => void
  hideInputsButton?: boolean
  pipelineInputs?: Record<string, any>
  pluginContext?: any
}

type NodePosition = { x: number; y: number }

type DragState = {
  index: number
  offsetX: number
  offsetY: number
}

type PanState = {
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
}

type ConnectionState = {
  fromIndex: number
  x: number
  y: number
  outputKey?: string
}

type HoveredPort = {
  nodeIndex: number
  kind: 'input' | 'output'
  key?: string
} | null

type CameraState = {
  x: number
  y: number
  zoom: number
}

export function PipelineGraphEditor({
  steps,
  actionCaps,
  onStepChange,
  onRemoveStep,
  onAddStep,
  onMoveStep,
  selectedIndex: externalSelectedIndex,
  onSelectIndex,
  hideInputsButton,
  pipelineInputs,
  pluginContext,
}: PipelineGraphEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [manualPositions, setManualPositions] = useState<
    Record<number, NodePosition>
  >({})
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [panState, setPanState] = useState<PanState | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [panMode, setPanMode] = useState(false)
  const [camera, setCamera] = useState<CameraState>({ x: 80, y: 80, zoom: 1 })
  const [connecting, setConnecting] = useState<ConnectionState | null>(null)
  const [hoveredPort, setHoveredPort] = useState<HoveredPort>(null)
  const [selectedEdge, setSelectedEdge] = useState<{
    from: number
    to: number
    inputKey?: string
    outputKey?: string
  } | null>(null)
  const activeSelectedIndex = externalSelectedIndex ?? selectedIndex
  const useOrthogonalEdges = true

  // Configuration Constants
  const STEP_NODE_WIDTH = 280
  const STEP_NODE_HEIGHT = 200 // Base height
  const SLOT_HEIGHT = 24 // Height per port slot
  const HEADER_HEIGHT = 40 // Space for header
  const CONTROLS_HEIGHT = 52 // Space for capabilities selector

  // --- Start Moved Helper Functions ---
  const getInputs = (step: PipelineStepDraft) => {
    // Check for "Action" capabilities first
    if (step.capId === 'embeddr-comfyui.run_workflow') {
      // Check if inputs has a workflow_id or workflow_name
      try {
        const parsed = JSON.parse(step.inputsText || '{}')
        const workflowId = parsed.workflow_id
        const workflowName = parsed.workflow_name

        if (workflowId || workflowName) {
          const flows = pluginContext?.comfyWorkflows || []
          const found = flows.find(
            (w: any) =>
              String(w.id) === String(workflowId) || w.name === workflowName,
          )
          if (found && found.interface) {
            const inputs = found.interface.exposed_inputs || []
            if (Array.isArray(inputs)) {
              return inputs.map((i: any) => i.label || `${i.node}:${i.port}`)
            }
          }
        }
      } catch {}
    }

    if (step.inputsText?.trim()) {
      try {
        const parsed = JSON.parse(step.inputsText)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const baseKeys = Object.keys(parsed)
          const payload = (parsed as Record<string, unknown>).payload
          if (
            payload &&
            typeof payload === 'object' &&
            !Array.isArray(payload)
          ) {
            return [
              ...baseKeys,
              ...Object.keys(payload).map((key) => `payload.${key}`),
            ]
          }
          return baseKeys
        }
      } catch {
        // Ignore invalid JSON and fall back to schema.
      }
    }

    const cap = actionCaps.find((item) => item.id === step.capId)
    const schema = (cap?.data as any)?.input?.schema || {}
    const props = schema?.properties || {}
    return Object.keys(props)
  }

  const getOutputs = (step: PipelineStepDraft) => {
    // Introspect ComfyUI Workflow Outputs
    if (step.capId === 'embeddr-comfyui.run_workflow') {
      try {
        const parsed = JSON.parse(step.inputsText || '{}')
        const workflowId = parsed.workflow_id
        const workflowName = parsed.workflow_name

        if (workflowId || workflowName) {
          const flows = pluginContext?.comfyWorkflows || []
          const found = flows.find(
            (w: any) =>
              String(w.id) === String(workflowId) || w.name === workflowName,
          )
          if (found && found.interface) {
            const outputs = found.interface.exposed_outputs || []
            // Also standard 'artifact' output is usually available if UploadArtifact is present
            // But we can check for it too? For now always include 'artifact' + exposed
            const exposedLabels = Array.isArray(outputs)
              ? outputs.map((i: any) => i.label || `${i.node}:${i.port}`)
              : []

            // Deduplicate
            if (!exposedLabels.includes('artifact'))
              exposedLabels.push('artifact')
            return exposedLabels.sort()
          }
        }
      } catch {}
    }

    const cap = actionCaps.find((item) => item.id === step.capId)
    const schema = (cap?.data as any)?.output?.schema || {}
    const props = schema?.properties || {}
    const keys = Object.keys(props)
    return keys.length > 0 ? keys : ['artifact']
  }

  const formatPreviewValue = (value: unknown) => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value)
    if (Array.isArray(value)) return `[${value.length}]`
    if (typeof value === 'object') return '{...}'
    return String(value)
  }

  const inputKeysByIndex = useMemo(
    () => steps.map((step) => getInputs(step)),
    [steps, actionCaps, pluginContext],
  )

  const inputPreviewByIndex = useMemo(() => {
    return steps.map((step) => {
      if (!step.inputsText?.trim()) return []
      try {
        const parsed = JSON.parse(step.inputsText)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return []
        }
        const entries: Array<{ key: string; value: string }> = []
        Object.entries(parsed as Record<string, unknown>).forEach(
          ([key, value]) => {
            if (key === 'payload') return
            entries.push({ key, value: formatPreviewValue(value) })
          },
        )
        const payload = (parsed as Record<string, unknown>).payload
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          Object.entries(payload as Record<string, unknown>).forEach(
            ([key, value]) => {
              entries.push({
                key: `payload.${key}`,
                value: formatPreviewValue(value),
              })
            },
          )
        }
        return entries.slice(0, 6)
      } catch {
        return []
      }
    })
  }, [steps])

  const outputKeysByIndex = useMemo(
    () => steps.map((step) => getOutputs(step)),
    [steps, actionCaps],
  )
  const getNodeKindMeta = (cap?: LotusCapability) => {
    if (!cap) {
      return { badge: 'Unknown', accent: 'border-l-muted/50' }
    }

    const slot = String(cap.slot || '')
    if (cap.kind === 'feature' || slot.startsWith('feature.')) {
      return { badge: 'Feature', accent: 'border-l-emerald-400/70' }
    }
    if (
      slot.startsWith('event.') ||
      slot.startsWith('workflow.') ||
      slot.startsWith('artifact.')
    ) {
      return { badge: 'Primitive', accent: 'border-l-amber-400/70' }
    }
    if (cap.kind === 'workflow') {
      return { badge: 'Workflow', accent: 'border-l-sky-400/70' }
    }
    return { badge: 'Action', accent: 'border-l-indigo-400/70' }
  }
  // --- End Moved Helper Functions ---

  // We calculate dynamic height for the input node
  const getNodeDimensions = (index: number) => {
    if (index === -1) {
      if (!pipelineInputs) return { width: 240, height: 100 }
      const count = Object.keys(pipelineInputs).length
      const h = HEADER_HEIGHT + count * SLOT_HEIGHT + 20
      return { width: 240, height: Math.max(100, h) }
    }

    const inputKeys = inputKeysByIndex[index] || []
    const outputKeys = outputKeysByIndex[index] || ['artifact']
    // We need to fit the longer of inputs or outputs list
    // But visually outputs are usually on the right, inputs on the left.
    // They share the same vertical space if we line them up?
    // Actually usually inputs are distinct from outputs (transform).
    // Outputs usually just ['artifact'].
    // Let's stack them? No, standard node graph has them on sides.
    // If we have 20 inputs and 1 output, height is driven by inputs.
    // If we have 1 input and 20 outputs, height driven by outputs.
    const maxPorts = Math.max(inputKeys.length, outputKeys.length)
    const contentHeight = Math.max(1, maxPorts) * SLOT_HEIGHT

    // Header + Controls + Content + Padding
    const totalHeight = HEADER_HEIGHT + CONTROLS_HEIGHT + contentHeight + 24

    return { width: STEP_NODE_WIDTH, height: totalHeight }
  }

  const getPortY = (idx: number, slotIndex: number) => {
    const pos = positions[idx]
    if (!pos) return 0
    const dim = getNodeDimensions(idx)
    const nodeTop = pos.y - dim.height / 2

    // Calculate offset where the list starts
    let contentStart = HEADER_HEIGHT

    if (idx !== -1) {
      // Regular nodes have the controls block
      contentStart += CONTROLS_HEIGHT
    }

    // Add a bit of padding before first slot
    contentStart += 12

    return nodeTop + contentStart + slotIndex * SLOT_HEIGHT + SLOT_HEIGHT / 2
  }

  const layout = useMemo(() => {
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120 })
    g.setDefaultEdgeLabel(() => ({}))

    // Add Input Node
    if (pipelineInputs !== undefined) {
      const dim = getNodeDimensions(-1)
      g.setNode('-1', { width: dim.width, height: dim.height })
    }

    steps.forEach((step, index) => {
      const dim = getNodeDimensions(index)
      g.setNode(String(index), { width: dim.width, height: dim.height })
      const outgoing = step.ui?.outgoing
      if (!outgoing || outgoing.length === 0) return
      outgoing.forEach((entry) => {
        const normalized = typeof entry === 'number' ? { to: entry } : entry
        if (
          normalized.to !== undefined &&
          normalized.to !== index &&
          normalized.to >= 0 &&
          normalized.to < steps.length
        ) {
          g.setEdge(String(index), String(normalized.to))
        }
      })
    })

    // If we have inputs, we assume steps without dependencies might depend on inputs?
    // Or just let layout handle it. But to ensure Inputs -> First Step order, we might need a fake edge?
    // For now, let's simpler hardcode the position of -1 later if needed, or let Dagre handle it detached.

    dagre.layout(g)

    const nodes: Record<number, NodePosition> = {}
    g.nodes().forEach((nodeId) => {
      const node = g.node(nodeId)
      if (node && Number.isFinite(node.x) && Number.isFinite(node.y)) {
        nodes[Number(nodeId)] = { x: node.x, y: node.y }
      }
    })

    if (Object.keys(nodes).length === 0) {
      steps.forEach((_, index) => {
        nodes[index] = { x: index * 260, y: 0 }
      })
    }

    return nodes
  }, [steps])

  const positions = useMemo(() => {
    const combined: Record<number, NodePosition> = {}

    if (pipelineInputs !== undefined) {
      combined[-1] = manualPositions[-1] ||
        // Check if layout has it (dagre keys are strings)
        layout['-1'] ||
          // Or default position to the left
          { x: -300, y: 0 }
    }

    steps.forEach((step, index) => {
      combined[index] = manualPositions[index] ||
        step.ui ||
        layout[index] || { x: index * 400, y: 0 }
    })
    return combined
  }, [layout, manualPositions, steps, pipelineInputs])

  const bounds = useMemo(() => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    steps.forEach((_, index) => {
      const pos = positions[index]
      if (!pos) return
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x)
      maxY = Math.max(maxY, pos.y)
    })

    if (pipelineInputs !== undefined) {
      const inputPos = positions[-1]
      if (inputPos) {
        minX = Math.min(minX, inputPos.x)
        minY = Math.min(minY, inputPos.y)
        maxX = Math.max(maxX, inputPos.x)
        maxY = Math.max(maxY, inputPos.y)
      }
    }

    if (
      (!steps.length && pipelineInputs === undefined) ||
      !Number.isFinite(minX)
    ) {
      return null
    }

    return { minX, minY, maxX, maxY }
  }, [positions, steps, pipelineInputs])

  const edges = useMemo(() => {
    const derived: Array<{
      from: number
      to: number
      inputKey?: string
      outputKey?: string
    }> = []

    // 1. Dependency Edges (Steps -> Steps)
    steps.forEach((step, index) => {
      const outgoing = step.ui?.outgoing
      if (!outgoing || outgoing.length === 0) return
      outgoing.forEach((entry) => {
        const normalized =
          typeof entry === 'number'
            ? { to: entry }
            : {
                to: entry.to,
                inputKey: entry.inputKey,
                outputKey: entry.outputKey,
              }
        if (
          normalized.to !== index &&
          normalized.to >= 0 &&
          normalized.to < steps.length
        ) {
          derived.push({
            from: index,
            to: normalized.to,
            inputKey: normalized.inputKey,
            outputKey: normalized.outputKey,
          })
        }
      })
    })

    // 2. Binding Edges (Inputs -> Steps)
    if (pipelineInputs) {
      steps.forEach((step, index) => {
        // Scan for bindings
        try {
          const parsed = JSON.parse(step.inputsText || '{}')
          const scanObj = (obj: any, path: string[]) => {
            if (!obj || typeof obj !== 'object') return
            Object.entries(obj).forEach(([k, v]) => {
              const currentPath = [...path, k].join('.') // simplified for now, usually top level inputs
              if (typeof v === 'string') {
                const match = v.match(/^\$\{payload\.([^}]+)\}$/)
                if (match) {
                  const inputVar = match[1]
                  // We found a binding!
                  // Source: -1 (Input Node), outputKey: inputVar
                  // Target: index, inputKey: k (if simple)
                  // Note: The graph visualization only supports top-level input keys for ports.
                  // If parsing complex nested inputs, we might not match a visual port.
                  // But assume top-level ComfyUI inputs (like "30" or "prompt") match schema keys.
                  // Actually, schema keys are what 'getInputs' returns.

                  derived.push({
                    from: -1,
                    to: index,
                    outputKey: inputVar, // The variable name
                    inputKey: k, // The input field name on the step
                  })
                }
              }
            })
          }
          scanObj(parsed, [])
        } catch {}
      })
    }

    return derived
  }, [steps, pipelineInputs])

  const edgeLaneInfo = useMemo(() => {
    const laneMap = new Map<string, number>()
    const laneCounts = new Map<string, number>()

    edges.forEach((edge) => {
      const fromKey = `${edge.from}:${edge.outputKey ?? ''}`
      const currentCount = laneCounts.get(fromKey) ?? 0
      laneCounts.set(fromKey, currentCount + 1)
      const edgeKey = `${edge.from}|${edge.to}|${edge.inputKey ?? ''}|${edge.outputKey ?? ''}`
      laneMap.set(edgeKey, currentCount)
    })

    return { laneMap, laneCounts }
  }, [edges])

  // Map of connected ports for each node
  const nodeConnections = useMemo(() => {
    const inputs = new Map<number, Set<string>>()
    const outputs = new Map<number, Set<string>>()

    // Initialize (include -1)
    const allIndices = [-1, ...steps.map((_, i) => i)]
    allIndices.forEach((i) => {
      inputs.set(i, new Set())
      outputs.set(i, new Set())
    })

    edges.forEach((edge) => {
      // For Inputs: Tracks which INPUT ports on a node have incoming edges
      if (edge.inputKey) {
        inputs.get(edge.to)?.add(edge.inputKey)
      } else if (edge.to !== -1) {
        // Edge to node without specific input key? (Not common in this UI)
      }

      // For Outputs: Tracks which OUTPUT ports have outgoing edges
      if (edge.outputKey) {
        outputs.get(edge.from)?.add(edge.outputKey)
      }
    })

    return { inputs, outputs }
  }, [edges, steps])

  const handleDisconnect = (
    index: number,
    portKey: string,
    type: 'input' | 'output',
  ) => {
    const targetEdges = edges.filter((e) => {
      if (type === 'input') return e.to === index && e.inputKey === portKey
      if (type === 'output') return e.from === index && e.outputKey === portKey
      return false
    })

    targetEdges.forEach((edge) => {
      if (edge.from === -1) {
        // Binding edge -> update target step inputs JSON
        try {
          const step = steps[edge.to]
          const parsed = JSON.parse(step?.inputsText || '{}')
          if (edge.inputKey && parsed[edge.inputKey]) {
            delete parsed[edge.inputKey]
            onStepChange(edge.to, {
              inputsText: JSON.stringify(parsed, null, 2),
            })
          }
        } catch {}
      } else {
        // Graph edge -> update source step outgoing
        const step = steps[edge.from]
        if (step && step.ui && step.ui.outgoing) {
          const newOutgoing = step.ui.outgoing.filter((entry) => {
            const e = typeof entry === 'number' ? { to: entry } : entry
            // Keep edge if it DOES NOT match the one we are deleting
            // Match criteria: same target AND same inputKey/outputKey
            const targetMatch = e.to === edge.to
            const inputMatch =
              e.inputKey === edge.inputKey ||
              (!e.inputKey && !edge.inputKey) ||
              (e.inputKey === undefined && edge.inputKey === null)
            const outputMatch =
              e.outputKey === edge.outputKey ||
              (!e.outputKey && !edge.outputKey) ||
              (e.outputKey === undefined && edge.outputKey === null)

            return !(targetMatch && inputMatch && outputMatch)
          })
          onStepChange(edge.from, {
            ui: { ...step.ui, outgoing: newOutgoing },
          })
        }
      }
    })
  }

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    index: number,
  ) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const worldX = (event.clientX - rect.left - camera.x) / camera.zoom
    const worldY = (event.clientY - rect.top - camera.y) / camera.zoom
    const current = positions[index] || { x: 0, y: 0 }
    setDragState({
      index,
      offsetX: worldX - current.x,
      offsetY: worldY - current.y,
    })
    if (onSelectIndex) {
      onSelectIndex(index)
    } else {
      setSelectedIndex(index)
    }
    setSelectedEdge(null)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    if (!dragState) return
    const rect = containerRef.current.getBoundingClientRect()
    const worldX = (event.clientX - rect.left - camera.x) / camera.zoom
    const worldY = (event.clientY - rect.top - camera.y) / camera.zoom
    const x = worldX - dragState.offsetX
    const y = worldY - dragState.offsetY
    setManualPositions((prev) => ({
      ...prev,
      [dragState.index]: { x, y },
    }))
  }

  const handleCanvasPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (panState) {
      const dx = event.clientX - panState.startX
      const dy = event.clientY - panState.startY
      setCamera((prev) => ({
        ...prev,
        x: panState.scrollLeft + dx,
        y: panState.scrollTop + dy,
      }))
    }

    if (!connecting || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const worldX = (event.clientX - rect.left - camera.x) / camera.zoom
    const worldY = (event.clientY - rect.top - camera.y) / camera.zoom
    setConnecting((prev) =>
      prev
        ? {
            ...prev,
            x: worldX,
            y: worldY,
          }
        : null,
    )
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    const pos = manualPositions[dragState.index]
    if (pos) {
      onStepChange(dragState.index, {
        ui: {
          ...steps[dragState.index]?.ui,
          x: pos.x,
          y: pos.y,
        },
      })
    }
    setDragState(null)
  }

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panState) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setPanState(null)
  }

  const handleCanvasPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panState) {
      handlePanEnd(event)
    }
  }

  const handleConnectionPointerUpCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!connecting) return
    const target = event.target as HTMLElement
    if (target?.dataset?.port === 'input') return
    setConnecting(null)
  }

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panMode && !event.shiftKey) return
    if ((event.target as HTMLElement).dataset?.node === 'true') return
    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: camera.x,
      scrollTop: camera.y,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleResetView = () => {
    setCamera({ x: 80, y: 80, zoom: 1 })
  }

  const beginConnection = (index: number, outputKey?: string) => {
    const pos = positions[index]
    if (!pos) return
    const dim = getNodeDimensions(index)
    setConnecting({
      fromIndex: index,
      x: pos.x + dim.width / 2,
      y: pos.y,
      outputKey,
    })
  }

  const completeConnection = (toIndex: number, inputKey?: string) => {
    if (!connecting) return
    const fromIndex = connecting.fromIndex
    const outputKey = connecting.outputKey
    setConnecting(null)
    if (fromIndex === toIndex) return

    // Handle Input Node Connection
    if (fromIndex === -1) {
      if (!inputKey || !outputKey) {
        // Can't bind input without explicit keys
        return
      }

      // Update target step inputs JSON
      const targetStep = steps[toIndex]
      try {
        const parsed = JSON.parse(targetStep.inputsText || '{}')
        // Special case handling for ComfyUI style "inputs" dict if needed,
        // but user seems to use simple key-value or nested.
        // If the key exists, update it. If not, add it.
        // We use string interpolation syntax.

        // Check if key is deeply nested (e.g. "inputs.30.value") ??
        // The getInputs() function returns raw keys or "payload.x".
        // Let's assume simple key for now or follow getInputs logic.

        parsed[inputKey] = `\${payload.${outputKey}}`
        onStepChange(toIndex, {
          inputsText: JSON.stringify(parsed, null, 2),
        })
      } catch (e) {
        console.error('Failed to bind input', e)
      }
      return
    }

    steps.forEach((step, idx) => {
      if (idx === fromIndex) return
      const outgoing = step.ui?.outgoing ?? []
      const nextOutgoing = outgoing
        .map((entry) =>
          typeof entry === 'number'
            ? { to: entry }
            : {
                to: entry.to,
                inputKey: entry.inputKey,
                outputKey: entry.outputKey,
              },
        )
        .filter(
          (entry) =>
            entry.to !== toIndex ||
            (inputKey ? entry.inputKey !== inputKey : false),
        )
      if (nextOutgoing.length === outgoing.length) return
      onStepChange(idx, {
        ui: {
          ...step.ui,
          outgoing: nextOutgoing,
        },
      })
    })

    if (fromIndex === -1) return

    const current = steps[fromIndex].ui?.outgoing ?? []
    const normalized = current.map((entry) =>
      typeof entry === 'number'
        ? { to: entry }
        : {
            to: entry.to,
            inputKey: entry.inputKey,
            outputKey: entry.outputKey,
          },
    )
    if (
      normalized.some(
        (entry) =>
          entry.to === toIndex &&
          (!inputKey || entry.inputKey === inputKey) &&
          (!connecting.outputKey || entry.outputKey === connecting.outputKey),
      )
    )
      return
    onStepChange(fromIndex, {
      ui: {
        ...steps[fromIndex].ui,
        outgoing: [
          ...normalized,
          {
            to: toIndex,
            inputKey,
            outputKey: connecting.outputKey,
          },
        ],
      },
    })
  }

  const handleFitView = () => {
    if (!containerRef.current || !bounds) return
    const rect = containerRef.current.getBoundingClientRect()
    const padding = 120
    const contentWidth = bounds.maxX - bounds.minX + 220
    const contentHeight = bounds.maxY - bounds.minY + 140
    const scale = Math.min(
      2.5,
      Math.max(
        0.3,
        Math.min(
          (rect.width - padding) / contentWidth,
          (rect.height - padding) / contentHeight,
        ),
      ),
    )
    const x = (rect.width - contentWidth * scale) / 2 - bounds.minX * scale
    const y = (rect.height - contentHeight * scale) / 2 - bounds.minY * scale
    setCamera({ x, y, zoom: scale })
  }

  const handleZoom = (delta: number, origin?: { x: number; y: number }) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ox = origin?.x ?? rect.width / 2
    const oy = origin?.y ?? rect.height / 2
    setCamera((prev) => {
      const nextZoom = Math.min(2.5, Math.max(0.3, prev.zoom + delta))
      const worldX = (ox - prev.x) / prev.zoom
      const worldY = (oy - prev.y) / prev.zoom
      return {
        zoom: nextZoom,
        x: ox - worldX * nextZoom,
        y: oy - worldY * nextZoom,
      }
    })
  }

  // Handle Edge Deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete if we are typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
        if (selectedEdge.from === -1) {
          // It's a binding edge, modify input JSON
          const step = steps[selectedEdge.to]
          if (step && selectedEdge.inputKey) {
            try {
              const parsed = JSON.parse(step.inputsText || '{}')
              if (parsed[selectedEdge.inputKey]) {
                delete parsed[selectedEdge.inputKey]
                onStepChange(selectedEdge.to, {
                  inputsText: JSON.stringify(parsed, null, 2),
                })
              }
            } catch {}
          }
        } else {
          // It's a graph edge, modify outgoing
          const step = steps[selectedEdge.from]
          if (step && step.ui && step.ui.outgoing) {
            const newOutgoing = step.ui.outgoing.filter((edge) => {
              const e = typeof edge === 'number' ? { to: edge } : edge
              // Relaxed comparison
              const targetMatch = e.to === selectedEdge.to

              const edgeInput = e.inputKey
              const selectedInput = selectedEdge.inputKey
              const inputMatch =
                edgeInput === selectedInput ||
                (edgeInput === undefined && selectedInput === null) ||
                (edgeInput === null && selectedInput === undefined)

              const edgeOutput = e.outputKey
              const selectedOutput = selectedEdge.outputKey
              const outputMatch =
                edgeOutput === selectedOutput ||
                (edgeOutput === undefined && selectedOutput === null) ||
                (edgeOutput === null && selectedOutput === undefined)

              // Debug log
              const isMatch = targetMatch && inputMatch && outputMatch
              // console.log(`Checking edge ${JSON.stringify(e)} against ${JSON.stringify(selectedEdge)} -> ${isMatch}`)
              return !isMatch
            })
            onStepChange(selectedEdge.from, {
              ui: { ...step.ui, outgoing: newOutgoing },
            })
          }
        }
        setSelectedEdge(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEdge, steps, onStepChange])

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const ox = event.clientX - rect.left
    const oy = event.clientY - rect.top
    const delta = event.deltaY > 0 ? -0.1 : 0.1
    handleZoom(delta, { x: ox, y: oy })
  }

  const getEdgePath = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    laneOffset: number,
  ) => {
    const isBackEdge = endX < startX + 40
    const baseOffset = Math.max(24, Math.abs(laneOffset))

    if (!isBackEdge) {
      const midX = startX + Math.max(60, (endX - startX) / 2) + laneOffset
      const safeMidX = Math.max(startX + 30, midX)
      return `M ${startX} ${startY} L ${safeMidX} ${startY} L ${safeMidX} ${endY} L ${endX} ${endY}`
    }

    const detourX = startX + 120 + baseOffset
    return `M ${startX} ${startY} L ${detourX} ${startY} L ${detourX} ${endY} L ${endX} ${endY}`
  }

  const gridSize = 22 * camera.zoom
  const gridOffsetX = ((camera.x % gridSize) + gridSize) % gridSize
  const gridOffsetY = ((camera.y % gridSize) + gridSize) % gridSize

  return (
    <div className="space-y-2 h-[95.5%] outline-none" tabIndex={0}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Drag nodes to rearrange. Hold Shift or use Pan mode to drag the
          canvas. Ctrl/Alt/⌘ + scroll to zoom.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={panMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPanMode((prev) => !prev)}
          >
            Pan mode
          </Button>
          <Button variant="ghost" size="sm" onClick={handleFitView}>
            Fit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleZoom(0.1)}>
            +
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleZoom(-0.1)}>
            -
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetView}>
            Reset view
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setManualPositions({})
              steps.forEach((_, index) => {
                onStepChange(index, { ui: undefined })
              })
            }}
            disabled={
              Object.keys(manualPositions).length === 0 &&
              !steps.some((step) => step.ui)
            }
          >
            Auto layout
          </Button>
          <Button variant="secondary" size="sm" onClick={onAddStep}>
            Add node
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        className={`relative h-full min-h-90 overflow-visible rounded-md border border-muted/60 bg-muted/10 outline-none ${
          panMode ? 'cursor-grab' : 'cursor-default'
        }`}
        onPointerMove={handlePointerMove}
        onPointerMoveCapture={handleCanvasPointerMove}
        onPointerUp={handlePointerUp}
        onPointerDown={handlePanStart}
        onPointerUpCapture={(event) => {
          handleCanvasPointerUp(event)
          handleConnectionPointerUpCapture(event)
        }}
        onWheel={handleWheel}
        onPointerLeave={() => setConnecting(null)}
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.25) 1px, transparent 0)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
        }}
      >
        <div
          className="relative"
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <svg className="absolute inset-0 h-full w-full z-0 overflow-visible pointer-events-auto">
            <defs>
              <marker
                id="pipeline-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const from = positions[edge.from]
              const to = positions[edge.to]
              if (!from || !to) {
                return null
              }
              const fromDim = getNodeDimensions(edge.from)
              const toDim = getNodeDimensions(edge.to)

              const outputKeys = outputKeysByIndex[edge.from] || ['artifact']
              // Handling input node special case for keys
              if (edge.from === -1 && pipelineInputs) {
                // The output keys for input node are the input keys themselves
                // But wait, key access for -1 isn't in outputKeysByIndex array index -1
              }

              // Correct lookup for Input Node Output Keys
              const actualOutputKeys =
                edge.from === -1 && pipelineInputs
                  ? Object.keys(pipelineInputs)
                  : outputKeysByIndex[edge.from] || ['artifact']

              const inputKeys = inputKeysByIndex[edge.to] || []
              const outputIndex = edge.outputKey
                ? actualOutputKeys.indexOf(edge.outputKey)
                : 0
              const inputIndex = edge.inputKey
                ? inputKeys.indexOf(edge.inputKey)
                : 0
              const safeOutputIndex = outputIndex >= 0 ? outputIndex : 0
              const safeInputIndex = inputIndex >= 0 ? inputIndex : 0

              const startX = from.x + fromDim.width / 2
              const startY = getPortY(edge.from, safeOutputIndex)
              const endX = to.x - toDim.width / 2
              const endY = getPortY(edge.to, safeInputIndex)
              const edgeKey = `${edge.from}|${edge.to}|${edge.inputKey ?? ''}|${edge.outputKey ?? ''}`
              const laneKey = `${edge.from}:${edge.outputKey ?? ''}`
              const laneIndex = edgeLaneInfo.laneMap.get(edgeKey) ?? 0
              const laneCount = edgeLaneInfo.laneCounts.get(laneKey) ?? 1
              const laneOffset = (laneIndex - (laneCount - 1) / 2) * 12
              const path = useOrthogonalEdges
                ? getEdgePath(startX, startY, endX, endY, laneOffset)
                : `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`
              const isActive =
                activeSelectedIndex === edge.from ||
                activeSelectedIndex === edge.to ||
                (selectedEdge &&
                  selectedEdge.from === edge.from &&
                  selectedEdge.to === edge.to &&
                  selectedEdge.inputKey === edge.inputKey &&
                  selectedEdge.outputKey === edge.outputKey)

              const isSelected =
                selectedEdge &&
                selectedEdge.from === edge.from &&
                selectedEdge.to === edge.to &&
                selectedEdge.inputKey === edge.inputKey &&
                selectedEdge.outputKey === edge.outputKey

              return (
                <g
                  key={`${edge.from}-${edge.to}-${edge.inputKey ?? 'in'}-${edge.outputKey ?? 'out'}`}
                >
                  {/* Hit Area */}
                  <path
                    d={path}
                    stroke="transparent"
                    strokeWidth={15}
                    fill="none"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEdge({
                        from: edge.from,
                        to: edge.to,
                        inputKey: edge.inputKey,
                        outputKey: edge.outputKey,
                      })
                      if (onSelectIndex) {
                        onSelectIndex(null)
                      } else {
                        setSelectedIndex(null) // Deselect nodes
                      }
                    }}
                  />
                  {/* Visible Path */}
                  <path
                    d={path}
                    stroke="currentColor"
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    className={
                      isSelected
                        ? 'text-primary'
                        : isActive
                          ? 'text-primary'
                          : 'text-muted-foreground/70'
                    }
                    fill="none"
                    markerEnd="url(#pipeline-arrow)"
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              )
            })}
            {connecting &&
              positions[connecting.fromIndex] &&
              (() => {
                const fromDim = getNodeDimensions(connecting.fromIndex)
                const startX =
                  positions[connecting.fromIndex].x + fromDim.width / 2
                // We need to know which port we are dragging from to set startY correctly
                // connecting.outputKey
                let startY = positions[connecting.fromIndex].y

                if (connecting.fromIndex === -1 && pipelineInputs) {
                  const keys = Object.keys(pipelineInputs)
                  const idx = keys.indexOf(connecting.outputKey || '')
                  if (idx >= 0) startY = getPortY(connecting.fromIndex, idx)
                } else {
                  const keys = outputKeysByIndex[connecting.fromIndex] || [
                    'artifact',
                  ]
                  const idx = keys.indexOf(connecting.outputKey || '')
                  if (idx >= 0) startY = getPortY(connecting.fromIndex, idx)
                  // Default center if not found (shouldn't happen)
                }

                const path = useOrthogonalEdges
                  ? getEdgePath(startX, startY, connecting.x, connecting.y, 0)
                  : `M ${startX} ${startY} C ${(startX + connecting.x) / 2} ${startY}, ${(startX + connecting.x) / 2} ${connecting.y}, ${connecting.x} ${connecting.y}`
                return (
                  <path
                    d={path}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="text-primary/60"
                    fill="none"
                  />
                )
              })()}
          </svg>

          {pipelineInputs &&
            positions['-1'] &&
            (() => {
              const index = -1
              const pos = positions[index]
              if (!pos) return null
              const dim = getNodeDimensions(index)
              const outputX = pos.x + dim.width / 2
              const outputKeys = Object.keys(pipelineInputs)
              const isActive = false // Not selectable for now

              return (
                <div key="ports-inputs" className="relative z-30">
                  {outputKeys.map((key, slotIndex) => (
                    <div key={`output-inputs-${key}`}>
                      <div
                        className={`absolute h-3 w-3 rounded-full shadow bg-orange-400`}
                        style={{
                          left: outputX - 6,
                          top: getPortY(index, slotIndex) - 6,
                        }}
                        data-node="true"
                        data-port="output"
                        data-output-key={key}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          beginConnection(index, key)
                        }}
                        onPointerEnter={() =>
                          setHoveredPort({
                            nodeIndex: index,
                            kind: 'output',
                            key,
                          })
                        }
                        onPointerLeave={() => setHoveredPort(null)}
                        role="button"
                      />
                    </div>
                  ))}
                  {/* Output Labels for Input Node are also inside the node now */}
                </div>
              )
            })()}

          {steps.map((_, index) => {
            const pos = positions[index] || { x: index * 240, y: 0 }
            const dim = getNodeDimensions(index)
            const inputX = pos.x - dim.width / 2
            const outputX = pos.x + dim.width / 2
            const inputKeys = inputKeysByIndex[index] || []
            const outputKeys = outputKeysByIndex[index] || ['artifact']
            const isActive = activeSelectedIndex === index
            return (
              <div key={`ports-${index}`} className="relative z-30">
                {inputKeys.length === 0 ? (
                  <div
                    className={`absolute h-3 w-3 rounded-full shadow ${
                      hoveredPort?.nodeIndex === index &&
                      hoveredPort?.kind === 'input'
                        ? 'bg-emerald-300 ring-2 ring-emerald-200'
                        : isActive
                          ? 'bg-emerald-400'
                          : 'bg-emerald-400/80'
                    }`}
                    style={{ left: inputX - 6, top: pos.y - 6 }}
                    data-node="true"
                    data-port="input"
                    onPointerUp={(event) => {
                      event.stopPropagation()
                      completeConnection(index)
                    }}
                    onPointerEnter={() =>
                      setHoveredPort({ nodeIndex: index, kind: 'input' })
                    }
                    onPointerLeave={() => setHoveredPort(null)}
                    role="button"
                  />
                ) : (
                  inputKeys.map((key, slotIndex) => (
                    <div
                      key={`input-${index}-${key}`}
                      className={`absolute h-3 w-3 rounded-full shadow ${
                        hoveredPort?.nodeIndex === index &&
                        hoveredPort?.kind === 'input' &&
                        hoveredPort?.key === key
                          ? 'bg-emerald-300 ring-2 ring-emerald-200'
                          : isActive
                            ? 'bg-emerald-400'
                            : 'bg-emerald-400/80'
                      }`}
                      style={{
                        left: inputX - 6,
                        top: getPortY(index, slotIndex) - 6,
                      }}
                      data-node="true"
                      data-port="input"
                      data-input-key={key}
                      onPointerUp={(event) => {
                        event.stopPropagation()
                        completeConnection(index, key)
                      }}
                      onPointerEnter={() =>
                        setHoveredPort({
                          nodeIndex: index,
                          kind: 'input',
                          key,
                        })
                      }
                      onPointerLeave={() => setHoveredPort(null)}
                      role="button"
                    />
                  ))
                )}
                {outputKeys.map((key, slotIndex) => (
                  <div
                    key={`output-${index}-${key}`}
                    className={`absolute h-3 w-3 rounded-full shadow ${
                      hoveredPort?.nodeIndex === index &&
                      hoveredPort?.kind === 'output' &&
                      hoveredPort?.key === key
                        ? 'bg-indigo-300 ring-2 ring-indigo-200'
                        : isActive
                          ? 'bg-indigo-400'
                          : 'bg-indigo-400/80'
                    }`}
                    style={{
                      left: outputX - 6,
                      top: getPortY(index, slotIndex) - 6,
                    }}
                    data-node="true"
                    data-port="output"
                    data-output-key={key}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      beginConnection(index, key)
                    }}
                    onPointerEnter={() =>
                      setHoveredPort({ nodeIndex: index, kind: 'output', key })
                    }
                    onPointerLeave={() => setHoveredPort(null)}
                    role="button"
                  />
                ))}
              </div>
            )
          })}

          {/* 
            Output Labels are now rendered inside the node by PipelineGraphNode.
                 Removed the absolute overlay loop.
               */}
          {pipelineInputs && positions['-1'] && (
            <PipelineGraphNode
              key="node-inputs"
              index={-1}
              position={positions[-1] || { x: 0, y: 0 }}
              size={getNodeDimensions(-1)}
              inputs={[]}
              outputs={Object.keys(pipelineInputs)}
              capTitle="Pipeline Inputs"
              capId="inputs"
              isMissingCap={false}
              isSelected={false}
              accentClass="border-l-orange-400/70"
              badgeText="Inputs"
              hideInputsButton={true}
              canMoveUp={false}
              canMoveDown={false}
              actionCaps={[]}
              connectedInputs={nodeConnections.inputs.get(-1)}
              connectedOutputs={nodeConnections.outputs.get(-1)}
              onDisconnect={handleDisconnect}
              onSelect={() => {}}
              onDragStart={(e) => handlePointerDown(e, -1)}
              onMoveStep={() => {}}
              onRemoveStep={() => {}}
              onEditInputs={() => {}}
              onCapChange={() => {}}
            />
          )}

          {steps.map((step, index) => {
            const pos = positions[index] || { x: index * 240, y: 0 }
            const inputs = getInputs(step)
            const outputs = getOutputs(step)
            const dim = getNodeDimensions(index)
            const cap = actionCaps.find((item) => item.id === step.capId)
            const capTitle = cap?.title || step.capId || 'Select action'
            const kindMeta = getNodeKindMeta(cap)
            return (
              <PipelineGraphNode
                key={`${step.capId}-${index}`}
                index={index}
                position={pos}
                size={dim}
                inputs={inputs}
                outputs={outputs}
                inputPreview={inputPreviewByIndex[index]}
                capTitle={capTitle}
                capId={step.capId}
                isMissingCap={!cap}
                isSelected={activeSelectedIndex === index}
                accentClass={kindMeta.accent}
                badgeText={kindMeta.badge}
                hideInputsButton={hideInputsButton}
                canMoveUp={index > 0}
                canMoveDown={index < steps.length - 1}
                actionCaps={actionCaps}
                connectedInputs={nodeConnections.inputs.get(index)}
                connectedOutputs={nodeConnections.outputs.get(index)}
                onDisconnect={handleDisconnect}
                onSelect={(idx) => {
                  if (onSelectIndex) {
                    onSelectIndex(idx)
                  } else {
                    setSelectedIndex(idx)
                  }
                }}
                onDragStart={handlePointerDown}
                onMoveStep={onMoveStep}
                onRemoveStep={onRemoveStep}
                onEditInputs={(idx) => setEditIndex(idx)}
                onCapChange={(idx, value) =>
                  onStepChange(idx, { capId: value })
                }
              />
            )
          })}
        </div>
      </div>

      <Dialog open={editIndex !== null} onOpenChange={() => setEditIndex(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Node inputs</DialogTitle>
          </DialogHeader>
          {editIndex !== null && (
            <div className="h-full space-y-2">
              <div className="text-xs text-muted-foreground">
                Use JSON. You can reference event payloads like
                <span className="font-mono">
                  {' '}
                  ${'{'}payload.id{'}'}{' '}
                </span>
                .
              </div>
              <Textarea
                value={steps[editIndex]?.inputsText || ''}
                onChange={(event) =>
                  onStepChange(editIndex, { inputsText: event.target.value })
                }
                className="min-h-52 font-mono text-[11px]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
