import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useWindowStore } from '@/store/windowStore'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useSafeArea } from '@/hooks/useSafeArea'
import { useSettingsStore } from '@/store/settingsStore'
import { DraggablePanel as LibDraggablePanel } from '@embeddr/react-ui'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { Button } from '@embeddr/react-ui/components/ui'

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
  const mergeWindows = useWindowStore((s) => s.mergeWindows)
  const mergeHoverTargetId = useWindowStore((s) => s.mergeHoverTargetId)
  const setMergeHoverTarget = useWindowStore((s) => s.setMergeHoverTarget)
  const setHoverPanelId = useWindowStore((s) => s.setHoverPanelId)
  const panelOrder = useWindowStore((s) => s.panelOrder)
  const backdropWindowId = useWindowStore((s) => s.backdropWindowId)
  const safeArea = useSafeArea()

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
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
  const liveUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const lastLiveUpdateAtRef = useRef(0)
  const liveUpdatePosRef = useRef<{ x: number; y: number } | null>(null)
  const liveUpdateSizeRef = useRef<{ width: number; height: number } | null>(
    null,
  )

  useEffect(() => {
    stateRef.current = state
  }, [state])
  useEffect(() => {
    sizeRef.current = size
  }, [size])
  useEffect(() => {
    positionRef.current = position
  }, [position])

  const scheduleLiveUpdate = useCallback(() => {
    const throttleMs = 90
    if (liveUpdateTimeoutRef.current) return
    const elapsed = Date.now() - lastLiveUpdateAtRef.current
    const waitMs = Math.max(0, throttleMs - elapsed)
    liveUpdateTimeoutRef.current = setTimeout(() => {
      liveUpdateTimeoutRef.current = null
      lastLiveUpdateAtRef.current = Date.now()
      const nextPos = liveUpdatePosRef.current
      const nextSize = liveUpdateSizeRef.current
      if (nextPos || nextSize) {
        updateWindow(id, {
          position: nextPos ?? positionRef.current,
          size: nextSize ?? sizeRef.current,
        })
      }
    }, waitMs)
  }, [id, updateWindow])

  useEffect(() => {
    return () => {
      if (liveUpdateTimeoutRef.current) {
        clearTimeout(liveUpdateTimeoutRef.current)
        liveUpdateTimeoutRef.current = null
      }
    }
  }, [])

  const clampPositionToSafeArea = useCallback(
    (
      nextPos: { x: number; y: number },
      panelSize: { width: number; height: number },
    ) => {
      const minX = safeArea.left
      const minY = safeArea.top
      const maxX = Math.max(
        minX,
        window.innerWidth - safeArea.right - panelSize.width,
      )
      const maxY = Math.max(
        minY,
        window.innerHeight - safeArea.bottom - panelSize.height,
      )

      return {
        x: Math.min(Math.max(nextPos.x, minX), maxX),
        y: Math.min(Math.max(nextPos.y, minY), maxY),
      }
    },
    [safeArea.bottom, safeArea.left, safeArea.right, safeArea.top],
  )

  const clampSizeToSafeArea = useCallback(
    (
      nextSize: { width: number; height: number },
      atPos: { x: number; y: number },
    ) => {
      const maxWidth = Math.max(
        minWidth,
        window.innerWidth - safeArea.right - atPos.x,
      )
      const maxHeight = Math.max(
        minHeight,
        window.innerHeight - safeArea.bottom - atPos.y,
      )

      return {
        width: Math.min(Math.max(nextSize.width, minWidth), maxWidth),
        height: Math.min(Math.max(nextSize.height, minHeight), maxHeight),
      }
    },
    [minHeight, minWidth, safeArea.bottom, safeArea.right],
  )

  useEffect(() => {
    if (windowState?.positionMode !== 'absolute') return
    if (!windowState.position) return
    const { x, y } = windowState.position
    isInteracting.current = true
    setPosition({ x, y })
    setState((prev) => ({
      ...prev,
      anchorX: 'left',
      anchorY: 'top',
      offsetX: x,
      offsetY: y,
    }))
    updateWindow(id, { positionMode: undefined })
    setTimeout(() => {
      isInteracting.current = false
    }, 120)
  }, [id, updateWindow, windowState?.positionMode, windowState?.position])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      lastMouseRef.current = { x: event.clientX, y: event.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

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
        const forceAbsolute = windowState.positionMode === 'absolute'
        // We need to calculate the correct offset for the current anchor
        // based on this new absolute position
        let newOffsetX = newX
        let newOffsetY = newY

        const { innerWidth, innerHeight } = window

        if (!forceAbsolute) {
          // X Axis
          if (currentState.anchorX === 'right') {
            newOffsetX =
              innerWidth - (currentState.width || currentSize.width) - newX
          } else if (currentState.anchorX === 'center') {
            newOffsetX =
              newX -
              (innerWidth - (currentState.width || currentSize.width)) / 2
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
        }

        setState((prev) => ({
          ...prev,
          anchorX: forceAbsolute ? 'left' : prev.anchorX,
          anchorY: forceAbsolute ? 'top' : prev.anchorY,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        }))
        setPosition({ x: newX, y: newY })

        if (forceAbsolute) {
          updateWindow(id, { positionMode: undefined })
        }
      }
    }
  }, [
    // Depend on the store position object identity.
    // If simple re-renders create new objects with same values, this might still fire occasionally,
    // but typically store updaters preserve identity if values haven't changed, or we accept the slight overhead.
    // The critical thing is NOT to depend on 'position' or 'state'.
    windowState?.position,
    windowState?.positionMode,
    setState,
    updateWindow,
    id,
  ])

  // Calculate position from state and window size
  const calculatePosition = useCallback(() => {
    let x = 0
    let y = 0

    if (state.anchorX === 'left') x = safeArea.left + state.offsetX
    else if (state.anchorX === 'right')
      x = window.innerWidth - safeArea.right - size.width - state.offsetX
    else x = safeArea.left + (safeArea.width - size.width) / 2 + state.offsetX

    if (state.anchorY === 'top') y = safeArea.top + state.offsetY
    else if (state.anchorY === 'bottom')
      y = window.innerHeight - safeArea.bottom - size.height - state.offsetY
    else y = safeArea.top + (safeArea.height - size.height) / 2 + state.offsetY

    return { x, y }
  }, [state, size.width, size.height, safeArea])

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

  const findMergeTarget = useCallback(() => {
    if (windowState?.groupHostId) return null
    if (!isInteracting.current) return null
    const pointer = lastMouseRef.current
    if (!pointer) return null
    const currentEl = document.querySelector(
      `[data-panel-id="${id}"]`,
    ) as HTMLElement | null
    if (!currentEl) return null
    const centerX = pointer.x
    const centerY = pointer.y

    const candidates = document.querySelectorAll('[data-panel-drop-zone="tab"]')
    for (const node of Array.from(candidates)) {
      const el = node as HTMLElement
      const targetId = el.getAttribute('data-panel-id')
      if (!targetId || targetId === id) continue
      const targetState = useWindowStore.getState().windows[targetId]
      if (!targetState || targetState.isMinimized || targetState.groupHostId)
        continue
      const rect = el.getBoundingClientRect()
      const isInside =
        centerX >= rect.left &&
        centerX <= rect.left + rect.width &&
        centerY >= rect.top &&
        centerY <= rect.top + rect.height
      if (isInside) return targetId
    }
    return null
  }, [id, windowState?.groupHostId])

  // Handle drag/resize end - calculate new anchor and offset
  const handleInteractionEnd = useCallback(() => {
    const clampedSize = clampSizeToSafeArea(size, position)
    const clampedPosition = clampPositionToSafeArea(position, clampedSize)

    const { x, y } = clampedPosition
    const { width, height } = clampedSize

    setPosition(clampedPosition)
    setSize(clampedSize)

    let anchorX: PanelState['anchorX'] = 'left'
    let offsetX = x - safeArea.left

    // Threshold for middle vs sides
    const centerX = safeArea.left + safeArea.width / 2

    if (x + width / 2 < centerX - 100) {
      anchorX = 'left'
      offsetX = x - safeArea.left
    } else if (x + width / 2 > centerX + 100) {
      anchorX = 'right'
      offsetX = window.innerWidth - safeArea.right - (x + width)
    } else {
      anchorX = 'center'
      offsetX = x + width / 2 - centerX
    }

    let anchorY: PanelState['anchorY'] = 'top'
    let offsetY = y - safeArea.top

    const centerY = safeArea.top + safeArea.height / 2

    if (y + height / 2 < centerY - 100) {
      anchorY = 'top'
      offsetY = y - safeArea.top
    } else if (y + height / 2 > centerY + 100) {
      anchorY = 'bottom'
      offsetY = window.innerHeight - safeArea.bottom - (y + height)
    } else {
      anchorY = 'center'
      offsetY = y + height / 2 - centerY
    }

    logger.info('Interaction Ended - Saving New State', {
      id,
      anchorX,
      anchorY,
      offsetX,
      offsetY,
      rawPosition: { x, y },
      rawSize: { width, height },
      safeArea,
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
      position: clampedPosition,
      size: clampedSize,
    })

    const targetId = findMergeTarget()
    if (targetId) mergeWindows(id, targetId)

    // Release interaction lock after a short delay to allow React state to settle
    // and prevent the stale-state jump in the calculatePosition effect
    setTimeout(() => {
      isInteracting.current = false
    }, 500) // Increased to 500ms to allow store propagation roundtrip to settle
  }, [
    id,
    position,
    size,
    clampPositionToSafeArea,
    clampSizeToSafeArea,
    setState,
    updateWindow,
    findMergeTarget,
    mergeWindows,
  ])

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

  const PanelBase = LibDraggablePanel as React.ComponentType<any>

  return (
    <PanelBase
      id={id}
      title={title}
      titleIcon={titleIcon}
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      onPositionChange={(pos: { x: number; y: number }) => {
        isInteracting.current = true
        const clampedPos = clampPositionToSafeArea(pos, sizeRef.current)
        setPosition(clampedPos)
        liveUpdatePosRef.current = clampedPos
        scheduleLiveUpdate()
        const targetId = findMergeTarget()
        if (targetId !== mergeHoverTargetId) setMergeHoverTarget(targetId)
      }}
      size={size}
      onSizeChange={(s: { width: number; height: number }) => {
        isInteracting.current = true
        const clampedSize = clampSizeToSafeArea(s, positionRef.current)
        const clampedPos = clampPositionToSafeArea(
          positionRef.current,
          clampedSize,
        )
        setSize(clampedSize)
        setPosition(clampedPos)
        liveUpdateSizeRef.current = clampedSize
        liveUpdatePosRef.current = clampedPos
        scheduleLiveUpdate()
      }}
      className={cn(className, 'embeddr-draggable-panel')}
      minWidth={minWidth}
      minHeight={minHeight}
      pinned={isPinned}
      onPinChange={onPinChange || (() => togglePin(id))}
      onDragEnd={() => {
        handleInteractionEnd()
        setMergeHoverTarget(null)
        liveUpdatePosRef.current = null
        liveUpdateSizeRef.current = null
      }}
      onResizeEnd={handleInteractionEnd}
      zIndex={zIndex}
      onFocus={() => bringToFront(id)}
      onMinimize={onMinimize}
      onMouseDown={(e: React.MouseEvent) => {
        // Stop propagation so the global click handler doesn't clear the active panel
        e.stopPropagation()
        bringToFront(id)
      }}
      onMouseEnter={() => setHoverPanelId(id)}
      onMouseLeave={() => setHoverPanelId(null)}
      showTitle={state.showTitle ?? true}
      onShowTitleChange={(showTitle: boolean) =>
        setState({ ...state, showTitle })
      }
      hideHeader={hideHeader}
      transparent={transparent}
      isActive={isActive}
      additionalSettingsItems={additionalSettingsItems}
      mergeActive={mergeHoverTargetId === id}
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
    </PanelBase>
  )
}
