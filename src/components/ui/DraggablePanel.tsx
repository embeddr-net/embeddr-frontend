import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useWindowStore } from '@/store/windowStore'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DraggablePanel as LibDraggablePanel } from '@embeddr/react-ui'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button } from '@embeddr/react-ui/components/button'

interface DraggablePanelProps {
  id: string
  title: string
  titleIcon?: React.ReactNode
  children:
    | React.ReactNode
    | ((props: { showTitle: boolean; isActive: boolean }) => React.ReactNode)
  isOpen: boolean
  onClose: () => void
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  className?: string
  minWidth?: number
  minHeight?: number
  hideHeader?: boolean
  transparent?: boolean
  onMinimize?: () => void
  zIndex?: number
  additionalSettingsItems?: React.ReactNode
  pinned?: boolean
  onPinChange?: () => void
  isActive?: boolean
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  onPositionChange?: (pos: { x: number; y: number }) => void
  onSizeChange?: (size: { width: number; height: number }) => void
  onDragEnd?: () => void
  onResizeEnd?: () => void
  onMouseDown?: (event: React.MouseEvent) => void
  showTitle?: boolean
  onShowTitleChange?: (showTitle: boolean) => void
  context?: { artifactId?: string | number; imageUrl?: string }
}

interface PanelState {
  anchorX: 'left' | 'right' | 'center'
  anchorY: 'top' | 'bottom' | 'center'
  offsetX: number
  offsetY: number
  width: number
  height: number
  showTitle: boolean
}

export function DraggablePanel({
  id,
  title,
  titleIcon,
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
  onMinimize,
  additionalSettingsItems,
  zIndex: propZIndex,
  pinned,
  onPinChange,
  isActive: isActiveProp,
}: DraggablePanelProps) {
  const bringToFront = useWindowStore((s) => s.bringToFront)
  const updateWindow = useWindowStore((s) => s.updateWindow)
  const togglePin = useWindowStore((s) => s.togglePin)
  const setBackdrop = useWindowStore((s) => s.setBackdrop)
  const { panelOrder, backdropWindowId } = useWindowStore()

  // Explicitly select only this window's state to prevent re-renders when other windows update
  const windowState = useWindowStore((s) => s.windows[id])
  const isPinned = pinned ?? windowState?.isPinned ?? false

  // Efficient selections for derived state
  const isActive =
    isActiveProp ??
    useWindowStore((s) => s.panelOrder[s.panelOrder.length - 1] === id)
  const isBackdrop = useWindowStore((s) => s.backdropWindowId === id)

  const logger = useRef(createLogger(`DraggablePanel:${id}`)).current

  // Default internal state for anchoring logic
  const defaultState: PanelState = React.useMemo(
    () => ({
      anchorX: 'left',
      anchorY: 'top',
      offsetX: defaultPosition.x,
      offsetY: defaultPosition.y,
      width: defaultSize.width,
      height: defaultSize.height,
      showTitle: true,
    }),
    [
      defaultPosition.x,
      defaultPosition.y,
      defaultSize.width,
      defaultSize.height,
    ],
  )

  const [state, setState] = useLocalStorage<PanelState>(
    `panel-state-${id}`,
    defaultState,
  )

  // Local interaction state for smooth performance
  // Initialize from saved state to prevent jumping to 0,0 on mount
  const [position, setPosition] = useState(() => {
    // Basic calculation for the very first frame
    const { x, y } = defaultPosition
    // We try to read from localStorage immediately for the initializer
    try {
      const saved = localStorage.getItem(`panel-state-${id}`)
      if (saved) {
        const s = JSON.parse(saved) as PanelState
        // Basic anchor logic for initial mount
        const width = s.width || defaultSize.width
        const height = s.height || defaultSize.height
        const innerWidth =
          typeof window !== 'undefined' ? window.innerWidth : 1024
        const innerHeight =
          typeof window !== 'undefined' ? window.innerHeight : 768

        let initialX = s.offsetX
        let initialY = s.offsetY

        if (s.anchorX === 'right') initialX = innerWidth - width - s.offsetX
        else if (s.anchorX === 'center')
          initialX = (innerWidth - width) / 2 + s.offsetX

        if (s.anchorY === 'bottom') initialY = innerHeight - height - s.offsetY
        else if (s.anchorY === 'center')
          initialY = (innerHeight - height) / 2 + s.offsetY

        return { x: initialX, y: initialY }
      }
    } catch (e) {
      // Fallback
    }
    return { x, y }
  })
  const [size, setSize] = useState({ width: state.width, height: state.height })
  const isInteracting = useRef(false)

  // Refs for accessing latest state/size/position inside effects without adding to dependencies
  const stateRef = useRef(state)
  const sizeRef = useRef(size)
  const positionRef = useRef(position)

  useEffect(() => {
    stateRef.current = state
  }, [state])
  useEffect(() => {
    sizeRef.current = size
  }, [size])
  useEffect(() => {
    positionRef.current = position
  }, [position])

  // Sync local size when localStorage state changes (external updates)
  useEffect(() => {
    if (isInteracting.current) return
    setSize((current) => {
      if (current.width === state.width && current.height === state.height)
        return current
      return { width: state.width, height: state.height }
    })
  }, [state.width, state.height])

  // Sync state width/height with props if provided by store
  useEffect(() => {
    if (isInteracting.current) return
    if (windowState?.size) {
      const newWidth = windowState.size.width
      const newHeight = windowState.size.height

      if (newWidth !== state.width || newHeight !== state.height) {
        setState((prev) => ({
          ...prev,
          width: newWidth ?? prev.width,
          height: newHeight ?? prev.height,
        }))
      }
    }
  }, [windowState?.size, setState, state.width, state.height])

  // Sync position with store if provided
  useEffect(() => {
    // Only perform sync if not interacting.
    // AND crucially, only if the store position is DIFFERENT from our current position (within epsilon?)
    // Actually, simpler: Only run this effect when windowState.position changes reference.
    // By NOT including position in deps, we avoid the feedback loop where resize -> setPosition -> effect -> setPosition(old).

    if (isInteracting.current) return
    if (windowState?.position) {
      const newX = windowState.position.x
      const newY = windowState.position.y

      const currentPos = positionRef.current
      const currentState = stateRef.current
      const currentSize = sizeRef.current

      // Check if position actually changed significantly
      const deltaX = Math.abs(newX - currentPos.x)
      const deltaY = Math.abs(newY - currentPos.y)

      if (deltaX > 2 || deltaY > 2) {
        logger.debug('External Position Update', {
          newX,
          newY,
          currentX: currentPos.x,
          currentY: currentPos.y,
        })
        // We need to calculate the correct offset for the current anchor
        // based on this new absolute position
        let newOffsetX = newX
        let newOffsetY = newY

        const { innerWidth, innerHeight } = window

        // X Axis
        if (currentState.anchorX === 'right') {
          newOffsetX =
            innerWidth - (currentState.width || currentSize.width) - newX
        } else if (currentState.anchorX === 'center') {
          newOffsetX =
            newX - (innerWidth - (currentState.width || currentSize.width)) / 2
        }

        // Y Axis
        if (currentState.anchorY === 'bottom') {
          newOffsetY =
            innerHeight - (currentState.height || currentSize.height) - newY
        } else if (currentState.anchorY === 'center') {
          newOffsetY =
            newY -
            (innerHeight - (currentState.height || currentSize.height)) / 2
        }

        setState((prev) => ({
          ...prev,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
          // Do NOT reset anchors here. Keep existing anchors.
        }))
        setPosition({ x: newX, y: newY })
      }
    }
  }, [
    // Depend on the store position object identity.
    // If simple re-renders create new objects with same values, this might still fire occasionally,
    // but typically store updaters preserve identity if values haven't changed, or we accept the slight overhead.
    // The critical thing is NOT to depend on 'position' or 'state'.
    windowState?.position,
    setState,
  ])

  // Calculate position from state and window size
  const calculatePosition = useCallback(() => {
    const { innerWidth, innerHeight } = window
    let x = 0
    let y = 0

    if (state.anchorX === 'left') x = state.offsetX
    else if (state.anchorX === 'right')
      x = innerWidth - size.width - state.offsetX
    else x = (innerWidth - size.width) / 2 + state.offsetX

    if (state.anchorY === 'top') y = state.offsetY
    else if (state.anchorY === 'bottom')
      y = innerHeight - size.height - state.offsetY
    else y = (innerHeight - size.height) / 2 + state.offsetY

    return { x, y }
  }, [state, size.width, size.height])

  // Update position when state or window size changes
  useEffect(() => {
    if (isInteracting.current) return
    setPosition(calculatePosition())

    let resizeTimer: any

    const handleResize = () => {
      logger.debug('Viewport Resize START/ONGOING', { anchorState: state })

      if (resizeTimer) window.clearTimeout(resizeTimer)

      if (!isInteracting.current) {
        const newPos = calculatePosition()
        setPosition(newPos)
      }

      resizeTimer = window.setTimeout(() => {
        logger.debug('Viewport Resize END', {
          finalPosition: calculatePosition(),
        })
      }, 200)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) window.clearTimeout(resizeTimer)
    }
  }, [calculatePosition])

  // Handle drag/resize end - calculate new anchor and offset
  const handleInteractionEnd = useCallback(() => {
    const { innerWidth, innerHeight } = window
    const { x, y } = position
    const { width, height } = size

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

    logger.info('Interaction Ended - Saving New State', {
      id,
      anchorX,
      anchorY,
      offsetX,
      offsetY,
      rawPosition: { x, y },
      rawSize: { width, height },
      windowSize: { innerWidth, innerHeight },
    })

    setState((prev) => ({
      ...prev,
      anchorX,
      anchorY,
      offsetX,
      offsetY,
      width,
      height,
    }))

    // Update store for layout persistence
    updateWindow(id, {
      position: { x, y },
      size: { width, height },
    })

    // Release interaction lock after a short delay to allow React state to settle
    // and prevent the stale-state jump in the calculatePosition effect
    setTimeout(() => {
      isInteracting.current = false
    }, 500) // Increased to 500ms to allow store propagation roundtrip to settle
  }, [id, position, size, setState, updateWindow])

  // Z-Index Logic
  // Normal windows: 20 + order (0 to N)
  // Pinned windows: 1000 + order
  // Active window gets a boost within its tier
  const orderIndex = panelOrder.indexOf(id)
  const baseOrder = orderIndex === -1 ? 0 : orderIndex

  // Backdrop overrides everything to be at the bottom (level 1-5), above desktop
  if (isBackdrop) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-10 w-full h-full bg-background/95 backdrop-blur-3xl overflow-hidden',
          className,
        )}
        style={{ pointerEvents: 'auto' }}
      >
        {typeof children === 'function'
          ? children({
              showTitle: false,
              isActive: true,
            })
          : children}
      </div>
    )
  }

  const zIndex = propZIndex ?? (isPinned ? 1000 + baseOrder : 20 + baseOrder)

  return (
    <LibDraggablePanel
      id={id}
      title={title}
      titleIcon={titleIcon}
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      onPositionChange={(pos) => {
        isInteracting.current = true
        setPosition(pos)
      }}
      size={size}
      onSizeChange={(s) => {
        isInteracting.current = true
        setSize(s)
      }}
      className={cn(className, 'embeddr-draggable-panel')}
      minWidth={minWidth}
      minHeight={minHeight}
      pinned={isPinned}
      onPinChange={onPinChange || (() => togglePin(id))}
      onDragEnd={handleInteractionEnd}
      onResizeEnd={handleInteractionEnd}
      zIndex={zIndex}
      onFocus={() => bringToFront(id)}
      onMinimize={onMinimize}
      onMouseDown={(e) => {
        // Stop propagation so the global click handler doesn't clear the active panel
        e.stopPropagation()
        bringToFront(id)
      }}
      showTitle={state.showTitle ?? true}
      onShowTitleChange={(showTitle) => setState({ ...state, showTitle })}
      hideHeader={hideHeader}
      transparent={transparent}
      isActive={isActive}
      additionalSettingsItems={additionalSettingsItems}
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
          ? children({
              showTitle: state.showTitle ?? true,
              isActive,
            })
          : children}
      </div>
    </LibDraggablePanel>
  )
}
