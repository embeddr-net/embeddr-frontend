import { createFileRoute } from '@tanstack/react-router'
import { PipelineComposer } from '@/features/pipelines/PipelineComposer'

const PipelinesIndexPage = () => {
  return (
    <div className="flex h-full min-h-0 flex-col p-2">
      <PipelineComposer />
    </div>
  )
}

export const Route = createFileRoute('/pipelines/')({
  component: PipelinesIndexPage,
})
