import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@embeddr/react-ui/ui'
import { Card } from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { Separator } from '@embeddr/react-ui/ui'
import { embeddrApi } from '@/lib/api/client'
import type {
  AutomationListResponse,
  IngestionPipelineConfig,
  LotusCapability,
} from '@/lib/api/types'

interface OnboardingWizardProps {
  onComplete?: () => void
  onOpenSettingsTab: (tab: string) => void
}

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
  const queryClient = useQueryClient()
  const [defaultsResult, setDefaultsResult] = useState<
    'idle' | 'success' | 'error'
  >('idle')

  const { data: capsData } = useQuery({
    queryKey: ['lotus', 'capabilities', 'onboarding'],
    queryFn: () => embeddrApi.lotus.list({ limit: 500 }),
    staleTime: 30_000,
  })

  const { data: pipelineConfig } = useQuery<IngestionPipelineConfig>({
    queryKey: ['system', 'ingestion', 'pipeline'],
    queryFn: () => embeddrApi.system.getIngestionPipeline(),
    staleTime: 30_000,
  })

  const { data: automationsData } = useQuery<AutomationListResponse>({
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

  const activePipeline = useMemo(() => {
    const pipelineId = pipelineConfig?.pipeline_id
    if (!pipelineId) return null
    return (
      automationsData?.items?.find((item) => item.id === pipelineId) || null
    )
  }, [pipelineConfig, automationsData])

  const defaultsReady = Boolean(activePipeline) && missingCaps.length === 0

  const applyDefaults = useMutation({
    mutationFn: () => embeddrApi.system.applyIngestionDefaults(),
    onSuccess: async () => {
      setDefaultsResult('success')
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['system', 'ingestion', 'pipeline'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['system', 'automation', 'list'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['lotus', 'capabilities', 'onboarding'],
        }),
      ])
    },
    onError: () => {
      setDefaultsResult('error')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={defaultsReady ? 'default' : 'secondary'}>
          {defaultsReady ? 'Ready to ingest' : 'Needs defaults'}
        </Badge>
        {activePipeline ? (
          <Badge variant="outline">Pipeline: {activePipeline.name}</Badge>
        ) : (
          <Badge variant="outline">Pipeline: not configured</Badge>
        )}
        {missingCaps.length === 0 ? (
          <Badge variant="outline">Core capabilities available</Badge>
        ) : (
          <Badge variant="secondary">
            Missing {missingCaps.map((cap) => cap.label).join(', ')}
          </Badge>
        )}
      </div>

      <Separator />

      <Card className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Quick start</h3>
          <p className="text-sm text-muted-foreground">
            Start with defaults, ingest content, and customize later.
          </p>
        </div>

        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">
                1) Workspace and sources
              </div>
              <div className="text-xs text-muted-foreground">
                Use Lotus to review workspace state, then add a folder to scan.
              </div>
            </div>
            <Badge variant="outline">Beginner</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/lotus' })}
            >
              Open Lotus
            </Button>
            <Button onClick={() => onOpenSettingsTab('library')}>
              Add directory
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">2) Apply sane defaults</div>
              <div className="text-xs text-muted-foreground">
                Automatically configures ingestion defaults for thumbnails and
                embeddings when available.
              </div>
            </div>
            <Badge variant={defaultsReady ? 'default' : 'secondary'}>
              {defaultsReady ? 'Configured' : 'Recommended'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => applyDefaults.mutate()}
              disabled={applyDefaults.isPending}
            >
              {applyDefaults.isPending
                ? 'Applying defaults...'
                : 'Apply defaults'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/pipelines' })}
            >
              Open pipeline composer
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenSettingsTab('automation')}
            >
              Advanced automation
            </Button>
          </div>
          {(defaultsResult === 'success' || defaultsResult === 'error') && (
            <div
              className={
                defaultsResult === 'success'
                  ? 'text-xs text-emerald-600 dark:text-emerald-400'
                  : 'text-xs text-destructive'
              }
            >
              {defaultsResult === 'success'
                ? 'Defaults applied. You can start ingesting now.'
                : 'Could not apply defaults automatically. Use pipeline composer or automation settings.'}
            </div>
          )}
          {ingestActions.length > 0 && (
            <div className="text-[11px] text-muted-foreground">
              Available ingest actions:{' '}
              {ingestActions.map((cap) => cap.title || cap.id).join(', ')}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">3) Start exploring</div>
              <div className="text-xs text-muted-foreground">
                Ingest a few files, then use search and similarity.
              </div>
            </div>
            <Badge variant="outline">Ready</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenSettingsTab('upload')}
            >
              Upload files
            </Button>
            <Button onClick={() => navigate({ to: '/search' })}>
              Open search
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => onComplete?.()}>
          Skip for now
        </Button>
        <Button onClick={() => onComplete?.()}>Finish onboarding</Button>
      </div>
    </div>
  )
}
