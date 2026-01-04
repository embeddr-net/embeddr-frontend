import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Edit,
  FileText as FileTextIcon,
  ImageOff,
  SplitSquareHorizontal,
} from 'lucide-react'
import type { DatasetItem } from '@/hooks/useDatasets'
import { cn } from '@/lib/utils'
import { BACKEND_URL } from '@/lib/api/config'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface DatasetGridProps {
  isLoading: boolean
  filteredItems: Array<DatasetItem>
  selectedItem: DatasetItem | null
  setSelectedItem: (item: DatasetItem) => void
  viewMode: 'base' | 'pair'
}

export function DatasetGrid({
  isLoading,
  filteredItems,
  selectedItem,
  setSelectedItem,
  viewMode,
}: DatasetGridProps) {
  const [gridCols] = useLocalStorage('explore-grid-cols', 5)
  const [imageFit] = useLocalStorage<'cover' | 'contain'>(
    'explore-image-fit',
    'contain',
  )

  return (
    <ScrollArea className="h-full" type="always">
      <div
        className="grid gap-1 pr-4"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Loading items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No items match the current filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const showPair = viewMode === 'pair'
            const imagePath = showPair
              ? item.pair_image_path
              : item.processed_image_path || item.original_path

            return (
              <div
                key={item.id}
                className={cn(
                  'group relative aspect-square overflow-hidden border bg-muted cursor-pointer transition-all hover:border-primary',
                  selectedItem?.id === item.id && 'border-primary',
                )}
                onClick={() => setSelectedItem(item)}
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
                    <span className="text-xs font-medium">No Pair Image</span>
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
                      className="bg-blue-500/80 text-white p-1 rounded-sm backdrop-blur-sm"
                      title="Processed"
                    >
                      <Edit className="w-3 h-3" />
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

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-white text-xs line-clamp-2 w-full font-mono">
                    {item.caption || 'No caption'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </ScrollArea>
  )
}
