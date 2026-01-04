import { create } from 'zustand'
import type { PromptImage } from '@/lib/api/types'

interface GlobalState {
  selectedImage: PromptImage | null
  selectImage: (image: PromptImage | null) => void
}

export const useGlobalStore = create<GlobalState>((set) => ({
  selectedImage: null,
  selectImage: (image) => set({ selectedImage: image }),
}))
