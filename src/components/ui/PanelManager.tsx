import React from 'react'
import { useWindowStore } from '@/store/windowStore'
import { useSettingsStore } from '@/store/settingsStore'
import { usePluginStore } from '@/plugins/store'
import { usePluginLogos } from '@/hooks/usePluginLogos'

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
import { PluginErrorBoundary } from '@/plugins/PluginErrorBoundary'
import { useShallow } from 'zustand/react/shallow'

type ResolvedPluginWindow = {
  pluginId: string
  componentName: string
  def?: any
}

type Resolved = { pluginId: string; componentName: string; def?: any } | null

const PluginContent = React.memo(
  ({
    pluginId,
    componentName,
    api,
    windowId,
    context,
    pluginProps,
  }: {
    pluginId: string
    componentName: string
    api: any
    windowId: string
    context: any
    pluginProps: any
  }) => (
    <PluginErrorBoundary pluginId={pluginId} componentName={componentName}>
      <DynamicPluginComponent
        pluginId={pluginId}
        componentName={componentName}
        api={api}
        windowId={windowId}
        context={context}
        {...pluginProps}
      />
    </PluginErrorBoundary>
  ),
  (prev, next) =>
    prev.pluginId === next.pluginId &&
    prev.componentName === next.componentName &&
    prev.api === next.api &&
    prev.windowId === next.windowId &&
    prev.context === next.context &&
    prev.pluginProps === next.pluginProps,
)

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
  const def = plugins?.[bestPid]?.components?.find(
    (c: any) => c.id === defId || c.name === defId,
  )
  const componentName = def?.exportName || def?.component
  if (!componentName) return null

  return { pluginId: bestPid, componentName, def }
}

const WindowRenderer = ({ id }: { id: string }) => {
  const { windowState, arePanelsHidden, backdropWindowId } = useWindowStore(
    useShallow((s) => ({
      windowState: s.windows[id],
      arePanelsHidden: s.arePanelsHidden,
      backdropWindowId: s.backdropWindowId,
    })),
  )
  if (!windowState) return null

  const isHidden = arePanelsHidden && windowState.id !== backdropWindowId

  let content = null

  // Core windows
  if (windowState.componentId.startsWith('core-')) {
    const Component = windowRegistry.get(windowState.componentId)
    if (Component) {
      content = (
        <PanelManagerWrapper
          key={windowState.id}
          windowState={windowState}
          Component={Component}
        />
      )
    }
  } else {
    // Plugin windows
    content = (
      <PluginWindowWrapper key={windowState.id} windowState={windowState} />
    )
  }

  if (!content) return null

  if (isHidden) {
    return <div style={{ display: 'none' }}>{content}</div>
  }

  return content
}

export const PanelManager: React.FC = () => {
  const restoreWindow = useWindowStore((s) => s.restoreWindow)
  const closeAll = useWindowStore((s) => s.closeAll)
  const showZenToolbar = useWindowStore((s) => s.showZenToolbar)
  const toggleZenToolbar = useWindowStore((s) => s.toggleZenToolbar)
  const setBackdrop = useWindowStore((s) => s.setBackdrop)
  const arePanelsHidden = useWindowStore((s) => s.arePanelsHidden)
  const backdropWindowId = useWindowStore((s) => s.backdropWindowId)

  // Select only IDs of open windows to avoid re-rendering list on every position update
  const openWindowIds = useWindowStore(
    useShallow((s) =>
      Object.values(s.windows)
        .filter((w) => {
          // Always show backdrop
          if (w.id === s.backdropWindowId) return true
          // Otherwise standard minimized check
          return !w.isMinimized
        })
        .map((w) => w.id),
    ),
  )

  // We explicitly subscribe to minimized windows for the restore bar
  const minimizedWindows = useWindowStore(
    useShallow((s) => Object.values(s.windows).filter((w) => w.isMinimized)),
  )

  // Backdrop window selection
  const backdropWindow = useWindowStore((s) =>
    s.backdropWindowId ? s.windows[s.backdropWindowId] : null,
  )

  // Render order must be STABLE to prevent component unmounting/remounting
  // which destroys WebGL contexts (Three.js/Canvas).
  // Visual layering is handled purely by z-index in DraggablePanel/Wrapper.
  // We filter out core components but do NOT sort by panelOrder here.
  // const openWindows = Object.values(windows).filter(
  //   (w) => !w.isMinimized && !w.componentId.startsWith('core-'),
  // )

  // const openWindows = Object.values(windows).filter((w) => !w.isMinimized)

  // const minimizedWindows = Object.values(windows).filter((w) => w.isMinimized)
  // const backdropWindow = backdropWindowId ? windows[backdropWindowId] : null

  return (
    <>
      {/* 
        NOTE: Bottom bar functionality has been moved to GlobalCommandBar widgets.
        (TaskbarWidget and ZenToggleWidget).
        This component now purely handles the rendering of the window panels themselves.
      */}

      {/* Render Main Window Panels */}
      {openWindowIds.map((id) => (
        <WindowRenderer key={id} id={id} />
      ))}
    </>
  )
}
export const PluginWindowWrapper = ({ windowState }: { windowState: any }) => {
  // ✅ ALL hooks first, unconditional, top-level
  const windowApi = useWindowStore(
    useShallow((s) => ({
      closeWindow: s.closeWindow,
      minimizeWindow: s.minimizeWindow,
      bringToFront: s.bringToFront,
      togglePin: s.togglePin,
      panelOrder: s.panelOrder,
      updateWindow: s.updateWindow,
      setBackdrop: s.setBackdrop,
      backdropWindowId: s.backdropWindowId,
    })),
  )
  const baseApi = useEmbeddrAPI()
  const { selectedImage } = useGlobalStore()
  const plugins = usePluginStore((s) => s.plugins)
  const commandBarPosition = useSettingsStore((s) => s.commandBarPosition)
  const isOverlay = useSettingsStore((s) => s.commandBarHoverParams.enabled)
  const showPluginLogos = useSettingsStore((s) => s.showPluginLogos)
  const { logos } = usePluginLogos()

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

  const api = React.useMemo(
    () =>
      resolved?.pluginId
        ? extendApiForPlugin(baseApi, resolved.pluginId)
        : baseApi,
    [baseApi, resolved?.pluginId],
  )
  const isActive = panelOrder[panelOrder.length - 1] === windowState.id

  const context = React.useMemo(
    () => ({
      artifactId: selectedImage?.id,
      imageUrl: selectedImage?.url,
    }),
    [selectedImage?.id, selectedImage?.url],
  )

  const pluginProps = React.useMemo(
    () => ({ ...(windowState.props || {}), isActive }),
    [windowState.props, isActive],
  )

  // ✅ safe early return after hooks
  if (!resolved) {
    console.warn('[PanelManager] Could not resolve plugin window', windowState)
    return null
  }

  const { pluginId, componentName, def } = resolved

  const logoUrl = showPluginLogos ? logos?.[pluginId] : null
  const titleIcon = logoUrl ? (
    <img
      src={logoUrl}
      alt={`${pluginId} logo`}
      className="h-4 w-4 rounded-sm object-contain"
    />
  ) : undefined

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

  if (isBackdrop) {
    return (
      <div
        className="fixed inset-0 z-0  flex flex-col w-screen h-screen"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Top Spacer */}
        {commandBarPosition === 'top' && !isOverlay && (
          <div className="h-10 w-full shrink-0 bg-background/0" />
        )}

        <div className="flex-1 w-full min-h-0 overflow-hidden relative embeddr-plugin-scope @container [container-name:panel] p-1">
          {/* Header Controls for Backdrop */}
          <div className="absolute top-2 right-2 z-50 flex items-center gap-1 opacity-10 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 rounded-full bg-background/50 backdrop-blur border"
              onClick={() => setBackdrop(null)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 rounded-full bg-background/50 backdrop-blur border"
              onClick={() => closeWindow(windowState.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden h-full">
            <PluginContent
              pluginId={pluginId}
              componentName={componentName}
              api={api}
              windowId={windowState.id}
              context={context}
              pluginProps={pluginProps}
            />
          </div>
        </div>

        {/* Bottom Spacer */}
        {commandBarPosition === 'bottom' && !isOverlay && (
          <div className="h-10 w-full shrink-0 bg-background/0" />
        )}
      </div>
    )
  }

  return (
    <DraggablePanel
      id={windowState.id}
      title={windowState.title}
      titleIcon={titleIcon}
      isOpen={true}
      zIndex={zIndex}
      onClose={() => closeWindow(windowState.id)}
      onMinimize={() => minimizeWindow(windowState.id)}
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
          'fixed! inset-0! w-screen! h-screen! left-0! top-0! z-0! border-0! shadow-none! transform-none! bg-background! p-1 rounded-md',
      )}
      additionalSettingsItems={
        <DropdownMenuItem onClick={() => setBackdrop(windowState.id)}>
          <Maximize className="mr-2 h-4 w-4" />
          Set as Backdrop
        </DropdownMenuItem>
      }
      context={context}
    >
      <div
        className="h-full w-full min-h-0 overflow-hidden embeddr-plugin-scope @container [container-name:panel]"
        style={{
          paddingTop: isBackdrop
            ? 'var(--layout-screen-safe-top, 0px)'
            : undefined,
          paddingBottom: isBackdrop
            ? 'var(--layout-screen-safe-bottom, 0px)'
            : undefined,
        }}
      >
        <PluginContent
          pluginId={pluginId}
          componentName={componentName}
          api={api}
          windowId={windowState.id}
          context={context}
          pluginProps={pluginProps}
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
  } = useWindowStore(
    useShallow((s) => ({
      closeWindow: s.closeWindow,
      minimizeWindow: s.minimizeWindow,
      bringToFront: s.bringToFront,
      togglePin: s.togglePin,
      panelOrder: s.panelOrder,
      updateWindow: s.updateWindow,
      setBackdrop: s.setBackdrop,
      backdropWindowId: s.backdropWindowId,
    })),
  )
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
  const api = React.useMemo(
    () => (pluginId ? extendApiForPlugin(baseApi, pluginId) : baseApi),
    [baseApi, pluginId],
  )

  const context = React.useMemo(
    () => ({
      artifactId: selectedImage?.id,
      imageUrl: selectedImage?.url,
    }),
    [selectedImage?.id, selectedImage?.url],
  )

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
      artifactId: context.artifactId,
      imageUrl: context.imageUrl,
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
            '!fixed !inset-0 !w-screen !h-screen !left-0 !top-0 !z-0 !border-0 !shadow-none !transform-none !bg-background',
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
