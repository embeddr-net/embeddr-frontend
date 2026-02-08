import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'

export function LotusDefaultsTab({
  blobProviders,
  providerResolvers,
  defaultBlobProvider,
  setDefaultBlobProvider,
  defaultBlobResolver,
  setDefaultBlobResolver,
  saveBlobDefaultsPending,
  onSaveBlobDefaults,
  automationTotal,
  automationActive,
  ingestionPipelineId,
  setIngestionPipelineId,
  pipelineOptions,
  saveIngestionPipelinePending,
  onSaveIngestionPipeline,
  textProvider,
  setTextProvider,
  similarProvider,
  setSimilarProvider,
  searchProviders,
  saveRoutingPending,
  onSaveRouting,
}: {
  blobProviders: string[]
  providerResolvers: Record<string, string>
  defaultBlobProvider: string
  setDefaultBlobProvider: (value: string) => void
  defaultBlobResolver: string
  setDefaultBlobResolver: (value: string) => void
  saveBlobDefaultsPending: boolean
  onSaveBlobDefaults: () => void
  automationTotal: number
  automationActive: number
  ingestionPipelineId: string
  setIngestionPipelineId: (value: string) => void
  pipelineOptions: Array<{ id: string; name: string }>
  saveIngestionPipelinePending: boolean
  onSaveIngestionPipeline: () => void
  textProvider: string
  setTextProvider: (value: string) => void
  similarProvider: string
  setSimilarProvider: (value: string) => void
  searchProviders: Array<{ id: string; title: string }>
  saveRoutingPending: boolean
  onSaveRouting: () => void
}) {
  const providerValue = defaultBlobProvider || '__unset__'
  const resolvedResolver = defaultBlobProvider
    ? providerResolvers[defaultBlobProvider]
    : defaultBlobResolver

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-muted/60 bg-transparent">
        <CardHeader>
          <CardTitle className="text-sm">Blob Routing Defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-xs">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">
                Default upload provider
              </span>
              <Select
                value={providerValue}
                onValueChange={(value) => {
                  const next = value === '__unset__' ? '' : value
                  setDefaultBlobProvider(next)
                  setDefaultBlobResolver(providerResolvers[next] || '')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">Not set</SelectItem>
                  {blobProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {defaultBlobProvider &&
                providerResolvers[defaultBlobProvider] && (
                  <span className="text-[10px] text-muted-foreground">
                    resolver: {providerResolvers[defaultBlobProvider]}
                  </span>
                )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">
                Resolver (auto)
              </span>
              <div className="rounded border border-muted/60 bg-muted/20 px-2 py-1 text-[11px]">
                {resolvedResolver || 'Auto-resolved by provider'}
              </div>
              <span className="text-[10px] text-muted-foreground">
                Resolvers are inferred from the selected provider; no manual
                default needed.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onSaveBlobDefaults}
              disabled={saveBlobDefaultsPending}
            >
              Save Blob Defaults
            </Button>
            {saveBlobDefaultsPending && (
              <span className="text-[11px] text-muted-foreground">
                Saving...
              </span>
            )}
          </div>
          {blobProviders.length === 0 && (
            <div className="text-[11px] text-muted-foreground">
              No blob providers registered yet. Add a storage plugin to expose
              providers here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted/60 bg-transparent">
        <CardHeader>
          <CardTitle className="text-sm">Ingestion Defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">automations: {automationTotal}</Badge>
            <Badge variant="secondary">active: {automationActive}</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-muted-foreground">
              Ingestion pipeline automation
            </span>
            <Select
              value={ingestionPipelineId}
              onValueChange={setIngestionPipelineId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelineOptions.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onSaveIngestionPipeline}
              disabled={saveIngestionPipelinePending}
            >
              Save Pipeline
            </Button>
            {saveIngestionPipelinePending && (
              <span className="text-[11px] text-muted-foreground">
                Saving...
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/60 bg-transparent">
        <CardHeader>
          <CardTitle className="text-sm">Search Routing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-xs">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">
                Text search provider
              </span>
              <Select value={textProvider} onValueChange={setTextProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {searchProviders.map((cap) => (
                    <SelectItem key={cap.id} value={cap.id}>
                      {cap.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">
                Similarity provider
              </span>
              <Select
                value={similarProvider}
                onValueChange={setSimilarProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {searchProviders.map((cap) => (
                    <SelectItem key={cap.id} value={cap.id}>
                      {cap.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={onSaveRouting} disabled={saveRoutingPending}>
              Save Routing
            </Button>
            {saveRoutingPending && (
              <span className="text-[11px] text-muted-foreground">
                Saving...
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
