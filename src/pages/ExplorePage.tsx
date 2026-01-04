import { useEffect, useMemo, useState } from 'react'
import { Card } from '@embeddr/react-ui/components/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@embeddr/react-ui/components/dialog'
import { Label } from '@embeddr/react-ui/components/label'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Separator } from '@embeddr/react-ui/components/separator'
import {
  BookCopyIcon,
  ClockPlus,
  Eye,
  FilterIcon,
  FolderPlus,
  FolderSyncIcon,
  Info,
  Layers,
  Plus,
  ScanEye,
  Search,
  Settings2Icon,
  Tag,
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
import { Route } from '@/routes'
import { FilterConfigPanel } from '@/components/search/FilterConfigPanel'
import { TagsFilter } from '@/components/search/TagsFilter'
import PostsScrollArea from '@/components/search/PostsScrollArea'
import {
  addItemToCollection,
  createCollection,
  fetchCollectionItems,
  fetchCollections,
  fetchItems,
  fetchLibraryPaths,
  fetchTags,
  searchItems,
  searchItemsByImageId,
} from '@/lib/api'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useSettings } from '@/hooks/useSettings'

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
  const [sidebarTab, setSidebarTab] = useState('folders')
  const [showSidebar, setShowSidebar] = useLocalStorage(
    'explore-show-sidebar',
    true,
  )
  const [selectedImage, setSelectedImage] = useState<PromptImage | null>(null)
  const [detailImageId, setDetailImageId] = useState<string | null>(null)
  const [searchImageId, setSearchImageId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(
    null,
  )
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false)
  const [dragOverCollectionId, setDragOverCollectionId] = useState<
    number | null
  >(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'all'>('all')
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
  const navigate = useNavigate()

  // Fetch Library Paths
  const { data: libraryPaths } = useQuery({
    queryKey: ['library-paths'],
    queryFn: fetchLibraryPaths,
  })

  // Fetch Collections
  const { data: collections, refetch: refetchCollections } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
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
        selectedTags,
        mediaType,
        showArchived,
      ],
      queryFn: ({ pageParam }) => {
        if (selectedCollectionId) {
          return fetchCollectionItems(selectedCollectionId, pageParam, 50)
        }

        let sort: 'random' | 'new' = 'new'
        const filter: 'all' | 'following' = 'all'

        if (activeTab === 'new') sort = 'new'
        if (activeTab === 'random') sort = 'random'

        return fetchItems({
          offset: pageParam,
          limit: 50,
          sort,
          filter,
          libraryId: selectedLibraryId,
          tags: selectedTags,
          mediaType: mediaType === 'all' ? undefined : mediaType,
          isArchived: showArchived,
        })
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
    ],
    queryFn: ({ pageParam }) => {
      if (searchImageId) {
        return searchItemsByImageId(
          searchImageId,
          50,
          pageParam,
          selectedLibraryId,
          selectedModel,
          selectedCollectionId,
          showArchived,
          mediaType === 'all' ? undefined : mediaType,
        )
      }
      return searchItems(
        activeSearchQuery,
        50,
        pageParam,
        selectedLibraryId,
        selectedModel,
        selectedCollectionId,
        showArchived,
        mediaType === 'all' ? undefined : mediaType,
      )
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

  const handleOpenLightbox = (image: PromptImage) => {
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

  const handleCreateCollection = async () => {
    try {
      await createCollection({ name: newCollectionName })
      setNewCollectionName('')
      setIsCreateCollectionOpen(false)
      refetchCollections()
      toast.success('Collection created')
    } catch (e) {
      toast.error('Failed to create collection')
    }
  }

  return (
    <div className="w-full h-full overflow-hidden flex p-1">
      {/* Left Sidebar */}
      <div
        className={cn(
          'flex flex-col overflow-hidden h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 transition-all duration-300 ease-in-out',
          showSidebar
            ? 'w-80 opacity-100 translate-x-0 mr-1'
            : 'w-0 opacity-0 -translate-x-4 mr-0',
        )}
      >
        <div className="w-80 h-full flex flex-col gap-1">
          {/* <div className="col-span-1 flex-col gap-1 h-full hidden md:flex"> */}
          {/* User Profile / Auth CTA */}
          {/* Folders Section / Image Details */}
          <Card className="flex-1 p-0! gap-0! flex flex-col overflow-visible min-h-0">
            <Tabs
              value={sidebarTab}
              onValueChange={(v) => setSidebarTab(v)}
              className="h-full flex flex-col w-full! min-h-0 gap-1! space-y-0!"
            >
              <div className="flex items-center justify-between shrink-0 border-b border-foreground/10 p-1 bg-muted/35">
                <TabsList
                  className={cn(
                    'flex gap-1 w-full justify-start',
                    // selectedImage ? 'grid-cols-2' : 'grid-cols-1',
                  )}
                >
                  <TabsTrigger
                    value="folders"
                    className="max-w-fit items-center gap-2"
                  >
                    <BookCopyIcon className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="collections"
                    className="max-w-fit items-center gap-2"
                  >
                    <Layers className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="ml-auto max-w-fit items-center gap-2"
                    disabled={!selectedImage}
                  >
                    <Info className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="config"
                    className="max-w-fit items-center gap-2"
                  >
                    <FilterIcon className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="collections"
                className="flex-1 m-0 overflow-hidden flex flex-col"
              >
                <ScrollArea className="flex-1">
                  <div className="p-2 flex flex-row items-center justify-between space-y-0">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Collections
                    </span>
                    <Dialog
                      open={isCreateCollectionOpen}
                      onOpenChange={setIsCreateCollectionOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create Collection</DialogTitle>
                          <DialogDescription>
                            Create a new collection to organize your images.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                              Name
                            </Label>
                            <Input
                              id="name"
                              autoComplete="off"
                              value={newCollectionName}
                              onChange={(e) =>
                                setNewCollectionName(e.target.value)
                              }
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCreateCollection}>
                            Create
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Separator />

                  <div className="p-2 space-y-1">
                    {collections?.map((collection) => (
                      <Button
                        key={collection.id}
                        variant={
                          selectedCollectionId === collection.id
                            ? 'secondary'
                            : dragOverCollectionId === collection.id
                              ? 'secondary'
                              : 'ghost'
                        }
                        className={cn(
                          'w-full justify-between font-normal h-9 transition-all',
                          dragOverCollectionId === collection.id &&
                            'ring-2 ring-primary ring-inset scale-[1.02]',
                        )}
                        onClick={() => {
                          setSelectedCollectionId(collection.id)
                          setSelectedLibraryId(null)
                          if (
                            activeTab === 'search' &&
                            !activeSearchQuery &&
                            !searchImageId
                          ) {
                            setActiveTab('new')
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragOverCollectionId(collection.id)
                        }}
                        onDragLeave={() => setDragOverCollectionId(null)}
                        onDrop={async (e) => {
                          e.preventDefault()
                          setDragOverCollectionId(null)
                          const imageId = e.dataTransfer.getData(
                            'application/embeddr-image-id',
                          )
                          if (imageId) {
                            try {
                              await addItemToCollection(
                                collection.id,
                                parseInt(imageId),
                              )
                              toast.success(`Added to ${collection.name}`)
                              refetchCollections()
                            } catch (err) {
                              toast.error('Failed to add to collection')
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Layers className="h-4 w-4 shrink-0" />
                          <span className="truncate">{collection.name}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 px-1.5 min-w-5 justify-center"
                        >
                          {collection.item_count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="folders"
                className="flex-1 m-0 overflow-hidden flex flex-col"
              >
                <div className="p-2 flex flex-row items-center justify-between space-y-0">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Libraries
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      navigate({ to: '/settings', search: { tab: 'library' } })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Separator />
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    <Button
                      variant={
                        selectedLibraryId === null &&
                        selectedCollectionId === null
                          ? 'secondary'
                          : 'ghost'
                      }
                      className="w-full justify-between font-normal h-9"
                      onClick={() => {
                        setSelectedLibraryId(null)
                        setSelectedCollectionId(null)
                      }}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderPlus className="h-4 w-4 text-muted-foreground" />
                        All Images
                      </span>
                    </Button>
                    {libraryPaths?.map((folder) => (
                      <Button
                        key={folder.id}
                        variant={
                          selectedLibraryId === folder.id
                            ? 'secondary'
                            : 'ghost'
                        }
                        className="w-full justify-between font-normal h-9"
                        onClick={() => {
                          setSelectedLibraryId(folder.id)
                          setSelectedCollectionId(null)
                          if (
                            activeTab === 'search' &&
                            !activeSearchQuery &&
                            !searchImageId
                          ) {
                            setActiveTab('new')
                          }
                        }}
                      >
                        <span
                          className="flex items-center gap-2 truncate"
                          title={folder.path}
                        >
                          <FolderPlus className="h-4 w-4 text-muted-foreground" />
                          {folder.name || folder.path.split('/').pop()}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs h-5 px-1.5"
                        >
                          {folder.image_count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="details"
                className="flex-1 m-0 overflow-hidden flex flex-col"
              >
                {/* {selectedImage ? (
                <ImageDetailsSidebar
                  image={fullSelectedImage || selectedImage}
                  onClose={handleCloseDetails}
                  onToggleLike={handleToggleLike}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                  Select an image to view details
                </div>
              )} */}
              </TabsContent>

              <TabsContent
                value="config"
                className="flex-1 m-0 overflow-hidden"
              >
                <FilterConfigPanel
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
                />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Visualizer CTA - Pushed to bottom */}
          {/* <VisualizerCTA /> */}
        </div>
      </div>

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
          <div className="flex items-center shrink-0 border border-foreground/10 p-1 bg-card gap-1">
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
            <TabsList className="grid grid-cols-4 border border-foreground/0 bg-card gap-1">
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
                  if (!activeSearchQuery) setActiveTab('random')
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
