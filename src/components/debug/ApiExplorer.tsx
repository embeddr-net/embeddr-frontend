import React, { useState, useEffect, useMemo } from 'react'
import { Badge, Button, ScrollArea } from '@embeddr/react-ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/ui'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import {
  RefreshCcw,
  Search,
  Database,
  Loader2,
  Microscope,
  Hash,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { Input } from '@embeddr/react-ui/ui'
import { useQuery } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import type { Artifact, PaginatedResponse } from '@/lib/api/types'
import { useArtifact } from '@/hooks/useArtifact'
import { Separator } from '@embeddr/react-ui/ui'
import { useDebounce } from '@/hooks/use-debounce'

export const ApiExplorer = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [storageFilter, setStorageFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const [pluginFilter, setPluginFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  // Debounce search
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    setPage(0)
  }, [
    debouncedSearchTerm,
    typeFilter,
    storageFilter,
    originFilter,
    pluginFilter,
  ])

  const {
    data: artifactsData,
    isLoading: isLoadingList,
    refetch,
  } = useQuery<PaginatedResponse<Artifact>>({
    queryKey: [
      'artifacts',
      'artifacts',
      page,
      pageSize,
      debouncedSearchTerm,
      typeFilter,
    ],
    queryFn: async (): Promise<PaginatedResponse<Artifact>> => {
      if (debouncedSearchTerm) {
        return (await embeddrApi.artifacts.search(
          debouncedSearchTerm,
          pageSize,
          page * pageSize,
          typeFilter === 'all' ? undefined : typeFilter,
        )) as PaginatedResponse<Artifact>
      }
      return (await embeddrApi.artifacts.list({
        limit: pageSize,
        offset: page * pageSize,
        type_name: typeFilter === 'all' ? undefined : typeFilter,
      })) as PaginatedResponse<Artifact>
    },
    placeholderData: (previousData) => previousData,
  })

  // Pagination info
  const artifacts = artifactsData?.items || []
  const totalItems = artifactsData?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  const handlePrevPage = () => setPage((p) => Math.max(0, p - 1))
  const handleNextPage = () => setPage((p) => (p < totalPages - 1 ? p + 1 : p))

  // Unified hook for selected artifact
  const artifactQuery = useArtifact(selectedId)
  const {
    details,
    embeddings,
    annotations,
    lineage,
    relations,
    contentUrl,
    capabilities,
    isLoading: isLoadingArtifactData,
  } = artifactQuery

  const isLoading = isLoadingList

  const getStorageKind = (uri?: string) => {
    if (!uri) return 'unknown'
    if (uri.startsWith('s3://')) return 's3'
    if (uri.startsWith('http')) return 'http'
    if (uri.startsWith('file://')) return 'file'
    if (uri.startsWith('internal://')) return 'internal'
    if (uri.startsWith('virtual://')) return 'virtual'
    if (uri.startsWith('/')) return 'filesystem'
    return 'custom'
  }

  const getOriginKind = (uri?: string) => {
    if (!uri) return 'unknown'
    if (uri.startsWith('http') || uri.startsWith('s3://')) return 'external'
    if (uri.startsWith('virtual://')) return 'virtual'
    if (uri.startsWith('internal://')) return 'managed'
    if (uri.startsWith('file://') || uri.startsWith('/')) return 'managed'
    return 'custom'
  }

  const getArtifactPlugin = (item: any) => {
    return (
      item?.metadata_json?.plugin_name ||
      item?.metadata_json?.plugin ||
      item?.metadata_json?.source_plugin ||
      item?.metadata_json?.ingest_plugin ||
      'unknown'
    )
  }

  const storageOptions = useMemo(() => {
    const items = new Set<string>(['all'])
    artifacts.forEach((a: Artifact) => items.add(getStorageKind(a.uri)))
    return Array.from(items)
  }, [artifacts])

  const originOptions = useMemo(() => {
    return ['all', 'managed', 'external', 'virtual', 'custom', 'unknown']
  }, [])

  const pluginOptions = useMemo(() => {
    const items = new Set<string>(['all'])
    artifacts.forEach((a: Artifact) => items.add(getArtifactPlugin(a)))
    return Array.from(items)
  }, [artifacts])

  const filteredArtifacts = artifacts.filter((a: Artifact) => {
    const storageKind = getStorageKind(a.uri)
    const originKind = getOriginKind(a.uri)
    const pluginName = getArtifactPlugin(a)

    if (storageFilter !== 'all' && storageKind !== storageFilter) return false
    if (originFilter !== 'all' && originKind !== originFilter) return false
    if (pluginFilter !== 'all' && pluginName !== pluginFilter) return false
    return true
  })

  // Hardcoded types/common types
  const docTypes = [
    'image',
    'text',
    'video',
    'audio',
    'collection',
    'document',
  ].sort()

  const featureCount = (embeddings?.length || 0) + (annotations?.length || 0)

  const storageLabel = getStorageKind(details?.uri)

  const blobRegistryQuery = useQuery({
    queryKey: ['system', 'blob-registry', 'features-explorer'],
    queryFn: () => embeddrApi.system.getBlobRegistry(),
  })

  const resourceAdaptersQuery = useQuery({
    queryKey: ['resources', 'adapters', 'features-explorer'],
    queryFn: () => embeddrApi.resources.listAdapters(),
  })

  return (
    <div className="flex w-full h-full border min-h-0 rounded">
      <div className="w-1/3 border-r bg-muted/10 flex flex-col min-h-0">
        <div className="p-2 border-b bg-muted/20 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Artifacts ({totalItems})
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handlePrevPage}
                disabled={page === 0 || isLoadingList}
                title="Previous Page"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-[10px] text-muted-foreground w-12 text-center">
                {page + 1}/{totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleNextPage}
                disabled={page >= totalPages - 1 || isLoadingList}
                title="Next Page"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => refetch()}
                title="Refresh"
              >
                <RefreshCcw className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search artifacts..."
                className="h-7 text-xs pl-7 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-25 h-7 text-[10px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {docTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={storageFilter} onValueChange={setStorageFilter}>
              <SelectTrigger className="w-27.5 h-7 text-[10px]">
                <SelectValue placeholder="Storage" />
              </SelectTrigger>
              <SelectContent>
                {storageOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="w-30 h-7 text-[10px]">
                <SelectValue placeholder="Origin" />
              </SelectTrigger>
              <SelectContent>
                {originOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pluginFilter} onValueChange={setPluginFilter}>
              <SelectTrigger className="w-40 h-7 text-[10px]">
                <SelectValue placeholder="Plugin" />
              </SelectTrigger>
              <SelectContent>
                {pluginOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ScrollArea
            className="h-full w-full pr-2"
            variant="left-border"
            type="always"
          >
            <div className="flex flex-col">
              {isLoading && <div className="p-4 text-xs">Loading...</div>}
              {filteredArtifacts?.map((a: Artifact) => {
                const isImage =
                  a.type_name === 'image' || a.base_type_name === 'image'
                const previewUrl = embeddrApi.artifacts.getPreviewUrl(
                  a.id,
                  'thumbnail',
                )

                return (
                  <div
                    key={a.id}
                    className={`p-2 text-xs border-b cursor-pointer hover:bg-muted/50 flex gap-2 transition-colors  ${
                      selectedId === a.id
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'border-l-2 border-l-transparent'
                    }`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden border shrink-0">
                      {isImage ? (
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
                          {a.type_name}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate flex-1">
                          {a.base_type_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px]">
                            {getStorageKind(a.uri)}
                          </Badge>
                          <span className="font-mono text-[9px] text-muted-foreground opacity-50 ml-1">
                            {a.id.substring(0, 6)}
                          </span>
                        </div>
                      </div>
                      <div className="truncate text-muted-foreground text-[10px] break-all whitespace-pre-wrap">
                        {a.metadata_json?.label ||
                          (a.uri ? a.uri.split('/').pop() : 'No Label')}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredArtifacts?.length === 0 && !isLoading && (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  No artifacts found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-card overflow-hidden min-h-0">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Database className="w-8 h-8 opacity-20 mb-2" />
            <span className="text-xs">Select an artifact to inspect</span>
          </div>
        ) : (
          <Tabs defaultValue="info" className="h-full flex flex-col">
            <div className="border-b px-2 bg-muted/20 flex items-center justify-between">
              <TabsList className="bg-transparent h-8 gap-2">
                <TabsTrigger
                  value="info"
                  className="text-[10px] sm:text-xs data-[state=active]:bg-background"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="text-[10px] sm:text-xs data-[state=active]:bg-background"
                >
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="features"
                  className="text-[10px] sm:text-xs data-[state=active]:bg-background"
                >
                  Features ({featureCount})
                </TabsTrigger>
                <TabsTrigger
                  value="graph"
                  className="text-[10px] sm:text-xs data-[state=active]:bg-background"
                >
                  Graph ({relations?.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="raw"
                  className="text-[10px] sm:text-xs data-[state=active]:bg-background"
                >
                  Raw
                </TabsTrigger>
              </TabsList>
              {isLoadingArtifactData && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mr-2" />
              )}
            </div>

            <TabsContent value="info" className="flex-1 overflow-auto p-4 m-0">
              <Accordion
                type="multiple"
                defaultValue={['summary', 'capabilities', 'metadata']}
              >
                <AccordionItem value="summary">
                  <AccordionTrigger className="text-sm py-2">
                    Summary
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{details?.type_name}</Badge>
                        {details?.base_type_name && (
                          <Badge variant="secondary">
                            {details.base_type_name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Storage:{' '}
                        <span className="font-mono">{storageLabel}</span>
                      </div>
                      {details?.uri && (
                        <div className="text-[11px] text-muted-foreground break-all">
                          URI: <span className="font-mono">{details.uri}</span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="capabilities">
                  <AccordionTrigger className="text-sm py-2">
                    Capabilities
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex gap-2 flex-wrap text-xs">
                      {(details?.type_name === 'image' ||
                        details?.type_name?.startsWith('image')) && (
                        <Badge>Viewable</Badge>
                      )}
                      {(details?.type_name === 'text' ||
                        details?.type_name?.startsWith('text')) && (
                        <Badge>Readable</Badge>
                      )}
                      {(details?.type_name === 'document' ||
                        details?.type_name?.startsWith('document')) && (
                        <Badge>Viewable</Badge>
                      )}
                      {(details?.type_name === 'document' ||
                        details?.type_name?.startsWith('document')) && (
                        <Badge>Readable</Badge>
                      )}
                      {(details?.type_name === 'audio' ||
                        details?.base_type_name === 'audio' ||
                        details?.type_name?.startsWith('audio')) && (
                        <Badge>Playable</Badge>
                      )}
                      {(details as any)?.override_capabilities?.map(
                        (c: string) => (
                          <Badge key={c} variant="secondary">
                            {c}
                          </Badge>
                        ),
                      )}
                      <span className="text-muted-foreground ml-2 italic">
                        {details?.type_name === 'image' ||
                        details?.type_name === 'document' ||
                        details?.type_name === 'audio' ||
                        details?.base_type_name === 'audio'
                          ? 'Can be previewed/streamed via API'
                          : ''}
                      </span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="providers">
                  <AccordionTrigger className="text-sm py-2">
                    Providers
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">
                          Blob providers
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(blobRegistryQuery.data?.providers || []).length ===
                          0 ? (
                            <span className="text-[10px] text-muted-foreground">
                              None detected
                            </span>
                          ) : (
                            blobRegistryQuery.data?.providers?.map((p) => (
                              <Badge key={p} variant="secondary">
                                {p}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">
                          Resolvers
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(blobRegistryQuery.data?.resolvers || []).length ===
                          0 ? (
                            <span className="text-[10px] text-muted-foreground">
                              None detected
                            </span>
                          ) : (
                            blobRegistryQuery.data?.resolvers?.map((r) => (
                              <Badge key={r} variant="outline">
                                {r}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">
                          Resource adapters
                        </span>
                        <div className="flex flex-col gap-1 mt-1">
                          {(resourceAdaptersQuery.data?.adapters || [])
                            .length === 0 ? (
                            <span className="text-[10px] text-muted-foreground">
                              None detected
                            </span>
                          ) : (
                            resourceAdaptersQuery.data?.adapters
                              ?.slice(0, 6)
                              .map((adapter) => (
                                <div
                                  key={adapter.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="text-[10px] font-mono">
                                    {adapter.id}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px]"
                                  >
                                    {adapter.plugin || 'core'}
                                  </Badge>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="metadata">
                  <AccordionTrigger className="text-sm py-2">
                    Metadata JSON
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap bg-secondary/50 border p-2 rounded">
                      {JSON.stringify(details?.metadata_json, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="raw">
                  <AccordionTrigger className="text-sm py-2">
                    Raw JSON
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent
              value="preview"
              className="flex-1 overflow-auto p-4 m-0 flex flex-col items-center bg-zinc-950/5"
            >
              <div className="w-full flex gap-2 mb-4 justify-centern items-center my-4 justify-center">
                {capabilities.map((c) => (
                  <Badge key={c}>{c}</Badge>
                ))}
                {capabilities.length === 0 && (
                  <span className="text-muted-foreground text-xs italic">
                    No explicit capabilities
                  </span>
                )}
              </div>

              {capabilities.includes('viewable') &&
                details?.type_name === 'image' && (
                  <div className="border border-border/50 shadow-sm rounded-lg overflow-hidden max-w-full max-h-full">
                    <img
                      src={contentUrl}
                      className="max-w-full max-h-150 object-contain"
                      alt="preview"
                    />
                  </div>
                )}
              {capabilities.includes('viewable') &&
                details?.type_name === 'document' &&
                contentUrl && (
                  <iframe
                    src={contentUrl}
                    className="w-full h-full min-h-125 border rounded"
                    title="PDF Preview"
                  ></iframe>
                )}
              {capabilities.includes('readable') &&
                capabilities.includes('viewable') &&
                details?.type_name === 'text' &&
                contentUrl && (
                  <div className="w-full max-w-3xl bg-background border p-1 rounded shadow-sm h-full flex flex-col">
                    <div className="bg-muted px-3 py-1 text-xs border-b">
                      Using plain text viewer (readable)
                    </div>
                    <iframe
                      src={contentUrl}
                      className="w-full flex-1 border-0 p-4 font-mono text-sm"
                      title="Text Preview"
                    ></iframe>
                  </div>
                )}
              {(details?.type_name === 'audio' ||
                details?.base_type_name === 'audio' ||
                details?.type_name?.startsWith('audio')) &&
                contentUrl && (
                  <div className="w-full max-w-3xl bg-background border p-3 rounded shadow-sm">
                    <audio
                      src={contentUrl}
                      controls
                      preload="metadata"
                      className="w-full"
                    />
                  </div>
                )}
              {!capabilities.includes('viewable') &&
                details?.type_name !== 'audio' &&
                details?.base_type_name !== 'audio' &&
                !details?.type_name?.startsWith('audio') && (
                <div className="text-muted-foreground mt-10">
                  Artifact of type <strong>{details?.type_name}</strong> is not
                  marked as viewable.
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="features"
              className="flex-1 overflow-auto p-4 m-0"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">Embeddings</Badge>
                  <span className="text-muted-foreground">
                    {embeddings?.length || 0} vectors
                  </span>
                </div>
                {embeddings && embeddings.length > 0 ? (
                  embeddings.map((emb, idx) => (
                    <div
                      key={emb.id || idx}
                      className="border rounded-lg bg-background overflow-hidden p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Microscope className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold">
                            {emb.model_name}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {emb.space}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-muted/30 p-2 rounded flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Dimensions
                          </span>
                          <span className="text-sm font-mono">
                            {emb.vector_dim}
                          </span>
                        </div>
                        <div className="bg-muted/30 p-2 rounded flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Plugin
                          </span>
                          <span className="text-xs">
                            {emb.plugin_name || 'core'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] text-muted-foreground font-bold">
                            Vector Values (Preview)
                          </span>
                          <span className="text-[9px] text-muted-foreground opacity-50 font-mono italic">
                            First 8 components shown
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {emb.vector_json.slice(0, 8).map((v, i) => (
                            <div
                              key={i}
                              className="px-2 py-1 bg-secondary rounded font-mono text-[10px] border border-border/50"
                            >
                              {v.toFixed(4)}
                            </div>
                          ))}
                          <div className="px-2 py-1 bg-secondary/30 rounded font-mono text-[10px] italic">
                            ...
                          </div>
                        </div>
                      </div>

                      <Accordion type="single" collapsible className="mt-3">
                        <AccordionItem value="full-json" className="border-0">
                          <AccordionTrigger className="py-1 text-[10px] hover:no-underline">
                            View Full Vector JSON
                          </AccordionTrigger>
                          <AccordionContent>
                            <pre className="text-[9px] font-mono whitespace-pre-wrap bg-zinc-950 text-zinc-400 p-2 rounded max-h-50 overflow-auto">
                              {JSON.stringify(emb.vector_json, null, 1)}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                    <Hash className="w-8 h-8 mb-2" />
                    <span className="text-xs">
                      No embeddings found for this artifact
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs pt-4 border-t">
                  <Badge variant="outline">Annotations</Badge>
                  <span className="text-muted-foreground">
                    {annotations?.length || 0} records
                  </span>
                </div>
                {annotations && annotations.length > 0 ? (
                  annotations.map((ann, idx) => (
                    <div key={idx} className="border rounded bg-muted/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {ann.annotation_type}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          {ann.plugin_name}
                        </span>
                      </div>
                      <div className="text-xs font-serif italic text-foreground leading-relaxed">
                        "{ann.text}"
                      </div>
                      {ann.confidence !== undefined && (
                        <div className="mt-2 text-[9px] text-muted-foreground">
                          Confidence: {(ann.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs text-center py-10 italic">
                    No annotations found
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="graph" className="flex-1 overflow-auto p-4 m-0">
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="border rounded p-2">
                  <h4 className="text-xs font-semibold mb-2">Lineage</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Parents
                      </div>
                      <pre className="text-[10px] font-mono whitespace-pre-wrap">
                        {JSON.stringify(lineage?.parents, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Children
                      </div>
                      <pre className="text-[10px] font-mono whitespace-pre-wrap">
                        {JSON.stringify(lineage?.children, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
                <div className="border rounded p-2">
                  <h4 className="text-xs font-semibold mb-2">Relations</h4>
                  <pre className="text-[10px] font-mono whitespace-pre-wrap">
                    {JSON.stringify(relations, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="raw" className="flex-1 overflow-auto p-4 m-0">
              <pre className="text-[10px] font-mono whitespace-pre-wrap">
                {JSON.stringify(details, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
