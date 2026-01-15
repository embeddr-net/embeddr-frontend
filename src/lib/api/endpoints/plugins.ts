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
