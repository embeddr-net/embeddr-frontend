import { createFileRoute } from '@tanstack/react-router'
import ComingSoonPage from '@/pages/ComingSoonPage'
import ZenPage from '@/pages/ZenPage'

export const Route = createFileRoute('/')({
  component: ZenPage,
})
