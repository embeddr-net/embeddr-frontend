import React from 'react'
import { useWindowStore } from '@/store/windowStore'
import { usePluginStore } from '@/plugins/store'

import { windowRegistry } from './windowRegistry'
import { DraggablePanel } from './DraggablePanel'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Minus,
  X,
  Maximize2,
  Layout,
  PanelBottomClose,
  PanelBottomOpen,
  Minimize2,
  MoreVertical,
  Maximize,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@embeddr/react-ui/components/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import { useEmbeddrAPI, extendApiForPlugin } from '@/plugins/store'
import { useGlobalStore } from '@/store/globalStore'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'
type ResolvedPluginWindow = {
  pluginId: string
  componentName: string
  def?: any
}

type Resolved = { pluginId: string; componentName: string; def?: any } | null

function resolveFromComponentId(
  componentId: string | undefined,
  plugins: Record<string, any>,
): Resolved {
  if (!componentId) return null

  // longest-prefix match: `${pluginId}-...`
  let bestPid: string | null = null
  for (const pid of Object.keys(plugins || {})) {
    const prefix = pid + '-'
    if (componentId.startsWith(prefix)) {
      if (!bestPid || pid.length > bestPid.length) bestPid = pid
    }
  }
  if (!bestPid) return null

  const defId = componentId.slice(bestPid.length + 1)
  const def = plugins?.[bestPid]?.components?.find((c: any) => c.id === defId)
  const componentName = def?.exportName || def?.component
  if (!componentName) return null

  return { pluginId: bestPid, componentName, def }
}

export const PanelManager: React.FC = () => {
  const {
    windows,
    panelOrder,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    bringToFront,
    closeAll,
    showZenToolbar, // NEW
    toggleZenToolbar, // NEW
    backdropWindowId, // NEW
    setBackdrop, // NEW
  } = useWindowStore()

  // Render order must be STABLE to prevent component unmounting/remounting
  // which destroys WebGL contexts (Three.js/Canvas).
  // Visual layering is handled purely by z-index in DraggablePanel/Wrapper.
  // We filter out core components but do NOT sort by panelOrder here.
  // const openWindows = Object.values(windows).filter(
  //   (w) => !w.isMinimized && !w.componentId.startsWith('core-'),
  // )

  const openWindows = Object.values(windows).filter((w) => !w.isMinimized)

  const minimizedWindows = Object.values(windows).filter((w) => w.isMinimized)
  const backdropWindow = backdropWindowId ? windows[backdropWindowId] : null

  return (
    <>
      {/* Top Bar for Minimized / Management */}
      <div
        className={cn(
          'fixed bottom-1 left-0 right-0 h-8 z-[100] flex p-1 items-center gap-2 pointer-events-none w-full justify-between',
          // Always interactable now that checks for buttons
          'pointer-events-none',
        )}
      >
        {/* Left Side: Zen Toolbar Toggle */}
        <div className="pointer-events-auto flex items-center gap-1 bg-background/80 backdrop-blur-md shadow-sm border p-1 ">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={toggleZenToolbar}
              >
                {showZenToolbar ? (
                  <PanelBottomClose className="h-3 w-3" />
                ) : (
                  <PanelBottomOpen className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showZenToolbar ? 'Hide Toolbar' : 'Show Toolbar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right Side: Windows & Backdrop Status */}
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-md shadow-sm pointer-events-auto transition-all border p-1">
          {backdropWindow && (
            <div className="flex items-center gap-1 mr-2 border-r pr-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                <Layout className="h-3 w-3" />
                Backdrop: {backdropWindow.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-1"
                onClick={() => setBackdrop(null)} // Eject backdrop
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            </div>
          )}

          {minimizedWindows.length > 0 && (
            <div className="flex items-center gap-1  border-r py-1 px-2.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                {minimizedWindows.length}
              </span>
            </div>
          )}

          {minimizedWindows.map((w) => (
            <Tooltip key={w.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs gap-1 max-w-[150px] truncate"
                  onClick={() => restoreWindow(w.id)}
                >
                  <Maximize2 className="h-3 w-3" />
                  {w.title}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore {w.title}</TooltipContent>
            </Tooltip>
          ))}

          {Object.keys(windows).length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1"
                  onClick={closeAll}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close All Windows</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Window Container */}
      {/* We render persistent windows here */}
      {openWindows.map((w) => {
        // Core windows (if you ever decide to render them here)
        if (w.componentId.startsWith('core-')) {
          const Component = windowRegistry.get(w.componentId)
          if (!Component) return null
          return (
            <PanelManagerWrapper
              key={w.id}
              windowState={w}
              Component={Component}
            />
          )
        }

        // Plugin windows: host renders chrome + dynamic component
        return <PluginWindowWrapper key={w.id} windowState={w} />
      })}
    </>
  )
}
export const PluginWindowWrapper = ({ windowState }: { windowState: any }) => {
  // ✅ ALL hooks first, unconditional, top-level
  const windowApi = useWindowStore()
  const baseApi = useEmbeddrAPI()
  const { selectedImage } = useGlobalStore()
  const plugins = usePluginStore((s) => s.plugins)

  const {
    closeWindow,
    minimizeWindow,
    bringToFront,
    togglePin,
    panelOrder,
    updateWindow,
    setBackdrop,
    backdropWindowId,
  } = windowApi

  const isBackdrop = windowState.id === backdropWindowId

  const orderIndex = panelOrder.indexOf(windowState.id)
  const baseOrder = orderIndex === -1 ? 0 : orderIndex
  const zIndex = isBackdrop
    ? 0
    : windowState.isPinned
      ? 1000 + baseOrder
      : 20 + baseOrder

  const resolved = React.useMemo<Resolved>(() => {
    // Prefer explicit spawn props if present
    const explicitPid = windowState.props?.pluginId
    const explicitName = windowState.props?.componentName
    if (explicitPid && explicitName) {
      return { pluginId: explicitPid, componentName: explicitName }
    }
    return resolveFromComponentId(windowState.componentId, plugins)
  }, [
    windowState.componentId,
    windowState.props?.pluginId,
    windowState.props?.componentName,
    plugins,
  ])

  // ✅ still safe: no hooks below, so early returns are fine
  if (!resolved) {
    console.warn('[PanelManager] Could not resolve plugin window', windowState)
    return null
  }

  const { pluginId, componentName, def } = resolved
  const api = extendApiForPlugin(baseApi, pluginId)
  const isActive = panelOrder[panelOrder.length - 1] === windowState.id

  const handlePositionChange = (pos: { x: number; y: number }) =>
    updateWindow(windowState.id, { position: pos })

  const handleSizeChange = (size: { width: number; height: number }) =>
    updateWindow(windowState.id, { size })

  const defaultSize =
    windowState.size ||
    windowState.props?.defaultSize ||
    def?.props?.defaultSize
  const defaultPosition =
    windowState.position ||
    windowState.props?.defaultPosition ||
    def?.props?.defaultPosition

  return (
    <DraggablePanel
      id={windowState.id}
      title={windowState.title}
      isOpen={true}
      zIndex={zIndex}
      onClose={() => closeWindow(windowState.id)}
      onMinimize={() => minimizeWindow(windowState.id)}
      onFocus={() => bringToFront(windowState.id)}
      pinned={isBackdrop ? true : windowState.isPinned}
      onPinChange={() => togglePin(windowState.id)}
      isActive={isActive}
      defaultSize={defaultSize}
      defaultPosition={defaultPosition}
      position={windowState.position}
      size={windowState.size}
      onPositionChange={handlePositionChange}
      onSizeChange={handleSizeChange}
      hideHeader={windowState.props?.hideHeader}
      transparent={windowState.props?.transparent}
      className={cn(
        windowState.props?.className,
        isBackdrop &&
          '!fixed !inset-0 !w-screen !h-screen !left-0 !top-0 !z-0 !border-0 !shadow-none !transform-none !bg-background pb-10',
      )}
      additionalSettingsItems={
        <DropdownMenuItem onClick={() => setBackdrop(windowState.id)}>
          <Maximize className="mr-2 h-4 w-4" />
          Set as Backdrop
        </DropdownMenuItem>
      }
      context={{
        artifactId: selectedImage?.id,
        imageUrl: selectedImage?.url,
      }}
    >
      <div className="h-full w-full min-h-0 overflow-hidden embeddr-plugin-scope">
        <DynamicPluginComponent
          pluginId={pluginId}
          componentName={componentName}
          api={api}
          windowId={windowState.id}
          context={{
            artifactId: selectedImage?.id,
            imageUrl: selectedImage?.url,
          }}
          {...(windowState.props || {})}
        />
      </div>
    </DraggablePanel>
  )
}

const PanelManagerWrapper = ({
  windowState,
  Component,
}: {
  windowState: any
  Component: any
}) => {
  const {
    closeWindow,
    minimizeWindow,
    bringToFront,
    togglePin,
    panelOrder,
    updateWindow, // Need updateWindow
    setBackdrop,
    backdropWindowId,
  } = useWindowStore()
  const baseApi = useEmbeddrAPI()
  const { selectedImage } = useGlobalStore()

  const isBackdrop = windowState.id === backdropWindowId

  // Calculate global z-index consistent with DraggablePanel wrapper
  const orderIndex = panelOrder.indexOf(windowState.id)
  const baseOrder = orderIndex === -1 ? 0 : orderIndex
  const zIndex = isBackdrop
    ? 0
    : windowState.isPinned
      ? 1000 + baseOrder
      : 20 + baseOrder

  // Extend API if pluginId is present in window props
  const pluginId = windowState.props?.pluginId
  const api = pluginId ? extendApiForPlugin(baseApi, pluginId) : baseApi

  const isActive = panelOrder[panelOrder.length - 1] === windowState.id

  // Create debounced updaters for plugins that use the dumb DraggablePanel
  // This allows them to persist state just by spreading props
  const handlePositionChange = React.useCallback(
    (pos: { x: number; y: number }) => {
      // Use a small timeout or debounce if needed, but for now direct update
      // passed to a plugin might update the store.
      // Ideally we debounce this.
      // Since we can't easily hook up a useRef debounce inside this recreation,
      // we rely on the component (dumb panel) not spamming too hard, or we accept some traffic.
      // Better: updateWindow is just a state set, Zustand is fast.
      // But the "Jitter" fix in Smart Panel handles the loop back.
      updateWindow(windowState.id, { position: pos })
    },
    [windowState.id, updateWindow],
  )

  const handleSizeChange = React.useCallback(
    (size: { width: number; height: number }) => {
      updateWindow(windowState.id, { size })
    },
    [windowState.id, updateWindow],
  )

  // Inject api if not present
  const props = {
    ...(windowState.props || {}),
    id: windowState.id, // Explicitly pass ID for local storage keys etc
    api: windowState.props?.api || api,
    zIndex,
    // Pass size/position from store if plugin needs to be controlled
    defaultSize: windowState.size || windowState.props?.defaultSize,
    defaultPosition: windowState.position || windowState.props?.defaultPosition,
    // Explicitly pass constrained position/size so "controlled" mode works in UI lib
    position: windowState.position,
    size: windowState.size,
    // Header settings actions
    additionalSettingsItems: (
      <DropdownMenuItem onClick={() => setBackdrop(windowState.id)}>
        <Maximize className="mr-2 h-4 w-4" />
        Set as Backdrop
      </DropdownMenuItem>
    ),
    // Handlers for persistence
    onPositionChange: handlePositionChange,
    onSizeChange: handleSizeChange,
    context: {
      artifactId: selectedImage?.id,
      imageUrl: selectedImage?.url,
    },
    onClose: () => closeWindow(windowState.id),
    onMinimize: () => minimizeWindow(windowState.id),
    onFocus: () => bringToFront(windowState.id),
    onPinChange: () => togglePin(windowState.id),
    pinned: isBackdrop ? true : windowState.isPinned,
    isActive,
    ...(isBackdrop
      ? {
          hideHeader: true,
          // Force fixed full screen with high specificity overrides
          className: cn(
            windowState.props?.className,
            '!fixed !inset-0 !w-screen !h-screen !left-0 !top-0 !z-0 !border-0 !shadow-none !transform-none !bg-background pb-10',
          ),
          // Logic overrides
          position: { x: 0, y: 0 },
          size: {
            width: typeof window !== 'undefined' ? window.innerWidth : 1000,
            height: typeof window !== 'undefined' ? window.innerHeight : 1000,
          },
        }
      : {}),
  }

  return (
    <div className="embeddr-plugin-scope">
      <Component {...props} />
    </div>
  )
}
