import FeaturesPage from '@/pages/FeaturesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/features')({
  component: FeaturesPage,
})
