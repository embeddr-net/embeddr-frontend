import { createContext } from 'react'

export interface UploadConfig {
  default_library_id: number | null
  default_collection_id: number | null
  default_tags: string
}

export interface SettingsContextType {
  selectedModel: string
  setSelectedModel: (model: string) => void
  batchSize: number
  setBatchSize: (size: number) => void
  uploadConfig: UploadConfig
  setUploadConfig: (config: UploadConfig) => void
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
)
