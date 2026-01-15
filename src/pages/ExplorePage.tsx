import { useEffect, useMemo, useState } from 'react'
import { Card } from '@embeddr/react-ui/components/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Switch } from '@embeddr/react-ui/components/switch'

import { Label } from '@embeddr/react-ui/components/label'
import { Button } from '@embeddr/react-ui/components/button'
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
import { toast } from 'sonner'

import { Spinner } from '@embeddr/react-ui/components/spinner'
import { useNavigate } from '@tanstack/react-router'
import { useImageDialog } from '@embeddr/react-ui/hooks'
import { Input } from '@embeddr/react-ui/components/input'
import type { PromptImage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ImageDetailDialog } from '@/components/dialogs/ImageDetailDialog'
import { Route } from '@/routes/search'
import { TagsFilter } from '@/components/search/TagsFilter'
import PostsScrollArea from '@/components/search/PostsScrollArea'
import { fetchCollections, fetchItems, fetchTags, searchItems } from '@/lib/api'
import { embeddrApi } from '@/lib/api/v2/client'
import type { Artifact } from '@/lib/api/v2/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'

import { ExploreSidebar } from '@/components/panels/ExploreSidebar'

import { useRef } from 'react'

const mapArtifactToImage = (a: Artifact): PromptImage => ({
  id: a.id as any, // Cast UUID to any to bypass number type check till PromptImage is updated
  created_at: a.created_at,
  url: embeddrApi.artifacts.getContentUrl(a.id),
  image_url: embeddrApi.artifacts.getContentUrl(a.id),
  thumb_url: embeddrApi.artifacts.getPreviewUrl(a.id, 'thumbnail'),
  file_size: 0,
  prompt:
    a.metadata_json?.prompt ||
    a.metadata_json?.label ||
    a.uri?.split('/').pop() ||
    '',
  author_name: 'Local User',
  author_username: 'local',
  media_type:
    a.base_type_name === 'collection' ||
    a.type_name === 'collection' ||
    a.base_type_name == 'folder'
      ? 'collection' // Use 'collection' if available, otherwise we will treat as image but leverage `is_collection` property.
      : // Or if TypeScript is strict, we might need a workaround. Assuming PromptImage allows arbitrary strings or we cast.
        ((a.base_type_name === 'video' || a.type_name === 'video'
          ? 'video'
          : 'image') as any),
  duration: 0,
  fps: 0,
  frame_count: 0,
  phash: '',
  is_archived: !!a.metadata_json?.is_archived,
  width: a.metadata_json?.width || 0,
  height: a.metadata_json?.height || 0,
})
import { useSettings } from '@/hooks/useSettings'
import { globalEventBus } from '@/lib/eventBus'

const ExplorePage = () => {
  const { openImage, closeImage } = useImageDialog()
  const { selectedModel } = useSettings()
  const queryClient = useQueryClient()
  const { imageId } = Route.useSearch()
  const session = {
    user: { id: 'local', name: 'Local User', username: 'local' },
  }
  const isPending = false
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
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'all'>('all')
  const [showArchived, setShowArchived] = useState<boolean | null>(false)
  const [useReranker, setUseReranker] = useLocalStorage(
    'explore-use-reranker',
    false,
  )
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

  useEffect(() => {
    if (imageId) {
      setSearchImageId(imageId)
      setActiveTab('search')
      setSearchQuery('')
      setActiveSearchQuery('')
    }
  }, [imageId])

  useEffect(() => {
    // if (!isPending && session && !session.user.username) {
    //   navigate({ to: '/onboarding' })
    // }
  }, [session, isPending, navigate])

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
      ],
      queryFn: async ({ pageParam }) => {
        if (selectedCollectionId) {
          // V2 Collection Items
          const res = await embeddrApi.artifacts.list({
            collection_id: selectedCollectionId.toString(),
            limit: 50,
            offset: pageParam,
            sort: activeTab === 'random' ? 'random' : 'new',
          })
          return res.items.map(mapArtifactToImage)
        }

        if (selectedSourceId) {
          // By Parent ID / Source Collection
          const res = await embeddrApi.artifacts.list({
            parent_id: selectedSourceId.toString(),
            limit: 50,
            offset: pageParam,
            sort: activeTab === 'random' ? 'random' : 'new',
          })
          return res.items.map(mapArtifactToImage)
        }

        let sort: 'random' | 'new' = 'new'
        if (activeTab === 'new') sort = 'new'
        if (activeTab === 'random') sort = 'random'

        const res = await embeddrApi.artifacts.list({
          limit: 50,
          offset: pageParam,
          library_id: selectedLibraryId?.toString(),
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          media_type: mediaType === 'all' ? undefined : mediaType,
          sort: sort,
          is_archived: showArchived || false,
        })
        return res.items.map(mapArtifactToImage)
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < 50) return undefined
        return allPages.length * 50
      },
    })

  // Listen for generation completion to refresh the list (Replaced by unified effect above)
  /* useEffect(() => {
    const unsubscribe = globalEventBus.on('generation:complete', () => {
      console.log(
        '[ExplorePage] Received generation:complete, invalidating queries',
      )
      // Only invalidate if we are on the 'new' tab, as that's where new images appear
      if (activeTab === 'new') {
        queryClient.invalidateQueries({ queryKey: ['items'] })
      }
    })
    return unsubscribe
  }, [queryClient, activeTab]) */

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

  // const {
  //   data: likedData,
  //   fetchNextPage: fetchNextLikedPage,
  //   hasNextPage: hasNextLikedPage,
  //   isFetchingNextPage: isFetchingNextLikedPage,
  //   isLoading: isLikedLoading,
  // } = useInfiniteQuery({
  //   queryKey: ["liked-items"],
  //   queryFn: ({ pageParam }) =>
  //     fetchUserLikes({ offset: pageParam, limit: 50 }),
  //   initialPageParam: 0,
  //   getNextPageParam: (lastPage, allPages) => {
  //     if (lastPage.length < 50) return undefined;
  //     return allPages.length * 50;
  //   },
  //   enabled: !!session,
  // });

  // const likedPosts = useMemo(() => {
  //   if (!likedData) return [];
  //   const flatPosts = likedData.pages.flat();
  //   const seen = new Set();
  //   return flatPosts.filter((post) => {
  //     if (seen.has(post.id)) return false;
  //     seen.add(post.id);
  //     return true;
  //   });
  // }, [likedData]);

  // ... existing imports

  // Inside component

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
      useReranker,
    ],
    queryFn: async () => {
      if (searchImageId) {
        const res = await embeddrApi.artifacts.findSimilar(
          searchImageId.toString(),
          50,
          selectedModel,
        )
        if (res.items.length === 0) return []

        const ids = res.items.map((i) => i.id)
        const artifacts = await Promise.all(
          ids.map((id) => embeddrApi.artifacts.get(id)),
        )
        return artifacts.map(mapArtifactToImage)
      }

      // Use V2 Semantic Search
      const res = await embeddrApi.artifacts.semanticSearch(
        activeSearchQuery,
        50,
        useReranker,
        selectedModel,
      )
      // Plugin returns { items: [{ id, score }] }. We need to fetch full artifacts or just headers?
      // UI needs images. We should Hydrate them.
      // Fetch details for the IDs.
      if (res.items.length === 0) return []

      const ids = res.items.map((i) => i.id)

      // We don't have a bulk fetch by ID endpoint in V2 yet (artifacts.list doesn't take IDs array in my edit).
      // We can iterate fetch (slow) or better: update backend list to accept ids or use search endpoint in V2 artifacts.py
      // V2 artifacts.py search_artifacts(q) uses text search.
      // The USER wants embedding search.
      // So we have IDs from plugin.
      // Let's implement a 'getByIds' or 'list' with IDs in client/backend.
      // For now, let's use parallel fetch.
      const artifacts = await Promise.all(
        ids.map((id) => embeddrApi.artifacts.get(id)),
      )
      return artifacts.map(mapArtifactToImage)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined
      return allPages.length * 50
    },
    enabled:
      activeTab === 'search' &&
      (activeSearchQuery.length > 0 || searchImageId !== null),
  })

  const searchPosts = useMemo(() => {
    if (!searchData) return []
    const flatPosts = searchData.pages.flat()
    const seen = new Set()
    return flatPosts.filter((post) => {
      if (seen.has(post.id)) return false
      seen.add(post.id)
      return true
    })
  }, [searchData])

  const { setGalleryImages, currentGallery } = useImageDialog()

  const currentPosts = activeTab === 'search' ? searchPosts : posts
  const currentFetchNext =
    activeTab === 'search' ? fetchNextSearchPage : fetchNextPage
  const currentHasNext =
    activeTab === 'search' ? hasNextSearchPage : hasNextPage

  // Sync images to lightbox when they change
  useEffect(() => {
    if (currentGallery?.id === 'virtual-gallery' && currentPosts.length > 0) {
      const galleryImages = currentPosts.map((p) => ({
        src: p.image_url,
        title: p.prompt,
        metadata: p as any,
        media_type: (p.media_type === 'video' ? 'video' : 'image') as
          | 'video'
          | 'image',
      }))
      const totalImages = currentHasNext
        ? currentPosts.length + 100
        : currentPosts.length
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
      openImage(
        image.image_url,
        {
          id: 'virtual-gallery',
          images: currentPosts.map((p) => ({
            src: p.image_url,
            title: p.prompt,
            metadata: p as any,
            media_type: p.media_type === 'video' ? 'video' : 'image',
          })),
          fetchMore: () => currentFetchNext(),
          totalImages: currentHasNext
            ? currentPosts.length + 100
            : currentPosts.length,
        },
        index,
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
        useReranker={useReranker}
        setUseReranker={setUseReranker}
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
          <div className="flex items-center shrink-0 border border-foreground/10 p-1 bg-card/20 gap-1">
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

          <TabsContent value="search" className="flex-1 m-0 overflow-hidden">
            {activeTab === 'search' &&
              (isSearchLoading ? (
                <div className="flex items-center justify-center h-full flex-col">
                  <Spinner />
                </div>
              ) : searchPosts.length === 0 ? (
                <div className="flex items-center justify-center h-full flex-col text-muted-foreground">
                  No results found for "{activeSearchQuery || 'Image Search'}"
                </div>
              ) : (
                <PostsScrollArea
                  posts={searchPosts}
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
      />
    </div>
  )
}

export default ExplorePage
