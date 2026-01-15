import React from 'react'

export type WindowRenderer = React.ComponentType<any>

const registry = new Map<string, WindowRenderer>()

export const windowRegistry = {
  register(id: string, component: WindowRenderer) {
    registry.set(id, component)
  },
  get(id: string) {
    return registry.get(id)
  },
  has(id: string) {
    return registry.has(id)
  },
  // optional: debug
  keys() {
    return Array.from(registry.keys())
  },
}

export function registerWindowComponent(id: string, component: WindowRenderer) {
  const existing = registry.get(id)
  if (existing === component) return
  registry.set(id, component)
}
