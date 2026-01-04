import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SettingsContext } from '@/context/SettingsContext'
import { BACKEND_URL } from '@/lib/api'

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const queryClient = useQueryClient()

  // Local state for optimistic UI / fallback
  const [selectedModel, setSelectedModel] = useState(
    'openai/clip-vit-base-patch32',
  )
  const [batchSize, setBatchSize] = useState(32)
  const [uploadConfig, setUploadConfig] = useState({
    default_library_id: null,
    default_collection_id: null,
    default_tags: '',
  })

  // Fetch config from backend
  const { data: config } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/system/config`)
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json()
    },
  })

  useEffect(() => {
    if (config?.general) {
      setSelectedModel(config.general.model)
      setBatchSize(config.general.batch_size)
    }
    if (config?.upload) {
      setUploadConfig(config.upload)
    }
  }, [config])

  // Mutation to update backend
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: any) => {
      const res = await fetch(`${BACKEND_URL}/system/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })
      if (!res.ok) throw new Error('Failed to update config')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['system-config'], data)
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const handleSetSelectedModel = (model: string) => {
    setSelectedModel(model)
    updateConfigMutation.mutate({ general: { model } })
  }

  const handleSetBatchSize = (size: number) => {
    setBatchSize(size)
    updateConfigMutation.mutate({ general: { batch_size: size } })
  }

  const handleSetUploadConfig = (newConfig: any) => {
    setUploadConfig(newConfig)
    updateConfigMutation.mutate({ upload: newConfig })
  }

  return (
    <SettingsContext.Provider
      value={{
        selectedModel,
        setSelectedModel: handleSetSelectedModel,
        batchSize,
        setBatchSize: handleSetBatchSize,
        uploadConfig,
        setUploadConfig: handleSetUploadConfig,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
