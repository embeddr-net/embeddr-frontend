import React, { useMemo, useState, useEffect } from 'react'
import { UMAP } from 'umap-js'
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import { Umap3DExplorer } from '@embeddr/react-ui'
import { cn } from '@/lib/utils'
import { Spinner } from '@embeddr/react-ui/ui'

import type { Point3D, GraphEdge, SearchResult } from './atlas/types'
import { AtlasControls } from './atlas/AtlasControls'
import { AtlasDetailsPanel } from './atlas/AtlasDetailsPanel'

// Simple cache for projection results
const PROJECTION_CACHE = new Map<string, Point3D[]>()

export const VectorAtlas = () => {
  const [selectedPoint, setSelectedPoint] = useState<Point3D | null>(null)
  const [depth, setDepth] = useState([1])
  const [focusMode, setFocusMode] = useState(false) // "Tree Shaking" mode
  const [isSettingsFolded, setIsSettingsFolded] = useState(false)
  const [showSettings, setShowSettings] = useState(true)

  // Filtering & Search
  const [selectedCollection, setSelectedCollection] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearches, setActiveSearches] = useState<SearchResult[]>([])

  const [pointSize, setPointSize] = useState([0.15])
  const [useBackend, setUseBackend] = useState(true) // Force server-side

  // UMAP Parameters
  const [nNeighbors, setNNeighbors] = useState([15])
  const [minDist, setMinDist] = useState([0.1])
  const [spread, setSpread] = useState([1.0])

  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([])
  const [traversalLoading, setTraversalLoading] = useState(false)
  const [themeTick, setThemeTick] = useState(0)

  const resolveCssColor = (cssVar: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim()
    if (!raw) return fallback

    const probe = document.createElement('span')
    probe.style.color = raw
    document.body.appendChild(probe)
    const resolved = getComputedStyle(probe).color
    probe.remove()
    return resolved || fallback
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const observer = new MutationObserver(() => {
      setThemeTick((prev) => prev + 1)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  const vizColors = useMemo(
    () => ({
      searchPalette: [
        resolveCssColor('--primary', '#ffffff'),
        resolveCssColor('--accent-foreground', '#ffff00'),
        resolveCssColor('--secondary-foreground', '#00ffff'),
        resolveCssColor('--destructive', '#ff00ff'),
        resolveCssColor('--muted-foreground', '#ff9900'),
      ],
      pointImage: resolveCssColor('--primary', '#ff5555'),
      pointText: resolveCssColor('--accent-foreground', '#5555ff'),
      pointOther: resolveCssColor('--secondary-foreground', '#55ff55'),
      connectionParent: resolveCssColor('--primary', '#00ffff'),
      connectionChild: resolveCssColor('--accent-foreground', '#ff00ff'),
      connectionContains: resolveCssColor('--secondary-foreground', '#00ff00'),
      connectionRelation: resolveCssColor('--muted-foreground', '#ffd700'),
    }),
    [themeTick],
  )

  const queryClient = useQueryClient()

  const {
    data: artifactsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['artifacts', 'atlas'],
    queryFn: () => embeddrApi.artifacts.list({ limit: 500 }),
    enabled: !useBackend, // Only fetch full list if computing locally
  })

  // Normalize data for local projection
  const artifacts = artifactsData?.items

  // Collections Query
  const { data: collectionsResponse } = useQuery({
    queryKey: ['collections'],
    queryFn: () => embeddrApi.collections.list(),
    enabled: true,
  })
  // list() returns Array, not { items: Array }
  const collections = Array.isArray(collectionsResponse)
    ? collectionsResponse
    : (collectionsResponse as any)?.items || []

  // Backend projection query
  const {
    data: backendPoints,
    isError: isBackendError,
    isLoading: isBackendLoading,
    refetch: refetchBackend,
  } = useQuery({
    queryKey: [
      'artifacts',
      'projections',
      nNeighbors,
      minDist,
      spread,
      activeSearches
        .map((s) => s.query)
        .sort()
        .join(','),
    ],
    queryFn: () => {
      return embeddrApi.projections.getUmap({
        n_neighbors: nNeighbors[0],
        min_dist: minDist[0],
        spread: spread[0],
        limit: 2000,
        search_queries: activeSearches.map((s) => s.query),
      })
    },
    enabled: useBackend,
    retry: false,
    staleTime: 300000,
    placeholderData: keepPreviousData,
  })

  // Logic merged with rawPoints below

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      // Find unused color from a simple palette
      const palette = vizColors.searchPalette
      const usedColors = new Set(activeSearches.map((s) => s.color))
      const color =
        palette.find((c) => !usedColors.has(c)) || vizColors.searchPalette[0]

      // Semantic Search Only
      const semanticRes = await embeddrApi.plugins
        .call<{
          items: { id: string; score: number }[]
          count: number
        }>('embeddr-search', '/query', 'POST', {
          query: searchQuery,
          limit: 100,
        })
        .catch(() => ({ items: [] as { id: string; score: number }[] }))

      const allIds = semanticRes.items.map((i) => i.id)

      if (allIds.length === 0) {
        console.warn('No results found for search')
      }

      const newSearch: SearchResult = {
        id: `search-result-${Date.now()}`,
        query: searchQuery,
        items: allIds,
        color,
      }

      setActiveSearches((prev) => [...prev, newSearch])
      setSearchQuery('') // Clear input
    } catch (e) {
      console.error('Search failed', e)
    }
  }

  const removeSearch = (id: string) => {
    setActiveSearches((prev) => prev.filter((s) => s.id !== id))
  }

  // ---- Traversal Logic ----
  useEffect(() => {
    if (!selectedPoint) {
      setGraphEdges([])
      return
    }

    let isMounted = true
    const traverse = async () => {
      // 1. Check for Virtual Search Points (Client-side expansion)
      if (selectedPoint.id.toString().startsWith('search-result-')) {
        const search = activeSearches.find((s) => s.id === selectedPoint.id)
        if (search) {
          const edges: GraphEdge[] = search.items.map((itemId) => ({
            source: selectedPoint.id as string,
            target: itemId,
            type: 'relation',
            label: 'match',
            depth: 1,
          }))
          setGraphEdges(edges)
        }
        return
      }

      setTraversalLoading(true)

      try {
        // 2. Use the new server-side Subgraph endpoint (Batched & Faster)
        const subgraph = (await embeddrApi.artifacts.getSubgraph(
          selectedPoint.id as string,
          {
            maxDepth: depth[0],
            includeLineage: true,
            includeRelations: true,
          },
        )) as {
          edges: Array<{
            source: string
            target: string
            type: string
            label?: string
          }>
        }

        if (isMounted) {
          // Map to internal GraphEdge format
          const edges: GraphEdge[] = subgraph.edges.map((e: any) => ({
            source: e.source,
            target: e.target,
            type: e.type,
            label: e.label,
            depth: 1, // Simplified depth for visual
          }))
          setGraphEdges(edges)
        }
      } catch (e) {
        console.error('Failed to fetch subgraph', e)
        // Fallback or handle error
      } finally {
        if (isMounted) setTraversalLoading(false)
      }
    }

    traverse()
    return () => {
      isMounted = false
    }
  }, [selectedPoint, depth, activeSearches])

  // Fetch details for selected point (full metadata)
  const { data: details } = useQuery<any>({
    queryKey: ['details', selectedPoint?.id],
    queryFn: async () => {
      if (!selectedPoint) return null
      // Check if it's a virtual search point
      if (selectedPoint.id.toString().startsWith('search-result-')) {
        const search = activeSearches.find((s) => s.id === selectedPoint.id)
        if (!search) return null

        return {
          id: selectedPoint.id,
          type_name: 'search',
          base_type_name: 'virtual',
          created_at: new Date().toISOString(),
          metadata_json: {
            label: `Search: "${search.query}"`,
            count: search.items.length,
            uri: 'virtual://search',
            query: search.query,
            color: search.color,
            results: search.items,
          },
        }
      }
      return embeddrApi.artifacts.get(selectedPoint.id as string)
    },
    enabled: !!selectedPoint,
  })

  // Fetch debug connection data
  const { data: debugRelations } = useQuery({
    queryKey: ['relations', selectedPoint?.id],
    queryFn: () =>
      selectedPoint
        ? embeddrApi.artifacts.getRelations(selectedPoint.id as string)
        : [],
    enabled:
      !!selectedPoint &&
      !selectedPoint.id.toString().startsWith('search-result-'),
  })

  // Perform UMAP Projection
  const rawPoints: Point3D[] = useMemo(() => {
    if (useBackend) {
      if (backendPoints) return backendPoints as Point3D[]
      return []
    }

    if (!artifacts || artifacts.length === 0) return []

    const cacheKey = `umap-${nNeighbors[0]}-${minDist[0]}-${spread[0]}-${artifacts
      .map((a: any) => a.id)
      .sort()
      .join(',')}`

    if (PROJECTION_CACHE.has(cacheKey)) {
      return PROJECTION_CACHE.get(cacheKey)!
    }

    try {
      // Create synthetic features
      const featureMatrix = artifacts.map((a: any) => {
        // Feature 1: Type (Strong cluster)
        let typeVal = 0
        if (a.type_name === 'image') typeVal = 10
        else if (a.type_name === 'text') typeVal = -10
        else if (a.type_name === 'comfy_workflow') typeVal = 5

        // Feature 2: Aspect Ratio (if image) or Size
        let f2 = 0
        if (a.metadata_json) {
          const meta = a.metadata_json as any
          if (meta.width && meta.height) {
            f2 = meta.width / meta.height
          } else if (meta.file_size) {
            f2 = Math.log10(meta.file_size)
          }
        }

        // Feature 3: Pseudo-Time (from created_at if possible, else hash)
        // const dateVal = new Date(a.created_at).getTime() / 1000000000
        // fallback to hash
        const hash = a.id
          .split('')
          .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
        const f3 = (hash % 255) / 25.0

        // Feature 4: Source Namespace Length
        const source = (a.metadata_json as any)?.source || ''
        const f4 = source.length

        // Feature 5: Random noise to prevent stacking
        const f5 = Math.random() * 0.1

        return [typeVal, f2, f3, f4, f5]
      })

      const umap = new UMAP({
        nComponents: 3,
        nNeighbors: nNeighbors[0],
        minDist: minDist[0],
        spread: spread[0],
      })

      const embedding = umap.fit(featureMatrix)

      const projected = artifacts.map((a: any, i: number) => {
        return {
          id: a.id,
          x: embedding[i][0] * 2,
          y: embedding[i][1] * 2,
          z: embedding[i][2] * 2,
          color:
            a.type_name === 'image'
              ? vizColors.pointImage
              : a.type_name === 'text'
                ? vizColors.pointText
                : vizColors.pointOther,
          label:
            (a.metadata_json as any)?.name ||
            (a.metadata_json as any)?.label ||
            (a.metadata_json as any)?.title ||
            (a.metadata_json as any)?.original_filename ||
            (a.metadata_json as any)?.filename ||
            a.type_name,
          metadata: { uri: a.uri, type: a.type_name },
        }
      })

      PROJECTION_CACHE.set(cacheKey, projected)
      return projected
    } catch (e) {
      console.error(e)
      return []
    }
  }, [
    artifacts,
    nNeighbors,
    minDist,
    spread,
    useBackend,
    backendPoints,
    vizColors,
  ])

  const { points, searchMarkers } = useMemo(() => {
    const base = rawPoints || []
    let res = base

    // Filter by Collection
    if (selectedCollection !== 'all') {
      res = res.filter((p: any) => {
        const cols = p.metadata?.in_collections || p.metadata?.collections
        if (!cols) return false

        if (Array.isArray(cols)) {
          return cols.some((c: any) => {
            if (typeof c === 'string') return c === selectedCollection
            if (typeof c === 'object' && c?.id)
              return c.id === selectedCollection
            return false
          })
        }
        return (
          cols === selectedCollection ||
          (cols as any)?.id === selectedCollection
        )
      })
    }

    // Focus Mode (Tree Shaking)
    // Only show nodes that are part of the current graph expansion
    if (focusMode && selectedPoint) {
      const connectedIds = new Set(
        graphEdges.flatMap((e) => [e.source, e.target]),
      )
      connectedIds.add(selectedPoint.id.toString())
      res = res.filter((p) => connectedIds.has(p.id.toString()))
    }

    let markers: any[] = []

    // Search Point Injection - Handle Multiple Searches
    if (activeSearches.length > 0) {
      const allSearchIds = new Set<string>()
      const searchColorMap = new Map<string, string>()
      const generatedSearchPoints: Point3D[] = []

      // 1. Process each search
      activeSearches.forEach((search) => {
        // Map Item IDs to Color
        search.items.forEach((id) => {
          allSearchIds.add(id)
          searchColorMap.set(id, search.color)
        })

        // Check if there is already a backend point for this query
        const hasBackendPoint = res.some(
          (p) => p.label === `Search: ${search.query}`,
        )

        if (!hasBackendPoint) {
          // Only use fallback centroid if backend didn't provide one
          const matchingPoints = res.filter((p) =>
            search.items.includes(p.id.toString()),
          )

          if (matchingPoints.length > 0) {
            const centroid = matchingPoints.reduce(
              (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
              { x: 0, y: 0, z: 0 },
            )
            centroid.x /= matchingPoints.length
            centroid.y /= matchingPoints.length
            centroid.z /= matchingPoints.length

            // Add Virtual Search Point
            const searchPoint: Point3D = {
              id: search.id,
              x: centroid.x,
              y: centroid.y,
              z: centroid.z,
              color: search.color,
              label: `Search: "${search.query}"`,
              metadata: {
                type: 'search', // 'search' vs 'search_query' distinction
                count: matchingPoints.length,
                is_virtual: true,
                results: search.items,
              },
            }
            generatedSearchPoints.push(searchPoint)

            // Add Virtual Visual Marker
            markers.push({
              x: centroid.x,
              y: centroid.y,
              z: centroid.z,
              label: `"${search.query}"`,
              color: search.color,
            })
          }
        }
      })

      // 2. Highlight Logic
      const pointsWithHighlight = res.map((p) => {
        const idStr = p.id.toString()
        if (allSearchIds.has(idStr)) {
          return {
            ...p,
            color: searchColorMap.get(idStr) || vizColors.searchPalette[0],
            opacity: 1.0,
          }
        }
        // Also ensure backend injected queries get visual markers
        if ((p.metadata as any)?.type === 'search_query') {
          markers.push({
            x: p.x,
            y: p.y,
            z: p.z,
            label: p.label || 'Search',
            color: p.color,
          })
        }

        return { ...p, opacity: 0.1 } // Dim non-matches
      })

      res = [...pointsWithHighlight, ...generatedSearchPoints]
    }

    return { points: res, searchMarkers: markers }
  }, [
    rawPoints,
    selectedCollection,
    activeSearches,
    focusMode,
    selectedPoint,
    graphEdges,
    vizColors,
  ])

  // Connections to draw
  const connections = useMemo(() => {
    return graphEdges.map((edge) => ({
      startId: edge.source,
      endId: edge.target,
      color:
        edge.type === 'parent'
          ? vizColors.connectionParent
          : edge.type === 'child'
            ? vizColors.connectionChild
            : edge.label === 'contains'
              ? vizColors.connectionContains
              : vizColors.connectionRelation,
    }))
  }, [graphEdges, vizColors])

  if (isLoading)
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    )

  return (
    <div className="h-full w-full flex flex-row relative">
      {/* 3D View */}
      <div className="flex-1 relative h-full min-w-0">
        <AtlasControls
          isSettingsFolded={isSettingsFolded}
          setIsSettingsFolded={setIsSettingsFolded}
          pointsCount={points.length}
          isBackendLoading={isBackendLoading}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          useBackend={useBackend}
          setUseBackend={setUseBackend}
          filterCollection={selectedCollection}
          setFilterCollection={setSelectedCollection}
          collections={collections || []}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          activeSearches={activeSearches}
          removeSearch={removeSearch}
          clearSearches={() => setActiveSearches([])}
          onPointSelect={setSelectedPoint}
          points={points}
          depth={depth}
          setDepth={setDepth}
          pointSize={pointSize}
          setPointSize={setPointSize}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          nNeighbors={nNeighbors}
          setNNeighbors={setNNeighbors}
          minDist={minDist}
          setMinDist={setMinDist}
          spread={spread}
          setSpread={setSpread}
          onClearCache={() => {
            PROJECTION_CACHE.clear()
            queryClient.invalidateQueries({
              queryKey: ['artifacts'],
            })
            queryClient.invalidateQueries({ queryKey: ['lineage'] })
            queryClient.invalidateQueries({ queryKey: ['relations'] })
            refetch()
            refetchBackend()
          }}
          onRefresh={() => {
            PROJECTION_CACHE.clear()
            queryClient.invalidateQueries({
              queryKey: ['artifacts'],
            })
            queryClient.invalidateQueries({ queryKey: ['lineage'] })
            queryClient.invalidateQueries({ queryKey: ['relations'] })
            refetch()
            refetchBackend()
          }}
        />

        {/* Legend */}
        <div className="absolute top-2 right-2 z-10 bg-card/80 border border-border p-2 backdrop-blur text-[10px] text-foreground space-y-1 pointer-events-none">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: vizColors.connectionParent }}
            ></div>{' '}
            Parent (Input/Source)
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: vizColors.connectionChild }}
            ></div>{' '}
            Child (Derived/Output)
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: vizColors.connectionContains }}
            ></div>{' '}
            Contains (Folder/Group)
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: vizColors.connectionRelation }}
            ></div>{' '}
            Relation (Reference)
          </div>
        </div>

        <Umap3DExplorer
          points={points}
          onPointSelect={(p) => setSelectedPoint(p as Point3D)}
          selectedPointId={selectedPoint?.id}
          pointSize={pointSize[0]}
          getImageUrl={(point, type) => {
            if (type === 'thumb') {
              return embeddrApi.artifacts.getPreviewUrl(
                (point as any).id,
                'thumbnail',
              )
            }
            return embeddrApi.artifacts.getContentUrl((point as any).id)
          }}
          showDefaultOverlay={false} // Disable built-in overlay
          connections={connections}
          highlightedConnection={null}
          searchMarkers={searchMarkers}
        />
      </div>

      {/* Sidebar Overlay (Right Side) */}
      <AtlasDetailsPanel
        selectedPoint={selectedPoint}
        setSelectedPoint={setSelectedPoint}
        details={details}
        points={points}
        graphEdges={graphEdges}
        traversalLoading={traversalLoading}
        depth={depth}
        debugRelations={debugRelations}
        artifacts={artifacts || []}
      />
    </div>
  )
}
