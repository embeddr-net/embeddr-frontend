import React, { useState } from 'react'
import {
  Badge,
  Input,
  ScrollArea,
  Separator,
  Spinner,
  VideoPlayer,
} from '@embeddr/react-ui'
import {
  ArrowLeft,
  ArrowRight,
  Code,
  EyeIcon,
  GitFork,
  Info,
  Network,
  Search,
  Zap,
} from 'lucide-react'
import { embeddrApi } from '@/lib/api/client'
import type { Point3D, GraphEdge } from './types'

interface AtlasDetailsPanelProps {
  selectedPoint: Point3D | null
  setSelectedPoint: (p: Point3D | null) => void
  details: any
  points: Point3D[]
  graphEdges: GraphEdge[]
  traversalLoading: boolean
  depth: number[]
  debugRelations: any
  artifacts: any[]
}

export const AtlasDetailsPanel: React.FC<AtlasDetailsPanelProps> = ({
  selectedPoint,
  setSelectedPoint,
  details,
  points,
  graphEdges,
  traversalLoading,
  depth,
  debugRelations,
  artifacts,
}) => {
  const [connectionSearch, setConnectionSearch] = useState('')
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null)

  if (!selectedPoint) {
    return (
      <div className="w-80 h-full border-l bg-card flex flex-col shadow-xl z-20 shrink-0 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
          <Network className="w-12 h-12 opacity-20 mb-4" />
          <p className="text-sm">
            Select a node in the 3D view to inspect details and relations.
          </p>
        </div>
      </div>
    )
  }

  const renderPreview = () => {
    if (!details) return null
    const safeUrl = (id: string) => {
      try {
        return embeddrApi.artifacts.getContentUrl(id)
      } catch {
        return ''
      }
    }

    if (details.type_name === 'image') {
      return (
        <div className="aspect-square bg-muted  overflow-hidden border">
          <img
            src={safeUrl(details.id)}
            className="w-full h-full object-contain"
          />
        </div>
      )
    }
    if (
      details.type_name === 'video' ||
      details.base_type_name === 'video' ||
      details.type_name?.startsWith('video')
    ) {
      return (
        <div className="aspect-square bg-black overflow-hidden border flex items-center justify-center">
          <VideoPlayer
            src={safeUrl(details.id)}
            controls
            className="w-full h-full"
            objectFit="contain"
          />
        </div>
      )
    }

    if (
      details.type_name === 'audio' ||
      details.base_type_name === 'audio' ||
      details.type_name?.startsWith('audio')
    ) {
      return (
        <div className="aspect-square bg-muted overflow-hidden border flex items-center justify-center p-3">
          <audio
            src={safeUrl(details.id)}
            controls
            preload="metadata"
            className="w-full"
          />
        </div>
      )
    }

    if (details.type_name === 'text' || details.base_type_name === 'text') {
      return (
        <div className="h-48 bg-muted  p-2 border overflow-hidden text-xs font-mono">
          <iframe
            src={safeUrl(details.id)}
            className="w-full h-full bg-transparent"
          />
        </div>
      )
    }
    return (
      <div className="p-4 text-center text-muted-foreground italic text-xs">
        No visual preview available
      </div>
    )
  }

  return (
    <div className="w-80 h-full border-l bg-card flex flex-col shadow-xl z-20 shrink-0 overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              {details?.type_name || 'Loading...'}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground truncate flex-1 text-right">
              {selectedPoint.id.toString().substring(0, 8)}
            </span>
          </div>
          <h2
            className="font-semibold text-lg leading-tight break-all line-clamp-2"
            title={
              details?.metadata_json?.name ||
              details?.metadata_json?.label ||
              details?.metadata_json?.title ||
              details?.metadata_json?.filename ||
              details?.metadata_json?.original_filename ||
              'Untitled Artifact'
            }
          >
            {details?.metadata_json?.name ||
              details?.metadata_json?.label ||
              details?.metadata_json?.title ||
              details?.metadata_json?.filename ||
              details?.metadata_json?.original_filename ||
              'Untitled Artifact'}
          </h2>
        </div>

        <ScrollArea className="h-full flex-1 min-h-0">
          <div className="p-4 space-y-6 pb-20">
            {/* Custom Sidebar for Search Results */}
            {details?.base_type_name === 'virtual' &&
            details?.metadata_json?.uri === 'virtual://search' ? (
              <div className="space-y-4">
                <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Search className="w-4 h-4" /> Result Set
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Displaying {details.metadata_json.count} artifacts matching
                    <span className="font-mono bg-muted px-1 rounded ml-1">
                      "{details.metadata_json.query}"
                    </span>
                  </p>
                </div>

                <ScrollArea
                  className="h-[400px] border pr-2"
                  type="always"
                  variant="left-border"
                >
                  <div className="flex flex-col gap-1 p-1">
                    {details.metadata_json.results &&
                      (details.metadata_json.results as string[]).map((id) => {
                        const point = points.find((p) => p.id === id)
                        const name =
                          point?.label || id.toString().substring(0, 8)
                        const type = (point?.metadata as any)?.type || 'Unknown'

                        return (
                          <div
                            key={id}
                            className="text-xs border p-2 bg-muted/30 hover:bg-muted cursor-pointer transition-colors flex justify-between items-center group"
                            onClick={() => point && setSelectedPoint(point)}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: point?.color || '#ccc',
                                }}
                              />
                              <span className="truncate whitespace-pre-wrap break-all">
                                {name}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1"
                            >
                              {type}
                            </Badge>
                          </div>
                        )
                      })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <>
                {/* Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <EyeIcon className="w-3 h-3" /> Preview
                  </h4>
                  {renderPreview()}
                </div>

                <Separator />

                {/* Graph Traversal Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <GitFork className="w-3 h-3" /> Graph (Depth {depth[0]})
                    </h4>
                    {traversalLoading && <Spinner className="w-3 h-3" />}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 p-2  text-center">
                      <div className="text-lg font-bold">
                        {
                          new Set(
                            graphEdges.map(
                              (e) =>
                                [e.source, e.target].sort().join('-') +
                                e.type +
                                (e.label || ''),
                            ),
                          ).size
                        }
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        Relations
                      </div>
                    </div>
                    <div className="bg-muted/50 p-2  text-center">
                      <div className="text-lg font-bold">
                        {
                          new Set(
                            graphEdges.flatMap((e) => [e.source, e.target]),
                          ).size
                        }
                      </div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        Nodes
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Capabilities */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Capabilities
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {(details as any)?.override_capabilities?.map(
                      (c: string) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {c}
                        </Badge>
                      ),
                    )}
                    {!details && (
                      <div className="text-xs text-muted-foreground">
                        Loading...
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Relations List (First Level Only for cleanliness) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Network className="w-3 h-3" /> Direct Connections
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      {
                        graphEdges.filter(
                          (e) =>
                            e.source === selectedPoint.id ||
                            e.target === selectedPoint.id,
                        ).length
                      }
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Filter connections..."
                      value={connectionSearch}
                      onChange={(e) => setConnectionSearch(e.target.value)}
                      className="h-6 text-xs pl-7"
                    />
                  </div>

                  <ScrollArea
                    className="h-48 border  pr-2"
                    type="always"
                    variant="left-border"
                  >
                    <div className="p-1 flex flex-col gap-1">
                      {(() => {
                        const seen = new Set<string>()
                        return graphEdges
                          .filter(
                            (e) =>
                              e.source === selectedPoint.id ||
                              e.target === selectedPoint.id,
                          )
                          .map((edge, idx) => {
                            const otherId =
                              edge.source === selectedPoint.id
                                ? edge.target
                                : edge.source

                            // Dedup based on node+type+label
                            // This prevents seeing the same 'contains' relation twice if traversed from both ends
                            const dedupKey = `${otherId}-${edge.type}-${edge.label || ''}`
                            if (seen.has(dedupKey)) return null
                            seen.add(dedupKey)

                            const inGraph = points.find((p) => p.id === otherId)

                            // Determine direction for icon
                            let typeLabel = String(edge.type)
                            if (edge.type === 'relation' && edge.label) {
                              typeLabel = edge.label
                            } else if (edge.label) {
                              typeLabel += `: ${edge.label}`
                            }

                            // Try to find a human readable name and type
                            let targetName = otherId
                            let targetType = 'Unknown'

                            if (inGraph) {
                              // If point exists, trust its label which we already processed in projection
                              if (inGraph.label) targetName = inGraph.label
                              if ((inGraph as any).metadata?.type)
                                targetType = (inGraph as any).metadata.type
                            } else {
                              // Fallback to searching artifacts array if available
                              const artifact = artifacts?.find(
                                (a) => a.id === otherId,
                              )
                              if (artifact) {
                                // Try metadata fields in order
                                const meta = artifact.metadata_json || {}
                                targetName =
                                  meta.name ||
                                  meta.label ||
                                  meta.title ||
                                  meta.original_filename ||
                                  meta.filename ||
                                  otherId
                                targetType = artifact.type_name || 'Unknown'
                              }
                            }

                            // If name is still just ID, and type includes "collection",
                            // try to fetch/display differently if possible (can't fetch async here easily)
                            // But usually `artifacts` array should contain it.

                            // Search Filter
                            if (
                              connectionSearch &&
                              !targetName
                                .toLowerCase()
                                .includes(connectionSearch.toLowerCase()) &&
                              !typeLabel
                                .toLowerCase()
                                .includes(connectionSearch.toLowerCase()) &&
                              !targetType
                                .toLowerCase()
                                .includes(connectionSearch.toLowerCase())
                            ) {
                              return null
                            }

                            return (
                              <div
                                key={idx}
                                className="text-xs border p-2 bg-muted/30 hover:bg-muted cursor-pointer transition-colors "
                                onClick={() => {
                                  if (inGraph) setSelectedPoint(inGraph)
                                }}
                                onMouseEnter={() => setHoveredEdge(edge)}
                                onMouseLeave={() => setHoveredEdge(null)}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono text-[9px] uppercase flex items-center gap-1">
                                    {edge.type === 'child' ? (
                                      <ArrowRight className="w-3 h-3 text-magenta-500" />
                                    ) : edge.type === 'parent' ? (
                                      <ArrowLeft className="w-3 h-3 text-cyan-500" />
                                    ) : edge.label === 'contains' ? (
                                      <GitFork className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Network className="w-3 h-3 text-yellow-500" />
                                    )}
                                    {typeLabel}
                                  </span>
                                  <div className="flex gap-1">
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] h-4 px-1"
                                    >
                                      {targetType}
                                    </Badge>
                                    {inGraph && (
                                      <Badge
                                        className="text-[9px] h-4 px-1"
                                        variant="outline"
                                      >
                                        Graph
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className="font-medium text-[10px] truncate whitespace-pre-wrap break-all"
                                  title={otherId}
                                >
                                  {targetName}
                                </div>
                              </div>
                            )
                          })
                          .filter(Boolean)
                      })()}

                      {graphEdges.length > 0 &&
                        graphEdges.filter(
                          (e) =>
                            e.source === selectedPoint.id ||
                            e.target === selectedPoint.id,
                        ).length === 0 && (
                          <span className="text-xs text-muted-foreground italic p-2">
                            No connections found.
                          </span>
                        )}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Debug: Raw Relations */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Code className="w-3 h-3" /> Raw Relations JSON
                  </h4>
                  <pre className="text-[9px] font-mono bg-muted p-2 overflow-auto max-h-60 border whitespace-pre-wrap break-all">
                    {JSON.stringify(debugRelations, null, 2)}
                  </pre>
                </div>

                <Separator />

                {/* Meta */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Info className="w-3 h-3" /> Metadata
                  </h4>
                  <pre className="text-[9px] font-mono bg-muted p-2 overflow-auto max-h-60 border whitespace-pre-wrap break-all">
                    {JSON.stringify(details?.metadata_json, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
