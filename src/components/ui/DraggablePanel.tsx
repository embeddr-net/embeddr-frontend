import React, { useCallback, useEffect, useState } from 'react'
import { DraggablePanel as LibDraggablePanel } from '@embeddr/react-ui/components/draggable-panel'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { usePanelStore } from '@/store/panelStore'
import { cn } from '@/lib/utils'

interface DraggablePanelProps {
  id: string
  title: string
  children:
    | React.ReactNode
    | ((props: { showTitle: boolean }) => React.ReactNode)
  isOpen: boolean
  onClose: () => void
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  className?: string
  minWidth?: number
  minHeight?: number
  hideHeader?: boolean
  transparent?: boolean
}

interface PanelState {
  anchorX: 'left' | 'right' | 'center'
  anchorY: 'top' | 'bottom' | 'center'
  offsetX: number
  offsetY: number
  width: number
  height: number
  pinned: boolean
  showTitle: boolean
}

export function DraggablePanel({
  id,
  title,
  children,
  isOpen,
  onClose,
  defaultPosition = { x: 20, y: 20 },
  defaultSize = { width: 320, height: 400 },
  className,
  minWidth = 200,
  minHeight = 40,
  hideHeader,
  transparent,
}: DraggablePanelProps) {
  const { bringToFront, panelOrder } = usePanelStore()

  // Default state
  const defaultState: PanelState = {
    anchorX: 'left',
    anchorY: 'top',
    offsetX: defaultPosition.x,
    offsetY: defaultPosition.y,
    width: defaultSize.width,
    height: defaultSize.height,
    pinned: false,
    showTitle: true,
  }

  const [state, setState] = useLocalStorage<PanelState>(
    `panel-state-${id}`,
    defaultState,
  )

  // Local position state for smooth dragging
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Calculate position from state and window size
  const calculatePosition = useCallback(() => {
    const { innerWidth, innerHeight } = window
    let x = 0
    let y = 0

    if (state.anchorX === 'left') x = state.offsetX
    else if (state.anchorX === 'right')
      x = innerWidth - state.width - state.offsetX
    else x = (innerWidth - state.width) / 2 + state.offsetX

    if (state.anchorY === 'top') y = state.offsetY
    else if (state.anchorY === 'bottom')
      y = innerHeight - state.height - state.offsetY
    else y = (innerHeight - state.height) / 2 + state.offsetY

    return { x, y }
  }, [state])

  // Update position when state or window size changes
  useEffect(() => {
    setPosition(calculatePosition())

    const handleResize = () => setPosition(calculatePosition())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [calculatePosition])

  // Handle drag end - calculate new anchor and offset
  const handleDragEnd = () => {
    const { innerWidth, innerHeight } = window
    const { x, y } = position
    const { width, height } = state

    let anchorX: PanelState['anchorX'] = 'left'
    let offsetX = x

    // Snap thresholds
    const SNAP = 50

    if (x < SNAP) {
      anchorX = 'left'
      offsetX = x
    } else if (x > innerWidth - width - SNAP) {
      anchorX = 'right'
      offsetX = innerWidth - width - x
    } else {
      if (x > innerWidth / 2) {
        anchorX = 'right'
        offsetX = innerWidth - width - x
      } else {
        anchorX = 'left'
        offsetX = x
      }
    }

    let anchorY: PanelState['anchorY'] = 'top'
    let offsetY = y

    if (y < SNAP) {
      anchorY = 'top'
      offsetY = y
    } else if (y > innerHeight - height - SNAP) {
      anchorY = 'bottom'
      offsetY = innerHeight - height - y
    } else {
      if (y > innerHeight / 2) {
        anchorY = 'bottom'
        offsetY = innerHeight - height - y
      } else {
        anchorY = 'top'
        offsetY = y
      }
    }

    setState({
      ...state,
      anchorX,
      anchorY,
      offsetX,
      offsetY,
    })
  }

  const zIndex =
    (panelOrder.indexOf(id) === -1 ? 0 : panelOrder.indexOf(id)) + 20

  return (
    <LibDraggablePanel
      title={title}
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      onPositionChange={setPosition}
      size={{ width: state.width, height: state.height }}
      onSizeChange={(s) =>
        setState({ ...state, width: s.width, height: s.height })
      }
      className={cn(className, 'embeddr-draggable-panel')}
      minWidth={minWidth}
      minHeight={minHeight}
      pinned={state.pinned}
      onPinChange={(pinned) => setState({ ...state, pinned })}
      onDragEnd={handleDragEnd}
      zIndex={zIndex}
      onFocus={() => bringToFront(id)}
      onMouseDown={(e) => {
        // Stop propagation so the global click handler doesn't clear the active panel
        e.stopPropagation()
        bringToFront(id)
      }}
      showTitle={state.showTitle ?? true}
      onShowTitleChange={(showTitle) => setState({ ...state, showTitle })}
      hideHeader={hideHeader}
      transparent={transparent}
    >
      <div
        className="h-full w-full"
        onMouseDown={(e) => {
          // Also catch clicks inside the content
          e.stopPropagation()
          bringToFront(id)
        }}
      >
        {typeof children === 'function'
          ? children({ showTitle: state.showTitle ?? true })
          : children}
      </div>
    </LibDraggablePanel>
  )
}
