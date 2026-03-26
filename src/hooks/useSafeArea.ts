import { useSettingsStore } from "@/store/settingsStore";
import { useShallow } from "zustand/react/shallow";
import { useEffect, useMemo, useState } from "react";

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const OVERLAY_COLLAPSED_THRESHOLD_PX = 10;
const COMMAND_BAR_LOOKUP_RETRIES = 20;

function measureCommandBarInset(
  commandBarPosition: "top" | "bottom",
  isOverlay: boolean,
): number {
  if (typeof window === "undefined") return 0;

  const commandBar = document.getElementById("embeddr-command-bar");
  if (!commandBar) return 0;

  const rect = commandBar.getBoundingClientRect();
  const rawInset =
    commandBarPosition === "top"
      ? Math.max(0, rect.bottom)
      : Math.max(0, window.innerHeight - rect.top);

  if (isOverlay && rawInset <= OVERLAY_COLLAPSED_THRESHOLD_PX) {
    return 0;
  }

  return Math.round(rawInset);
}

function measureViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function useSafeArea(): SafeArea {
  const { commandBarPosition, commandBarHoverParams, commandBarCompact } =
    useSettingsStore(
      useShallow((s) => ({
        commandBarPosition: s.commandBarPosition,
        commandBarHoverParams: s.commandBarHoverParams,
        commandBarCompact: s.commandBarCompact,
      })),
    );
  const isOverlay = commandBarHoverParams?.enabled ?? false;
  const [commandBarInset, setCommandBarInset] = useState(() =>
    measureCommandBarInset(commandBarPosition, isOverlay),
  );
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() =>
    measureViewportSize(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let resizeObserver: ResizeObserver | null = null;
    let frameId: number | null = null;
    let retries = 0;

    const updateMeasurements = () => {
      const nextInset = measureCommandBarInset(commandBarPosition, isOverlay);
      setCommandBarInset((current) =>
        current === nextInset ? current : nextInset,
      );

      const nextViewportSize = measureViewportSize();
      setViewportSize((current) =>
        current.width === nextViewportSize.width &&
        current.height === nextViewportSize.height
          ? current
          : nextViewportSize,
      );
    };

    const attachObserver = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;

      const commandBar = document.getElementById("embeddr-command-bar");
      if (commandBar && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateMeasurements);
        resizeObserver.observe(commandBar);
      }
      updateMeasurements();
    };

    const ensureObserver = () => {
      attachObserver();

      if (!resizeObserver && retries < COMMAND_BAR_LOOKUP_RETRIES) {
        retries += 1;
        frameId = window.requestAnimationFrame(ensureObserver);
      }
    };

    ensureObserver();
    window.addEventListener("resize", updateMeasurements);
    window.visualViewport?.addEventListener("resize", updateMeasurements);

    return () => {
      resizeObserver?.disconnect();
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", updateMeasurements);
      window.visualViewport?.removeEventListener("resize", updateMeasurements);
    };
  }, [commandBarPosition, isOverlay, commandBarCompact]);

  return useMemo(() => {
    const MARGIN = 0;

    const safeArea = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };

    if (commandBarPosition === "top") {
      safeArea.top = Math.max(0, commandBarInset + MARGIN * 2);
    } else {
      safeArea.bottom = Math.max(0, commandBarInset + MARGIN * 2);
    }

    // Add some default padding for the edges of the screen
    const EDGE_PADDING = 0;
    safeArea.top = Math.max(safeArea.top, EDGE_PADDING);
    safeArea.bottom = Math.max(safeArea.bottom, EDGE_PADDING);
    safeArea.left = Math.max(safeArea.left, EDGE_PADDING);
    safeArea.right = Math.max(safeArea.right, EDGE_PADDING);

    return {
      ...safeArea,
      width: Math.max(0, viewportSize.width - safeArea.left - safeArea.right),
      height: Math.max(0, viewportSize.height - safeArea.top - safeArea.bottom),
    };
  }, [
    commandBarInset,
    commandBarPosition,
    viewportSize.height,
    viewportSize.width,
  ]);
}
