import WorkflowArtifactsPage from '@/pages/WorkflowArtifactsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workflows')({
  component: WorkflowArtifactsPage,
})
