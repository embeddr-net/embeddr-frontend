import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@embeddr/react-ui/components/button'
import { Card } from '@embeddr/react-ui/components/card'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Separator } from '@embeddr/react-ui/components/separator'
import { embeddrApi } from '@/lib/api/client'
import type { LotusCapability } from '@/lib/api/v2/types'

interface OnboardingWizardProps {
  onComplete?: () => void
  onOpenSettingsTab: (tab: string) => void
}

const steps = [
  {
    id: 'pipeline-check',
    title: 'Check system readiness',
    description:
      'Choose an ingestion pipeline and verify the system can run it before scanning folders.',
  },
  {
    id: 'add-directory',
    title: 'Add a directory to scan',
    description:
      'Point Embeddr at a local folder so it can index your files automatically.',
  },
  {
    id: 'automation',
    title: 'Pipelines & Automation',
    description:
      'Embeddr uses workflows to process your content. The default pipeline generates thumbnails and embeddings automatically.',
  },
  {
    id: 'search',
    title: 'Try search',
    description:
      'Search your library by text or similarity once items are ingested.',
  },
]

const REQUIRED_CAPS = [
  {
    key: 'preview.thumbnail',
    label: 'Thumbnail generator',
    match: (cap: LotusCapability) => cap.slot === 'preview.thumbnail',
  },
  {
    key: 'feature.generator',
    label: 'Embedding generator',
    match: (cap: LotusCapability) => cap.slot === 'feature.generator',
  },
]

export function OnboardingWizard({
  onComplete,
  onOpenSettingsTab,
}: OnboardingWizardProps) {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)

  const { data: capsData } = useQuery({
    queryKey: ['lotus', 'capabilities', 'onboarding'],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  })

  const { data: automationStatus } = useQuery({
    queryKey: ['system', 'automation', 'status'],
    queryFn: () => embeddrApi.system.getAutomationStatus(),
    staleTime: 30_000,
  })

  const { data: pipelineConfig } = useQuery({
    queryKey: ['system', 'ingestion', 'pipeline'],
    queryFn: () => embeddrApi.system.getIngestionPipeline(),
    staleTime: 30_000,
  })

  const { data: automationsData } = useQuery({
    queryKey: ['system', 'automation', 'list'],
    queryFn: () => embeddrApi.system.listAutomations(),
    staleTime: 30_000,
  })

  const missingCaps = useMemo(() => {
    const caps = (capsData?.items || []) as LotusCapability[]
    return REQUIRED_CAPS.filter(
      (required) => !caps.some((cap) => required.match(cap)),
    )
  }, [capsData])

  const ingestActions = useMemo(() => {
    const caps = (capsData?.items || []) as LotusCapability[]
    return caps.filter((cap) => {
      if (cap.kind !== 'action' || !(cap.tags || []).includes('ingest')) {
        return false
      }
      const inputSchema = (cap.data as any)?.input?.schema || {}
      const props = inputSchema?.properties || {}
      const supportsArtifacts =
        'artifact_id' in props || 'artifact_ids' in props
      if (!supportsArtifacts) return false
      const title = String(cap.title || cap.id || '').toLowerCase()
      if (title.includes('backfill')) return false
      return true
    })
  }, [capsData])

  const missingAutomation =
    (automationStatus?.total ?? 0) === 0 ||
    (automationStatus?.active ?? 0) === 0

  const activePipeline = useMemo(() => {
    const pipelineId = pipelineConfig?.pipeline_id
    if (!pipelineId) return null
    return (
      automationsData?.items?.find((item) => item.id === pipelineId) || null
    )
  }, [pipelineConfig, automationsData])

  const activeStep = useMemo(() => steps[stepIndex], [stepIndex])

  useEffect(() => {
    if (!onComplete) return
    if (stepIndex < 0) setStepIndex(0)
  }, [onComplete, stepIndex])

  const handleSkip = () => {
    onComplete?.()
  }

  const handleNext = () => {
    if (stepIndex >= steps.length - 1) {
      onComplete?.()
      return
    }
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <Badge
            key={step.id}
            variant={index === stepIndex ? 'default' : 'secondary'}
          >
            {index + 1}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      <Separator />

      <Card className="p-4 space-y-2">
        <h3 className="text-lg font-semibold">{activeStep.title}</h3>
        <p className="text-sm text-muted-foreground">
          {activeStep.description}
        </p>

        {activeStep.id === 'pipeline-check' && (
          <div className="pt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={missingAutomation ? 'secondary' : 'default'}>
                Automations: {automationStatus?.active ?? 0} active
              </Badge>
              <Badge variant={activePipeline ? 'default' : 'secondary'}>
                Ingest pipeline: {activePipeline?.name || 'Not set'}
              </Badge>
              {missingCaps.length === 0 ? (
                <Badge variant="default">Capabilities: ready</Badge>
              ) : (
                missingCaps.map((cap) => (
                  <Badge key={cap.key} variant="secondary">
                    Missing {cap.label}
                  </Badge>
                ))
              )}
            </div>

            {activePipeline ? (
              <div>
                <div className="text-xs text-muted-foreground">
                  Suggested ingest actions
                </div>
                <div className="text-[11px] text-muted-foreground">
                  These are capabilities tagged for ingest. You choose which
                  ones to add to your pipeline.
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ingestActions.length === 0 ? (
                    <Badge variant="secondary">No ingest actions found</Badge>
                  ) : (
                    ingestActions.map((cap) => (
                      <Badge key={cap.id} variant="outline">
                        {cap.title || cap.id}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                Pick or create an ingestion pipeline in the composer to see
                suggested actions.
              </div>
            )}

            <div>
              <div className="text-xs text-muted-foreground">
                Active automations
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(automationsData?.items || []).length === 0 ? (
                  <Badge variant="secondary">No automations configured</Badge>
                ) : (
                  automationsData?.items
                    ?.filter((rule) => rule.is_active)
                    .map((rule) => (
                      <Badge key={rule.id} variant="outline">
                        {rule.name}
                      </Badge>
                    ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onOpenSettingsTab('automation')}>
                Configure automation
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/lotus' })}
              >
                Open Lotus dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/pipelines' })}
              >
                Open pipeline composer
              </Button>
            </div>
          </div>
        )}

        {activeStep.id === 'add-directory' && (
          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onOpenSettingsTab('library')
              }}
            >
              Add directory
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenSettingsTab('upload')}
            >
              Upload a few files instead
            </Button>
          </div>
        )}

        {activeStep.id === 'automation' && (
          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onOpenSettingsTab('automation')
              }}
            >
              Open automation settings
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/lotus' })}
            >
              View pipeline executions
            </Button>
          </div>
        )}

        {activeStep.id === 'search' && (
          <div className="pt-2 flex flex-wrap gap-2">
            <Button onClick={() => navigate({ to: '/search' })}>
              Open search
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/lotus' })}
            >
              Explore Lotus workflows
            </Button>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleSkip}>
          Skip for now
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            Back
          </Button>
          <Button onClick={handleNext}>
            {stepIndex >= steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
