import React, { useEffect, useState, useMemo } from 'react'
import {
  FileText,
  Folder,
  Tag,
  Calendar,
  Layers,
  Info,
  ExternalLink,
  Image as ImageIcon,
  Video,
  X,
  GitFork,
  ArrowRight,
  Database,
  Link as LinkIcon,
  Settings,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Separator } from '@embeddr/react-ui/components/separator'
import { Skeleton } from '@embeddr/react-ui/components/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import { embeddrApi } from '@/lib/api/client'
import { BACKEND_URL, type PromptImage } from '@/lib/api'
import type { LineageResponse } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface ImageDetailsSidebarProps {
  image: PromptImage
  onClose: () => void
  onToggleLike?: (args: { id: number; liked_by_me: boolean }) => void
  onSelectImage?: (image: PromptImage) => void
}

interface ArtifactDetail {
  id: string
  type_name: string
  uri: string
  metadata_json: Record<string, any>
  collections: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string }>
  created_at: string
}

const DEFAULT_SECTIONS = [
  'prompt',
  'info',
  'metadata',
  'parents',
  'children',
  'collections',
  'tags',
]

const SECTION_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  info: 'Info',
  metadata: 'Metadata',
  parents: 'Parents',
  children: 'Children',
  collections: 'Collections',
  tags: 'Tags',
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  prompt: FileText,
  info: Info,
  metadata: Database,
  parents: GitFork,
  children: GitFork,
  collections: Folder,
  tags: Tag,
}

const MetadataViewer = ({ data }: { data: Record<string, any> }) => {
  if (!data || Object.keys(data).length === 0) return null

  // Filter out keys we display elsewhere or that are internal
  const ignoredKeys = [
    'width',
    'height',
    'format',
    'filename',
    'source_url',
    'parent_uri',
    'post_title',
    'tags', // usually handled by specific tags UI
  ]

  const entries = Object.entries(data).filter(
    ([key]) => !ignoredKeys.includes(key),
  )

  if (entries.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="text-xs border  divide-y">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-3 p-2 gap-2">
            <span className="font-medium text-muted-foreground break-all">
              {key}
            </span>
            <span className="col-span-2 font-mono break-all whitespace-pre-wrap">
              {typeof value === 'object'
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ImageDetailsSidebar({
  image,
  onClose,
  // @ts-ignore
  onToggleLike,
  onSelectImage,
}: ImageDetailsSidebarProps) {
  const [artifact, setArtifact] = useState<ArtifactDetail | null>(null)
  const [lineage, setLineage] = useState<LineageResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Persistent State
  const [sectionOrder, setSectionOrder] = useLocalStorage<string[]>(
    'image-details-order',
    DEFAULT_SECTIONS,
  )
  const [hiddenSections, setHiddenSections] = useLocalStorage<string[]>(
    'image-details-hidden',
    [],
  )
  const [expandedSections, setExpandedSections] = useLocalStorage<string[]>(
    'image-details-expanded',
    ['prompt', 'info'],
  )

  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (!image.id) return

    setLoading(true)
    Promise.all([
      embeddrApi.artifacts.get(String(image.id)),
      embeddrApi.artifacts.getLineage(image.id.toString()).catch(() => null),
    ])
      .then(([data, lineageData]) => {
        setArtifact(data as any)
        setLineage(lineageData)
      })
      .catch((e) => console.error('Failed to fetch details', e))
      .finally(() => setLoading(false))
  }, [image.id])

  // Ensure all sections are present in order
  const activeSections = useMemo(() => {
    const current = new Set(sectionOrder)
    const missing = DEFAULT_SECTIONS.filter((s) => !current.has(s))
    return [...sectionOrder, ...missing]
  }, [sectionOrder])

  if (!image) return null

  const getPromptText = () => {
    const text = image.prompt
    if (
      artifact?.metadata_json?.filename &&
      text === artifact.metadata_json.filename
    ) {
      return null
    }
    if (text && text.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      return null
    }
    return text
  }

  const promptText = getPromptText()

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...activeSections]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex >= 0 && swapIndex < newOrder.length) {
      ;[newOrder[index], newOrder[swapIndex]] = [
        newOrder[swapIndex],
        newOrder[index],
      ]
      setSectionOrder(newOrder)
    }
  }

  const toggleHidden = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setHiddenSections((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const renderSectionContent = (id: string) => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )
    }

    if (!artifact && id !== 'prompt') return null

    switch (id) {
      case 'prompt':
        if (!promptText)
          return (
            <div className="text-xs text-muted-foreground italic">
              No prompt available
            </div>
          )
        return (
          <div className="text-xs text-muted-foreground bg-muted/50 border p-3  whitespace-pre-wrap font-mono max-h-60 overflow-y-auto select-text break-all">
            {promptText}
          </div>
        )

      case 'info':
        return (
          <div className="grid grid-cols-2 gap-4 text-xs border  p-3">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="font-mono">
                {artifact?.metadata_json?.width || image.width
                  ? `${artifact?.metadata_json?.width || image.width} x ${artifact?.metadata_json?.height || image.height}`
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Format</span>
              <span className="uppercase font-mono break-all whitespace-pre-wrap">
                {artifact?.metadata_json?.format ||
                  (artifact?.metadata_json?.filename
                    ? artifact.metadata_json.filename.split('.').pop()
                    : 'UNK')}
              </span>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Created
              </span>
              <span className="font-mono">
                {new Date(image.created_at).toLocaleString()}
              </span>
            </div>

            {(artifact?.metadata_json?.source_url ||
              artifact?.metadata_json?.parent_uri) && (
              <div className="flex flex-col gap-1 col-span-2 pt-2 border-t mt-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" /> Source
                </span>
                {artifact.metadata_json.post_title && (
                  <span className="font-medium truncate mb-1">
                    {artifact.metadata_json.post_title}
                  </span>
                )}
                {artifact.metadata_json.source_url && (
                  <a
                    href={artifact.metadata_json.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate flex items-center gap-1"
                  >
                    Source Image <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {artifact.metadata_json.parent_uri && (
                  <a
                    href={artifact.metadata_json.parent_uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate flex items-center gap-1"
                  >
                    Original Post <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )

      case 'metadata':
        return artifact?.metadata_json ? (
          <MetadataViewer data={artifact.metadata_json} />
        ) : null

      case 'parents':
        if (!lineage?.parents?.length)
          return (
            <div className="text-xs text-muted-foreground italic">
              No parents
            </div>
          )
        return (
          <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
            {lineage.parents.map((link) => (
              <div
                key={link.parent_id}
                className="flex items-center gap-3 p-2  hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() =>
                  onSelectImage &&
                  onSelectImage({
                    id: link.parent_id,
                    url: BACKEND_URL + `/artifacts/${link.parent_id}`,
                    image_url:
                      BACKEND_URL + `/artifacts/${link.parent_id}/content`,
                    width: 0,
                    height: 0,
                    prompt: '',
                    created_at: link.created_at,
                  })
                }
              >
                <div className="w-12 h-12  border">
                  <img
                    src={
                      BACKEND_URL +
                      `/artifacts/${link.parent_id}/preview?preview_type=thumbnail`
                    }
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {link.parent_id.split('-').pop()}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                    <span>
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'children':
        if (!lineage?.children?.length)
          return (
            <div className="text-xs text-muted-foreground italic">
              No children
            </div>
          )
        return (
          <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
            {lineage.children.map((link) => (
              <div
                key={link.child_id}
                className="flex items-center gap-3 p-2  hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() =>
                  onSelectImage &&
                  onSelectImage({
                    id: link.child_id,
                    url: BACKEND_URL + `/artifacts/${link.child_id}`,
                    image_url:
                      BACKEND_URL + `/artifacts/${link.child_id}/content`,
                    width: 0,
                    height: 0,
                    prompt: '',
                    created_at: link.created_at,
                  })
                }
              >
                <div className="w-12 h-12  border">
                  <img
                    src={
                      BACKEND_URL +
                      `/artifacts/${link.child_id}/preview?preview_type=thumbnail`
                    }
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {link.child_id.split('-').pop()}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                    <span>
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'collections':
        if (!artifact?.collections?.length)
          return (
            <div className="text-xs text-muted-foreground italic">
              No collections
            </div>
          )
        return (
          <div className="flex flex-wrap gap-1">
            {artifact.collections.map((c: any) => (
              <Badge
                key={c.id}
                variant="outline"
                className="text-[10px] font-normal"
              >
                <Layers className="w-3 h-3 mr-1" />
                {c.name}
              </Badge>
            ))}
          </div>
        )

      case 'tags':
        const tags = [
          ...(artifact?.tags || []),
          ...((!artifact?.tags || artifact.tags.length === 0) &&
          artifact?.metadata_json?.tags &&
          Array.isArray(artifact.metadata_json.tags)
            ? artifact.metadata_json.tags.map((t: string) => ({
                id: t,
                name: t,
              }))
            : []),
        ]

        if (tags.length === 0)
          return (
            <div className="text-xs text-muted-foreground italic">No tags</div>
          )

        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((t: any) => (
              <Badge
                key={t.id}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                #{t.name}
              </Badge>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-background min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-semibold text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Details
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={editMode ? 'secondary' : 'ghost'}
            size="icon"
            className="h-6 w-6"
            onClick={() => setEditMode(!editMode)}
            title="Configure Layout"
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Static Preview Area */}
      <div className="p-4 border-b bg-muted/20">
        <div className="border rounded-md overflow-hidden bg-muted aspect-square flex items-center justify-center relative group">
          <img
            src={image.thumb_url || image.image_url}
            alt="preview"
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Button
              variant="secondary"
              size="sm"
              className="pointer-events-auto"
              onClick={() => window.open(image.image_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Original
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 min-h-0" type="always">
        <div className="p-4 space-y-2 min-h-0">
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={(val) => setExpandedSections(val)}
            className="w-full space-y-2"
          >
            {activeSections.map((id, index) => {
              const isHidden = hiddenSections.includes(id)
              if (isHidden && !editMode) return null

              const Icon = SECTION_ICONS[id] || FileText

              return (
                <AccordionItem
                  key={id}
                  value={id}
                  className={cn(
                    'border border-b! rounded-md px-3',
                    editMode && 'border-dashed border-primary/50',
                  )}
                >
                  <AccordionTrigger className="hover:no-underline py-3 text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={cn(
                          isHidden &&
                            'opacity-50 strike-through decoration-slate-500',
                        )}
                      >
                        {SECTION_LABELS[id] || id}
                      </span>
                      {isHidden && editMode && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] h-4"
                        >
                          Hidden
                        </Badge>
                      )}
                    </div>
                    {editMode ? (
                      <div
                        className="flex items-center gap-1 mr-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveSection(index, 'up')
                          }}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === activeSections.length - 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveSection(index, 'down')
                          }}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => toggleHidden(id, e)}
                        >
                          {isHidden ? (
                            <EyeOff className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-3">
                    {renderSectionContent(id)}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          {editMode && (
            <div className="text-center p-4 text-xs text-muted-foreground bg-muted/30 border border-dashed rounded-md mt-4">
              Use controls to reorder or hide sections.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
