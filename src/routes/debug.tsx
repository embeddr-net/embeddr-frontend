import DebugPage from '@/pages/DebugPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/debug')({
  component: DebugPage,
})
