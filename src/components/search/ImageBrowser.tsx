import React, { useEffect, useRef, useState } from 'react'
import { Input } from '@embeddr/react-ui/components/input'
import { Button } from '@embeddr/react-ui/components/button'
import { Slider } from '@embeddr/react-ui/components/slider'
import { Label } from '@embeddr/react-ui/components/label'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import {
  Archive,
  Filter,
  Folder,
  GripVertical,
  Image as ImageIcon,
  Library,
  ScanEye,
  Search,
  SlidersHorizontal,
  Video, X 
} from 'lucide-react'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ImageLightbox } from './ImageLightbox'
import type { PromptImage } from '@/lib/api/types'
import {
  fetchCollectionItems,
  fetchCollections,
  fetchItems,
  fetchLibraryPaths,
  searchItems,
  searchItemsByImageId,
} from '@/lib/api'
import PostsScrollArea from '@/components/search/PostsScrollArea'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { cn } from '@/lib/utils'
import { globalEventBus } from '@/lib/eventBus'

interface ImageBrowserProps {
  onSelect: (image: PromptImage) => void
  defaultGridCols?: number
  storageKey?: string
}

export function ImageBrowser({
  onSelect,
  defaultGridCols = 5,
  storageKey = 'explore-grid-cols',
}: ImageBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [searchImageId, setSearchImageId] = useState<number | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null)
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(
    null,
  )
  const [gridCols, setGridCols] = useLocalStorage(storageKey, defaultGridCols)
  const [imageFit] = useLocalStorage<'cover' | 'contain'>(
    'explore-image-fit',
    'cover',
  )
  const [lightboxImage, setLightboxImage] = useState<PromptImage | null>(null)
  const [showArchived, setShowArchived] = useState<boolean | null>(false)
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'all'>('all')
  const queryClient = useQueryClient()

  // Listen for new generations and uploads to refresh the list
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[ImageBrowser] Refreshing images query')
      queryClient.invalidateQueries({ queryKey: ['images'] })
      queryClient.refetchQueries({ queryKey: ['images'] })
    }

    const unsubGen = globalEventBus.on('generation:complete', handleRefresh)
    const unsubUpload = globalEventBus.on('image:uploaded', handleRefresh)

    return () => {
      unsubGen()
      unsubUpload()
    }
  }, [queryClient])

  // Fetch collections
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  })

  // Fetch libraries
  const { data: libraries } = useQuery({
    queryKey: ['libraries'],
    queryFn: fetchLibraryPaths,
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        'images',
        activeSearchQuery,
        searchImageId,
        selectedCollectionId,
        selectedLibraryId,
        showArchived,
        mediaType,
      ],
      queryFn: ({ pageParam = 0 }) => {
        if (searchImageId) {
          return searchItemsByImageId(
            searchImageId,
            50,
            pageParam,
            selectedLibraryId,
          )
        }
        if (activeSearchQuery) {
          return searchItems(
            activeSearchQuery,
            50,
            pageParam,
            selectedLibraryId,
            undefined,
            selectedCollectionId,
            showArchived,
            mediaType === 'all' ? undefined : mediaType,
          )
        }
        if (selectedCollectionId) {
          return fetchCollectionItems(selectedCollectionId, pageParam, 50)
        }
        return fetchItems({
          offset: pageParam,
          limit: 50,
          libraryId: selectedLibraryId,
          isArchived: showArchived,
          mediaType: mediaType === 'all' ? undefined : mediaType,
        })
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === 50 ? allPages.length * 50 : undefined,
    })

  const posts = data?.pages.flatMap((page) => page) || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveSearchQuery(searchQuery)
    setSearchImageId(null)
    setSelectedCollectionId(null)
  }

  const handleSearchByImage = (image: PromptImage) => {
    setSearchImageId(image.id)
    setSearchQuery('')
    setActiveSearchQuery('')
    setSelectedCollectionId(null)
  }

  return (
    <div className="flex h-full flex-col relative overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 flex items-center gap-2 p-2 border-b bg-background z-30">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            className="pl-8 h-9"
          />
        </div>

        {/* Library Select */}
        <Select
          value={selectedLibraryId?.toString() || 'all'}
          onValueChange={(val) => {
            if (val === 'all') {
              setSelectedLibraryId(null)
            } else {
              setSelectedLibraryId(parseInt(val))
            }
          }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Library" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center">
                <Library className="mr-2 h-4 w-4" />
                All Libraries
              </div>
            </SelectItem>
            {libraries?.map((library) => (
              <SelectItem key={library.id} value={library.id.toString()}>
                <div className="flex items-center w-full">
                  <Library className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {library.name || library.path}
                  </span>
                  {library.image_count !== undefined && (
                    <span className="ml-auto text-xs text-muted-foreground pl-2">
                      {library.image_count}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Collection Select */}
        <Select
          value={selectedCollectionId?.toString() || 'all'}
          onValueChange={(val) => {
            if (val === 'all') {
              setSelectedCollectionId(null)
            } else {
              setSelectedCollectionId(parseInt(val))
              setSearchImageId(null)
              setActiveSearchQuery('')
              setSearchQuery('')
            }
          }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center">
                <Folder className="mr-2 h-4 w-4" />
                All Images
              </div>
            </SelectItem>
            {collections?.map((collection) => (
              <SelectItem key={collection.id} value={collection.id.toString()}>
                <div className="flex items-center w-full">
                  <Folder className="mr-2 h-4 w-4" />
                  <span className="truncate">{collection.name}</span>
                  {collection.item_count !== undefined && (
                    <span className="ml-auto text-xs text-muted-foreground pl-2">
                      {collection.item_count}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Media Type */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={mediaType !== 'all' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              title="Media Type"
            >
              {mediaType === 'video' ? (
                <Video className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setMediaType('all')}>
              <Filter className="mr-2 h-4 w-4" /> All Media
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMediaType('image')}>
              <ImageIcon className="mr-2 h-4 w-4" /> Images Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMediaType('video')}>
              <Video className="mr-2 h-4 w-4" /> Videos Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Archive Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={showArchived !== null ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              title="Archive Status"
            >
              {showArchived === true ? (
                <Archive className="h-4 w-4" />
              ) : (
                <ScanEye className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowArchived(false)}>
              <ScanEye className="mr-2 h-4 w-4" /> Active Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowArchived(true)}>
              <Archive className="mr-2 h-4 w-4" /> Archived Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowArchived(null)}>
              <Filter className="mr-2 h-4 w-4" /> All Items
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Zoom / View Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title="View Settings"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Columns: {gridCols}</Label>
              </div>
              <Slider
                value={[Number(gridCols)]}
                min={2}
                max={10}
                step={1}
                onValueChange={(vals) => setGridCols(vals[0])}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters (Chips) - Only for special things like "Similar to #ID" */}
      {searchImageId && (
        <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium border border-primary/20">
            <ScanEye className="h-3 w-3" />
            <span>Similar to #{searchImageId}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-4 w-4 ml-1 hover:bg-primary/20"
              onClick={() => setSearchImageId(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative min-h-0">
        <PostsScrollArea
          posts={posts}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onSelect={onSelect}
          onSearchByImage={handleSearchByImage}
          onOpenDetails={(image) => setLightboxImage(image)}
          gridCols={gridCols}
          imageFit={imageFit}
          onArchive={() => {
            queryClient.invalidateQueries({ queryKey: ['images'] })
          }}
        />
      </div>

      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  )
}
