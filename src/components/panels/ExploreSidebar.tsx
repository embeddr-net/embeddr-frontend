import React, { useState } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Card } from '@embeddr/react-ui/components/card'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import { Separator } from '@embeddr/react-ui/components/separator'
import { Badge } from '@embeddr/react-ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@embeddr/react-ui/components/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import {
  BookCopyIcon,
  Database,
  Layers,
  Info,
  FilterIcon,
  Settings,
  FolderPlus,
  Folder,
  Plus,
  X,
  Search,
  HardDrive,
  Cloud,
  Server,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProviderInfo } from '@/lib/providers'
import { FilterConfigPanel } from '@/components/search/FilterConfigPanel'
import { ImageDetailsSidebar } from '@/components/panels/ImageDetailsSidebar'
import type { PromptImage } from '@/lib/api'
import { toast } from 'sonner'
import { embeddrApi } from '@/lib/api/v2/client'
import { useQueryClient } from '@tanstack/react-query'

interface SidebarProps {
  showSidebar: boolean
  sidebarTab: string
  setSidebarTab: (value: string) => void
  selectedImage: PromptImage | null
  setSelectedImage: (image: PromptImage | null) => void
  activeTab: string
  setActiveTab: (value: string) => void
  activeSearchQuery: string
  searchImageId: number | string | null

  // Selection State
  selectedLibraryId: string | null
  setSelectedLibraryId: (id: string | null) => void
  selectedCollectionId: string | null
  setSelectedCollectionId: (id: string | null) => void
  selectedSourceId: string | null
  setSelectedSourceId: (id: string | null) => void

  // Data
  libraryPaths?: any[]
  collections?: any[]
  sourceCollections?: any[]
  refetchCollections: () => void

  // Config
  gridCols: number
  setGridCols: (val: number) => void
  imageFit: 'cover' | 'contain'
  setImageFit: (val: 'cover' | 'contain') => void
  autoGrid: boolean
  setAutoGrid: (val: boolean) => void
  useOriginalImages: boolean
  setUseOriginalImages: (val: boolean) => void
  mediaType: 'image' | 'video' | 'all'
  setMediaType: (val: 'image' | 'video' | 'all') => void
  showArchived: boolean | null
  setShowArchived: (val: boolean | null) => void
  useReranker: boolean
  setUseReranker: (val: boolean) => void

  // New Providers Filter
  selectedSourceType: string | null
  setSelectedSourceType: (val: string | null) => void

  // Navigation
  navigate: (args: any) => void
}

export function ExploreSidebar({
  showSidebar,
  sidebarTab,
  setSidebarTab,
  selectedImage,
  setSelectedImage,
  activeTab,
  setActiveTab,
  activeSearchQuery,
  searchImageId,
  selectedLibraryId,
  setSelectedLibraryId,
  selectedCollectionId,
  setSelectedCollectionId,
  selectedSourceId,
  setSelectedSourceId,
  libraryPaths,
  collections,
  sourceCollections,
  refetchCollections,
  gridCols,
  setGridCols,
  imageFit,
  setImageFit,
  autoGrid,
  setAutoGrid,
  useOriginalImages,
  setUseOriginalImages,
  mediaType,
  setMediaType,
  showArchived,
  setShowArchived,
  useReranker,
  setUseReranker,
  selectedSourceType,
  setSelectedSourceType,
  navigate,
}: SidebarProps) {
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false)
  const [dragOverCollectionId, setDragOverCollectionId] = useState<
    string | null
  >(null)
  const [filterQuery, setFilterQuery] = useState('')

  // Filter the lists
  const filteredLibraries =
    libraryPaths?.filter(
      (l) =>
        (l.label || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
        (l.uri || '').toLowerCase().includes(filterQuery.toLowerCase()),
    ) || []

  const filteredCollections =
    collections?.filter((c) =>
      (c.name || c.label || '')
        .toLowerCase()
        .includes(filterQuery.toLowerCase()),
    ) || []

  // Sources can be messy, filter by multiple fields
  const filteredSources =
    sourceCollections?.filter((s) => {
      const term = filterQuery.toLowerCase()
      return (
        (s.metadata?.post_title || '').toLowerCase().includes(term) ||
        (s.label || '').toLowerCase().includes(term) ||
        (s.uri?.split('/').pop() || '').toLowerCase().includes(term) ||
        (s.id?.toString() || '').includes(term)
      )
    }) || []

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return
    try {
      await embeddrApi.collections.create(newCollectionName)
      toast.success('Collection created')
      refetchCollections()
      setIsCreateCollectionOpen(false)
      setNewCollectionName('')
    } catch (e) {
      toast.error('Failed to create collection')
    }
  }

  const addItemToCollection = async (
    collectionId: number | string,
    artifactId: number,
  ) => {
    // Legacy API wrapper or V2 equivalent
    // In V2 we might use artifacts.addToCollection(artifactId, collectionId)
    // For now assuming existing logic in ExplorePage was calling a helper or API directly
    await embeddrApi.collections.addArtifact(
      String(collectionId),
      String(artifactId),
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 transition-all duration-300 ease-in-out',
        showSidebar
          ? 'w-80 opacity-100 translate-x-0 mr-1'
          : 'w-0 opacity-0 -translate-x-4 mr-0',
      )}
    >
      <div className="w-80 h-full flex flex-col gap-1">
        <Card className="flex-1 p-0! gap-0! flex flex-col overflow-visible min-h-0 bg-opacity-0">
          <Tabs
            value={sidebarTab}
            onValueChange={(v) => setSidebarTab(v)}
            className="h-full flex flex-col w-full! min-h-0 gap-1! space-y-0! backdrop-blur-md bg-muted/30! bg-opacity-50!"
          >
            <div className="flex items-center justify-between shrink-0 border-b border-foreground/10 p-1 bg-muted/35">
              <TabsList className="flex gap-1 w-full justify-start bg-transparent ">
                <TabsTrigger
                  value="filters"
                  className="max-w-fit items-center gap-2"
                  title="Filters & Library"
                >
                  <FilterIcon className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="max-w-fit items-center gap-2"
                  disabled={!selectedImage}
                  title="Image Details"
                >
                  <Info className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="ml-auto max-w-fit items-center gap-2"
                  title="View Settings"
                >
                  <Settings className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </div>

            {/* FILTERS TAB (Consolidated Libraries, Collections, Sources) */}
            <TabsContent
              value="filters"
              className="flex-1 m-0 overflow-hidden flex flex-col min-h-0"
            >
              {/* Top Filters */}
              <div className="p-3 border-b border-border bg-muted/10 shrink-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Kind
                    </Label>
                    <Select
                      value={mediaType}
                      onValueChange={(value: any) => setMediaType(value)}
                    >
                      <SelectTrigger className="h-7 text-xs bg-background/50">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Media</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                        <SelectItem value="video">Videos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Provider
                    </Label>
                    <Select
                      value={selectedSourceType || 'all'}
                      onValueChange={(value) => {
                        setSelectedSourceType(value === 'all' ? null : value)
                        if (value !== 'all') {
                          // Clear other selections when filtering by provider
                          setSelectedLibraryId(null)
                          setSelectedCollectionId(null)
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs bg-background/50">
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="local">Local Drive</SelectItem>
                        <SelectItem value="s3">Cloud Storage</SelectItem>
                        <SelectItem value="stash">Stash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filter Input */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter folders & lists..."
                    className="h-8 pl-8 text-xs"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                  {filterQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6"
                      onClick={() => setFilterQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 h-full">
                <Accordion
                  type="multiple"
                  className="w-full px-2 pb-2"
                  defaultValue={['libraries', 'collections', 'sources']}
                >
                  {/* LIBRARIES SECTION */}
                  <AccordionItem value="libraries" className="border-b-0">
                    <div className="flex items-center justify-between py-1 pr-2 group">
                      <AccordionTrigger className="py-2 hover:no-underline flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider justify-start gap-2">
                        Folder Library
                      </AccordionTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate({
                            to: '/settings',
                            search: { tab: 'library' },
                          })
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <AccordionContent className="pb-2">
                      <div className="space-y-0.5 pl-1">
                        {!filterQuery && (
                          <Button
                            variant={
                              selectedLibraryId === null &&
                              selectedCollectionId === null &&
                              selectedSourceId === null &&
                              selectedSourceType === null
                                ? 'secondary'
                                : 'ghost'
                            }
                            className="w-full justify-between font-normal h-8 text-sm px-2"
                            onClick={() => {
                              setSelectedLibraryId(null)
                              setSelectedCollectionId(null)
                              setSelectedSourceId(null)
                              setSelectedSourceType(null)
                            }}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                              All Images
                            </span>
                          </Button>
                        )}
                        {filteredLibraries.map((folder) => {
                          const provider = getProviderInfo(folder)
                          const Icon = provider.icon

                          // If source type filter is active, only show matching libraries
                          if (
                            selectedSourceType &&
                            provider.id !== selectedSourceType
                          ) {
                            return null
                          }

                          return (
                            <Button
                              key={folder.id}
                              variant={
                                selectedLibraryId === folder.id
                                  ? 'secondary'
                                  : 'ghost'
                              }
                              className="w-full justify-between font-normal h-8 text-sm px-2 group/btn"
                              onClick={() => {
                                setSelectedLibraryId(folder.id)
                                setSelectedCollectionId(null)
                                // DO NOT clear source filter here, as user might want to stay in "Stash" mode
                                // setSelectedSourceType(null)
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
                                title={folder.uri}
                              >
                                <Icon
                                  className={cn('h-3.5 w-3.5', provider.color)}
                                />
                                {folder.label || folder.uri.split('/').pop()}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground opacity-50 font-mono uppercase tracking-tighter">
                                  {provider.label}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-4 px-1"
                                >
                                  {folder.file_count}
                                </Badge>
                              </div>
                            </Button>
                          )
                        })}
                        {filteredLibraries.length === 0 && !!filterQuery && (
                          <div className="text-xs text-muted-foreground p-2">
                            No libraries match
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <Separator className="my-1" />

                  {/* COLLECTIONS SECTION */}
                  <AccordionItem value="collections" className="border-b-0">
                    <div className="flex items-center justify-between py-1 pr-2 group">
                      <AccordionTrigger className="py-2 hover:no-underline flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider justify-start gap-2">
                        Collections
                      </AccordionTrigger>
                      <Dialog
                        open={isCreateCollectionOpen}
                        onOpenChange={setIsCreateCollectionOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus className="h-3 w-3" />
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
                    <AccordionContent className="pb-2">
                      <div className="space-y-0.5 pl-1">
                        {filteredCollections.map((collection) => (
                          <Button
                            key={collection.id}
                            variant={
                              selectedCollectionId === String(collection.id)
                                ? 'secondary'
                                : dragOverCollectionId === String(collection.id)
                                  ? 'secondary'
                                  : 'ghost'
                            }
                            className={cn(
                              'w-full justify-between font-normal h-fit py-1 text-sm transition-all px-2',
                              dragOverCollectionId === String(collection.id) &&
                                'ring-2 ring-primary ring-inset scale-[1.02]',
                            )}
                            onClick={() => {
                              setSelectedCollectionId(String(collection.id))
                              setSelectedLibraryId(null)
                              setSelectedSourceId(null)
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
                              setDragOverCollectionId(String(collection.id))
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
                              <Layers className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-start truncate break-all text-ellipsis whitespace-pre-wrap">
                                {collection.name ||
                                  collection.label ||
                                  'Untitled'}
                              </span>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1 min-w-5 justify-center"
                            >
                              {collection.item_count}
                            </Badge>
                          </Button>
                        ))}
                        {filteredCollections.length === 0 && !!filterQuery && (
                          <div className="text-xs text-muted-foreground p-2">
                            No collections match
                          </div>
                        )}
                        {collections?.length === 0 && !filterQuery && (
                          <div className="text-xs text-muted-foreground p-2">
                            No collections
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <Separator className="my-1" />

                  {/* SOURCES SECTION */}
                  {((sourceCollections && sourceCollections.length > 0) ||
                    !!filterQuery) && (
                    <AccordionItem value="sources" className="border-b-0">
                      <div className="flex items-center justify-between py-1 pr-2">
                        <AccordionTrigger className="py-2 hover:no-underline flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider justify-start gap-2">
                          Import Sources
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="pb-2">
                        <div className="space-y-0.5 pl-1">
                          {filteredSources.map((source: any) => (
                            <Button
                              key={source.id}
                              variant={
                                selectedSourceId === source.id
                                  ? 'secondary'
                                  : 'ghost'
                              }
                              className="w-full justify-start font-normal h-auto min-h-8 py-1.5 text-sm px-2"
                              onClick={() => {
                                setSelectedSourceId(source.id)
                                setSelectedLibraryId(null)
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
                              <div className="flex flex-col items-start gap-0.5 truncate w-full">
                                <span className="flex items-center gap-2 truncate w-full font-medium">
                                  <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate break-all whitespace-pre-wrap text-start">
                                    {source.metadata?.post_title ||
                                      source.label ||
                                      (source.uri &&
                                        source.uri.split('/').pop()) ||
                                      source.id}
                                  </span>
                                </span>
                                {source.metadata?.source_url && (
                                  <span className="text-[10px] text-muted-foreground truncate w-full pl-6">
                                    {
                                      new URL(source.metadata.source_url)
                                        .hostname
                                    }
                                  </span>
                                )}
                              </div>
                            </Button>
                          ))}
                          {!filteredSources.length && !!filterQuery && (
                            <div className="p-2 text-xs text-muted-foreground">
                              No sources match
                            </div>
                          )}
                          {!sourceCollections?.length && !filterQuery && (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              No sources found
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </ScrollArea>
            </TabsContent>

            {/* DETAILS TAB */}
            <TabsContent
              value="details"
              className="flex-1 m-0 overflow-hidden flex flex-col"
            >
              {selectedImage ? (
                <ImageDetailsSidebar
                  image={selectedImage}
                  onClose={() => setSelectedImage(null)}
                  onSelectImage={setSelectedImage}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                  Select an image (Ctrl+Click) to view details
                </div>
              )}
            </TabsContent>

            {/* SETTINGS TAB (Was Config) */}
            <TabsContent
              value="settings"
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
                useReranker={useReranker}
                setUseReranker={setUseReranker}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
