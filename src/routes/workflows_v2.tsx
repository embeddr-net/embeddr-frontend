import WorkflowArtifactsPage from '@/pages/WorkflowArtifactsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workflows_v2')({
  component: WorkflowArtifactsPage,
})
