import React, { useEffect, useRef, useState } from 'react'
import { Info, Loader2, Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@embeddr/react-ui/components/button'
import { useLineageStore } from '@/store/lineageStore'
import { ImageNode } from '@/components/lineage/ImageNode'

const NODE_WIDTH = 240
const NODE_HEIGHT = 300

export const CustomGraph = () => {
  const {
    nodes,
    edges,
    isLoading,
    selectImage,
    selectedImageId,
    toggleStackExpansion,
  } = useLineageStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Center graph on load
  useEffect(() => {
    if (nodes.length > 0 && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()

      // Calculate bounding box of nodes
      const minX = Math.min(...nodes.map((n) => n.position.x))
      const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_WIDTH))
      const minY = Math.min(...nodes.map((n) => n.position.y))
      const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_HEIGHT))

      const graphWidth = maxX - minX
      const graphHeight = maxY - minY

      const scaleX = (width - 100) / graphWidth
      const scaleY = (height - 100) / graphHeight
      const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 1)

      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      setTransform({
        x: width / 2 - centerX * scale,
        y: height / 2 - centerY * scale,
        scale,
      })
    }
  }, [nodes])

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const zoomSensitivity = 0.001
      const newScale = Math.min(
        Math.max(transform.scale - e.deltaY * zoomSensitivity, 0.1),
        3,
      )

      // Zoom towards mouse pointer
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const scaleDiff = newScale - transform.scale
        const newX =
          transform.x - (mouseX - transform.x) * (scaleDiff / transform.scale)
        const newY =
          transform.y - (mouseY - transform.y) * (scaleDiff / transform.scale)

        setTransform({ x: newX, y: newY, scale: newScale })
      }
    } else {
      // Pan
      setTransform((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      // Left or Middle click
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      setTransform((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }))
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  if (isLoading && nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        Loading lineage...
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground p-8 text-center">
        <Info className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Lineage Selected</h3>
        <p className="max-w-md">
          Select an image from the sidebar to view its generation family tree.
          This will show parents (source images) and children
          (variations/upscales).
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-muted/10 overflow-hidden relative cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
        <Button
          size="icon"
          variant="secondary"
          onClick={() =>
            setTransform((t) => ({ ...t, scale: Math.min(t.scale + 0.1, 3) }))
          }
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() =>
            setTransform((t) => ({ ...t, scale: Math.max(t.scale - 0.1, 0.1) }))
          }
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() => {
            // Reset view logic (simplified)
            setTransform({ x: 0, y: 0, scale: 1 })
          }}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          willChange: 'transform',
        }}
      >
        {/* Edges Layer */}
        <svg
          className="absolute top-0 left-0 overflow-visible pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#ff0000" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source)
            const targetNode = nodes.find((n) => n.id === edge.target)

            if (!sourceNode || !targetNode) return null

            const startX = sourceNode.position.x + NODE_WIDTH / 2
            const startY = sourceNode.position.y + NODE_HEIGHT - 10
            const endX = targetNode.position.x + NODE_WIDTH / 2
            const endY = targetNode.position.y - 5

            // Bezier curve
            const path = `M ${startX} ${startY} C ${startX} ${startY + 50}, ${endX} ${endY - 50}, ${endX} ${endY}`

            return (
              <path
                key={edge.id}
                d={path}
                stroke="#ff0000"
                strokeWidth="3"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            )
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map((node) => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              transform: `translate(${node.position.x}px, ${node.position.y}px)`,
              width: NODE_WIDTH,
              // height: NODE_HEIGHT,
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (node.data.isStack && node.data.stackId) {
                toggleStackExpansion(node.data.stackId)
              } else {
                selectImage(node.id)
              }
            }}
          >
            <ImageNode
              data={node.data}
              selected={selectedImageId === node.id}
              onToggleStack={() => {
                if (node.data.stackId) {
                  toggleStackExpansion(node.data.stackId)
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
