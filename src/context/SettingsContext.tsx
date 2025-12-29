import { createContext } from 'react'

export interface SettingsContextType {
  selectedModel: string
  setSelectedModel: (model: string) => void
  batchSize: number
  setBatchSize: (size: number) => void
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
)
