import { useNavigate } from '@tanstack/react-router'
import { Card } from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Separator } from '@embeddr/react-ui/components/separator'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Zap, Workflow } from 'lucide-react'

export function AutomationSettings() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Pipelines</div>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Ingestion defaults
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pipelines are ordered action chains that run on ingest or other
          events. Use this page to configure the default ingestion pipeline.
        </p>
        <div>
          <Button size="sm" onClick={() => navigate({ to: '/pipelines' })}>
            Open pipelines
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <div className="text-sm font-medium">Workflows</div>
        </div>
        <p className="text-sm text-muted-foreground">
          Workflows are graph definitions that can be executed directly or used
          by actions. Manage workflow artifacts and run them here.
        </p>
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: '/workflows' })}
          >
            Open workflows
          </Button>
        </div>
      </Card>

      <Separator />

      <Card className="p-4 space-y-2 border-dashed">
        <div className="text-sm font-medium">Streamlining in progress</div>
        <p className="text-sm text-muted-foreground">
          We are consolidating ingestion, pipelines, and workflows. This hub
          avoids mixing legacy ingestion settings with the new pipeline/workflow
          model while we refactor the backend APIs.
        </p>
      </Card>
    </div>
  )
}
