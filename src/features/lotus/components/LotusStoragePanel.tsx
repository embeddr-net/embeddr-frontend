import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { Input } from '@embeddr/react-ui/components/input'
import { Switch } from '@embeddr/react-ui/components/switch'
import { toast } from 'sonner'
import type { ResourceAdapterInfo } from '@/lib/api/client'
import { embeddrApi } from '@/lib/api/client'
import { useEmbeddrAPI } from '@/plugins/store'
import type { LotusResultItem } from '../types'

type ResourceAdaptersResponse = {
  adapters: ResourceAdapterInfo[]
}

type LotusStoragePanelProps = {
  blobProviders: string[]
  blobResolvers: string[]
  providerResolvers: Record<string, string>
  defaultBlobProvider: string
  defaultBlobResolver: string
  storageCapabilities: LotusResultItem[]
}

export function LotusStoragePanel({
  blobProviders,
  blobResolvers,
  providerResolvers,
  defaultBlobProvider,
  defaultBlobResolver,
  storageCapabilities,
}: LotusStoragePanelProps) {
  const api = useEmbeddrAPI()

  const resourceAdaptersQuery = useQuery({
    queryKey: ['resources', 'adapters'],
    queryFn: () => embeddrApi.resources.listAdapters(),
  })

  const resourceAdapters = useMemo(() => {
    const data = resourceAdaptersQuery.data as
      | ResourceAdaptersResponse
      | undefined
    return data?.adapters || []
  }, [resourceAdaptersQuery.data])

  const [resourceUrl, setResourceUrl] = useState('')
  const [resourceHintType, setResourceHintType] = useState('')
  const [resourceAdapterId, setResourceAdapterId] = useState('')
  const resourceAdapterAutoValue = '__auto__'
  const [resourceResolveResult, setResourceResolveResult] = useState<Record<
    string,
    any
  > | null>(null)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadConfirm, setUploadConfirm] = useState(false)
  const [uploadResult, setUploadResult] = useState<Record<string, any> | null>(
    null,
  )
  const [uploadProvider, setUploadProvider] = useState('')
  const uploadProviderAutoValue = '__default__'

  useEffect(() => {
    if (uploadProvider) return
    if (defaultBlobProvider) {
      setUploadProvider(defaultBlobProvider)
    }
  }, [defaultBlobProvider, uploadProvider])

  const resolveResourceMutation = useMutation({
    mutationFn: async () => {
      return embeddrApi.resources.resolve({
        url: resourceUrl || undefined,
        hint_type: resourceHintType || undefined,
        adapter_id: resourceAdapterId || undefined,
      })
    },
    onSuccess: (data) => {
      setResourceResolveResult(data || null)
      toast.success('Resource resolved')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to resolve resource')
    },
  })

  const uploadTestMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) {
        throw new Error('File is required')
      }
      if (!uploadConfirm) {
        throw new Error('Confirmation required')
      }

      const artifact = await embeddrApi.artifacts.create({
        type_name: 'image',
        base_type_name: 'artifact',
        metadata_json: { name: uploadFile.name },
      })

      const init = await api.lotus.invoke('embeddr-core.artifact.upload.init', {
        artifact_id: artifact.id,
        filename: uploadFile.name,
        content_type: uploadFile.type || undefined,
        size: uploadFile.size,
        storage_backend: uploadProvider || undefined,
        confirm: true,
      })

      const uploadId = init?.upload_id as string | undefined
      if (!uploadId) {
        throw new Error('Upload init failed')
      }

      const uploaded = await embeddrApi.artifacts.uploadFile(
        uploadId,
        uploadFile,
      )

      const complete = await api.lotus.invoke(
        'embeddr-core.artifact.upload.complete',
        {
          upload_id: uploadId,
          confirm: true,
        },
      )

      return { artifact, init, uploaded, complete }
    },
    onSuccess: (data) => {
      setUploadResult(data || null)
      toast.success('Upload test completed')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to upload')
    },
  })

  const storageConfigCaps = useMemo(() => {
    return storageCapabilities
  }, [storageCapabilities])

  return (
    <div className="">
      <div className="flex flex-col gap-4">
        <Card className="border-muted/60 bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm">Storage Capabilities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs">
            <div className="text-[11px] text-muted-foreground">
              Lotus-discovered storage configuration and actions.
            </div>
            {storageConfigCaps.length === 0 ? (
              <div className="text-[11px] text-muted-foreground">
                No storage capabilities found.
              </div>
            ) : (
              <div className="space-y-2">
                {storageConfigCaps.map((cap) => (
                  <div
                    key={cap.id}
                    className="rounded border border-muted/60 bg-muted/20 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cap.title || cap.id}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {cap.kind}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {cap.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm">Upload Test</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs">
            <div className="text-[11px] text-muted-foreground">
              Destructive: uploads bytes and writes to the database.
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">File</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setUploadFile(event.target.files?.[0] ?? null)
                }
                className="text-[11px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">
                Upload provider (optional)
              </span>
              <Select
                value={uploadProvider || uploadProviderAutoValue}
                onValueChange={(value) =>
                  setUploadProvider(
                    value === uploadProviderAutoValue ? '' : value,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={uploadProviderAutoValue}>
                    Default ({defaultBlobProvider || 'unset'})
                  </SelectItem>
                  {blobProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={uploadConfirm}
                onCheckedChange={setUploadConfirm}
              />
              <span className="text-[11px] text-muted-foreground">
                I understand this writes to the database.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => uploadTestMutation.mutate()}
                disabled={
                  !uploadFile || !uploadConfirm || uploadTestMutation.isPending
                }
              >
                Upload to Selected Provider
              </Button>
              <Button variant="ghost" onClick={() => setUploadResult(null)}>
                Clear
              </Button>
            </div>
            {uploadResult && (
              <pre className="rounded bg-muted/40 p-2 text-[10px] whitespace-pre-wrap break-all">
                {JSON.stringify(uploadResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm">Blob Registry</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded border border-muted/60 bg-muted/20 p-2">
                <div className="text-[10px] text-muted-foreground">
                  Default upload provider
                </div>
                <div className="text-[11px] font-medium">
                  {defaultBlobProvider || 'unset'}
                </div>
                {defaultBlobProvider &&
                  providerResolvers[defaultBlobProvider] && (
                    <div className="text-[10px] text-muted-foreground">
                      resolver: {providerResolvers[defaultBlobProvider]}
                    </div>
                  )}
              </div>
              <div className="rounded border border-muted/60 bg-muted/20 p-2">
                <div className="text-[10px] text-muted-foreground">
                  Default resolver
                </div>
                <div className="text-[11px] font-medium">
                  {defaultBlobResolver || 'unset'}
                </div>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded border border-muted/60 bg-muted/20 p-2">
                <div className="text-[10px] text-muted-foreground">
                  Providers ({blobProviders.length})
                </div>
                <div className="text-[11px]">
                  {blobProviders.length ? blobProviders.join(', ') : 'none'}
                </div>
              </div>
              <div className="rounded border border-muted/60 bg-muted/20 p-2">
                <div className="text-[10px] text-muted-foreground">
                  Resolvers ({blobResolvers.length})
                </div>
                <div className="text-[11px]">
                  {blobResolvers.length ? blobResolvers.join(', ') : 'none'}
                </div>
              </div>
            </div>
            <div className="rounded border border-muted/60 bg-muted/20 p-2">
              <div className="text-[10px] text-muted-foreground">
                Provider → Resolver mapping
              </div>
              {Object.keys(providerResolvers).length ? (
                <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-muted/40 p-2 text-[10px]">
                  {JSON.stringify(providerResolvers, null, 2)}
                </pre>
              ) : (
                <div className="text-[11px]">none</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm">Resource Adapters</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            {resourceAdapters.length === 0 ? (
              <div className="text-muted-foreground">
                No resource adapters registered.
              </div>
            ) : (
              <div className="space-y-2">
                {resourceAdapters.map((adapter) => (
                  <div
                    key={adapter.id}
                    className="rounded border border-muted/60 bg-muted/20 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {adapter.title || adapter.id}
                      </span>
                      {adapter.plugin && (
                        <Badge variant="outline" className="text-[10px]">
                          {adapter.plugin}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {adapter.id}
                    </div>
                    {adapter.adapter?.match && (
                      <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-muted/40 p-2 text-[10px]">
                        {JSON.stringify(adapter.adapter.match, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60 bg-transparent">
          <CardHeader>
            <CardTitle className="text-sm">Resource Resolver Test</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">
                Resource URL
              </span>
              <Input
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Adapter (optional)
                </span>
                <Select
                  value={resourceAdapterId || resourceAdapterAutoValue}
                  onValueChange={(value) =>
                    setResourceAdapterId(
                      value === resourceAdapterAutoValue ? '' : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={resourceAdapterAutoValue}>
                      Auto
                    </SelectItem>
                    {resourceAdapters.map((adapter) => (
                      <SelectItem key={adapter.id} value={adapter.id}>
                        {adapter.title || adapter.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Hint type (optional)
                </span>
                <Input
                  value={resourceHintType}
                  onChange={(e) => setResourceHintType(e.target.value)}
                  placeholder="image | video | web"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => resolveResourceMutation.mutate()}
                disabled={!resourceUrl || resolveResourceMutation.isPending}
              >
                Resolve
              </Button>
              <Button
                variant="ghost"
                onClick={() => setResourceResolveResult(null)}
              >
                Clear
              </Button>
            </div>
            {resourceResolveResult && (
              <pre className="rounded bg-muted/40 p-2 text-[10px] whitespace-pre-wrap break-all">
                {JSON.stringify(resourceResolveResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
