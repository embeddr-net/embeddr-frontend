import { useGenerationStore } from '@/store/generationStore'

export const usePreview = () => {
  const currentPreview = useGenerationStore((state) => state.currentPreview)
  return currentPreview
}
