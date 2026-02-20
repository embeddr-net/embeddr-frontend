import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/ui'
import { useEffect, useState, useMemo } from 'react'
import {
  ArrowRight,
  Loader2,
  Info,
  FileText,
  Tag,
  GitFork,
  Database,
  Brain,
  Calendar,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Search,
} from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import { Separator } from '@embeddr/react-ui/components/ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/ui'
import { embeddrApi } from '@/lib/api/client'
import type {
  Artifact,
  ArtifactAnnotation,
  ArtifactEmbedding,
  LineageResponse,
  ArtifactRelation,
} from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface ImageDetailDialogProps {
  imageId: string | number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearchByImage?: (artifactId: string) => void
}

// ─── Sub-components ──────────────────────────────────────────────────

function MetadataGrid({ metadata }: { metadata: Record<string, any> }) {
  const filtered = useMemo(() => {
    const skip = new Set([
      'width',
      'height',
      'format',
      'prompt',
      'label',
      'is_archived',
    ])
    return Object.entries(metadata).filter(([k]) => !skip.has(k))
  }, [metadata])

  if (filtered.length === 0)
    return <p className="text-xs text-muted-foreground italic">No metadata</p>

  return (
    <div className="text-xs border divide-y rounded-md">
      {filtered.map(([key, value]) => (
        <div key={key} className="grid grid-cols-3 gap-2 p-2">
          <span className="font-medium text-muted-foreground break-all">
            {key}
          </span>
          <span className="col-span-2 font-mono break-all whitespace-pre-wrap text-foreground/80">
            {typeof value === 'object'
              ? JSON.stringify(value, null, 2)
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function AnnotationsList({
  annotations,
}: {
  annotations: ArtifactAnnotation[]
}) {
  if (annotations.length === 0)
    return (
      <p className="text-xs text-muted-foreground italic">No annotations</p>
    )

  return (
    <div className="space-y-3">
      {annotations.map((ann) => (
        <div key={ann.id} className="border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">
              {ann.annotation_type}
            </Badge>
            {ann.plugin_name && (
              <Badge variant="secondary" className="text-[10px]">
                {ann.plugin_name}
              </Badge>
            )}
            {ann.confidence != null && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {(ann.confidence * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/80 whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded select-text">
            {ann.text}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {new Date(ann.created_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmbeddingsList({ embeddings }: { embeddings: ArtifactEmbedding[] }) {
  if (embeddings.length === 0)
    return <p className="text-xs text-muted-foreground italic">No embeddings</p>

  return (
    <div className="space-y-2">
      {embeddings.map((emb) => (
        <div
          key={emb.id}
          className="border rounded-md p-3 flex items-center gap-3"
        >
          <Brain className="w-4 h-4 text-primary/60 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-xs font-medium truncate">{emb.model_name}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {emb.space}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {emb.vector_dim}d
              </span>
              {emb.plugin_name && (
                <span className="text-[10px] text-muted-foreground">
                  via {emb.plugin_name}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {new Date(emb.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function LineageSection({
  lineage,
  onNavigate,
}: {
  lineage: LineageResponse
  onNavigate: (id: string) => void
}) {
  const { parents, children } = lineage
  const hasAny = parents.length > 0 || children.length > 0

  if (!hasAny)
    return (
      <p className="text-xs text-muted-foreground italic">
        No lineage connections
      </p>
    )

  const renderLinks = (
    links: Array<{ parent_id: string; child_id: string; created_at: string }>,
    idKey: 'parent_id' | 'child_id',
    label: string,
  ) => {
    if (links.length === 0) return null
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          {label}
          <span className="text-[10px]">({links.length})</span>
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {links.map((link) => {
            const id = link[idKey]
            return (
              <div
                key={id}
                className="aspect-square overflow-hidden border rounded-md bg-muted cursor-pointer hover:ring-2 ring-primary/50 transition-all group relative"
                onClick={() => onNavigate(id)}
              >
                <img
                  src={embeddrApi.artifacts.getPreviewUrl(id, 'thumbnail')}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {id.split('-').pop()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {renderLinks(parents, 'parent_id', 'Parents')}
      {renderLinks(children, 'child_id', 'Children')}
    </div>
  )
}

function RelationsList({
  relations,
  artifactId,
  onNavigate,
}: {
  relations: ArtifactRelation[]
  artifactId: string
  onNavigate: (id: string) => void
}) {
  if (relations.length === 0)
    return <p className="text-xs text-muted-foreground italic">No relations</p>

  return (
    <div className="space-y-2">
      {relations.map((rel, i) => {
        const otherId =
          rel.source_id === artifactId ? rel.target_id : rel.source_id
        const direction = rel.source_id === artifactId ? 'outgoing' : 'incoming'
        return (
          <div
            key={i}
            className="border rounded-md p-2 flex items-center gap-2 hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => onNavigate(otherId)}
          >
            <ArrowRight
              className={cn(
                'w-3 h-3 shrink-0',
                direction === 'incoming' && 'rotate-180',
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono truncate">{otherId}</div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {rel.relation_type}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {rel.source_namespace}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Dialog ─────────────────────────────────────────────────────

export function ImageDetailDialog({
  imageId,
  open,
  onOpenChange,
  onSearchByImage,
}: ImageDetailDialogProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [annotations, setAnnotations] = useState<ArtifactAnnotation[]>([])
  const [embeddings, setEmbeddings] = useState<ArtifactEmbedding[]>([])
  const [lineage, setLineage] = useState<LineageResponse | null>(null)
  const [relations, setRelations] = useState<ArtifactRelation[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [currentId, setCurrentId] = useState<string | null>(null)

  const loadArtifact = async (id: string) => {
    setLoading(true)
    setActiveTab('overview')
    try {
      const [art, ann, emb, lin, rel] = await Promise.all([
        embeddrApi.artifacts.get(id),
        embeddrApi.artifacts.getAnnotations(id).catch(() => []),
        embeddrApi.artifacts.getEmbeddings(id).catch(() => []),
        embeddrApi.artifacts
          .getLineage(id)
          .catch(() => ({ parents: [], children: [] })),
        embeddrApi.artifacts.getRelations(id).catch(() => []),
      ])
      setArtifact(art)
      setAnnotations(ann)
      setEmbeddings(emb)
      setLineage(lin)
      setRelations(rel)
      setCurrentId(id)
    } catch (err) {
      console.error('Failed to load artifact details', err)
      setArtifact(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && imageId) {
      loadArtifact(String(imageId))
    } else {
      setArtifact(null)
      setAnnotations([])
      setEmbeddings([])
      setLineage(null)
      setRelations([])
      setCurrentId(null)
    }
  }, [open, imageId])

  const handleNavigate = (id: string) => {
    loadArtifact(id)
  }

  const copyId = () => {
    if (currentId) {
      navigator.clipboard.writeText(currentId)
    }
  }

  const meta = artifact?.metadata_json || {}
  const isVideo =
    artifact?.base_type_name === 'video' || artifact?.type_name === 'video'
  const contentUrl = currentId
    ? embeddrApi.artifacts.getContentUrl(currentId)
    : ''

  const tagList = useMemo(() => {
    if (!meta.tags) return []
    return Array.isArray(meta.tags) ? meta.tags : []
  }, [meta.tags])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-sm font-semibold">
              Artifact Details
            </DialogTitle>
            {artifact && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {artifact.type_name}
                </Badge>
                <button
                  onClick={copyId}
                  className="font-mono hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy artifact ID"
                >
                  {currentId?.slice(0, 8)}...
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : artifact ? (
            <>
              {/* Left: Image preview */}
              <div className="flex-1 bg-muted/5 flex flex-col min-w-0">
                <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                  {isVideo ? (
                    <video
                      src={contentUrl}
                      className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                      controls
                      autoPlay
                      loop
                    />
                  ) : (
                    <img
                      src={contentUrl}
                      className="max-w-full max-h-full object-contain rounded-md shadow-sm"
                      alt={meta.prompt || meta.label || ''}
                    />
                  )}
                </div>
                {/* Quick actions bar */}
                <div className="p-2 border-t flex items-center gap-2 shrink-0">
                  {onSearchByImage && currentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        onSearchByImage(currentId)
                        onOpenChange(false)
                      }}
                    >
                      <Search className="w-3 h-3 mr-1" />
                      Find Similar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => window.open(contentUrl, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open Original
                  </Button>
                  <div className="ml-auto text-[10px] text-muted-foreground font-mono">
                    {meta.width && meta.height
                      ? `${meta.width} × ${meta.height}`
                      : ''}
                    {meta.format ? ` · ${meta.format.toUpperCase()}` : ''}
                  </div>
                </div>
              </div>

              {/* Right: Tabbed info panel */}
              <div className="w-100 border-l bg-background flex flex-col shrink-0">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex flex-col h-full"
                >
                  <TabsList className="grid grid-cols-5 m-2 mb-0 shrink-0">
                    <TabsTrigger value="overview" className="text-xs gap-1">
                      <Info className="w-3 h-3" />
                      Info
                    </TabsTrigger>
                    <TabsTrigger value="annotations" className="text-xs gap-1">
                      <FileText className="w-3 h-3" />
                      <span className="hidden xl:inline">Text</span>
                      {annotations.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 px-1"
                        >
                          {annotations.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="embeddings" className="text-xs gap-1">
                      <Brain className="w-3 h-3" />
                      <span className="hidden xl:inline">Vec</span>
                      {embeddings.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 px-1"
                        >
                          {embeddings.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="lineage" className="text-xs gap-1">
                      <GitFork className="w-3 h-3" />
                      <span className="hidden xl:inline">Tree</span>
                    </TabsTrigger>
                    <TabsTrigger value="metadata" className="text-xs gap-1">
                      <Database className="w-3 h-3" />
                      <span className="hidden xl:inline">Meta</span>
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-4">
                      <TabsContent value="overview" className="mt-0 space-y-4">
                        {/* Prompt / Label */}
                        {(meta.prompt || meta.label) && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-muted-foreground">
                              Prompt
                            </h4>
                            <div className="text-xs bg-muted/30 border rounded-md p-2 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto select-text">
                              {meta.prompt || meta.label}
                            </div>
                          </div>
                        )}

                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Created
                            </span>
                            <span className="font-mono">
                              {new Date(artifact.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Type</span>
                            <span className="font-mono capitalize">
                              {artifact.type_name}
                            </span>
                          </div>
                          {meta.width && (
                            <div className="space-y-1">
                              <span className="text-muted-foreground">
                                Dimensions
                              </span>
                              <span className="font-mono">
                                {meta.width} x {meta.height}
                              </span>
                            </div>
                          )}
                          {meta.format && (
                            <div className="space-y-1">
                              <span className="text-muted-foreground">
                                Format
                              </span>
                              <span className="font-mono uppercase">
                                {meta.format}
                              </span>
                            </div>
                          )}
                          {meta.seed != null && (
                            <div className="space-y-1">
                              <span className="text-muted-foreground">
                                Seed
                              </span>
                              <span className="font-mono">{meta.seed}</span>
                            </div>
                          )}
                          {meta.steps != null && (
                            <div className="space-y-1">
                              <span className="text-muted-foreground">
                                Steps
                              </span>
                              <span className="font-mono">{meta.steps}</span>
                            </div>
                          )}
                          {meta.cfg_scale != null && (
                            <div className="space-y-1">
                              <span className="text-muted-foreground">CFG</span>
                              <span className="font-mono">
                                {meta.cfg_scale}
                              </span>
                            </div>
                          )}
                          {meta.model_name && (
                            <div className="space-y-1 col-span-2">
                              <span className="text-muted-foreground">
                                Model
                              </span>
                              <span className="font-mono text-[11px] truncate block">
                                {meta.model_name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Source links */}
                        {(meta.source_url || meta.parent_uri) && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" /> Source
                              </h4>
                              {meta.post_title && (
                                <p className="text-xs font-medium truncate">
                                  {meta.post_title}
                                </p>
                              )}
                              {meta.source_url && (
                                <a
                                  href={meta.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                                >
                                  Source Image{' '}
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              )}
                              {meta.parent_uri && (
                                <a
                                  href={meta.parent_uri}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                                >
                                  Original Post{' '}
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              )}
                            </div>
                          </>
                        )}

                        {/* URI */}
                        {artifact.uri && (
                          <>
                            <Separator />
                            <div className="space-y-1">
                              <h4 className="text-xs font-medium text-muted-foreground">
                                URI
                              </h4>
                              <p className="text-[11px] font-mono text-foreground/70 break-all select-text bg-muted/20 p-2 rounded-md border">
                                {artifact.uri}
                              </p>
                            </div>
                          </>
                        )}

                        {/* Tags */}
                        {tagList.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Tags
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {tagList.map((t: string) => (
                                  <Badge
                                    key={t}
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    #{t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Embedding summary */}
                        {embeddings.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-1">
                              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Brain className="w-3 h-3" /> Embeddings
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {embeddings.map((e) => (
                                  <Badge
                                    key={e.id}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {e.model_name.split('/').pop()} ({e.space})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </TabsContent>

                      <TabsContent
                        value="annotations"
                        className="mt-0 space-y-3"
                      >
                        <h4 className="text-xs font-medium text-muted-foreground">
                          Annotations ({annotations.length})
                        </h4>
                        <AnnotationsList annotations={annotations} />
                      </TabsContent>

                      <TabsContent
                        value="embeddings"
                        className="mt-0 space-y-3"
                      >
                        <h4 className="text-xs font-medium text-muted-foreground">
                          Embeddings ({embeddings.length})
                        </h4>
                        <EmbeddingsList embeddings={embeddings} />
                      </TabsContent>

                      <TabsContent value="lineage" className="mt-0 space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground">
                          Lineage
                        </h4>
                        {lineage ? (
                          <LineageSection
                            lineage={lineage}
                            onNavigate={handleNavigate}
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No lineage data
                          </p>
                        )}
                        {relations.length > 0 && (
                          <>
                            <Separator />
                            <h4 className="text-xs font-medium text-muted-foreground">
                              Relations ({relations.length})
                            </h4>
                            <RelationsList
                              relations={relations}
                              artifactId={currentId || ''}
                              onNavigate={handleNavigate}
                            />
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="metadata" className="mt-0 space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground">
                          Raw Metadata
                        </h4>
                        <MetadataGrid metadata={meta} />
                        {artifact.override_capabilities &&
                          artifact.override_capabilities.length > 0 && (
                            <>
                              <Separator />
                              <h4 className="text-xs font-medium text-muted-foreground">
                                Override Capabilities
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {artifact.override_capabilities.map((c) => (
                                  <Badge
                                    key={c}
                                    variant="outline"
                                    className="text-[10px] font-mono"
                                  >
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          )}
                      </TabsContent>
                    </div>
                  </ScrollArea>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Artifact not found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
