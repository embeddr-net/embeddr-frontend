import { createFileRoute } from '@tanstack/react-router'
import ComfyManagerPage from '@/pages/ComfyManagerPage'

export const Route = createFileRoute('/comfy')({
  component: ComfyManagerPage,
})
