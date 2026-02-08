import { useSettingsStore } from '@/store/settingsStore'
import { useShallow } from 'zustand/react/shallow'
import { useMemo } from 'react'

export interface SafeArea {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

export function useSafeArea(): SafeArea {
  const { commandBarPosition, commandBarHoverParams, commandBarCompact } =
    useSettingsStore(
      useShallow((s) => ({
        commandBarPosition: s.commandBarPosition,
        commandBarHoverParams: s.commandBarHoverParams,
        commandBarCompact: s.commandBarCompact,
      })),
    )

  return useMemo(() => {
    // const BAR_HEIGHT = commandBarCompact ? 32 : 36
    const BAR_HEIGHT = 0
    const MARGIN = 0

    // If hover is enabled, the bar "floats" and doesn't take up permanent safe area space
    // except maybe a tiny bit if we want to avoid overlapping the trigger zone.
    const isOverlay = commandBarHoverParams?.enabled ?? false

    const effectiveSpace = commandBarCompact
      ? BAR_HEIGHT
      : BAR_HEIGHT + MARGIN * 2

    const safeArea = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }

    if (!isOverlay) {
      if (commandBarPosition === 'top') {
        safeArea.top = effectiveSpace
      } else {
        safeArea.bottom = effectiveSpace
      }
    }

    // Add some default padding for the edges of the screen
    const EDGE_PADDING = 0
    safeArea.top = Math.max(safeArea.top, EDGE_PADDING)
    safeArea.bottom = Math.max(safeArea.bottom, EDGE_PADDING)
    safeArea.left = Math.max(safeArea.left, EDGE_PADDING)
    safeArea.right = Math.max(safeArea.right, EDGE_PADDING)

    return {
      ...safeArea,
      width: window.innerWidth - safeArea.left - safeArea.right,
      height: window.innerHeight - safeArea.top - safeArea.bottom,
    }
  }, [commandBarPosition, commandBarHoverParams?.enabled, commandBarCompact])
}
