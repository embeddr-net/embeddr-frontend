import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEmbeddrAPI } from "@/plugins/store";
import { toast } from "sonner";

// If you already have toast helpers, use those instead.
type AnyEvent = { detail?: any } | any;

export function CoreUIEventBridge() {
  const api = useEmbeddrAPI();
  const navigate = useNavigate();

  React.useEffect(() => {
    console.log("[CoreUIEventBridge] Setting up event bridge");
    const openArtifact = (artifactId: string) => {
      // You can decide a stable “core” window id, not tied to plugin.
      console.log(
        `[CoreUIEventBridge] Opening artifact viewer for ${artifactId}`,
      );
      api.windows.spawn(
        `embeddr-llm-llm-artifact`,
        `Artifact ${artifactId.slice(0, 8)}`,
        {
          artifactId,
        },
      );
    };

    const handleOpenPanel = (event: AnyEvent) => {
      const d = event?.detail ?? event;
      const p = d?.payload ?? d;

      // Option A: componentId is already in the exact form your PanelManager resolves:
      //   "embeddr-llm-llm-artifact" or "embeddr-comfyui-comfy-panel"
      const componentId = p?.componentId;

      // Option B: lotus-style panel_id: "plugin:embeddr-comfyui/comfy-panel"
      const panelId = p?.panel_id ?? p?.panelId;

      let resolvedComponentId = componentId as string | undefined;
      if (!resolvedComponentId && typeof panelId === "string") {
        const m = /^plugin:([^/]+)\/(.+)$/.exec(panelId);
        if (m) resolvedComponentId = `${m[1]}-${m[2]}`;
      }

      if (!resolvedComponentId) return;

      const nextProps = {
        ...(p?.props ?? {}),
        ...(p?.resetUiOnOpen !== undefined
          ? { resetUiOnOpen: p.resetUiOnOpen }
          : {}),
      };

      if (panelId) {
        api.windows.open(
          panelId,
          p?.title ?? resolvedComponentId,
          resolvedComponentId,
          nextProps,
        );
      } else {
        api.windows.spawn(
          resolvedComponentId,
          p?.title ?? resolvedComponentId,
          nextProps,
        );
      }
    };

    const openMediaFrame = (payload: any) => {
      const p = payload?.payload ?? payload ?? {};
      const title = p.title ?? "Media Frame";
      const mode: "replace" | "append" = p.mode ?? "replace";
      const focus = p.focus ?? true;
      const panelId = p.panelId;

      // Normalize -> items
      const items =
        Array.isArray(p.items) && p.items.length
          ? p.items
          : Array.isArray(p.artifactIds)
            ? p.artifactIds.map((id: string) => ({ artifactId: id }))
            : Array.isArray(p.artifact_ids)
              ? p.artifact_ids.map((id: string) => ({ artifactId: id }))
              : [];

      if (!items.length) {
        toast.info("No media to display");
        return;
      }

      // If targetWindowId provided, emit to that window instead of spawning new.
      // (Optional: you can implement "target existing window" later.)
      const windowId = p.targetWindowId ?? panelId ?? "core-media-frame";
      const componentId = "embeddr-core-media-frame-panel";
      const props = {
        // ✅ critical: pass windowId down so storage keys are unique per instance
        // your DynamicPluginComponent already passes windowId prop
        initialItems: items,
        initialMode: mode,
        initialSelectIndex: p.selectIndex ?? 0,
        // you can add "replace" semantics inside the panel with these
        intent: { mode },
        panelId: panelId ?? windowId,
        resetUiOnOpen: true,
      };

      // Open-or-reuse with stable ID so local panel state survives refreshes.
      api.windows.open(windowId, title, componentId, props);

      if (focus) {
        // bringToFront is on window store, but API doesn’t expose it directly;
        // if you want, add api.windows.focus(id) later.
      }
    };

    const openLightbox = (payload: any) => {
      const p = payload?.payload ?? payload ?? {};
      const title = p.title ?? "Lightbox";
      const mode: "replace" | "append" = p.mode ?? "replace";
      const focus = p.focus ?? true;
      const panelId = p.panelId;
      const shouldSpawn =
        p.spawn === true ||
        p.windowStrategy === "spawn" ||
        p.instanceMode === "multiple";

      const items =
        Array.isArray(p.items) && p.items.length
          ? p.items
          : Array.isArray(p.artifactIds)
            ? p.artifactIds.map((id: string) => ({ artifactId: id }))
            : Array.isArray(p.artifact_ids)
              ? p.artifact_ids.map((id: string) => ({ artifactId: id }))
              : [];

      if (!items.length) {
        toast.info("No media to display");
        return;
      }

      const windowId = shouldSpawn
        ? undefined
        : (p.targetWindowId ?? panelId ?? "core-lightbox");
      const componentId = "embeddr-media-tools-lightbox-panel";
      const props = {
        initialItems: items,
        initialMode: mode,
        initialSelectIndex: p.selectIndex ?? 0,
        showThumbnails: p.showThumbnails ?? true,
        panelId: panelId ?? windowId,
        resetUiOnOpen: true,
      };

      if (windowId) {
        api.windows.open(windowId, title, componentId, props);
      } else {
        api.windows.spawn(componentId, title, props);
      }

      if (focus) {
        // optional: add focus behavior later
      }
    };

    const openCompare = (payload: any) => {
      const p = payload?.payload ?? payload ?? {};
      const title = p.title ?? "Compare";
      const focus = p.focus ?? true;
      const panelId = p.panelId;

      const items = Array.isArray(p.items)
        ? p.items.slice(0, 2)
        : Array.isArray(p.artifact_ids)
          ? p.artifact_ids.slice(0, 2).map((id: string) => ({ artifactId: id }))
          : [p.primary, p.secondary].filter(Boolean);
      const windowId = p.targetWindowId ?? panelId ?? "core-compare";
      const componentId = "embeddr-media-tools-compare-panel";
      const props = {
        initialItems: items,
        panelId: panelId ?? windowId,
        resetUiOnOpen: true,
      };

      api.windows.open(windowId, title, componentId, props);

      if (focus) {
        // optional: add focus behavior later
      }
    };

    const handleDisplayMedia = (event: AnyEvent) => {
      const d = event?.detail ?? event;
      const p = d?.payload ?? d;
      console.log("[CoreUIEventBridge] display media event", p);
      openMediaFrame(p);
    };

    const handleDisplayLightbox = (event: AnyEvent) => {
      const d = event?.detail ?? event;
      const p = d?.payload ?? d;
      openLightbox(p);
    };

    const handleDisplayCompare = (event: AnyEvent) => {
      const d = event?.detail ?? event;
      const p = d?.payload ?? d;
      openCompare(p);
    };

    const handleToast = (event: AnyEvent) => {
      const d = event?.detail ?? event;
      const p = d?.payload ?? d; // supports both shapes

      const title = p?.title ?? "Embeddr";
      const description = p?.description ?? "";
      const variant = p?.variant ?? "default";

      const msg = description ? `${title}: ${description}` : title;

      console.log("[CoreUIEventBridge] Toast", { title, description, variant });

      if (variant === "destructive" || variant === "error") toast.error(msg);
      else if (variant === "success") toast.success(msg);
      else toast.info(msg);
    };

    const openGallery = (items: string[]) => {
      console.log(
        `[CoreUIEventBridge] Opening gallery with ${items.length} items`,
      );
      api.windows.spawn(
        `embeddr-llm-llm-gallery`,
        `Gallery (${items.length} items)`,
        {
          items,
        },
      );
    };

    const handleOpenArtifact = (event: AnyEvent) => {
      const d = event?.detail ?? event;
      const p = d?.payload ?? d;
      const artifactId = p?.artifact_id ?? p?.artifactId;
      if (typeof artifactId === "string" && artifactId.length > 0)
        openArtifact(artifactId);
    };

    const handleOpenGallery = (event: AnyEvent) => {
      const detail = event.detail ?? event;
      const p = detail?.payload ?? detail;
      const items = p?.items ?? p?.item_ids ?? p?.itemIds;
      if (Array.isArray(items)) openGallery(items);
    };

    const handleNavigate = (event: AnyEvent) => {
      const d = event?.detail ?? event;
      const p = d?.payload ?? d; // <-- support both shapes

      const to = p?.route ?? p?.to;

      console.log(`[CoreUIEventBridge] Navigating to`, { to, d, p });
      if (typeof to === "string" && to.length > 0) {
        navigate({ to });
      }
    };

    // Core UI intents (always-on)
    const u1 = api.events?.on?.("ui:display_media", handleDisplayMedia);
    const u8 = api.events?.on?.("ui.display_media_frame", handleDisplayMedia);
    const u6 = api.events?.on?.("ui:display_lightbox", handleDisplayLightbox);
    const u7 = api.events?.on?.("ui:display_compare", handleDisplayCompare);
    // const u1 = api.events?.on?.('ui:open_artifact', handleOpenArtifact)
    const u2 = api.events?.on?.("ui:open_gallery", handleOpenGallery);
    const u3 = api.events?.on?.("ui:navigate", handleNavigate);
    const u4 = api.events?.on?.("ui:toast", handleToast);
    const u5 = api.events?.on?.("ui:open_panel", handleOpenPanel);
    const u9 = api.events?.on?.("embeddr:ui:open_panel", handleOpenPanel);
    const u10 = api.events?.on?.("embeddr-core:ui:open_panel", handleOpenPanel);

    // Back-compat bridge: keep old LLM events working, but route to core intents
    const b1 = api.events?.on?.("llm:display_artifact", handleOpenArtifact);
    const b2 = api.events?.on?.("llm:display_gallery", handleOpenGallery);

    return () => {
      // Support both "returns unsubscribe" and "off" styles
      for (const [unsub, name, fn] of [
        [u1, "ui:display_media", handleDisplayMedia],
        [u8, "ui.display_media_frame", handleDisplayMedia],
        [u6, "ui:display_lightbox", handleDisplayLightbox],
        [u7, "ui:display_compare", handleDisplayCompare],
        // [u1, 'ui:open_artifact', handleOpenArtifact],
        [u2, "ui:open_gallery", handleOpenGallery],
        [u3, "ui:navigate", handleNavigate],
        [u4, "ui:toast", handleToast],
        [u5, "ui:open_panel", handleOpenPanel],
        [u9, "embeddr:ui:open_panel", handleOpenPanel],
        [u10, "embeddr-core:ui:open_panel", handleOpenPanel],
        [b1, "llm:display_artifact", handleOpenArtifact],
        [b2, "llm:display_gallery", handleOpenGallery],
      ] as const) {
        if (typeof unsub === "function") unsub();
        else api.events?.off?.(name, fn);
      }
    };
  }, [api, navigate]);

  return null;
}
