import React from "react";
import { useWindowStore } from "@/store/windowStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTilingStore } from "@/store/tilingStore";
import { usePluginStore } from "@/plugins/store";
import { usePluginLogos } from "@/hooks/usePluginLogos";

import { windowRegistry } from "./windowRegistry";
import { DraggablePanel } from "./DraggablePanel";
import { Button } from "@embeddr/react-ui/ui";
import {
  Minus,
  X,
  Maximize2,
  Layout,
  LayoutGrid,
  PanelBottomClose,
  PanelBottomOpen,
  Minimize2,
  MoreVertical,
  Maximize,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@embeddr/react-ui/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@embeddr/react-ui/ui";
import { useEmbeddrAPI, extendApiForPlugin } from "@/plugins/store";
import { useGlobalStore } from "@/store/globalStore";
import { DynamicPluginComponent } from "@/plugins/DynamicLoader";
import { PluginErrorBoundary } from "@/plugins/PluginErrorBoundary";
import { lucideIconFromName } from "@/lib/lucide";
import { useShallow } from "zustand/react/shallow";

type ResolvedPluginWindow = {
  pluginId: string;
  componentName: string;
  def?: any;
};

type Resolved = { pluginId: string; componentName: string; def?: any } | null;

const PluginContent = React.memo(
  ({
    pluginId,
    componentName,
    api,
    windowId,
    openRevision,
    panel,
    context,
    pluginProps,
  }: {
    pluginId: string;
    componentName: string;
    api: any;
    windowId: string;
    openRevision?: number;
    panel: {
      id: string;
      defaultPosition?: { x: number; y: number };
      isActive?: boolean;
    };
    context: any;
    pluginProps: any;
  }) => (
    <PluginErrorBoundary pluginId={pluginId} componentName={componentName}>
      <DynamicPluginComponent
        pluginId={pluginId}
        componentName={componentName}
        api={api}
        windowId={windowId}
        id={windowId}
        openRevision={openRevision}
        panel={panel}
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
    prev.openRevision === next.openRevision &&
    prev.panel.id === next.panel.id &&
    prev.panel.isActive === next.panel.isActive &&
    prev.panel.defaultPosition?.x === next.panel.defaultPosition?.x &&
    prev.panel.defaultPosition?.y === next.panel.defaultPosition?.y &&
    prev.context?.artifactId === next.context?.artifactId &&
    prev.context?.imageUrl === next.context?.imageUrl &&
    prev.pluginProps === next.pluginProps,
);

function resolveFromComponentId(
  componentId: string | undefined,
  plugins: Record<string, any>,
): Resolved {
  if (!componentId) return null;

  // longest-prefix match: `${pluginId}-...`
  let bestPid: string | null = null;
  for (const pid of Object.keys(plugins || {})) {
    const prefix = pid + "-";
    if (componentId.startsWith(prefix)) {
      if (!bestPid || pid.length > bestPid.length) bestPid = pid;
    }
  }
  if (!bestPid) return null;

  const defId = componentId.slice(bestPid.length + 1);
  const components = plugins?.[bestPid]?.components || [];
  const norm = (s: string) => (s || '').replace(/[-_]/g, '').toLowerCase();
  const defNorm = norm(defId);
  // Try exact match first, then normalized (strips hyphens, lowercases)
  const def =
    components.find((c: any) => c.id === defId || c.name === defId) ||
    components.find(
      (c: any) =>
        norm(c.id) === defNorm ||
        norm(c.name) === defNorm ||
        norm(c.exportName) === defNorm ||
        norm(c.component) === defNorm,
    );
  const componentName = def?.exportName || def?.component;
  if (!componentName) return null;

  return { pluginId: bestPid, componentName, def };
}

const WindowRenderer = ({ id }: { id: string }) => {
  const { windowState, arePanelsHidden, backdropWindowId } = useWindowStore(
    useShallow((s) => ({
      windowState: s.windows[id],
      arePanelsHidden: s.arePanelsHidden,
      backdropWindowId: s.backdropWindowId,
    })),
  );
  if (!windowState) return null;

  const isHidden = arePanelsHidden && windowState.id !== backdropWindowId;

  let content = null;

  // Core windows
  if (windowState.componentId.startsWith("core-")) {
    const Component = windowRegistry.get(windowState.componentId);
    if (Component) {
      content = (
        <PanelManagerWrapper
          key={windowState.id}
          windowState={windowState}
          Component={Component}
        />
      );
    }
  } else {
    // Plugin windows
    content = (
      <PluginWindowWrapper key={windowState.id} windowState={windowState} />
    );
  }

  if (!content) return null;

  if (isHidden) {
    return <div style={{ display: "none" }}>{content}</div>;
  }

  return content;
};

export const PanelManager: React.FC = () => {
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const closeAll = useWindowStore((s) => s.closeAll);
  const showZenToolbar = useWindowStore((s) => s.showZenToolbar);
  const toggleZenToolbar = useWindowStore((s) => s.toggleZenToolbar);
  const setBackdrop = useWindowStore((s) => s.setBackdrop);
  const arePanelsHidden = useWindowStore((s) => s.arePanelsHidden);
  const backdropWindowId = useWindowStore((s) => s.backdropWindowId);
  const tilingEnabled = useSettingsStore((s) => s.tilingEnabled);

  React.useEffect(() => {
    const handlePanelDebug = (event: Event) => {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem("embeddr_debug_panels") !== "1") return;

      const detail = (event as CustomEvent).detail as
        | { id?: string; phase?: string }
        | undefined;
      if (!detail) return;

      const snapshot = useWindowStore.getState();
      const windowState = detail.id ? snapshot.windows[detail.id] : undefined;

      console.debug("[PanelDebugTrace]", {
        ...detail,
        store: windowState
          ? {
              isMinimized: windowState.isMinimized,
              position: windowState.position,
              size: windowState.size,
              openRevision: windowState.openRevision,
            }
          : null,
        panelOrderTail: snapshot.panelOrder.slice(-5),
      });
    };

    window.addEventListener(
      "embeddr-panel-debug",
      handlePanelDebug as EventListener,
    );
    return () =>
      window.removeEventListener(
        "embeddr-panel-debug",
        handlePanelDebug as EventListener,
      );
  }, []);

  // Shift+click on a floating panel sends it to a tile
  React.useEffect(() => {
    if (!tilingEnabled) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (!e.shiftKey) return;
      const panelEl = (e.target as HTMLElement).closest?.("[data-panel-id]");
      if (!panelEl) return;
      const windowId = panelEl.getAttribute("data-panel-id");
      if (!windowId) return;
      const windowState = useWindowStore.getState().windows[windowId];
      if (!windowState?.componentId) return;
      e.preventDefault();
      e.stopPropagation();
      useTilingStore.getState().sendToTile(windowState.componentId, windowId);
      useWindowStore.getState().closeWindow(windowId);
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () =>
      document.removeEventListener("mousedown", handleMouseDown, true);
  }, [tilingEnabled]);

  // Select only IDs of open windows to avoid re-rendering list on every position update
  const openWindowIds = useWindowStore(
    React.useCallback(
      (s) =>
        Object.values(s.windows)
          .filter((w) => {
            if (w.id === s.backdropWindowId) return true;
            return !w.isMinimized && !w.groupHostId;
          })
          .map((w) => w.id)
          .sort()
          .join(","),
      [],
    ),
  );

  const openWindowIdList = React.useMemo(
    () => (openWindowIds ? openWindowIds.split(",") : []),
    [openWindowIds],
  );

  // We explicitly subscribe to minimized windows for the restore bar
  const minimizedWindows = useWindowStore(
    useShallow((s) => Object.values(s.windows).filter((w) => w.isMinimized)),
  );

  // Backdrop window selection
  const backdropWindow = useWindowStore((s) =>
    s.backdropWindowId ? s.windows[s.backdropWindowId] : null,
  );

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
      {openWindowIdList.map((id) => (
        <WindowRenderer key={id} id={id} />
      ))}
    </>
  );
};
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
      windows: s.windows,
      setActiveTab: s.setActiveTab,
      detachTab: s.detachTab,
      moveTab: s.moveTab,
    })),
  );
  const baseApi = useEmbeddrAPI();
  const { selectedImage } = useGlobalStore();
  const plugins = usePluginStore((s) => s.plugins);
  const commandBarPosition = useSettingsStore((s) => s.commandBarPosition);
  const isOverlay = useSettingsStore((s) => s.commandBarHoverParams.enabled);
  const showPluginLogos = useSettingsStore((s) => s.showPluginLogos);
  const tilingEnabled = useSettingsStore((s) => s.tilingEnabled);
  const sendToTile = useTilingStore((s) => s.sendToTile);
  const { logos } = usePluginLogos();

  const {
    closeWindow,
    minimizeWindow,
    bringToFront,
    togglePin,
    panelOrder,
    updateWindow,
    setBackdrop,
    backdropWindowId,
    windows,
    setActiveTab,
    detachTab,
    moveTab,
  } = windowApi;

  const isBackdrop = windowState.id === backdropWindowId;

  const orderIndex = panelOrder.indexOf(windowState.id);
  const baseOrder = orderIndex === -1 ? 0 : orderIndex;
  const zIndex = isBackdrop
    ? 0
    : windowState.isPinned
      ? 1000 + baseOrder
      : 20 + baseOrder;

  const tabs = windowState.tabs || [windowState.id];
  const activeTabId = windowState.activeTabId || windowState.id;
  const activeWindow = windows[activeTabId] || windowState;

  const resolved = React.useMemo<Resolved>(() => {
    // Prefer explicit spawn props if present
    const explicitPid = activeWindow.props?.pluginId;
    const explicitName = activeWindow.props?.componentName;
    if (explicitPid && explicitName) {
      return { pluginId: explicitPid, componentName: explicitName };
    }
    return resolveFromComponentId(activeWindow.componentId, plugins);
  }, [
    activeWindow.componentId,
    activeWindow.props?.pluginId,
    activeWindow.props?.componentName,
    plugins,
  ]);

  const api = React.useMemo(
    () =>
      resolved?.pluginId
        ? extendApiForPlugin(baseApi, resolved.pluginId)
        : baseApi,
    [baseApi, resolved?.pluginId],
  );
  const isActive = panelOrder[panelOrder.length - 1] === windowState.id;

  const context = React.useMemo(
    () => ({
      artifactId: selectedImage?.id,
      imageUrl: selectedImage?.url,
    }),
    [selectedImage?.id, selectedImage?.url],
  );

  const pluginProps = React.useMemo(
    () => ({ ...(activeWindow.props || {}), isActive }),
    [activeWindow.props, isActive],
  );
  const dragRef = React.useRef<{
    tabId: string;
    startX: number;
    startY: number;
    active: boolean;
    mode?: "reorder" | "detach";
  } | null>(null);
  const tabViewportRef = React.useRef<HTMLDivElement | null>(null);
  const tabTrackRef = React.useRef<HTMLDivElement | null>(null);
  const tabStripRef = React.useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const tabInsertIndexRef = React.useRef<number | null>(null);
  const detachRafRef = React.useRef<number | null>(null);
  const detachLastRef = React.useRef<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const [tabInsertIndex, setTabInsertIndex] = React.useState<number | null>(
    null,
  );
  const [tabInsertLeft, setTabInsertLeft] = React.useState<number | null>(null);
  const [tabOffset, setTabOffset] = React.useState(0);
  const [tabMaxOffset, setTabMaxOffset] = React.useState(0);

  const placeDetachedTab = React.useCallback(
    (tabId: string, clientX: number, clientY: number) => {
      detachLastRef.current = {
        tabId,
        x: Math.max(0, clientX - 80),
        y: Math.max(0, clientY - 14),
      };
      if (detachRafRef.current !== null) return;
      detachRafRef.current = window.requestAnimationFrame(() => {
        const pending = detachLastRef.current;
        if (pending) {
          updateWindow(pending.tabId, {
            position: { x: pending.x, y: pending.y },
            positionMode: "absolute",
          });
        }
        detachRafRef.current = null;
      });
    },
    [updateWindow],
  );

  const updateTabMetrics = React.useCallback(() => {
    const viewport = tabViewportRef.current;
    const track = tabTrackRef.current;
    if (!viewport || !track) {
      setTabMaxOffset(0);
      return;
    }
    const maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);
    setTabMaxOffset(maxOffset);
    setTabOffset((prev) => Math.min(Math.max(prev, 0), maxOffset));
  }, []);

  React.useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const strip = tabStripRef.current;
      const stripRect = strip?.getBoundingClientRect();
      const inStrip = stripRect
        ? event.clientY >= stripRect.top && event.clientY <= stripRect.bottom
        : false;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const dist = Math.hypot(dx, dy);

      if (!drag.active && dist > 6) {
        drag.active = true;
        drag.mode = inStrip ? "reorder" : "detach";
        if (drag.mode === "detach") {
          detachTab(drag.tabId, {
            x: Math.max(0, event.clientX - 80),
            y: Math.max(0, event.clientY - 14),
          });
          placeDetachedTab(drag.tabId, event.clientX, event.clientY);
        }
      }

      if (!drag.active) return;

      if (drag.mode === "detach") {
        placeDetachedTab(drag.tabId, event.clientX, event.clientY);
        return;
      }

      if (!inStrip) {
        drag.mode = "detach";
        detachTab(drag.tabId, {
          x: Math.max(0, event.clientX - 80),
          y: Math.max(0, event.clientY - 14),
        });
        placeDetachedTab(drag.tabId, event.clientX, event.clientY);
        setTabInsertIndex(null);
        tabInsertIndexRef.current = null;
        setTabInsertLeft(null);
        return;
      }

      if (!stripRect) return;

      const rects = tabs
        .map((id: string) =>
          tabButtonRefs.current.get(id)?.getBoundingClientRect(),
        )
        .filter((rect: DOMRect | undefined): rect is DOMRect => Boolean(rect));

      if (rects.length === 0) return;

      let nextIndex = rects.length;
      let nextLeft = rects[rects.length - 1].right - stripRect.left;
      for (let i = 0; i < rects.length; i += 1) {
        const rect = rects[i];
        const mid = rect.left + rect.width / 2;
        if (event.clientX < mid) {
          nextIndex = i;
          nextLeft = rect.left - stripRect.left;
          break;
        }
      }
      setTabInsertIndex(nextIndex);
      tabInsertIndexRef.current = nextIndex;
      setTabInsertLeft(nextLeft);
    };

    const handleUp = () => {
      const drag = dragRef.current;
      if (
        drag?.active &&
        drag.mode === "reorder" &&
        tabInsertIndexRef.current !== null
      ) {
        moveTab(windowState.id, drag.tabId, tabInsertIndexRef.current);
      }
      dragRef.current = null;
      tabInsertIndexRef.current = null;
      setTabInsertIndex(null);
      setTabInsertLeft(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [detachTab, moveTab, placeDetachedTab, tabs, windowState.id]);

  React.useEffect(() => {
    updateTabMetrics();
  }, [tabs.length, updateTabMetrics]);

  React.useEffect(() => {
    const viewport = tabViewportRef.current;
    const track = tabTrackRef.current;
    if (!viewport || !track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => updateTabMetrics());
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [updateTabMetrics, tabs.length]);

  // Compute panel metadata BEFORE the early return for `!resolved`. If we
  // returned null before these hooks ran, React would throw "Rendered more
  // hooks than during the previous render" when `resolved` flipped from null
  // to truthy (classic rules-of-hooks violation).
  const defaultPosition =
    windowState.props?.defaultPosition ||
    resolved?.def?.props?.defaultPosition ||
    { x: 20, y: 20 };
  const panelMeta = React.useMemo(
    () => ({
      id: windowState.id,
      defaultPosition,
      isActive,
    }),
    [defaultPosition, isActive, windowState.id],
  );
  const activePanelMeta = React.useMemo(
    () => ({
      id: activeTabId,
      defaultPosition,
      isActive,
    }),
    [activeTabId, defaultPosition, isActive],
  );

  // ✅ safe early return — all hooks are declared above
  if (!resolved) {
    console.warn("[PanelManager] Could not resolve plugin window", windowState);
    return null;
  }

  const { pluginId, componentName, def } = resolved;

  const safeTitle =
    activeWindow.title?.trim() ||
    windowState.title?.trim() ||
    def?.title ||
    def?.name ||
    componentName ||
    activeWindow.componentId ||
    "Untitled Panel";

  const logoUrl = showPluginLogos ? logos?.[pluginId] : null;
  const iconValue = def?.icon;
  const TitleGlyph =
    typeof iconValue === "string"
      ? lucideIconFromName(iconValue)
      : typeof iconValue === "function"
        ? iconValue
        : null;
  const titleIcon = logoUrl ? (
    <img
      src={logoUrl}
      alt={`${pluginId} logo`}
      className="h-4 w-4 rounded-sm object-contain"
    />
  ) : TitleGlyph ? (
    <TitleGlyph className="h-4 w-4" />
  ) : undefined;

  const handlePositionChange = (pos: { x: number; y: number }) =>
    updateWindow(windowState.id, { position: pos });

  const handleSizeChange = (size: { width: number; height: number }) =>
    updateWindow(windowState.id, { size });

  const defaultSize =
    windowState.size ||
    windowState.props?.defaultSize ||
    def?.props?.defaultSize;

  if (isBackdrop) {
    return (
      <div
        className="fixed inset-0 z-0  flex flex-col w-screen h-screen"
        style={{ pointerEvents: "auto" }}
      >
        {/* Top Spacer */}
        {commandBarPosition === "top" && !isOverlay && (
          <div className="h-8 w-full shrink-0 bg-background/0" />
        )}

        <div className="flex-1 w-full min-h-0 overflow-hidden relative embeddr-plugin-scope @container [container-name:panel] p-1">
          {/* Header Controls for Backdrop */}
          <div className="absolute top-2 right-2 z-50 flex items-center gap-1 opacity-10 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 rounded-full bg-background/50 backdrop-blur"
              onClick={() => setBackdrop(null)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 rounded-full bg-background/50 backdrop-blur"
              onClick={() => closeWindow(windowState.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="rounded-md overflow-hidden h-full">
            <PluginContent
              pluginId={pluginId}
              componentName={componentName}
              api={api}
              windowId={windowState.id}
              openRevision={windowState.openRevision}
              panel={panelMeta}
              context={context}
              pluginProps={pluginProps}
            />
          </div>
        </div>

        {/* Bottom Spacer */}
        {commandBarPosition === "bottom" && !isOverlay && (
          <div className="h-8 w-full shrink-0 bg-background/0" />
        )}
      </div>
    );
  }

  return (
    <DraggablePanel
      id={windowState.id}
      title={safeTitle}
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
      openRevision={windowState.openRevision}
      resetUiOnOpen={windowState.props?.resetUiOnOpen}
      onPositionChange={handlePositionChange}
      onSizeChange={handleSizeChange}
      hideHeader={windowState.props?.hideHeader}
      transparent={windowState.props?.transparent}
      className={cn(
        windowState.props?.className,
        "embeddr-panel",
        `embeddr-panel-${pluginId.replace(/[^a-zA-Z0-9]/g, "-")}`,
        `embeddr-component-${componentName.replace(/[^a-zA-Z0-9]/g, "-")}`,
        isBackdrop &&
          "fixed! inset-0! w-screen! h-screen! left-0! top-0! z-0! border-0! shadow-none! transform-none! bg-background! p-1 rounded-md",
      )}
      additionalSettingsItems={
        <>
          <DropdownMenuItem onClick={() => setBackdrop(windowState.id)}>
            <Maximize className="mr-2 h-4 w-4" />
            Set as Backdrop
          </DropdownMenuItem>
          {tilingEnabled && (
            <DropdownMenuItem
              onClick={() => {
                sendToTile(activeWindow.componentId, windowState.id);
                closeWindow(windowState.id);
              }}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Send to Tile
            </DropdownMenuItem>
          )}
        </>
      }
      context={context}
    >
      <div
        id={`panel-content-${pluginId.replace(/[^a-zA-Z0-9]/g, "-")}-${componentName.replace(/[^a-zA-Z0-9]/g, "-")}`}
        className="embeddr-panel-content h-full w-full min-h-0 overflow-hidden embeddr-plugin-scope @container [container-name:panel] relative"
        style={{
          paddingTop: isBackdrop
            ? "var(--layout-screen-safe-top, 0px)"
            : undefined,
          paddingBottom: isBackdrop
            ? "var(--layout-screen-safe-bottom, 0px)"
            : undefined,
        }}
      >
        {tabs.length > 1 && (
          <div
            ref={tabStripRef}
            className="embeddr-panel-tabs absolute top-0 inset-x-0 h-7.5 flex items-center gap-1 px-1.5 border-b border-border bg-background/80 backdrop-blur z-10"
          >
            <button
              className={cn(
                "embeddr-panel-tab-scroll embeddr-panel-tab-scroll-left h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground",
                tabOffset <= 0 && "opacity-30 pointer-events-none",
              )}
              onClick={() =>
                setTabOffset((prev) => {
                  const viewportWidth = tabViewportRef.current?.clientWidth;
                  const step = viewportWidth
                    ? Math.max(80, viewportWidth - 60)
                    : 140;
                  return Math.max(0, prev - step);
                })
              }
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div ref={tabViewportRef} className="flex-1 overflow-hidden">
              <div
                ref={tabTrackRef}
                className="embeddr-panel-tabs-track flex items-center gap-1 whitespace-nowrap transition-transform"
                style={{ transform: `translateX(-${tabOffset}px)` }}
              >
                {tabs.map((tabId: string) => {
                  const tabWindow = windows[tabId];
                  const tabPluginId = tabWindow?.props?.pluginId;
                  const tabLogo = showPluginLogos ? logos?.[tabPluginId] : null;
                  const tabResolved = tabWindow
                    ? resolveFromComponentId(tabWindow.componentId, plugins)
                    : null;
                  const tabTitle =
                    tabWindow?.title?.trim() ||
                    tabResolved?.def?.title ||
                    tabResolved?.def?.name ||
                    tabResolved?.componentName ||
                    tabWindow?.componentId ||
                    "Untitled Panel";
                  return (
                    <button
                      key={tabId}
                      ref={(node) => {
                        if (node) tabButtonRefs.current.set(tabId, node);
                        else tabButtonRefs.current.delete(tabId);
                      }}
                      className={cn(
                        "embeddr-panel-tab px-2 py-1 text-[11px] rounded border inline-flex items-center gap-1",
                        tabId === activeTabId
                          ? "embeddr-panel-tab-active bg-primary/10 border-primary/40 text-foreground"
                          : "border-transparent text-muted-foreground hover:bg-muted/60",
                      )}
                      onClick={() => setActiveTab(windowState.id, tabId)}
                      onPointerDown={(event) => {
                        dragRef.current = {
                          tabId,
                          startX: event.clientX,
                          startY: event.clientY,
                          active: false,
                        };
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        detachTab(tabId, {
                          x: Math.max(0, event.clientX - 80),
                          y: Math.max(0, event.clientY - 14),
                        });
                        placeDetachedTab(tabId, event.clientX, event.clientY);
                      }}
                      title="Right-click to detach"
                    >
                      {tabLogo && (
                        <img
                          src={tabLogo}
                          alt=""
                          className="embeddr-panel-tab-icon h-3 w-3 rounded-sm object-contain"
                        />
                      )}
                      <span className="embeddr-panel-tab-title max-w-24 truncate">
                        {tabTitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              className={cn(
                "embeddr-panel-tab-scroll embeddr-panel-tab-scroll-right h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground",
                tabOffset >= tabMaxOffset && "opacity-30 pointer-events-none",
              )}
              onClick={() =>
                setTabOffset((prev) => {
                  const viewportWidth = tabViewportRef.current?.clientWidth;
                  const step = viewportWidth
                    ? Math.max(80, viewportWidth - 60)
                    : 140;
                  const next = prev + step;
                  return next >= tabMaxOffset - 4
                    ? tabMaxOffset
                    : Math.min(tabMaxOffset, next);
                })
              }
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {tabInsertLeft !== null && (
              <div
                className="absolute top-1 bottom-1 w-px bg-primary/70"
                style={{ left: tabInsertLeft }}
              />
            )}
          </div>
        )}
        <div
          className={cn(
            "h-full embeddr-plugin-container",
            `plugin-${pluginId.replace(/[^a-zA-Z0-9]/g, "-")}`,
            `component-${componentName.replace(/[^a-zA-Z0-9]/g, "-")}`,
          )}
          style={{ paddingTop: tabs.length > 1 ? "30px" : undefined }}
        >
          <PluginContent
            key={activeTabId}
            pluginId={pluginId}
            componentName={componentName}
            api={api}
            windowId={activeTabId}
            openRevision={activeWindow.openRevision}
            panel={activePanelMeta}
            context={context}
            pluginProps={pluginProps}
          />
        </div>
      </div>
    </DraggablePanel>
  );
};

const PanelManagerWrapper = ({
  windowState,
  Component,
}: {
  windowState: any;
  Component: any;
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
  );
  const baseApi = useEmbeddrAPI();
  const { selectedImage } = useGlobalStore();
  const tilingEnabled = useSettingsStore((s) => s.tilingEnabled);
  const sendToTile = useTilingStore((s) => s.sendToTile);

  const isBackdrop = windowState.id === backdropWindowId;

  // Calculate global z-index consistent with DraggablePanel wrapper
  const orderIndex = panelOrder.indexOf(windowState.id);
  const baseOrder = orderIndex === -1 ? 0 : orderIndex;
  const zIndex = isBackdrop
    ? 0
    : windowState.isPinned
      ? 1000 + baseOrder
      : 20 + baseOrder;

  // Extend API if pluginId is present in window props
  const pluginId = windowState.props?.pluginId;
  const api = React.useMemo(
    () => (pluginId ? extendApiForPlugin(baseApi, pluginId) : baseApi),
    [baseApi, pluginId],
  );

  const context = React.useMemo(
    () => ({
      artifactId: selectedImage?.id,
      imageUrl: selectedImage?.url,
    }),
    [selectedImage?.id, selectedImage?.url],
  );

  const isActive = panelOrder[panelOrder.length - 1] === windowState.id;

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
      updateWindow(windowState.id, { position: pos });
    },
    [windowState.id, updateWindow],
  );

  const handleSizeChange = React.useCallback(
    (size: { width: number; height: number }) => {
      updateWindow(windowState.id, { size });
    },
    [windowState.id, updateWindow],
  );

  // Inject api if not present
  const props = {
    ...(windowState.props || {}),
    id: windowState.id, // Explicitly pass ID for local storage keys etc
    windowId: windowState.id,
    openRevision: windowState.openRevision,
    api: windowState.props?.api || api,
    zIndex,
    // Pass size/position from store if plugin needs to be controlled
    defaultSize: windowState.size || windowState.props?.defaultSize,
    defaultPosition: windowState.props?.defaultPosition,
    // Explicitly pass constrained position/size so "controlled" mode works in UI lib
    position: windowState.position,
    size: windowState.size,
    // Header settings actions
    additionalSettingsItems: (
      <>
        <DropdownMenuItem onClick={() => setBackdrop(windowState.id)}>
          <Maximize className="mr-2 h-4 w-4" />
          Set as Backdrop
        </DropdownMenuItem>
        {tilingEnabled && (
          <DropdownMenuItem
            onClick={() => {
              sendToTile(windowState.componentId, windowState.id);
              closeWindow(windowState.id);
            }}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Send to Tile
          </DropdownMenuItem>
        )}
      </>
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
            "!fixed !inset-0 !w-screen !h-screen !left-0 !top-0 !z-0 !border-0 !shadow-none !transform-none !bg-background",
          ),
          // Logic overrides
          position: { x: 0, y: 0 },
          size: {
            width: typeof window !== "undefined" ? window.innerWidth : 1000,
            height: typeof window !== "undefined" ? window.innerHeight : 1000,
          },
        }
      : {}),
  };

  return (
    <div className="embeddr-plugin-scope">
      <Component {...props} />
    </div>
  );
};
