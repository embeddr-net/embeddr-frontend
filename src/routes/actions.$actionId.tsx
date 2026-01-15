import { createFileRoute } from '@tanstack/react-router'
import { ActionGraphEditor } from '@/pages/ActionGraphEditorPage'

export const Route = createFileRoute('/actions/$actionId')({
  component: ActionGraphDetails,
})

function ActionGraphDetails() {
  const { actionId } = Route.useParams()
  return <ActionGraphEditor artifactId={actionId} />
}
