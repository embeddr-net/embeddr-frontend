import { createFileRoute } from '@tanstack/react-router'
import ComingSoonPage from '@/pages/ComingSoonPage'
import CreatePage from '@/pages/CreatePage'

export const Route = createFileRoute('/create')({
  component: CreatePage,
})
