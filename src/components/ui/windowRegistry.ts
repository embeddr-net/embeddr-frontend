import type React from "react";

export type WindowRenderer = React.ComponentType<any>;

const registry = new Map<string, WindowRenderer>();

/**
 * Normalize a component ID for fuzzy matching.
 * Strips hyphens/underscores and lowercases so that
 * "embeddr-debug-DebugPanel" and "embeddr-debug-debug-panel" both become
 * "embeddrdebugdebugpanel".
 */
function normalizeId(id: string) {
  return id.replace(/[-_]/g, "").toLowerCase();
}

export const windowRegistry = {
  register(id: string, component: WindowRenderer) {
    registry.set(id, component);
  },
  get(id: string) {
    return registry.get(id);
  },
  has(id: string) {
    return registry.has(id);
  },
  /**
   * Fuzzy lookup — tries exact match first, then normalized (strips hyphens, lowercases).
   * Returns [resolvedId, component] or null.
   */
  resolve(id: string): [string, WindowRenderer] | null {
    const exact = registry.get(id);
    if (exact) return [id, exact];
    const norm = normalizeId(id);
    for (const [key, comp] of registry) {
      if (normalizeId(key) === norm) return [key, comp];
    }
    return null;
  },
  keys() {
    return Array.from(registry.keys());
  },
};

export function registerWindowComponent(id: string, component: WindowRenderer) {
  const existing = registry.get(id);
  if (existing === component) return;
  registry.set(id, component);
}
