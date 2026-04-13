import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DraggablePanel as LibDraggablePanel } from "@embeddr/react-ui";
import { useLocalStorage, useScreenSafeArea } from "@embeddr/zen-shell";
import { useWindowStore } from "@/store/windowStore";
import { cn } from "@/lib/utils";

interface DraggablePanelProps {
  id: string;
  title: string;
  titleIcon?: React.ReactNode;
  children:
    | React.ReactNode
    | ((props: { showTitle: boolean; isActive: boolean }) => React.ReactNode);
  isOpen: boolean;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  className?: string;
  minWidth?: number;
  minHeight?: number;
  hideHeader?: boolean;
  transparent?: boolean;
  onMinimize?: () => void;
  zIndex?: number;
  additionalSettingsItems?: React.ReactNode;
  pinned?: boolean;
  onPinChange?: () => void;
  isActive?: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onDragEnd?: () => void;
  onResizeEnd?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  showTitle?: boolean;
  onShowTitleChange?: (showTitle: boolean) => void;
  openRevision?: number;
  resetUiOnOpen?: boolean;
  context?: { artifactId?: string | number; imageUrl?: string };
}

type PanelPosition = { x: number; y: number };
type PanelSize = { width: number; height: number };

const FLOAT_EPSILON = 0.5;

function positionsEqual(a: PanelPosition, b: PanelPosition) {
  return (
    Math.abs(a.x - b.x) <= FLOAT_EPSILON && Math.abs(a.y - b.y) <= FLOAT_EPSILON
  );
}

function sizesEqual(a: PanelSize, b: PanelSize) {
  return (
    Math.abs(a.width - b.width) <= FLOAT_EPSILON &&
    Math.abs(a.height - b.height) <= FLOAT_EPSILON
  );
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
  position: controlledPosition,
  size: controlledSize,
  onPositionChange,
  onSizeChange,
  onDragEnd,
  onResizeEnd,
  onMouseDown,
  showTitle: controlledShowTitle,
  onShowTitleChange,
  openRevision,
  resetUiOnOpen,
}: DraggablePanelProps) {
  const bringToFront = useWindowStore((s) => s.bringToFront);
  const updateWindow = useWindowStore((s) => s.updateWindow);
  const togglePin = useWindowStore((s) => s.togglePin);
  const openWindow = useWindowStore((s) => s.openWindow);
  const mergeWindows = useWindowStore((s) => s.mergeWindows);
  const setMergeHoverTarget = useWindowStore((s) => s.setMergeHoverTarget);
  const setHoverPanelId = useWindowStore((s) => s.setHoverPanelId);

  const windowState = useWindowStore((s) => s.windows[id]);
  const isBackdrop = useWindowStore((s) => s.backdropWindowId === id);
  const isMergeHoverTarget = useWindowStore((s) => s.mergeHoverTargetId === id);
  const orderIndex = useWindowStore((s) => s.panelOrder.indexOf(id));
  const isLastInOrder = useWindowStore(
    (s) => s.panelOrder[s.panelOrder.length - 1] === id,
  );

  const initialPosition =
    controlledPosition ?? windowState?.position ?? defaultPosition;
  const initialSize = controlledSize ?? windowState?.size ?? defaultSize;

  const [localPosition, setLocalPosition] = useState(initialPosition);
  const [localSize, setLocalSize] = useState(initialSize);
  const [internalShowTitle, setInternalShowTitle] = useLocalStorage(
    id ? `panel-${id}-show-title` : "temp-panel-show-title",
    true,
  );
  const screenSafeArea = useScreenSafeArea({
    enabled: true,
    edgePadding: 0,
  });

  const positionRef = useRef(localPosition);
  const sizeRef = useRef(localSize);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const lastPositionRef = useRef<PanelPosition | null>(null);
  const lastSizeRef = useRef<PanelSize | null>(null);
  const isInteractingRef = useRef(false);

  const isPinned = pinned ?? windowState?.isPinned ?? false;
  const isActive = isActiveProp ?? isLastInOrder;
  const effectiveShowTitle = controlledShowTitle ?? internalShowTitle;

  useEffect(() => {
    positionRef.current = localPosition;
  }, [localPosition]);

  useEffect(() => {
    sizeRef.current = localSize;
  }, [localSize]);

  useEffect(() => {
    if (
      controlledShowTitle !== undefined &&
      internalShowTitle !== controlledShowTitle
    ) {
      setInternalShowTitle(controlledShowTitle);
    }
  }, [controlledShowTitle, internalShowTitle, setInternalShowTitle]);

  useEffect(() => {
    if (!windowState) {
      openWindow({
        id,
        title,
        componentId: "embeddr-draggable-panel",
        props: {
          defaultPosition,
          defaultSize,
          minWidth,
          minHeight,
        },
      });
    }
  }, [
    defaultPosition,
    defaultSize,
    id,
    minHeight,
    minWidth,
    openWindow,
    title,
    windowState,
  ]);

  useEffect(() => {
    if (!windowState) return;
    if (!windowState.position) {
      updateWindow(id, { position: controlledPosition ?? defaultPosition });
    }
    if (!windowState.size) {
      updateWindow(id, { size: controlledSize ?? defaultSize });
    }
  }, [
    controlledPosition,
    controlledSize,
    defaultPosition,
    defaultSize,
    id,
    updateWindow,
    windowState,
    windowState?.position,
    windowState?.size,
  ]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      lastMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const clampPositionToSafeArea = useCallback(
    (nextPosition: PanelPosition, nextSize: PanelSize) => {
      if (typeof window === "undefined") return nextPosition;

      const minX = screenSafeArea.left;
      const minY = screenSafeArea.top;
      const maxX = Math.max(
        minX,
        window.innerWidth - screenSafeArea.right - nextSize.width,
      );
      const maxY = Math.max(
        minY,
        window.innerHeight - screenSafeArea.bottom - nextSize.height,
      );

      return {
        x: Math.min(Math.max(nextPosition.x, minX), maxX),
        y: Math.min(Math.max(nextPosition.y, minY), maxY),
      };
    },
    [
      screenSafeArea.bottom,
      screenSafeArea.left,
      screenSafeArea.right,
      screenSafeArea.top,
    ],
  );

  const clampSizeToSafeArea = useCallback(
    (nextSize: PanelSize, atPosition: PanelPosition) => {
      if (typeof window === "undefined") return nextSize;

      const maxWidth = Math.max(
        minWidth,
        window.innerWidth - screenSafeArea.right - atPosition.x,
      );
      const maxHeight = Math.max(
        minHeight,
        window.innerHeight - screenSafeArea.bottom - atPosition.y,
      );

      return {
        width: Math.min(Math.max(nextSize.width, minWidth), maxWidth),
        height: Math.min(Math.max(nextSize.height, minHeight), maxHeight),
      };
    },
    [minHeight, minWidth, screenSafeArea.bottom, screenSafeArea.right],
  );

  useEffect(() => {
    if (isInteractingRef.current) return;
    if (!controlledPosition) return;

    const constrained = clampPositionToSafeArea(
      controlledPosition,
      controlledSize ?? sizeRef.current,
    );

    if (!positionsEqual(positionRef.current, constrained)) {
      positionRef.current = constrained;
      setLocalPosition(constrained);
    }
  }, [clampPositionToSafeArea, controlledPosition, controlledSize]);

  useEffect(() => {
    if (isInteractingRef.current) return;
    if (!controlledSize) return;

    const positionForClamp = controlledPosition ?? positionRef.current;
    const constrained = clampSizeToSafeArea(controlledSize, positionForClamp);

    if (!sizesEqual(sizeRef.current, constrained)) {
      sizeRef.current = constrained;
      setLocalSize(constrained);
    }
  }, [clampSizeToSafeArea, controlledPosition, controlledSize]);

  const findMergeTarget = useCallback(() => {
    if (windowState?.groupHostId) return null;
    if (!isInteractingRef.current) return null;

    const pointer = lastMouseRef.current;
    if (!pointer) return null;

    const currentWindows = useWindowStore.getState().windows;
    const candidates = document.querySelectorAll(
      '[data-panel-drop-zone="tab"]',
    );

    for (const node of Array.from(candidates)) {
      const el = node as HTMLElement;
      const targetId = el.getAttribute("data-panel-id");
      if (!targetId || targetId === id) continue;

      const target = currentWindows[targetId];
      if (!target || target.isMinimized || target.groupHostId) continue;

      const rect = el.getBoundingClientRect();
      const isInside =
        pointer.x >= rect.left &&
        pointer.x <= rect.left + rect.width &&
        pointer.y >= rect.top &&
        pointer.y <= rect.top + rect.height;

      if (isInside) return target.id;
    }

    return null;
  }, [id, windowState?.groupHostId]);

  const handleShowTitleChange = useCallback(
    (show: boolean) => {
      setInternalShowTitle(show);
      onShowTitleChange?.(show);
    },
    [onShowTitleChange],
  );

  const handlePositionChange = useCallback(
    (pos: PanelPosition) => {
      const constrained = clampPositionToSafeArea(
        pos,
        controlledSize ?? sizeRef.current,
      );

      lastPositionRef.current = constrained;
      isInteractingRef.current = true;
      const positionChanged = !positionsEqual(positionRef.current, constrained);
      positionRef.current = constrained;

      if (positionChanged) {
        setLocalPosition(constrained);
        onPositionChange?.(constrained);
      }

      const targetId = findMergeTarget();
      const currentHoverId = useWindowStore.getState().mergeHoverTargetId;
      if (targetId !== currentHoverId) {
        setMergeHoverTarget(targetId);
      }
    },
    [clampPositionToSafeArea, controlledSize, findMergeTarget, onPositionChange, setMergeHoverTarget],
  );

  const handleSizeChange = useCallback(
    (nextSize: PanelSize) => {
      const positionForClamp = isInteractingRef.current
        ? (lastPositionRef.current ?? positionRef.current)
        : (controlledPosition ?? positionRef.current);
      const constrainedSize = clampSizeToSafeArea(nextSize, positionForClamp);
      lastSizeRef.current = constrainedSize;
      isInteractingRef.current = true;
      const sizeChanged = !sizesEqual(sizeRef.current, constrainedSize);
      sizeRef.current = constrainedSize;

      if (sizeChanged) {
        setLocalSize(constrainedSize);
      }
    },
    [clampSizeToSafeArea, controlledPosition],
  );

  const handleDragEnd = useCallback(() => {
    const rawPosition =
      lastPositionRef.current ?? controlledPosition ?? positionRef.current;
    const snappedPosition = clampPositionToSafeArea(
      rawPosition,
      controlledSize ?? sizeRef.current,
    );

    const positionChanged = !positionsEqual(
      positionRef.current,
      snappedPosition,
    );
    positionRef.current = snappedPosition;

    if (positionChanged) {
      setLocalPosition(snappedPosition);
      onPositionChange?.(snappedPosition);
    }

    updateWindow(id, { position: snappedPosition });

    const targetId = findMergeTarget();
    if (targetId) mergeWindows(id, targetId);

    setMergeHoverTarget(null);
    isInteractingRef.current = false;
    onDragEnd?.();
  }, [
    controlledPosition,
    clampPositionToSafeArea,
    findMergeTarget,
    id,
    mergeWindows,
    onDragEnd,
    onPositionChange,
    setMergeHoverTarget,
    updateWindow,
  ]);

  const handleResizeEnd = useCallback(() => {
    const currentPos = lastPositionRef.current ?? controlledPosition ?? positionRef.current;
    const nextSize = clampSizeToSafeArea(
      lastSizeRef.current ?? controlledSize ?? sizeRef.current,
      currentPos,
    );

    const sizeChanged = !sizesEqual(sizeRef.current, nextSize);
    sizeRef.current = nextSize;

    if (sizeChanged) {
      setLocalSize(nextSize);
      onSizeChange?.(nextSize);
    }

    // Persist BOTH size and position — position changes during NW/N/W resize
    updateWindow(id, { size: nextSize, position: currentPos });

    isInteractingRef.current = false;
    onResizeEnd?.();
  }, [
    clampSizeToSafeArea,
    controlledPosition,
    controlledSize,
    id,
    onResizeEnd,
    onSizeChange,
    updateWindow,
  ]);

  useEffect(() => {
    if (isInteractingRef.current || isBackdrop) return;

    const basePosition = controlledPosition ?? positionRef.current;
    const clampedSize = clampSizeToSafeArea(
      controlledSize ?? sizeRef.current,
      basePosition,
    );
    const clampedPosition = clampPositionToSafeArea(basePosition, clampedSize);

    const sizeChanged = !sizesEqual(sizeRef.current, clampedSize);
    const positionChanged = !positionsEqual(positionRef.current, clampedPosition);

    if (sizeChanged) {
      sizeRef.current = clampedSize;
      setLocalSize(clampedSize);
      onSizeChange?.(clampedSize);
    }
    if (positionChanged) {
      positionRef.current = clampedPosition;
      setLocalPosition(clampedPosition);
      onPositionChange?.(clampedPosition);
    }
    if (positionChanged || sizeChanged) {
      updateWindow(id, {
        position: clampedPosition,
        size: clampedSize,
      });
    }
  }, [
    clampPositionToSafeArea,
    clampSizeToSafeArea,
    controlledPosition,
    controlledSize,
    id,
    isBackdrop,
    onPositionChange,
    onSizeChange,
    updateWindow,
  ]);

  const resolvedChildren = useMemo(() => {
    if (typeof children === "function") {
      return children({
        showTitle: !hideHeader && effectiveShowTitle,
        isActive,
      });
    }

    return children;
  }, [children, effectiveShowTitle, hideHeader, isActive]);

  if (isBackdrop) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-10 h-full w-full overflow-hidden bg-background/95 backdrop-blur-3xl",
          className,
        )}
        style={{ pointerEvents: "auto" }}
      >
        {resolvedChildren}
      </div>
    );
  }

  const computedZIndex = useMemo(() => {
    if (propZIndex != null) return propZIndex;
    const baseOrder = orderIndex === -1 ? 0 : orderIndex;
    return isPinned ? 1000 + baseOrder : 20 + baseOrder;
  }, [isPinned, orderIndex, propZIndex]);

  return (
    <LibDraggablePanel
      id={id}
      title={title}
      titleIcon={titleIcon}
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={defaultSize}
      className={cn(className, "embeddr-draggable-panel")}
      minWidth={minWidth}
      minHeight={minHeight}
      position={localPosition}
      size={localSize}
      onPositionChange={handlePositionChange}
      onSizeChange={handleSizeChange}
      onDragEnd={handleDragEnd}
      onResizeEnd={handleResizeEnd}
      zIndex={computedZIndex}
      pinned={isPinned}
      onPinChange={onPinChange || (() => togglePin(id))}
      isActive={isActive}
      mergeActive={isMergeHoverTarget}
      onFocus={() => bringToFront(id)}
      onMouseDown={(event: React.MouseEvent) => {
        event.stopPropagation();
        onMouseDown?.(event);
        bringToFront(id);
      }}
      onMouseEnter={() => setHoverPanelId(id)}
      onMouseLeave={() => setHoverPanelId(null)}
      onMinimize={onMinimize}
      hideHeader={hideHeader}
      transparent={transparent}
      showTitle={effectiveShowTitle}
      onShowTitleChange={handleShowTitleChange}
      additionalSettingsItems={additionalSettingsItems}
      openRevision={openRevision}
      resetUiOnOpen={resetUiOnOpen}
    >
      <div
        className="h-full w-full"
        onMouseDown={(event) => {
          event.stopPropagation();
          bringToFront(id);
        }}
      >
        {resolvedChildren}
      </div>
    </LibDraggablePanel>
  );
}
