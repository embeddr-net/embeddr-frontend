import { createFileRoute } from '@tanstack/react-router'
import PipelineGraphPage from '@/pages/PipelineGraphPage'

export const Route = createFileRoute('/pipelines/$pipelineId')({
  component: () => {
    const { pipelineId } = Route.useParams()
    return <PipelineGraphPage pipelineId={pipelineId} />
  },
})
