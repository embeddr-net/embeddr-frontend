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
  useAddDatasetItems,
} from '@/hooks/useDatasets'
import { useQueryClient } from '@tanstack/react-query'
import { useEmbeddrAPI } from '@/plugins/store'

import { CaptionSettingsDialog } from '@/components/dialogs/CaptionSettingsDialog'
import { CreateDatasetDialog } from '@/components/dialogs/CreateDatasetDialog'
import { DatasetHeader } from '@/components/dataset/DatasetHeader'
import { DatasetToolbar } from '@/components/dataset/DatasetToolbar'
import { DatasetWorkspace } from '@/components/dataset/DatasetWorkspace'
import { DraggablePanel } from '@/components/ui/DraggablePanel'

interface ZenDatasetPanelProps {
  isOpen: boolean
  onClose: () => void
}

function DatasetDetail({ dataset }: { dataset: Dataset }) {
  const { data: items, isLoading } = useDatasetItems(dataset.id)
  const [filter, setFilter] = useState<
    'all' | 'missing_caption' | 'has_caption' | 'locked' | 'paired'
  >('all')
  const [viewMode, setViewMode] = useState<'base' | 'pair'>('base')
  const [selectedItem, setSelectedItem] = useState<DatasetItem | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const queryClient = useQueryClient()
  const api = useEmbeddrAPI()

  React.useEffect(() => {
    const handleItemUpdated = (data: any) => {
      if (data.dataset_id === dataset.id) {
        queryClient.setQueryData(
          ['dataset-items', dataset.id],
          (old: DatasetItem[]) => {
            if (!old) return old
            return old.map((item) =>
              item.id === data.id ? { ...item, ...data } : item,
            )
          },
        )
      }
    }

    const handleItemsAdded = (data: any) => {
      if (data.dataset_id === dataset.id) {
        queryClient.invalidateQueries({
          queryKey: ['dataset-items', dataset.id],
        })
        queryClient.invalidateQueries({ queryKey: ['datasets'] })
      }
    }

    api.events.on('dataset:item_updated', handleItemUpdated)
    api.events.on('dataset:items_added', handleItemsAdded)

    return () => {
      api.events.off('dataset:item_updated', handleItemUpdated)
      api.events.off('dataset:items_added', handleItemsAdded)
    }
  }, [dataset.id, queryClient, api])

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items.filter((item) => {
      if (filter === 'all') return true
      if (filter === 'missing_caption') return !item.caption
      if (filter === 'has_caption') return !!item.caption
      if (filter === 'locked') return !!item.processed_image_path
      if (filter === 'paired') return !!item.pair_image_path
      return true
    })
  }, [items, filter])

  return (
    <div className="flex flex-col h-full gap-1">
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

export function ZenDatasetPanel({ isOpen, onClose }: ZenDatasetPanelProps) {
  const { data: datasets, isLoading } = useDatasets()
  const deleteDataset = useDeleteDataset()
  const addItems = useAddDatasetItems()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

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

  const handleDrop = async (e: React.DragEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(null)
    const imageId = e.dataTransfer.getData('application/embeddr-image-id')
    if (imageId) {
      try {
        await addItems.mutateAsync({
          datasetId: id,
          imageIds: [parseInt(imageId)],
        })
        toast.success('Image added to dataset')
      } catch (error) {
        toast.error('Failed to add image to dataset')
      }
    }
  }

  return (
    <DraggablePanel
      id="zen-datasets"
      title="Datasets"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: 100, y: 100 }}
      defaultSize={{ width: 800, height: 600 }}
      className="absolute"
    >
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r bg-muted/10 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b">
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
                      'group/dataset-item flex items-center justify-between p-2 cursor-pointer hover:bg-accent/50 transition-colors rounded-sm border border-transparent',
                      selectedId === dataset.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground',
                      dragOverId === dataset.id &&
                        'border-primary bg-primary/10 text-primary',
                    )}
                    onClick={() => setSelectedId(dataset.id)}
                    onDragOver={(e) => handleDragOver(e, dataset.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dataset.id)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
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
                      className="opacity-0 group-hover/dataset-item:opacity-100 h-6 w-6"
                      onClick={(e) => handleDelete(e, dataset.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col bg-background">
          {selectedDataset ? (
            <DatasetDetail dataset={selectedDataset} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Database className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a dataset to view details</p>
            </div>
          )}
        </div>

        <CreateDatasetDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      </div>
    </DraggablePanel>
  )
}
