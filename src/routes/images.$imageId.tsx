import { createFileRoute } from '@tanstack/react-router'
import ImagePage from '@/pages/ImagePage'

export const Route = createFileRoute('/images/$imageId')({
  component: ImagePage,
})
