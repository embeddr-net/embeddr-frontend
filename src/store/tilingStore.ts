/**
 * tilingStore – manages the tiling tree layout for the frontend.
 *
 * Each tile leaf stores a `componentId` and optional `instanceId`.
 * Core windows (core-*) and plugin components can both be tiled.
 * The tree is persisted to localStorage so layouts survive page reloads.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TileDragPayload, TileDropZone, TileNode } from '@embeddr/zen-shell'
import {
  collapseEmptyNodes,
  createLeaf,
  createNodeId,
  findNodeById,
  pruneTreeEntries,
  sendEntryToTileTree,
  updateNodeById,
} from '@embeddr/zen-shell'

export interface TilingState {
  /** The root of the tiling tree, or null for an empty canvas. */
  tileTree: TileNode | null
  setTileTree: (tree: TileNode | null) => void

  /**
   * Assign a component to a tile. Handles center (replace), and
   * directional splits (left/right/top/bottom).
   */
  assignTile: (
    nodeId: string,
    payload: TileDragPayload,
    zone: TileDropZone,
  ) => void

  /** Remove the content of a tile and collapse empty nodes. */
  closeTile: (nodeId: string) => void

  /** Remove a component from a tile (e.g. when popping out to floating). */
  clearTile: (nodeId: string) => void

  /** Prune tiles whose entryKeys are no longer in the valid set. */
  pruneTiles: (validKeys: Set<string>) => void

  /** Reset the entire tiling layout. */
  resetTiling: () => void

  /** Toggle the header visibility for a specific tile node. */
  toggleTileHeader: (nodeId: string) => void

  /**
   * Send a floating window into the tiling canvas.
   * Auto-finds the first empty leaf or splits the last occupied one.
   */
  sendToTile: (componentId: string, windowId: string) => void
}

export const useTilingStore = create<TilingState>()(
  persist(
    (set, get) => ({
      tileTree: null,

      setTileTree: (tree) => set({ tileTree: tree }),

      assignTile: (nodeId, payload, zone) => {
        const { tileTree } = get()
        if (!tileTree) return

        const target = findNodeById(tileTree, nodeId)
        if (!target || target.children) return

        // Avoid no-op center drops on the same tile
        if (payload.sourceNodeId === nodeId && zone === 'center') return

        const incomingInstanceId = payload.instanceId || createNodeId()
        const targetEntry = target.entryKey
        const targetInstanceId = target.instanceId
        let nextTree = tileTree

        if (zone === 'center') {
          // Replace: set the incoming entry on this node
          nextTree = updateNodeById(nextTree, nodeId, (node) => ({
            ...node,
            entryKey: payload.entryKey,
            instanceId: incomingInstanceId,
          }))
          // Clear source node if it came from another tile
          if (payload.sourceNodeId && payload.sourceNodeId !== nodeId) {
            nextTree = updateNodeById(nextTree, payload.sourceNodeId, (node) => ({
              ...node,
              entryKey: undefined,
              instanceId: undefined,
            }))
          }
          set({ tileTree: collapseEmptyNodes(nextTree) })
          return
        }

        // Split: create two children
        const split = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical'
        const newEntryFirst = zone === 'left' || zone === 'top'
        const isSameNode = payload.sourceNodeId === nodeId

        const makeLeaf = (isTarget: boolean) => {
          if (isSameNode && !isTarget) {
            return createLeaf(undefined, undefined, undefined)
          }
          if (isTarget) {
            return createLeaf(targetEntry, target.id, targetInstanceId)
          }
          return createLeaf(payload.entryKey, undefined, incomingInstanceId)
        }

        nextTree = updateNodeById(nextTree, nodeId, () => ({
          id: createNodeId(),
          split,
          children: [makeLeaf(newEntryFirst ? false : true), makeLeaf(newEntryFirst ? true : false)] as [TileNode, TileNode],
        }))

        if (payload.sourceNodeId && !isSameNode) {
          nextTree = updateNodeById(nextTree, payload.sourceNodeId, (node) => ({
            ...node,
            entryKey: undefined,
            instanceId: undefined,
          }))
        }

        set({ tileTree: collapseEmptyNodes(nextTree) })
      },

      closeTile: (nodeId) => {
        const { tileTree } = get()
        if (!tileTree) return
        const nextTree = updateNodeById(tileTree, nodeId, (node) => ({
          ...node,
          entryKey: undefined,
          instanceId: undefined,
        }))
        set({ tileTree: collapseEmptyNodes(nextTree) })
      },

      clearTile: (nodeId) => {
        const { tileTree } = get()
        if (!tileTree) return
        const nextTree = updateNodeById(tileTree, nodeId, (node) => ({
          ...node,
          entryKey: undefined,
          instanceId: undefined,
        }))
        set({ tileTree: collapseEmptyNodes(nextTree) })
      },

      pruneTiles: (validKeys) => {
        const { tileTree } = get()
        if (!tileTree) return
        const pruned = pruneTreeEntries(tileTree, validKeys)
        const collapsed = collapseEmptyNodes(pruned)
        if (collapsed !== tileTree) {
          set({ tileTree: collapsed })
        }
      },

      resetTiling: () => set({ tileTree: null }),

      toggleTileHeader: (nodeId) => {
        const { tileTree } = get()
        if (!tileTree) return
        const nextTree = updateNodeById(tileTree, nodeId, (node) => ({
          ...node,
          showHeader: node.showHeader === false ? true : false,
        }))
        set({ tileTree: nextTree })
      },

      sendToTile: (componentId, windowId) => {
        const { tileTree } = get()
        set({ tileTree: sendEntryToTileTree(tileTree, componentId, windowId) })
      },    }),
    {
      name: 'embeddr-tiling-store',
      version: 1,
    },
  ),
)
