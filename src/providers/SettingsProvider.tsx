import React, { useEffect, useState } from 'react'
import { SettingsContext } from '@/context/SettingsContext'

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [selectedModel, setSelectedModel] = useState(
    'openai/clip-vit-base-patch32',
  )
  const [batchSize, setBatchSize] = useState(50)

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const savedModel = localStorage.getItem('embeddr-model')
    if (savedModel) setSelectedModel(savedModel)

    const savedBatchSize = localStorage.getItem('embeddr-batch-size')
    if (savedBatchSize) setBatchSize(parseInt(savedBatchSize, 10))
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('embeddr-model', selectedModel)
  }, [selectedModel])

  useEffect(() => {
    localStorage.setItem('embeddr-batch-size', batchSize.toString())
  }, [batchSize])

  return (
    <SettingsContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        batchSize,
        setBatchSize,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
