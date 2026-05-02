/**
 * TilingCanvas — renders the tiling layout for the frontend.
 *
 * When tiling mode is enabled, this component renders the tile tree
 * using zen-shell's TilingLayout with the frontend's existing component
 * resolution (core windows from windowRegistry, plugin windows via
 * DynamicPluginComponent).
 *
 * Supports:
 * - Rendering core and plugin components in tiles
 * - Drag-and-drop from floating panels to tiles (Shift + drag)
 * - Popping tiled panels back to floating windows
 * - Closing individual tiles
 * - Empty canvas drop to create first tile
 * - Hiding/showing the tile header bar per tile (right-click to toggle)
 * - Portal-based rendering: content is never unmounted on tree restructure
 */

import React from "react";
import ReactDOM from "react-dom";
import {
  TILE_DND_MIME,
  TilingLayout,
  createLeaf,
  createNodeId,
  getDropZoneFromPointer,
  getTileDragData,
  isTileDrag,
  setTileDragData,
} from "@embeddr/zen-shell";
import { GripHorizontal, Maximize2, X } from "lucide-react";
import { PanelContext } from "@embeddr/react-ui/components/embeddr";
import type { TileDragPayload, TileDropZone, TileNode } from "@embeddr/zen-shell";
import type { PanelState } from "@embeddr/react-ui/components/embeddr";
import { useTilingStore } from "@/store/tilingStore";
import { useWindowStore } from "@/store/windowStore";
import { windowRegistry } from "@/components/ui/windowRegistry";
import { extendApiForPlugin, useEmbeddrAPI, usePluginStore } from "@/plugins/store";
import { DynamicPluginComponent } from "@/plugins/DynamicLoader";
import { PluginErrorBoundary } from "@/plugins/PluginErrorBoundary";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Component resolution — same logic as PanelManager
// ---------------------------------------------------------------------------

function resolveFromComponentId(
  componentId: string | undefined,
  plugins: Record<string, any>,
): { pluginId: string; componentName: string; def?: any } | null {
  if (!componentId) return null;
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
  const norm = (s: string) => (s || "").replace(/[-_]/g, "").toLowerCase();
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

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

type LeafInfo = {
  instanceId: string;
  entryKey: string;
  nodeId: string;
  showHeader: boolean;
};

const PORTAL_PERSIST_MS = 400;

function collectLeaves(node: TileNode | null): Array<LeafInfo> {
  if (!node) return [];
  if (!node.split || !node.children) {
    if (!node.entryKey) return [];
    return [
      {
        instanceId: node.instanceId || node.id,
        entryKey: node.entryKey,
        nodeId: node.id,
        showHeader: node.showHeader !== false,
      },
    ];
  }
  return [...collectLeaves(node.children[0]), ...collectLeaves(node.children[1])];
}

function leavesEqual(a: LeafInfo, b: LeafInfo) {
  return (
    a.instanceId === b.instanceId &&
    a.entryKey === b.entryKey &&
    a.nodeId === b.nodeId &&
    a.showHeader === b.showHeader
  );
}

function usePersistentLeaves(leaves: Array<LeafInfo>): Array<LeafInfo> {
  const [persistentLeaves, setPersistentLeaves] = React.useState(leaves);
  const removalTimersRef = React.useRef(new Map<string, number>());

  React.useEffect(() => {
    const presentIds = new Set(leaves.map((leaf) => leaf.instanceId));

    for (const leaf of leaves) {
      const timerId = removalTimersRef.current.get(leaf.instanceId);
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        removalTimersRef.current.delete(leaf.instanceId);
      }
    }

    setPersistentLeaves((current) => {
      const retainedLeaves = current.filter((leaf) => !presentIds.has(leaf.instanceId));
      const nextLeaves = [...leaves, ...retainedLeaves];

      if (
        nextLeaves.length === current.length &&
        nextLeaves.every((leaf, index) => leavesEqual(leaf, current[index]))
      ) {
        return current;
      }

      return nextLeaves;
    });
  }, [leaves]);

  React.useEffect(() => {
    const presentIds = new Set(leaves.map((leaf) => leaf.instanceId));

    for (const leaf of persistentLeaves) {
      if (presentIds.has(leaf.instanceId) || removalTimersRef.current.has(leaf.instanceId)) {
        continue;
      }

      const timerId = window.setTimeout(() => {
        removalTimersRef.current.delete(leaf.instanceId);
        setPersistentLeaves((current) =>
          current.filter((item) => item.instanceId !== leaf.instanceId),
        );
      }, PORTAL_PERSIST_MS);

      removalTimersRef.current.set(leaf.instanceId, timerId);
    }
  }, [leaves, persistentLeaves]);

  React.useEffect(() => {
    return () => {
      for (const timerId of removalTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      removalTimersRef.current.clear();
    };
  }, []);

  return persistentLeaves;
}

// ---------------------------------------------------------------------------
// Split mode context – Shift-key tracking (matching sprout's approach)
// ---------------------------------------------------------------------------

const SplitModeContext = React.createContext(false);

function useSplitMode(): boolean {
  return React.useContext(SplitModeContext);
}

function useSplitModeTracker(): boolean {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !isTyping()) setActive(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") setActive(false);
    };
    const blur = () => setActive(false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return active;
}

// ---------------------------------------------------------------------------
// Tile drag active context
// ---------------------------------------------------------------------------

const TileDragActiveContext = React.createContext(false);

function useTileDragActive(): boolean {
  return React.useContext(TileDragActiveContext);
}

function useTileDragActiveTracker(): boolean {
  const [active, setActive] = React.useState(false);
  const depthRef = React.useRef(0);

  React.useEffect(() => {
    const enter = (e: DragEvent) => {
      if (Array.from(e.dataTransfer?.types || []).includes(TILE_DND_MIME)) {
        depthRef.current += 1;
        if (depthRef.current === 1) setActive(true);
      }
    };
    const leave = () => {
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setActive(false);
    };
    const drop = () => {
      depthRef.current = 0;
      setTimeout(() => setActive(false), 0);
    };
    const end = () => {
      depthRef.current = 0;
      setTimeout(() => setActive(false), 0);
    };

    document.addEventListener("dragenter", enter, true);
    document.addEventListener("dragleave", leave, true);
    document.addEventListener("drop", drop, true);
    document.addEventListener("dragend", end, true);
    return () => {
      document.removeEventListener("dragenter", enter, true);
      document.removeEventListener("dragleave", leave, true);
      document.removeEventListener("drop", drop, true);
      document.removeEventListener("dragend", end, true);
    };
  }, []);

  return active;
}

// ---------------------------------------------------------------------------
// Preview context – tracks which tile zone is being hovered
// ---------------------------------------------------------------------------

type PreviewState = { nodeId: string; zone: TileDropZone } | null;
type PreviewCtx = {
  preview: PreviewState;
  setPreview: React.Dispatch<React.SetStateAction<PreviewState>>;
};
const TilePreviewContext = React.createContext<PreviewCtx>({
  preview: null,
  setPreview: () => {},
});

function useActiveZone(nodeId: string): TileDropZone | null {
  const { preview } = React.useContext(TilePreviewContext);
  return preview && preview.nodeId === nodeId ? preview.zone : null;
}

// ---------------------------------------------------------------------------
// Slot registry – direct portal targets inside the live tile layout.
// When a slot briefly disappears during tree updates, the content falls back
// to a hidden container so the component instance can survive the transition.
// ---------------------------------------------------------------------------

type SlotRegistryCtx = {
  slotsRef: React.RefObject<Map<string, HTMLElement>>;
  /** Start tracking a placeholder slot. */
  register: (instanceId: string, slotEl: HTMLElement) => void;
  /** Stop tracking when the slot unmounts. */
  unregister: (instanceId: string) => void;
  /** Increments on register/unregister so portal consumers re-check the slot. */
  version: number;
};

const SlotRegistryContext = React.createContext<SlotRegistryCtx>({
  slotsRef: { current: new Map() },
  register: () => {},
  unregister: () => {},
  version: 0,
});

function useSlotRegistry(): SlotRegistryCtx {
  const slotsRef = React.useRef(new Map<string, HTMLElement>());
  const [version, setVersion] = React.useState(0);

  const register = React.useCallback((instanceId: string, slotEl: HTMLElement) => {
    slotsRef.current.set(instanceId, slotEl);
    setVersion((v) => v + 1);
  }, []);

  const unregister = React.useCallback((instanceId: string) => {
    slotsRef.current.delete(instanceId);
    setVersion((v) => v + 1);
  }, []);

  return React.useMemo(
    () => ({ slotsRef, register, unregister, version }),
    [register, unregister, version],
  );
}

// ---------------------------------------------------------------------------
// TileSlot – registers its DOM node so portaled content can find it
// ---------------------------------------------------------------------------

const TileSlot = React.memo<{ instanceId: string }>(({ instanceId }) => {
  const { register, unregister } = React.useContext(SlotRegistryContext);
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (el) register(instanceId, el);
      else unregister(instanceId);
    },
    [instanceId, register, unregister],
  );
  return <div ref={ref} className="min-h-0 min-w-0 flex-1 overflow-hidden" />;
});

// ---------------------------------------------------------------------------
// PortaledTileContent – persistent component keyed by instanceId, portals
// into the registered slot so tree restructures never unmount it
// ---------------------------------------------------------------------------

const PortaledTileContent = React.memo<{
  instanceId: string;
  componentId: string;
  showHeader: boolean;
}>(
  ({ instanceId, componentId, showHeader }) => {
    const { slotsRef, version } = React.useContext(SlotRegistryContext);
    const baseApi = useEmbeddrAPI();
    const plugins = usePluginStore((s) => s.plugins);
    const windowProps = useWindowStore((s) => s.windows[instanceId]?.props);

    // Re-check the slot when version changes (slot registered/unregistered)
    void version;
    const slotEl = slotsRef.current.get(instanceId) ?? null;

    let content: React.ReactNode;

    // Provide a PanelContext so plugins that call usePanel() (e.g. MediaFramePanel)
    // correctly reflect the tile's header visibility via isHeaderHidden.
    const panelCtxValue = React.useMemo<PanelState>(
      () => ({
        id: instanceId,
        isActive: true,
        isCollapsed: false,
        isPinned: false,
        isFullscreen: false,
        title: "",
        hideHeader: false,
        showTitle: showHeader,
        isHeaderHidden: !showHeader,
        headerHeight: showHeader ? 42 : 16,
        close: () => {},
        collapse: () => {},
        pin: () => {},
        focus: () => {},
      }),
      [instanceId, showHeader],
    );
    const panelProps = React.useMemo(
      () => ({
        id: instanceId,
        isActive: true,
        showTitle: showHeader,
        isHeaderHidden: !showHeader,
        headerHeight: showHeader ? 42 : 16,
        hideHeader: false,
      }),
      [instanceId, showHeader],
    );

    // Try windowRegistry first with fuzzy matching (covers both core and plugin panels,
    // handles old stored IDs like "embeddr-debug-DebugPanel" matching "embeddr-debug-debug-panel")
    const registryMatch = windowRegistry.resolve(componentId);
    if (registryMatch) {
      const [, RegistryComponent] = registryMatch;
      content = (
        <PanelContext.Provider value={panelCtxValue}>
          <RegistryComponent
            id={instanceId}
            windowId={instanceId}
            panel={panelProps}
            {...(windowProps || {})}
            showTitle={showHeader}
            isHeaderHidden={!showHeader}
            headerHeight={showHeader ? 42 : 16}
            hideHeader={false}
          />
        </PanelContext.Provider>
      );
    } else {
      const resolved = resolveFromComponentId(componentId, plugins);
      if (!resolved) {
        content = (
          <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
            Unknown panel: {componentId}
          </div>
        );
      } else {
        const api = extendApiForPlugin(baseApi, resolved.pluginId);
        content = (
          <PanelContext.Provider value={panelCtxValue}>
            <PluginErrorBoundary
              pluginId={resolved.pluginId}
              componentName={resolved.componentName}
            >
              <DynamicPluginComponent
                pluginId={resolved.pluginId}
                componentName={resolved.componentName}
                api={api}
                windowId={instanceId}
                id={instanceId}
                panel={panelProps}
                {...(resolved.def?.props || {})}
                {...(windowProps || {})}
                showTitle={showHeader}
                isHeaderHidden={!showHeader}
                headerHeight={showHeader ? 42 : 16}
                hideHeader={false}
              />
            </PluginErrorBoundary>
          </PanelContext.Provider>
        );
      }
    }

    if (slotEl) {
      return ReactDOM.createPortal(
        <div className="flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden">{content}</div>,
        slotEl,
      );
    }

    return (
      <div className="flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden">{content}</div>
    );
  },
  (prev, next) =>
    prev.instanceId === next.instanceId &&
    prev.componentId === next.componentId &&
    prev.showHeader === next.showHeader,
);

// ---------------------------------------------------------------------------
// Zone indicators and split preview
// ---------------------------------------------------------------------------

const ZONE_INDICATORS: Array<{
  zone: TileDropZone;
  label: string;
  pos: string;
}> = [
  { zone: "top", label: "▲", pos: "top-2 left-1/2 -translate-x-1/2" },
  { zone: "bottom", label: "▼", pos: "bottom-2 left-1/2 -translate-x-1/2" },
  { zone: "left", label: "◀", pos: "left-2 top-1/2 -translate-y-1/2" },
  { zone: "right", label: "▶", pos: "right-2 top-1/2 -translate-y-1/2" },
  {
    zone: "center",
    label: "⊞",
    pos: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
];

const splitPreviewClass = (zone: TileDropZone): string => {
  const base =
    "pointer-events-none absolute rounded-lg bg-primary/10 border border-primary/30 transition-all duration-100";
  switch (zone) {
    case "left":
      return `${base} inset-y-1 left-1 w-[calc(50%-4px)]`;
    case "right":
      return `${base} inset-y-1 right-1 w-[calc(50%-4px)]`;
    case "top":
      return `${base} inset-x-1 top-1 h-[calc(50%-4px)]`;
    case "bottom":
      return `${base} inset-x-1 bottom-1 h-[calc(50%-4px)]`;
    case "center":
      return `${base} inset-2`;
  }
};

// ---------------------------------------------------------------------------
// SplitModeOverlay – full-coverage overlay on occupied tiles during drag
// ---------------------------------------------------------------------------

const SplitModeOverlay = React.memo<{
  nodeId: string;
  onAssignTileRef: React.RefObject<
    (nodeId: string, payload: TileDragPayload, zone: TileDropZone) => void
  >;
}>(({ nodeId, onAssignTileRef }) => {
  const splitMode = useSplitMode();
  const tileDragActive = useTileDragActive();
  const activeZone = useActiveZone(nodeId);
  const { setPreview } = React.useContext(TilePreviewContext);

  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      const zone = getDropZoneFromPointer(event);
      setPreview((prev) => {
        if (prev?.nodeId === nodeId && prev.zone === zone) return prev;
        return { nodeId, zone };
      });
    },
    [nodeId, setPreview],
  );

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const payload = getTileDragData(event);
      if (!payload) return;
      const zone = getDropZoneFromPointer(event);
      onAssignTileRef.current?.(nodeId, payload, zone);
      setPreview(null);
    },
    [nodeId, onAssignTileRef, setPreview],
  );

  const handleDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const related = event.relatedTarget as Node | null;
      if (related && event.currentTarget.contains(related)) return;
      setPreview((prev) => (prev?.nodeId === nodeId ? null : prev));
    },
    [nodeId, setPreview],
  );

  if (!splitMode && !tileDragActive) return null;

  return (
    <div
      className="absolute inset-0 z-30 bg-background/10 backdrop-blur-[1px]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      <div className="pointer-events-none absolute inset-0 z-40">
        {activeZone && <div className={splitPreviewClass(activeZone)} />}
        {ZONE_INDICATORS.map(({ zone, label, pos }) => (
          <div
            key={zone}
            className={`absolute ${pos} flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-medium shadow-sm transition-all duration-100 ${
              zone === activeZone
                ? "scale-110 bg-primary text-primary-foreground shadow-md"
                : "bg-background/80 text-muted-foreground border border-border/60"
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// DropZoneOverlay – simpler version for non-split-mode drag
// ---------------------------------------------------------------------------

const DropZoneOverlay = React.memo<{ activeZone: TileDropZone }>(({ activeZone }) => (
  <div className="pointer-events-none absolute inset-0 z-20">
    <div className={splitPreviewClass(activeZone)} />
    {ZONE_INDICATORS.map(({ zone, label, pos }) => (
      <div
        key={zone}
        className={`absolute ${pos} flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-medium shadow-sm transition-all duration-100 ${
          zone === activeZone
            ? "scale-110 bg-primary text-primary-foreground shadow-md"
            : "bg-background/80 text-muted-foreground border border-border/60"
        }`}
      >
        {label}
      </div>
    ))}
  </div>
));

// ---------------------------------------------------------------------------
// TileContextMenu – portaled right-click context menu
// ---------------------------------------------------------------------------

const TileContextMenu = React.memo<{
  x: number;
  y: number;
  showHeader: boolean;
  onToggle: () => void;
  onClose: () => void;
}>(({ x, y, showHeader, onToggle, onClose }) => {
  React.useEffect(() => {
    const close = () => {
      onClose();
    };
    window.addEventListener("mousedown", close, { once: true });
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed z-[9999] min-w-[140px] rounded-md border border-border bg-popover text-popover-foreground shadow-md py-1 text-xs"
      style={{ top: y, left: x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="w-full px-3 py-1.5 text-left hover:bg-muted transition-colors"
        onClick={() => {
          onToggle();
          onClose();
        }}
      >
        {showHeader ? "Hide header" : "Show header"}
      </button>
    </div>,
    document.body,
  );
});

// ---------------------------------------------------------------------------
// TilingLeafPanel – wraps leaf content with chrome (header, drag, close)
// ---------------------------------------------------------------------------

interface TilingLeafPanelProps {
  nodeId: string;
  instanceId: string;
  entryKey: string | undefined;
  showHeader: boolean;
  onAssignTileRef: React.RefObject<
    (nodeId: string, payload: TileDragPayload, zone: TileDropZone) => void
  >;
  onPopOutRef: React.RefObject<(nodeId: string, entryKey: string, instanceId: string) => void>;
  onCloseTileRef: React.RefObject<(nodeId: string) => void>;
  onToggleHeaderRef: React.RefObject<(nodeId: string) => void>;
}

const TilingLeafPanel = React.memo<TilingLeafPanelProps>(
  ({
    nodeId,
    instanceId,
    entryKey,
    showHeader,
    onAssignTileRef,
    onPopOutRef,
    onCloseTileRef,
    onToggleHeaderRef,
  }) => {
    const activeZone = useActiveZone(nodeId);
    const { setPreview } = React.useContext(TilePreviewContext);
    const splitMode = useSplitMode();
    const [contextMenu, setContextMenu] = React.useState<{
      x: number;
      y: number;
    } | null>(null);

    const title = React.useMemo(() => {
      if (!entryKey) return "";
      if (entryKey.startsWith("core-")) {
        return entryKey
          .replace("core-", "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }
      const parts = entryKey.split("-");
      return parts.slice(-1)[0]?.replace(/\b\w/g, (l) => l.toUpperCase()) || entryKey;
    }, [entryKey]);

    const handleDrop = React.useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isTileDrag(event)) return;
        event.preventDefault();
        const payload = getTileDragData(event);
        if (!payload) return;
        const zone = getDropZoneFromPointer(event);
        onAssignTileRef.current?.(nodeId, payload, zone);
        setPreview(null);
      },
      [nodeId, onAssignTileRef, setPreview],
    );

    const handleDragOver = React.useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isTileDrag(event)) {
          setPreview((prev) => (prev?.nodeId === nodeId ? null : prev));
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const zone = getDropZoneFromPointer(event);
        setPreview((prev) => {
          if (prev?.nodeId === nodeId && prev.zone === zone) return prev;
          return { nodeId, zone };
        });
      },
      [nodeId, setPreview],
    );

    const handleDragLeave = React.useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        const related = event.relatedTarget as Node | null;
        if (related && event.currentTarget.contains(related)) return;
        setPreview((prev) => (prev?.nodeId === nodeId ? null : prev));
      },
      [nodeId, setPreview],
    );

    const handleDragStart = React.useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!entryKey) return;
        setTileDragData(event, {
          entryKey,
          sourceNodeId: nodeId,
          instanceId,
        });
      },
      [entryKey, nodeId, instanceId],
    );

    const handlePopOut = React.useCallback(() => {
      if (entryKey) onPopOutRef.current?.(nodeId, entryKey, instanceId);
    }, [entryKey, nodeId, instanceId, onPopOutRef]);

    const handleClose = React.useCallback(() => {
      onCloseTileRef.current?.(nodeId);
    }, [nodeId, onCloseTileRef]);

    const handleToggleHeader = React.useCallback(() => {
      onToggleHeaderRef.current?.(nodeId);
    }, [nodeId, onToggleHeaderRef]);

    const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    return (
      <div
        className={cn(
          "relative flex h-full flex-col rounded-xl border border-border/60 bg-background/70 shadow-sm overflow-clip",
          !entryKey && "items-center justify-center",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {activeZone && !splitMode ? <DropZoneOverlay activeZone={activeZone} /> : null}
        <SplitModeOverlay nodeId={nodeId} onAssignTileRef={onAssignTileRef} />

        {entryKey ? (
          <>
            {showHeader ? (
              /* Visible tile header with drag handle */
              <div
                className="flex items-center justify-between border-b border-border/60 px-2 py-1.5 text-[11px] cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={handleDragStart}
                onContextMenu={handleContextMenu}
              >
                <div className="flex items-center gap-1.5">
                  <GripHorizontal className="h-3 w-3 text-muted-foreground/60" />
                  <span className="font-medium">{title}</span>
                  <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {instanceId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded p-0.5 transition-colors hover:bg-muted/50"
                    onClick={handlePopOut}
                    title="Pop out to floating panel"
                  >
                    <Maximize2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive"
                    onClick={handleClose}
                    title="Close tile"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              /* Hidden-header strip — thin draggable bar, right-click to restore */
              <div
                className="group absolute top-0 inset-x-0 z-20 h-1 hover:h-5 transition-all duration-150 cursor-grab active:cursor-grabbing flex items-center bg-transparent hover:bg-muted/40 hover:border-b hover:border-border/40"
                draggable
                onDragStart={handleDragStart}
                onContextMenu={handleContextMenu}
                title="Right-click to show header"
              >
                <div className="pointer-events-none mx-auto opacity-0 group-hover:opacity-60 transition-opacity">
                  <GripHorizontal className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            )}
            {/* Tile content slot — portaled content renders here */}
            <TileSlot instanceId={instanceId} />
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            Empty tile — <kbd className="rounded border px-1 py-0.5 text-[10px]">Shift</kbd>
            +click a panel to fill it.
          </div>
        )}

        {contextMenu && entryKey && (
          <TileContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            showHeader={showHeader}
            onToggle={handleToggleHeader}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.nodeId === next.nodeId &&
    prev.instanceId === next.instanceId &&
    prev.entryKey === next.entryKey &&
    prev.showHeader === next.showHeader,
);

// ---------------------------------------------------------------------------
// SplitModeBadge
// ---------------------------------------------------------------------------

const SplitModeBadge = () => {
  const splitMode = useSplitMode();
  if (!splitMode) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-md bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-lg animate-in fade-in duration-150">
      Split Mode — drag panels onto zones
    </div>
  );
};

// ---------------------------------------------------------------------------
// TilingCanvas — main export
// ---------------------------------------------------------------------------

export const TilingCanvas: React.FC = () => {
  const tileTree = useTilingStore((s) => s.tileTree);
  const setTileTree = useTilingStore((s) => s.setTileTree);
  const assignTile = useTilingStore((s) => s.assignTile);
  const closeTile = useTilingStore((s) => s.closeTile);
  const toggleTileHeader = useTilingStore((s) => s.toggleTileHeader);
  const openWindow = useWindowStore((s) => s.openWindow);

  const [preview, setPreview] = React.useState<PreviewState>(null);
  const [canvasPreview, setCanvasPreview] = React.useState(false);
  const splitMode = useSplitModeTracker();
  const tileDragActive = useTileDragActiveTracker();
  const slotRegistry = useSlotRegistry();

  const previewCtx = React.useMemo<PreviewCtx>(() => ({ preview, setPreview }), [preview]);

  const plugins = usePluginStore((s) => s.plugins);
  const pruneTiles = useTilingStore((s) => s.pruneTiles);

  // Prune stale tile entries that can't be resolved on mount
  const hasPruned = React.useRef(false);
  React.useEffect(() => {
    if (!tileTree || hasPruned.current) return;
    // Wait a tick for plugins to register their window components
    const t = setTimeout(() => {
      hasPruned.current = true;
      const tree = useTilingStore.getState().tileTree;
      if (!tree) return;
      const leaves = collectLeaves(tree);
      const validKeys = new Set<string>();
      for (const leaf of leaves) {
        if (!leaf.entryKey) continue;
        if (windowRegistry.resolve(leaf.entryKey)) {
          validKeys.add(leaf.entryKey);
        } else {
          const resolved = resolveFromComponentId(leaf.entryKey, plugins);
          if (resolved) validKeys.add(leaf.entryKey);
        }
      }
      if (validKeys.size < leaves.length) {
        pruneTiles(validKeys);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [plugins, pruneTiles]);

  // Clear preview when split mode and drag both deactivate
  React.useEffect(() => {
    if (!splitMode && !tileDragActive) setPreview(null);
  }, [splitMode, tileDragActive]);

  // Stable refs for callbacks
  const onAssignTileRef = React.useRef(assignTile);
  onAssignTileRef.current = assignTile;

  const onPopOutRef = React.useRef((nodeId: string, entryKey: string, instanceId: string) => {
    openWindow({
      id: instanceId,
      title: entryKey.replace(/^core-/, "").replace(/-/g, " "),
      componentId: entryKey,
    });
    closeTile(nodeId);
  });
  React.useEffect(() => {
    onPopOutRef.current = (nodeId: string, entryKey: string, instanceId: string) => {
      openWindow({
        id: instanceId,
        title: entryKey.replace(/^core-/, "").replace(/-/g, " "),
        componentId: entryKey,
      });
      closeTile(nodeId);
    };
  }, [openWindow, closeTile]);

  const onCloseTileRef = React.useRef(closeTile);
  onCloseTileRef.current = closeTile;

  const onToggleHeaderRef = React.useRef(toggleTileHeader);
  onToggleHeaderRef.current = toggleTileHeader;

  // Collect leaves for persistent portal rendering
  const leaves = React.useMemo(() => collectLeaves(tileTree), [tileTree]);
  const persistentLeaves = usePersistentLeaves(leaves);

  // Render leaf function — stable ([] deps), reads props from node argument
  const renderLeaf = React.useCallback(
    (node: TileNode) => (
      <TilingLeafPanel
        key={node.instanceId || node.id}
        nodeId={node.id}
        instanceId={node.instanceId || node.id}
        entryKey={node.entryKey}
        showHeader={node.showHeader !== false}
        onAssignTileRef={onAssignTileRef}
        onPopOutRef={onPopOutRef}
        onCloseTileRef={onCloseTileRef}
        onToggleHeaderRef={onToggleHeaderRef}
      />
    ),
    [],
  );

  return (
    <SplitModeContext.Provider value={splitMode}>
      <TileDragActiveContext.Provider value={tileDragActive}>
        <SlotRegistryContext.Provider value={slotRegistry}>
          <TilePreviewContext.Provider value={previewCtx}>
            {/* Persistent content instances — never unmounted on tree restructure */}
            {persistentLeaves.map((leaf) => (
              <PortaledTileContent
                key={leaf.instanceId}
                instanceId={leaf.instanceId}
                componentId={leaf.entryKey}
                showHeader={leaf.showHeader}
              />
            ))}
            <div className="h-full min-h-0 min-w-0 overflow-hidden p-2">
              <div className="pointer-events-auto h-full min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-2">
                <div className="h-full min-h-0 min-w-0 relative">
                  <SplitModeBadge />
                  {tileTree ? (
                    <TilingLayout tree={tileTree} renderLeaf={renderLeaf} className="h-full" />
                  ) : (
                    <div
                      className="relative flex h-full items-center justify-center rounded-xl border border-dashed border-border/70"
                      onDragOver={(event) => {
                        if (!isTileDrag(event)) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setCanvasPreview(true);
                      }}
                      onDragLeave={(event) => {
                        const related = event.relatedTarget as Node | null;
                        if (related && event.currentTarget.contains(related)) return;
                        setCanvasPreview(false);
                      }}
                      onDrop={(event) => {
                        if (!isTileDrag(event)) return;
                        event.preventDefault();
                        const payload = getTileDragData(event);
                        if (!payload) return;
                        setTileTree(
                          createLeaf(
                            payload.entryKey,
                            undefined,
                            payload.instanceId || createNodeId(),
                          ),
                        );
                        setCanvasPreview(false);
                      }}
                    >
                      {canvasPreview ? (
                        <div className="pointer-events-none absolute inset-2 rounded-xl border border-primary/50 bg-primary/10" />
                      ) : null}
                      <div className="text-center text-xs text-muted-foreground">
                        <p className="mb-1 font-medium">Tiling Layout</p>
                        <p>
                          Hold <kbd className="rounded border px-1 py-0.5 text-[10px]">Shift</kbd> +
                          click a panel to tile it,
                        </p>
                        <p>
                          or use a panel's <span className="font-medium">⋮</span> menu →{" "}
                          <span className="font-medium">Send to Tile</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TilePreviewContext.Provider>
        </SlotRegistryContext.Provider>
      </TileDragActiveContext.Provider>
    </SplitModeContext.Provider>
  );
};
