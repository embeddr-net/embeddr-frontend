import { createFileRoute } from '@tanstack/react-router'
import DatasetPage from '@/pages/DatasetPage'

export const Route = createFileRoute('/datasets')({
  component: DatasetPage,
})
