import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@embeddr/react-ui/components/card'

function DatasetsPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Card className="border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
        Datasets view is under construction.
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/datasets')({
  component: DatasetsPlaceholder,
})
