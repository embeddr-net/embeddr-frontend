import { create } from 'zustand'
import dagre from 'dagre'
import type { PromptImage } from '@/lib/api/types'
import { fetchItem } from '@/lib/api/endpoints/images'

export interface GraphNode {
  id: string
  data: {
    image: PromptImage
    stackCount?: number
    stackId?: string
    isStack?: boolean
  }
  position: { x: number; y: number }
  width?: number
  height?: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

interface LineageState {
  // Raw Data
  rawNodes: Array<GraphNode>
  rawEdges: Array<GraphEdge>

  // Graph State
  nodes: Array<GraphNode>
  edges: Array<GraphEdge>

  // Selection State
  selectedImageId: string | null
  rootImageId: string | null

  // UI State
  isLoading: boolean
  error: string | null
  stackByPHash: boolean
  expandedStackIds: Array<string>

  // Actions
  selectImage: (id: string) => Promise<void>
  loadLineage: (id: string) => Promise<void>
  toggleStacking: () => void
  toggleStackExpansion: (id: string) => void
  reset: () => void
}

const NODE_WIDTH = 260 // Card width + margin
const NODE_HEIGHT = 320 // Card height + margin

const getHammingDistance = (hash1: string, hash2: string) => {
  if (!hash1 || !hash2) return 100
  try {
    const val1 = BigInt('0x' + hash1)
    const val2 = BigInt('0x' + hash2)
    let xor = val1 ^ val2
    let distance = 0
    while (xor > 0n) {
      if (xor & 1n) distance++
      xor >>= 1n
    }
    return distance
  } catch (e) {
    return 100
  }
}

const getLayoutedElements = (nodes: Array<GraphNode>, edges: Array<GraphEdge>) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // TB = Top to Bottom
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 100 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

const processGraph = (
  nodes: Array<GraphNode>,
  edges: Array<GraphEdge>,
  stackByPHash: boolean,
  expandedStackIds: Array<string>,
) => {
  let displayNodes = [...nodes]
  let displayEdges = [...edges]

  if (stackByPHash) {
    const groups: Array<Array<GraphNode>> = []
    const nodeToGroupIndex = new Map<string, number>() // nodeId -> groupIndex
    const THRESHOLD = 10 // Hamming distance threshold

    // Group by PHash Similarity
    nodes.forEach((node) => {
      const phash = node.data.image.phash
      if (!phash) {
        // No phash, own group
        groups.push([node])
        nodeToGroupIndex.set(node.id, groups.length - 1)
        return
      }

      let foundGroupIndex = -1

      // Check against existing groups
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i]
        // Check distance with the first element of the group (representative)
        const repNode = group[0]
        const repPhash = repNode.data.image.phash

        if (repPhash) {
          const dist = getHammingDistance(phash, repPhash)
          if (dist <= THRESHOLD) {
            foundGroupIndex = i
            break
          }
        }
      }

      if (foundGroupIndex !== -1) {
        groups[foundGroupIndex].push(node)
        nodeToGroupIndex.set(node.id, foundGroupIndex)
      } else {
        groups.push([node])
        nodeToGroupIndex.set(node.id, groups.length - 1)
      }
    })

    const newNodes: Array<GraphNode> = []
    const newEdges: Array<GraphEdge> = []
    const nodeToGroupRep = new Map<string, string>()

    // Create nodes (stacked or single)
    groups.forEach((group) => {
      const repNode = group[0]
      const isExpanded = expandedStackIds.includes(repNode.id)

      if (group.length > 1 && !isExpanded) {
        // Collapsed Stack
        const stackNode = {
          ...repNode,
          data: {
            ...repNode.data,
            stackCount: group.length,
            isStack: true,
            stackId: repNode.id,
          },
        }
        newNodes.push(stackNode)
        // Map all group members to this repNode ID for edge remapping
        group.forEach((n) => nodeToGroupRep.set(n.id, repNode.id))
      } else {
        // Expanded or Single
        group.forEach((n) => {
          newNodes.push({
            ...n,
            data: {
              ...n.data,
              stackCount: 1,
              stackId: group.length > 1 ? repNode.id : undefined,
              isStack: false,
            },
          })
        })
      }
    })

    // Remap edges
    edges.forEach((edge) => {
      let source = edge.source
      let target = edge.target

      // If source is in a collapsed group, map to rep
      if (nodeToGroupRep.has(source)) source = nodeToGroupRep.get(source)!

      // If target is in a collapsed group, map to rep
      if (nodeToGroupRep.has(target)) target = nodeToGroupRep.get(target)!

      if (source !== target) {
        const edgeId = `e${source}-${target}`
        if (!newEdges.some((e) => e.source === source && e.target === target)) {
          newEdges.push({ ...edge, id: edgeId, source, target })
        }
      }
    })

    displayNodes = newNodes
    displayEdges = newEdges
  }

  return getLayoutedElements(displayNodes, displayEdges)
}

export const useLineageStore = create<LineageState>((set, get) => ({
  rawNodes: [],
  rawEdges: [],
  nodes: [],
  edges: [],
  selectedImageId: null,
  rootImageId: null,
  isLoading: false,
  error: null,
  stackByPHash: false,
  expandedStackIds: [],

  selectImage: async (id) => {
    set({ selectedImageId: id })
  },

  toggleStacking: () => {
    const { rawNodes, rawEdges, stackByPHash, expandedStackIds } = get()
    const newStacking = !stackByPHash
    const layouted = processGraph(
      rawNodes,
      rawEdges,
      newStacking,
      expandedStackIds,
    )
    set({
      stackByPHash: newStacking,
      nodes: layouted.nodes,
      edges: layouted.edges,
    })
  },

  toggleStackExpansion: (id: string) => {
    const { rawNodes, rawEdges, stackByPHash, expandedStackIds } = get()
    const newExpanded = expandedStackIds.includes(id)
      ? expandedStackIds.filter((eid) => eid !== id)
      : [...expandedStackIds, id]

    const layouted = processGraph(rawNodes, rawEdges, stackByPHash, newExpanded)
    set({
      expandedStackIds: newExpanded,
      nodes: layouted.nodes,
      edges: layouted.edges,
    })
  },

  loadLineage: async (id) => {
    set({ isLoading: true, error: null, rootImageId: id })
    try {
      const visited = new Set<string>()
      const nodes: Array<GraphNode> = []
      const edges: Array<GraphEdge> = []

      const processImage = async (imageId: string, depth = 0) => {
        if (visited.has(imageId) || depth > 5) return
        visited.add(imageId)

        try {
          const image = await fetchItem(imageId)

          // Add Node
          nodes.push({
            id: image.id.toString(),
            data: { image },
            position: { x: 0, y: 0 }, // Layout will fix this
          })

          // Process Parents
          if (image.parents) {
            for (const parent of image.parents) {
              await processImage(parent.id.toString(), depth + 1)

              if (nodes.some((n) => n.id === parent.id.toString())) {
                const edgeId = `e${parent.id}-${image.id}`
                if (!edges.some((e) => e.id === edgeId)) {
                  edges.push({
                    id: edgeId,
                    source: parent.id.toString(),
                    target: image.id.toString(),
                  })
                }
              }
            }
          }

          // Process Children
          if (image.children) {
            for (const child of image.children) {
              await processImage(child.id.toString(), depth + 1)

              if (nodes.some((n) => n.id === child.id.toString())) {
                const edgeId = `e${image.id}-${child.id}`
                if (!edges.some((e) => e.id === edgeId)) {
                  edges.push({
                    id: edgeId,
                    source: image.id.toString(),
                    target: child.id.toString(),
                  })
                }
              }
            }
          }
        } catch (error) {
          console.error(`Failed to process image ${imageId}`, error)
        }
      }

      await processImage(id)

      const { stackByPHash, expandedStackIds } = get()
      const layouted = processGraph(
        nodes,
        edges,
        stackByPHash,
        expandedStackIds,
      )
      set({
        rawNodes: nodes,
        rawEdges: edges,
        nodes: layouted.nodes,
        edges: layouted.edges,
        isLoading: false,
      })
    } catch (error: any) {
      console.error('Failed to load lineage', error)
      set({ error: error.message, isLoading: false })
    }
  },

  reset: () => {
    set({
      rawNodes: [],
      rawEdges: [],
      nodes: [],
      edges: [],
      selectedImageId: null,
      rootImageId: null,
    })
  },
}))
