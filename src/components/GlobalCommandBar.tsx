import React, { useMemo } from 'react'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useCommandBarStore } from '@/store/commandBarStore'
import { useSettingsStore } from '@/store/settingsStore'
import { cn } from '@/lib/utils'
import { Separator } from '@embeddr/react-ui/components/separator'
import { useShallow } from 'zustand/react/shallow'

const SectionDivider = () => (
  <div className="h-4 w-px bg-border/50 mx-2 shrink-0" />
)

export function GlobalCommandBar() {
  const { isConnected } = useWebSocket()
  const { pageControls, widgets } = useCommandBarStore()
  const { commandBarHoverParams, commandBarPosition } = useSettingsStore(
    useShallow((s) => ({
      commandBarHoverParams: s.commandBarHoverParams,
      commandBarPosition: s.commandBarPosition,
    })),
  )

  const { leftWidgets, centerWidgets, rightWidgets } = useMemo(() => {
    const sorted = [...widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return {
      leftWidgets: sorted.filter((w) => w.location === 'left'),
      centerWidgets: sorted.filter((w) => w.location === 'center'),
      rightWidgets: sorted.filter((w) => w.location === 'right'),
    }
  }, [widgets])

  const isHoverEnabled = commandBarHoverParams?.enabled ?? false

  return (
    <div
      className={cn(
        'shrink-0 h-9 m-1! border rounded-md bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center px-2 text-[10px] z-50 relative select-none overflow-hidden transition-all duration-300',
        isHoverEnabled && 'opacity-0 hover:opacity-100 h-2 hover:h-9 delay-200',
      )}
    >
      {/* Left Section */}
      <div className="flex items-center h-full z-10 shrink-0">
        <div className="flex items-center gap-1">
          {leftWidgets.map((w, i) => (
            <React.Fragment key={w.id}>
              {i > 0 && <SectionDivider />}
              {w.component}
            </React.Fragment>
          ))}
        </div>

        {pageControls && (
          <>
            <SectionDivider />
            <div className="flex items-center gap-1 h-full mx-1">
              {pageControls}
            </div>
          </>
        )}
      </div>

      {/* Center Section - Absolute Centered */}
      <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none z-0">
        <div className="pointer-events-auto flex items-center gap-2 px-4 bg-background/0 transition-all">
          {centerWidgets.map((w) => (
            <React.Fragment key={w.id}>{w.component}</React.Fragment>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center justify-end h-full z-10 shrink-0 gap-0">
        <div className="flex items-center">
          {rightWidgets.map((w) => (
            <React.Fragment key={w.id}>
              <SectionDivider />
              <div className="flex items-center">{w.component}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
