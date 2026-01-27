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
import { Textarea } from '@embeddr/react-ui/components/textarea'

export function LotusDefaultsTab({
  blobProviders,
  blobResolvers,
  providerResolvers,
  defaultBlobProvider,
  setDefaultBlobProvider,
  defaultBlobResolver,
  setDefaultBlobResolver,
  saveBlobDefaultsPending,
  onSaveBlobDefaults,
  automationTotal,
  automationActive,
  ingestionWorkflowId,
  setIngestionWorkflowId,
  workflowOptions,
  defaultWorkflowIdsText,
  setDefaultWorkflowIdsText,
  saveWorkflowRegistryPending,
  onSaveWorkflowRegistry,
  textProvider,
  setTextProvider,
  similarProvider,
  setSimilarProvider,
  searchProviders,
  saveRoutingPending,
  onSaveRouting,
}: {
  blobProviders: string[]
  blobResolvers: string[]
  providerResolvers: Record<string, string>
  defaultBlobProvider: string
  setDefaultBlobProvider: (value: string) => void
  defaultBlobResolver: string
  setDefaultBlobResolver: (value: string) => void
  saveBlobDefaultsPending: boolean
  onSaveBlobDefaults: () => void
  automationTotal: number
  automationActive: number
  ingestionWorkflowId: string
  setIngestionWorkflowId: (value: string) => void
  workflowOptions: Array<{ id: string; name: string }>
  defaultWorkflowIdsText: string
  setDefaultWorkflowIdsText: (value: string) => void
  saveWorkflowRegistryPending: boolean
  onSaveWorkflowRegistry: () => void
  textProvider: string
  setTextProvider: (value: string) => void
  similarProvider: string
  setSimilarProvider: (value: string) => void
  searchProviders: Array<{ id: string; title: string }>
  saveRoutingPending: boolean
  onSaveRouting: () => void
}) {
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
                value={defaultBlobProvider}
                onValueChange={setDefaultBlobProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
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
                Default resolver
              </span>
              <Select
                value={defaultBlobResolver}
                onValueChange={setDefaultBlobResolver}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resolver" />
                </SelectTrigger>
                <SelectContent>
                  {blobResolvers.map((resolver) => (
                    <SelectItem key={resolver} value={resolver}>
                      {resolver}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Ingestion workflow artifact
            </span>
            <Select
              value={ingestionWorkflowId}
              onValueChange={setIngestionWorkflowId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflowOptions.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-muted-foreground">
              Default workflow ids (JSON array)
            </span>
            <Textarea
              value={defaultWorkflowIdsText}
              onChange={(event) =>
                setDefaultWorkflowIdsText(event.target.value)
              }
              className="min-h-24 font-mono text-[11px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onSaveWorkflowRegistry}
              disabled={saveWorkflowRegistryPending}
            >
              Save Defaults
            </Button>
            {saveWorkflowRegistryPending && (
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
