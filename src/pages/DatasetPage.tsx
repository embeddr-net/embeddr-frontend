import React, { useMemo, useState } from 'react'
import { Card } from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Database, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Dataset, DatasetItem } from '@/hooks/useDatasets'
import { cn } from '@/lib/utils'
import {
  useDatasetItems,
  useDatasets,
  useDeleteDataset,
} from '@/hooks/useDatasets'

import { CaptionSettingsDialog } from '@/components/dialogs/CaptionSettingsDialog'
import { CreateDatasetDialog } from '@/components/dialogs/CreateDatasetDialog'
import { DatasetHeader } from '@/components/dataset/DatasetHeader'
import { DatasetToolbar } from '@/components/dataset/DatasetToolbar'
import { DatasetWorkspace } from '@/components/dataset/DatasetWorkspace'

function DatasetDetail({ dataset }: { dataset: Dataset }) {
  const { data: items, isLoading } = useDatasetItems(dataset.id)
  const [filter, setFilter] = useState<
    'all' | 'missing_caption' | 'has_caption' | 'processed' | 'paired'
  >('all')
  const [viewMode, setViewMode] = useState<'base' | 'pair'>('base')
  const [selectedItem, setSelectedItem] = useState<DatasetItem | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items.filter((item) => {
      if (filter === 'all') return true
      if (filter === 'missing_caption') return !item.caption
      if (filter === 'has_caption') return !!item.caption
      if (filter === 'processed') return !!item.processed_image_path
      if (filter === 'paired') return !!item.pair_image_path
      return true
    })
  }, [items, filter])

  return (
    <div className="flex flex-col h-full  gap-1">
      <CaptionSettingsDialog
        dataset={dataset}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
      <DatasetHeader dataset={dataset} />
      <DatasetToolbar
        dataset={dataset}
        items={items}
        filter={filter}
        setFilter={setFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <DatasetWorkspace
        dataset={dataset}
        filteredItems={filteredItems}
        isLoading={isLoading}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        viewMode={viewMode}
      />
    </div>
  )
}

export default function DatasetsPage() {
  const { data: datasets, isLoading } = useDatasets()
  const deleteDataset = useDeleteDataset()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const selectedDataset = datasets?.find((d) => d.id === selectedId)

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this dataset?')) {
      await deleteDataset.mutateAsync(id)
      toast.success('Dataset deleted')
      if (selectedId === id) {
        setSelectedId(null)
      }
    }
  }

  return (
    <div className="p-1 w-full grid grid-cols-4 grid-rows-[auto_1fr] md:grid-rows-[1fr] gap-1 h-full overflow-visible">
      {/* Sidebar */}
      <div className="col-span-4 md:col-span-1 shrink-0! overflow-visible h-auto md:h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 gap-1">
        <Card className="flex-1 h-auto md:h-full p-0! gap-0! shrink-0 flex flex-col overflow-visible min-h-0">
          <div className="flex items-center justify-between shrink-0 border-b border-foreground/10 p-2 bg-muted/35">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Datasets
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 flex flex-col gap-1">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : datasets?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No datasets found.
                </div>
              ) : (
                datasets?.map((dataset) => (
                  <div
                    key={dataset.id}
                    className={cn(
                      'group flex items-center justify-between p-2 cursor-pointer hover:bg-accent/50 transition-colors',
                      selectedId === dataset.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground',
                    )}
                    onClick={() => setSelectedId(dataset.id)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Database className="w-4 h-4 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-medium">
                          {dataset.name}
                        </span>
                        <span className="text-xs opacity-70 truncate">
                          {dataset.item_count} items
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6"
                      onClick={(e) => handleDelete(e, dataset.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="col-span-4 md:col-span-3 flex grow flex-col overflow-hidden h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0">
        {selectedDataset ? (
          <DatasetDetail dataset={selectedDataset} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Database className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a dataset to view details</p>
          </div>
        )}
      </Card>

      <CreateDatasetDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
