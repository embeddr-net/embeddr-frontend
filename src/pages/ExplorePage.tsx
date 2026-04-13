import { useEffect, useMemo, useState } from 'react'
import { Card } from '@embeddr/react-ui/ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/ui'
import { Switch } from '@embeddr/react-ui/ui'

import { Label } from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import {
  ClockPlus,
  FolderSyncIcon,
  ScanEye,
  Search,
  Settings2Icon,
  X,
} from 'lucide-react'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Spinner } from '@embeddr/react-ui/ui'
import { useNavigate } from '@tanstack/react-router'
import { useImageDialog } from '@embeddr/react-ui/hooks'
import { Input } from '@embeddr/react-ui/ui'
import type { PromptImage } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  getArtifactProviderId,
  getArtifactImportSource,
  getArtifactOrigin,
} from '@/lib/providers'
import { ImageDetailDialog } from '@/components/dialogs/ImageDetailDialog'
import { Route } from '@/routes/search'
import { TagsFilter } from '@/components/search/TagsFilter'
import PostsScrollArea from '@/components/search/PostsScrollArea'
import { fetchCollections, fetchTags } from '@/lib/api'
import { embeddrApi } from '@/lib/api/client'
import type { Artifact } from '@/lib/api/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'

import { ExploreSidebar } from '@/components/panels/ExploreSidebar'

import { useRef } from 'react'

const normalizeMediaType = (
  mediaType?: string,
): 'image' | 'video' | 'collection' | 'document' | 'audio' | 'text' => {
  const value = (mediaType || '').toLowerCase()
  if (value === 'video') return 'video'
  if (value === 'collection' || value === 'folder') return 'collection'
  if (value === 'document' || value === 'web') return 'document'
  if (value === 'audio') return 'audio'
  if (value === 'text') return 'text'
  return 'image'
}

const mapArtifactToImage = (
  a: Artifact,
  knownProviders?: Set<string>,
): PromptImage =>
  {
    const external = (a.metadata_json?.external || {}) as Record<string, any>
    const previewUrl =
      external.preview_url ||
      a.metadata_json?.preview_url ||
      embeddrApi.artifacts.getPreviewUrl(a.id, 'thumbnail')

    const contentUrl = external.url || embeddrApi.artifacts.getContentUrl(a.id)
    const mediaType = normalizeMediaType(
      a.base_type_name === 'collection' || a.type_name === 'collection'
        ? 'collection'
        : a.base_type_name === 'folder'
          ? 'collection'
          : a.base_type_name || a.type_name,
    )

    return {
      id: a.id as any, // Cast UUID to any to bypass number type check till PromptImage is updated
      created_at: a.created_at,
      url: contentUrl,
      image_url: contentUrl,
      thumb_url: previewUrl,
      file_size: a.blob_size || 0,
      prompt:
        a.metadata_json?.prompt ||
        a.metadata_json?.label ||
        a.uri?.split('/').pop() ||
        '',
      author_name: 'Local User',
      author_username: 'local',
      media_type: mediaType,
      duration: 0,
      fps: 0,
      frame_count: 0,
      phash: '',
      is_archived: !!a.metadata_json?.is_archived,
      width: a.metadata_json?.width || 0,
      height: a.metadata_json?.height || 0,
      provider_id: getArtifactProviderId(a, knownProviders),
      import_source: getArtifactImportSource(a),
      origin: getArtifactOrigin(a),
      import_instance: a.metadata_json?.external?.instance || null,
      type_name: a.type_name,
      storage_backend: a.storage_backend,
      blob_size: a.blob_size,
    } as PromptImage
  }
import { useSettings } from '@/hooks/useSettings'
import { globalEventBus } from '@/lib/eventBus'

const ExplorePage = () => {
  const { openImage, closeImage } = useImageDialog()
  const { selectedModel } = useSettings()
  const queryClient = useQueryClient()
  const { imageId } = Route.useSearch()
  const [activeTab, setActiveTab] = useState('new')
  const [sidebarTab, setSidebarTab] = useState('filters')
  const [showSidebar, setShowSidebar] = useLocalStorage(
    'explore-show-sidebar',
    true,
  )
  const [selectedImage, setSelectedImage] = useState<PromptImage | null>(null)
  const [detailImageId, setDetailImageId] = useState<string | null>(null)
  const [searchImageId, setSearchImageId] = useState<number | string | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    null,
  )
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedSourceType, setSelectedSourceType] = useState<string | null>(
    null,
  )
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'all'>('all')
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState<boolean | null>(false)
  const [selectedTags, setSelectedTags] = useState<Array<string>>([])
  const [gridCols, setGridCols] = useLocalStorage('explore-grid-cols', 5)
  const [autoGrid, setAutoGrid] = useLocalStorage('explore-auto-grid', true)
  const [useOriginalImages, setUseOriginalImages] = useLocalStorage(
    'explore-use-original-images',
    false,
  )
  const [imageFit, setImageFit] = useLocalStorage<'cover' | 'contain'>(
    'explore-image-fit',
    'contain',
  )
  const [isLive, setIsLive] = useLocalStorage('explore-live-update', false)
  const lastUpdate = useRef(0)

  // Listen for Live Updates
  useEffect(() => {
    // Shared handler for new items
    const handleLiveUpdate = () => {
      if (!isLive) return

      const now = Date.now()
      // Throttle updates to max once every 2 seconds to avoid UI thrashing
      if (now - lastUpdate.current > 2000) {
        lastUpdate.current = now
        console.log('[ExplorePage] Live Update triggered')
        // Only invalidate if we are on tabs that show new content generally
        if (activeTab === 'new' || activeTab === 'all') {
          // 'all' might not be a tab but good practice
          queryClient.invalidateQueries({ queryKey: ['items'] })
        }
      }
    }

    const unsubCreated = globalEventBus.on(
      'plugin:artifact.created',
      handleLiveUpdate,
    )

    const unsubThumbnail = globalEventBus.on(
      'artifact:thumbnail_generated',
      handleLiveUpdate,
    )

    // Also listen for generation complete as before for consistency
    const unsubGen = globalEventBus.on('generation:complete', () => {
      console.log('[ExplorePage] Generation complete')
      // Always update on generation since user explicitly requested it
      if (activeTab === 'new') {
        queryClient.invalidateQueries({ queryKey: ['items'] })
      }
    })

    return () => {
      unsubCreated()
      unsubGen()
      unsubThumbnail()
    }
  }, [isLive, queryClient, activeTab])

  const navigate = useNavigate()

  // Fetch Library Paths
  const { data: libraryPaths } = useQuery({
    queryKey: ['library-paths'],
    queryFn: () => embeddrApi.collections.list('library'),
  })

  // Fetch Collections
  const { data: collections, refetch: refetchCollections } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  })

  // Fetch Sources (Collection/Folder artifacts)
  const { data: sourceCollections } = useQuery({
    queryKey: ['sources'],
    queryFn: () => embeddrApi.collections.list('source'),
  })

  // Fetch Tags
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  })

  const { data: artifactRegistry } = useQuery({
    queryKey: ['system', 'artifact-registry'],
    queryFn: () => embeddrApi.system.getArtifactRegistry(),
  })

  const providerSet = useMemo(
    () => new Set(artifactRegistry?.providers || []),
    [artifactRegistry],
  )

  useEffect(() => {
    if (imageId) {
      setSearchImageId(imageId)
      setActiveTab('search')
      setSearchQuery('')
      setActiveSearchQuery('')
    }
  }, [imageId])

  const handleSearchByImage = (image: PromptImage) => {
    console.log('[ExplorePage] handleSearchByImage FIRED:', image)
    setSearchQuery('')
    setActiveSearchQuery('')
    setSearchImageId(image.id)
    setActiveTab('search')
    closeImage()
  }

  // const handleCloseDetails = () => {
  //   setSelectedImage(null);
  //   setSidebarTab("folders");
  // };

  // const { data: fullSelectedImage } = useQuery({
  //   queryKey: ["item", selectedImage?.id],
  //   queryFn: () => fetchItem(selectedImage!.id),
  //   enabled: !!selectedImage?.id,
  //   staleTime: 1000 * 60 * 5, // 5 minutes
  // });

  // const { mutate: toggleLike } = useMutation({
  //   mutationFn: ({ id, liked_by_me }: { id: number; liked_by_me: boolean }) => {
  //     if (liked_by_me) return unlikeItem({ itemId: id });
  //     return likeItem({ itemId: id });
  //   },
  //   onMutate: async ({ id, liked_by_me }) => {
  //     if (selectedImage?.id === id) {
  //       setSelectedImage((prev) =>
  //         prev
  //           ? {
  //               ...prev,
  //               liked_by_me: !liked_by_me,
  //               like_count: liked_by_me
  //                 ? prev.like_count - 1
  //                 : prev.like_count + 1,
  //             }
  //           : null
  //       );
  //     }
  //   },
  //   onError: () => {
  //     toast.error("Failed to update like status");
  //   },
  //   onSettled: () => {
  //     queryClient.invalidateQueries({ queryKey: ["items"] });
  //     queryClient.invalidateQueries({ queryKey: ["liked-items"] });
  //     queryClient.invalidateQueries({ queryKey: ["search"] });
  //   },
  // });

  // const handleToggleLike = (args: { id: number; liked_by_me: boolean }) => {
  //   toggleLike(args);
  // };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        'items',
        activeTab,
        selectedLibraryId,
        selectedCollectionId,
        selectedSourceId,
        selectedTags,
        mediaType,
        showArchived,
        selectedSourceType,
        selectedTypeName,
      ],
      queryFn: async ({ pageParam }) => {
        const providerFilter = selectedSourceType
        const providerParams: {
          provider?: string
          import_source?: string
          import_instance?: string
          origin?: string
        } = {}
        if (providerFilter) {
          const [kind] = providerFilter.split(':')
          const value = providerFilter.slice(kind.length + 1)
          if (kind === 'import') {
            providerParams.import_source = value
          } else if (kind === 'instance') {
            providerParams.import_instance = value
          } else if (kind === 'origin') {
            providerParams.origin = value
          } else if (kind === 'provider') {
            providerParams.provider = value
          }
        }

        const typeParams = selectedTypeName
          ? { type_name: selectedTypeName }
          : mediaType !== 'all'
            ? { media_type: mediaType }
            : {}

        if (selectedCollectionId) {
          // Collection items
          const res = await embeddrApi.artifacts.list({
            collection_id: selectedCollectionId.toString(),
            limit: 50,
            offset: pageParam,
            sort: activeTab === 'random' ? 'random' : 'new',
            ...providerParams,
            ...typeParams,
          })
          return res.items.map((item) => mapArtifactToImage(item, providerSet))
        }

        if (selectedSourceId) {
          // By Parent ID / Source Collection
          const res = await embeddrApi.artifacts.list({
            parent_id: selectedSourceId.toString(),
            limit: 50,
            offset: pageParam,
            sort: activeTab === 'random' ? 'random' : 'new',
            ...providerParams,
            ...typeParams,
          })
          return res.items.map((item) => mapArtifactToImage(item, providerSet))
        }

        let sort: 'random' | 'new' = 'new'
        if (activeTab === 'new') sort = 'new'
        if (activeTab === 'random') sort = 'random'

        const res = await embeddrApi.artifacts.list({
          limit: 50,
          offset: pageParam,
          library_id: selectedLibraryId?.toString(),
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          sort: sort,
          is_archived: showArchived || false,
          ...providerParams,
          ...typeParams,
        })
        return res.items.map((item) => mapArtifactToImage(item, providerSet))
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < 50) return undefined
        return allPages.length * 50
      },
    })

  const posts = useMemo(() => {
    if (!data) return []
    const flatPosts = data.pages.flat()
    const seen = new Set()
    return flatPosts.filter((post) => {
      if (seen.has(post.id)) return false
      seen.add(post.id)
      return true
    })
  }, [data])

  const {
    data: searchData,
    isLoading: isSearchLoading,
    fetchNextPage: fetchNextSearchPage,
    hasNextPage: hasNextSearchPage,
    isFetchingNextPage: isFetchingNextSearchPage,
  } = useInfiniteQuery({
    queryKey: [
      'search',
      activeSearchQuery,
      searchImageId,
      selectedLibraryId,
      selectedCollectionId,
      selectedModel,
      mediaType,
      showArchived,
      selectedTypeName,
    ],
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0

      // Use lotus actions from the embeddr-search plugin
      type SearchResult = {
        items: Array<{ id: string; score: number }>
        count?: number
      }

      if (searchImageId) {
        const res = await embeddrApi.lotus.invoke<SearchResult>(
          'search.similar',
          {
            artifact_id: searchImageId.toString(),
            limit: 50,
            offset,
            model_name: selectedModel || undefined,
            space: 'visual',
          },
        )
        if (!res.items || res.items.length === 0) {
          return { items: [], count: res.count ?? 0, offset }
        }

        const ids = res.items.map((item) => item.id)
        let artifacts = await Promise.all(
          ids.map((id) => embeddrApi.artifacts.get(String(id))),
        )
        if (selectedTypeName) {
          artifacts = artifacts.filter(
            (a) =>
              a.type_name === selectedTypeName ||
              a.base_type_name === selectedTypeName,
          )
        }
        return {
          items: artifacts.map((item) => mapArtifactToImage(item, providerSet)),
          count: res.count ?? artifacts.length,
          offset,
        }
      }

      // Text-based semantic search via lotus action
      const res = await embeddrApi.lotus.invoke<SearchResult>('search.text', {
        query: activeSearchQuery,
        limit: 50,
        offset,
        model_name: selectedModel || undefined,
        space: 'visual',
      })
      if (!res.items || res.items.length === 0) {
        return { items: [], count: res.count ?? 0, offset }
      }

      const ids = res.items.map((item) => item.id)
      let artifacts = await Promise.all(
        ids.map((id) => embeddrApi.artifacts.get(String(id))),
      )
      // Post-filter by type if a type filter is active
      if (selectedTypeName) {
        artifacts = artifacts.filter(
          (a) =>
            a.type_name === selectedTypeName ||
            a.base_type_name === selectedTypeName,
        )
      }
      return {
        items: artifacts.map((item) => mapArtifactToImage(item, providerSet)),
        count: res.count ?? artifacts.length,
        offset,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.count ?? 0
      const loaded = allPages.reduce((acc, page) => acc + page.items.length, 0)
      if (loaded >= total) return undefined
      return loaded
    },
    enabled:
      activeTab === 'search' &&
      (activeSearchQuery.length > 0 || searchImageId !== null),
  })

  const searchPosts = useMemo(() => {
    if (!searchData) return []
    const flatPosts = searchData.pages.flatMap((page) => page.items)
    const seen = new Set()
    return flatPosts.filter((post) => {
      if (seen.has(post.id)) return false
      seen.add(post.id)
      return true
    })
  }, [searchData])

  const providerCounts = useMemo(() => {
    const counts = new Map<string, number>()
    const items = activeTab === 'search' ? searchPosts : posts
    items.forEach((item) => {
      const providerId = (item as any).provider_id as string | undefined
      if (!providerId) return
      counts.set(providerId, (counts.get(providerId) || 0) + 1)
    })
    return counts
  }, [activeTab, posts, searchPosts])

  const { setGalleryImages, currentGallery } = useImageDialog()

  const filterByProvider = (items: PromptImage[]) => {
    if (!selectedSourceType) return items
    const [kind, rawValue] = selectedSourceType.split(':')
    const value = rawValue ? selectedSourceType.slice(kind.length + 1) : ''

    return items.filter((item) => {
      const providerId = (item as any).provider_id
      const importSource = (item as any).import_source
      const origin = (item as any).origin

      if (kind === 'provider') {
        return providerId === value
      }

      if (kind === 'import') {
        return importSource === value
      }

      if (kind === 'instance') {
        return (item as any).import_instance === value
      }

      if (kind === 'origin') {
        return origin === value
      }

      return false
    })
  }

  const filteredSearchPosts = useMemo(
    () => filterByProvider(searchPosts),
    [searchPosts, selectedSourceType],
  )

  const importSourceOptions = useMemo(
    () => artifactRegistry?.import_sources || [],
    [artifactRegistry],
  )

  const originOptions = useMemo(
    () => artifactRegistry?.origins || [],
    [artifactRegistry],
  )

  const importInstanceOptions = useMemo(
    () => artifactRegistry?.import_instances || [],
    [artifactRegistry],
  )

  const currentPosts = activeTab === 'search' ? filteredSearchPosts : posts
  const currentFetchNext =
    activeTab === 'search' ? fetchNextSearchPage : fetchNextPage
  const currentHasNext =
    activeTab === 'search' ? hasNextSearchPage : hasNextPage

  // Sync images to lightbox when they change
  useEffect(() => {
    if (currentGallery?.id === 'virtual-gallery' && currentPosts.length > 0) {
      const lightboxPosts = currentPosts.filter(
        (p) => p.media_type === 'image' || p.media_type === 'video',
      )
      const galleryImages = lightboxPosts.map((p) => ({
        src: embeddrApi.artifacts.getContentUrl(String(p.id)),
        title: p.prompt,
        metadata: p as any,
        media_type: (p.media_type === 'video' ? 'video' : 'image') as
          | 'video'
          | 'image',
      }))
      const totalImages = currentHasNext
        ? lightboxPosts.length + 100
        : lightboxPosts.length
      setGalleryImages(galleryImages, true, undefined, totalImages)
    }
  }, [currentPosts, currentGallery?.id, setGalleryImages, currentHasNext])

  const handleSelectImage = (image: PromptImage) => {
    setDetailImageId(image.id.toString())
  }

  const handleOpenLightbox = (image: PromptImage, e?: React.MouseEvent) => {
    // Handle Collection Navigation
    if ((image as any).media_type === 'collection') {
      setSelectedSourceId(image.id.toString())
      // Ensure we are viewing "All Sources" context or reset others if needed, but selecting source ID is usually enough
      // Also switch tabs if needed to show content
      if (activeTab === 'search') setActiveTab('new')
      return
    }

    if (e && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Click: Select for sidebar details
      setSelectedImage(image)
      setSidebarTab('details')
      if (!showSidebar) setShowSidebar(true)
      return
    }

    const index = currentPosts.findIndex((p) => p.id === image.id)
    if (index !== -1) {
      const lightboxPosts = currentPosts.filter(
        (p) => p.media_type === 'image' || p.media_type === 'video',
      )
      const lightboxIndex = lightboxPosts.findIndex((p) => p.id === image.id)
      if (lightboxIndex === -1) return

      openImage(
        embeddrApi.artifacts.getContentUrl(String(image.id)),
        {
          id: 'virtual-gallery',
          images: lightboxPosts.map((p) => ({
            src: embeddrApi.artifacts.getContentUrl(String(p.id)),
            title: p.prompt,
            metadata: p as any,
            media_type: p.media_type === 'video' ? 'video' : 'image',
          })),
          fetchMore: () => currentFetchNext(),
          totalImages: currentHasNext
            ? lightboxPosts.length + 100
            : lightboxPosts.length,
        },
        lightboxIndex,
      )
    }
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearchImageId(null)
      setActiveSearchQuery(searchQuery)
      setActiveTab('search')
    }
  }

  return (
    <div className="w-full h-full overflow-hidden flex p-1">
      {/* Left Sidebar */}
      <ExploreSidebar
        showSidebar={showSidebar}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSearchQuery={activeSearchQuery}
        searchImageId={searchImageId}
        selectedLibraryId={selectedLibraryId}
        setSelectedLibraryId={setSelectedLibraryId}
        selectedCollectionId={selectedCollectionId}
        setSelectedCollectionId={setSelectedCollectionId}
        selectedSourceId={selectedSourceId}
        setSelectedSourceId={setSelectedSourceId}
        libraryPaths={libraryPaths}
        collections={collections}
        sourceCollections={sourceCollections}
        refetchCollections={refetchCollections}
        gridCols={gridCols}
        setGridCols={setGridCols}
        imageFit={imageFit}
        setImageFit={setImageFit}
        autoGrid={autoGrid}
        setAutoGrid={setAutoGrid}
        useOriginalImages={useOriginalImages}
        setUseOriginalImages={setUseOriginalImages}
        mediaType={mediaType}
        setMediaType={setMediaType}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        selectedTypeName={selectedTypeName}
        setSelectedTypeName={setSelectedTypeName}
        selectedSourceType={selectedSourceType}
        setSelectedSourceType={setSelectedSourceType}
        importSourceOptions={importSourceOptions}
        importInstanceOptions={importInstanceOptions}
        originOptions={originOptions}
        providerCounts={providerCounts}
        navigate={navigate}
      />

      {/* Main Content Area */}
      <Card
        className={cn(
          'flex-1 flex flex-col overflow-visible h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0',
        )}
      >
        <Tabs
          defaultValue="new"
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v)
            if (v !== 'search') {
              setSearchImageId(null)
            }
          }}
          className="h-full flex flex-col w-full! min-h-0 gap-1! space-y-0!"
        >
          {/* SEARCH BAR DIV */}
          <div className="flex items-center shrink-0 border border-foreground/10 p-1 bg-card/20 gap-1 rounded-md">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'border ring-0!',
                showSidebar && 'bg-foreground/20!',
              )}
              onClick={() => setShowSidebar((prev) => !prev)}
            >
              <Settings2Icon />
            </Button>
            <TabsList className="grid grid-cols-4 border border-foreground/20 bg-card/20 gap-1">
              <TabsTrigger value="new">
                <ClockPlus className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger
                value="random"
                onPointerDown={() => {
                  if (activeTab === 'random') {
                    queryClient.invalidateQueries({
                      queryKey: ['items', 'random'],
                    })
                  }
                }}
              >
                <FolderSyncIcon className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <div className="ml-auto">
              <TagsFilter
                tags={tags || []}
                selectedTags={selectedTags}
                onToggleTag={(tag) => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter((t) => t !== tag))
                  } else {
                    setSelectedTags([...selectedTags, tag])
                  }
                }}
                onClearTags={() => setSelectedTags([])}
                onSoloTag={(tag) => setSelectedTags([tag])}
              />
            </div>

            <div className="flex items-center gap-2 h-full">
              <div className="flex items-center space-x-2 border-r pr-2 border-foreground/10">
                <Switch
                  id="live-mode"
                  checked={isLive}
                  onCheckedChange={setIsLive}
                />
                <Label htmlFor="live-mode" className="text-xs cursor-pointer">
                  Live
                </Label>
              </div>

              <div className="relative w-50 md:w-75 h-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  className="pl-8 h-full dark:bg-input/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </div>
          </div>

          {searchImageId && (
            <div className="flex items-center justify-between bg-primary/5 px-1 pl-2 py-1.5 border border-foreground/10 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <ScanEye className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">
                  Showing images similar to{' '}
                  <span className="text-muted-foreground">
                    #{searchImageId}
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-primary/10"
                onClick={() => {
                  setSearchImageId(null)
                  if (!activeSearchQuery) setActiveTab('new')
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}

          <TabsContent
            value="search"
            className="flex-1 m-0 overflow-hidden rounded-md"
          >
            {activeTab === 'search' &&
              (isSearchLoading ? (
                <div className="flex items-center justify-center h-full flex-col">
                  <Spinner />
                </div>
              ) : filteredSearchPosts.length === 0 ? (
                <div className="flex items-center justify-center h-full flex-col text-muted-foreground">
                  No results found for "{activeSearchQuery || 'Image Search'}"
                </div>
              ) : (
                <PostsScrollArea
                  posts={filteredSearchPosts}
                  fetchNextPage={fetchNextSearchPage}
                  hasNextPage={hasNextSearchPage}
                  isFetchingNextPage={isFetchingNextSearchPage}
                  onSelect={handleOpenLightbox}
                  onOpenDetails={handleSelectImage}
                  onSearchByImage={handleSearchByImage}
                  selectedId={selectedImage?.id}
                  queryKey={['search', activeSearchQuery, searchImageId]}
                  gridCols={autoGrid ? null : gridCols}
                  imageFit={imageFit}
                  useOriginalImages={useOriginalImages}
                />
              ))}
          </TabsContent>

          <TabsContent value="random" className="flex-1 m-0 overflow-hidden">
            {activeTab === 'random' &&
              (isLoading ? (
                <div className="flex items-center justify-center h-full flex-col">
                  <Spinner />
                </div>
              ) : (
                <PostsScrollArea
                  key={`random-${selectedLibraryId}-${selectedCollectionId}`}
                  posts={posts}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onSelect={handleOpenLightbox}
                  onOpenDetails={handleSelectImage}
                  onSearchByImage={handleSearchByImage}
                  selectedId={selectedImage?.id}
                  queryKey={[
                    'items',
                    'random',
                    selectedLibraryId,
                    selectedCollectionId,
                  ]}
                  gridCols={autoGrid ? null : gridCols}
                  imageFit={imageFit}
                  useOriginalImages={useOriginalImages}
                />
              ))}
          </TabsContent>

          <TabsContent value="new" className="flex-1 m-0 overflow-hidden">
            {activeTab === 'new' &&
              (isLoading ? (
                <div className="flex items-center justify-center h-full flex-col">
                  <Spinner />
                </div>
              ) : (
                <PostsScrollArea
                  key={`new-${selectedLibraryId}-${selectedCollectionId}`}
                  posts={posts}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onSelect={handleOpenLightbox}
                  onOpenDetails={handleSelectImage}
                  onSearchByImage={handleSearchByImage}
                  selectedId={selectedImage?.id}
                  queryKey={[
                    'items',
                    'new',
                    selectedLibraryId,
                    selectedCollectionId,
                  ]}
                  gridCols={autoGrid ? null : gridCols}
                  imageFit={imageFit}
                  useOriginalImages={useOriginalImages}
                />
              ))}
          </TabsContent>

          <TabsContent value="following" className="flex-1 m-0 overflow-hidden">
            {activeTab === 'following' &&
              (isLoading ? (
                <div className="flex items-center justify-center h-full flex-col">
                  <Spinner />
                </div>
              ) : (
                <PostsScrollArea
                  key={`following-${selectedLibraryId}-${selectedCollectionId}`}
                  posts={posts}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onSelect={handleOpenLightbox}
                  onOpenDetails={handleSelectImage}
                  onSearchByImage={handleSearchByImage}
                  selectedId={selectedImage?.id}
                  queryKey={[
                    'items',
                    'following',
                    selectedLibraryId,
                    selectedCollectionId,
                  ]}
                  gridCols={autoGrid ? null : gridCols}
                  imageFit={imageFit}
                  useOriginalImages={useOriginalImages}
                />
              ))}
          </TabsContent>
        </Tabs>
      </Card>

      <ImageDetailDialog
        imageId={detailImageId}
        open={!!detailImageId}
        onOpenChange={(open) => !open && setDetailImageId(null)}
        onSearchByImage={(artifactId) => {
          setDetailImageId(null)
          setSearchImageId(artifactId)
          setSearchQuery('')
          setActiveSearchQuery('')
          setActiveTab('search')
        }}
      />
    </div>
  )
}

export default ExplorePage
