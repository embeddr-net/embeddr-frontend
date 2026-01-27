import { BACKEND_V2_URL } from '../config'

export interface PluginAction {
  name: string
  label: string
  description: string
  inputs: string[]
}

export interface Plugin {
  name: string
  version: string
  actions: PluginAction[]
  // ... other fields
}

export const fetchPlugins = async (): Promise<Plugin[]> => {
  const res = await fetch(`${BACKEND_V2_URL}/plugins`)
  if (!res.ok) throw new Error('Failed to fetch plugins')
  return res.json()
}

export const fetchPluginLogos = async (): Promise<
  Record<string, string | null>
> => {
  const res = await fetch(`${BACKEND_V2_URL}/plugins/logos`)
  if (!res.ok) throw new Error('Failed to fetch plugin logos')
  const data = await res.json()
  return data?.logos || {}
}
