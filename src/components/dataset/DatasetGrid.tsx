import React from 'react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Edit,
  FileText as FileTextIcon,
  ImageOff,
  SplitSquareHorizontal,
  Trash2,
  Wand2,
  ArrowRightLeft,
  Lock,
  Unlock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@embeddr/react-ui/components/context-menu'
import type { DatasetItem } from '@/hooks/useDatasets'
import {
  useUpdateDatasetItem,
  useDeleteDatasetItem,
  useAddDatasetItems,
  useGenerateItemCaption,
} from '@/hooks/useDatasets'
import { cn } from '@/lib/utils'
import { BACKEND_URL } from '@/lib/api/config'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface DatasetGridProps {
  isLoading: boolean
  filteredItems: Array<DatasetItem>
  selectedItem: DatasetItem | null
  setSelectedItem: (item: DatasetItem) => void
  viewMode: 'base' | 'pair'
  datasetId?: number
}

export function DatasetGrid({
  isLoading,
  filteredItems,
  selectedItem,
  setSelectedItem,
  viewMode,
  datasetId,
}: DatasetGridProps) {
  const [gridCols] = useLocalStorage('explore-grid-cols', 5)
  const [imageFit] = useLocalStorage<'cover' | 'contain'>(
    'explore-image-fit',
    'contain',
  )
  const updateItem = useUpdateDatasetItem()
  const deleteItem = useDeleteDatasetItem()
  const addItems = useAddDatasetItems()
  const generateCaption = useGenerateItemCaption()
  const [dragOverId, setDragOverId] = React.useState<number | null>(null)
  const [isContainerDragOver, setIsContainerDragOver] = React.useState(false)

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('application/embeddr-image-id')) {
      setDragOverId(id)
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, item: DatasetItem) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
    const imageId = e.dataTransfer.getData('application/embeddr-image-id')
    if (imageId) {
      try {
        await updateItem.mutateAsync({
          datasetId: item.dataset_id,
          itemId: item.id,
          updates: {
            pair_image_id: parseInt(imageId),
          },
        })
        toast.success('Pair image updated')
      } catch (error) {
        toast.error('Failed to update pair image')
      }
    }
  }

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (
      datasetId &&
      e.dataTransfer.types.includes('application/embeddr-image-id')
    ) {
      setIsContainerDragOver(true)
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleContainerDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsContainerDragOver(false)
  }

  const handleContainerDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsContainerDragOver(false)

    if (!datasetId) return

    const imageId = e.dataTransfer.getData('application/embeddr-image-id')
    if (imageId) {
      try {
        await addItems.mutateAsync({
          datasetId,
          imageIds: [parseInt(imageId)],
        })
        toast.success('Item added to dataset')
      } catch (error) {
        toast.error('Failed to add item to dataset')
      }
    }
  }

  const handleDeleteItem = async (item: DatasetItem) => {
    try {
      await deleteItem.mutateAsync({
        datasetId: item.dataset_id,
        itemId: item.id,
      })
      toast.success('Item deleted')
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  const handleSwapImages = async (item: DatasetItem) => {
    if (!item.pair_image_path) return

    const currentBase = item.processed_image_path || item.original_path
    const currentPair = item.pair_image_path

    try {
      await updateItem.mutateAsync({
        datasetId: item.dataset_id,
        itemId: item.id,
        updates: {
          processed_image_path: currentPair,
          pair_image_path: currentBase,
        },
      })
      toast.success('Images swapped')
    } catch (error) {
      toast.error('Failed to swap images')
    }
  }

  const handleToggleLock = async (item: DatasetItem) => {
    const isLocked = !!item.processed_image_path
    try {
      await updateItem.mutateAsync({
        datasetId: item.dataset_id,
        itemId: item.id,
        updates: {
          // @ts-ignore - null is valid for optional string
          processed_image_path: isLocked ? null : item.original_path,
        },
      })
      toast.success(isLocked ? 'Item unlocked' : 'Item locked')
    } catch (error) {
      toast.error('Failed to toggle lock')
    }
  }

  return (
    <ScrollArea
      className={cn('h-full', isContainerDragOver && 'bg-primary/5')}
      type="always"
      onDragOver={handleContainerDragOver}
      onDragLeave={handleContainerDragLeave}
      onDrop={handleContainerDrop}
    >
      <div
        className="grid gap-1 pr-4 min-h-[200px]"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Loading items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground flex flex-col items-center justify-center gap-2">
            <p>No items in this dataset.</p>
            <p className="text-xs">Drag images here to add them.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const showPair = viewMode === 'pair'
            const imagePath = showPair
              ? item.pair_image_path
              : item.processed_image_path || item.original_path

            return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className={cn(
                      'group/dataset-grid-card relative aspect-square overflow-hidden border bg-muted cursor-pointer transition-all hover:border-primary',
                      selectedItem?.id === item.id && 'border-primary',
                      dragOverId === item.id &&
                        'border-primary ring-2 ring-primary ring-offset-2',
                    )}
                    onClick={() => setSelectedItem(item)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item)}
                  >
                    {imagePath ? (
                      <img
                        src={`${BACKEND_URL}/images/file?path=${encodeURIComponent(
                          imagePath,
                        )}`}
                        alt=""
                        className={cn(
                          'w-full h-full',
                          imageFit === 'contain'
                            ? 'object-contain'
                            : 'object-cover',
                        )}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center bg-muted/50">
                        <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium">
                          No Pair Image
                        </span>
                      </div>
                    )}

                    {/* Status Indicators */}
                    <div className="absolute top-1 right-1 flex flex-col gap-1 pointer-events-none">
                      {item.caption && (
                        <div
                          className="bg-black/60 text-white p-1 rounded-sm backdrop-blur-sm"
                          title="Has Caption"
                        >
                          <FileTextIcon className="w-3 h-3" />
                        </div>
                      )}
                      {item.processed_image_path && (
                        <div
                          className="bg-orange-500/80 text-white p-1 rounded-sm backdrop-blur-sm"
                          title="Locked"
                        >
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                      {item.pair_image_path && (
                        <div
                          className="bg-green-500/80 text-white p-1 rounded-sm backdrop-blur-sm"
                          title="Paired"
                        >
                          <SplitSquareHorizontal className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/dataset-grid-card:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-xs line-clamp-2 w-full font-mono">
                        {item.caption || 'No caption'}
                      </p>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => handleDeleteItem(item)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Item
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => handleSwapImages(item)}
                    disabled={!item.pair_image_path}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Swap Base & Pair
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleToggleLock(item)}>
                    {item.processed_image_path ? (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        Unlock Item
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Lock Item
                      </>
                    )}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() =>
                      generateCaption.mutate({
                        datasetId: item.dataset_id,
                        itemId: item.id,
                      })
                    }
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Caption
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })
        )}
      </div>
    </ScrollArea>
  )
}
