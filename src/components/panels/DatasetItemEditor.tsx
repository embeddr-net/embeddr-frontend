import { useEffect, useState } from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Label } from '@embeddr/react-ui/components/label'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import {
  Edit,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Loader2,
  SaveIcon,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import type { PromptImage } from '@/lib/api/types'
import type { Dataset, DatasetItem } from '@/hooks/useDatasets'
import { BACKEND_URL } from '@/lib/api/config'
import { cn } from '@/lib/utils'
import {
  useGenerateItemCaption,
  useUpdateDatasetItem,
} from '@/hooks/useDatasets'
import { WorkflowRunnerDialog } from '@/components/dialogs/WorkflowRunnerDialog'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'

interface DatasetItemEditorProps {
  dataset: Dataset
  selectedItem: DatasetItem | null
}

export function DatasetItemEditor({
  dataset,
  selectedItem,
}: DatasetItemEditorProps) {
  const updateItem = useUpdateDatasetItem()
  const generateCaption = useGenerateItemCaption()
  const [captionBuffer, setCaptionBuffer] = useState('')
  const [activeLayer, setActiveLayer] = useState<'base' | 'pair'>('base')
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  useEffect(() => {
    if (selectedItem) {
      setCaptionBuffer(selectedItem.caption || '')
    }
  }, [selectedItem])

  const handleSaveCaption = async () => {
    if (!selectedItem) return
    try {
      await updateItem.mutateAsync({
        datasetId: dataset.id,
        itemId: selectedItem.id,
        updates: { caption: captionBuffer },
      })
      toast.success('Caption updated')
    } catch (error) {
      toast.error('Failed to update caption')
    }
  }

  const handleGenerateCaption = async () => {
    if (!selectedItem) return
    try {
      const result = await generateCaption.mutateAsync({
        datasetId: dataset.id,
        itemId: selectedItem.id,
      })
      setCaptionBuffer(result.caption)
      toast.success('Caption generated')
    } catch (error) {
      toast.error('Failed to generate caption')
    }
  }

  const handleGeneratePair = () => {
    setIsGenerateOpen(true)
  }

  const handleSelectPair = () => {
    setIsSelectOpen(true)
  }

  const handlePairSelected = async (image: PromptImage) => {
    if (!selectedItem) return
    // We need the absolute path. The PromptImage has image_url which is a URL.
    // But we might need the path.
    // The backend stores paths.
    // Let's assume we can get the path from the image object if we fetch it fully,
    // or we can just use the ID if we change the backend to support IDs.
    // But for now, DatasetItem stores `pair_image_path`.
    // We need to fetch the full image details to get the path.
    // Or we can assume the backend can handle it.
    // Wait, `PromptImage` from `fetchItems` might not have the raw path exposed.
    // Let's fetch the local image details using the ID.
    try {
      // We need to import fetchLocalImage
      const { fetchLocalImage } = await import('@/lib/api/endpoints/images')
      const localImage = await fetchLocalImage(image.id)

      await updateItem.mutateAsync({
        datasetId: dataset.id,
        itemId: selectedItem.id,
        updates: { pair_image_path: localImage.path },
      })
      setActiveLayer('pair')
      toast.success('Pair image updated')
    } catch (error) {
      console.error(error)
      toast.error('Failed to update pair image')
    }
  }

  const handlePairGenerated = async (path: string) => {
    if (!selectedItem) return
    try {
      await updateItem.mutateAsync({
        datasetId: dataset.id,
        itemId: selectedItem.id,
        updates: { pair_image_path: path },
      })
      setActiveLayer('pair')
    } catch (error) {
      toast.error('Failed to update pair image')
    }
  }

  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select an item to edit
      </div>
    )
  }

  const showPairToggle = dataset.type === 'image_pair'
  const hasPair = !!selectedItem.pair_image_path

  // If not a pair dataset, force base view
  const currentView = showPairToggle ? activeLayer : 'base'

  const displayImage =
    currentView === 'base'
      ? selectedItem.processed_image_path || selectedItem.original_path
      : selectedItem.pair_image_path

  return (
    <div className="h-full p-2 flex gap-2 shrink-0">
      <WorkflowRunnerDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        imagePath={
          selectedItem.processed_image_path || selectedItem.original_path
        }
        imageId={selectedItem.original_image_id}
        onSuccess={handlePairGenerated}
        title="Generate Pair Image"
        description="Select a workflow to generate the paired image."
      />

      <ImageSelectorDialog
        open={isSelectOpen}
        onOpenChange={setIsSelectOpen}
        onSelect={handlePairSelected}
        title="Select Pair Image"
        description="Choose an existing image to use as the pair."
      />

      <div className="aspect-square h-full overflow-hidden border bg-muted relative group flex items-center justify-center">
        {displayImage ? (
          <img
            src={`${BACKEND_URL}/images/file?path=${encodeURIComponent(
              displayImage,
            )}`}
            alt={currentView === 'base' ? 'Base Image' : 'Pair Image'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center p-4 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground mb-2">No Pair Image</p>
            <Button size="sm" variant="outline" onClick={handleGeneratePair}>
              <Wand2 className="w-3 h-3 mr-2" />
              Generate
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSelectPair}>
              <ImageIcon className="w-3 h-3 mr-2" />
              Select Existing
            </Button>
          </div>
        )}

        {/* Top Left Controls */}
        <div className="absolute top-2 left-2 flex gap-1">
          <div className="flex bg-background/80 backdrop-blur-sm gap-1 border shadow-sm p-0.5">
            <Button
              size="icon-sm"
              variant={currentView === 'base' ? 'outline' : 'ghost'}
              className="h-7 w-7"
              onClick={() => setActiveLayer('base')}
              title="Base Image"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>

            {showPairToggle && (
              <Button
                size="icon-sm"
                variant={currentView === 'pair' ? 'outline' : 'ghost'}
                className={cn('h-7 w-7', !hasPair && 'text-muted-foreground')}
                onClick={() => setActiveLayer('pair')}
                title="Pair Image"
              >
                <Layers className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Top Right Indicators */}
        <div className="absolute top-2 right-2 flex gap-1">
          {currentView === 'base' && selectedItem.original_image_id && (
            <Link
              to="/images/$imageId"
              params={{ imageId: selectedItem.original_image_id.toString() }}
              target="_blank"
              title="View Image Details"
            >
              <Button
                size="icon-sm"
                variant="secondary"
                className="h-7 w-7 opacity-50 hover:opacity-100"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          )}
          {currentView === 'base' && selectedItem.processed_image_path && (
            <div className="bg-background/80 backdrop-blur-sm px-2 py-1  border text-xs font-medium shadow-sm">
              Processed
            </div>
          )}
        </div>

        {/* Bottom Right Actions */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {currentView === 'base' && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              title="Edit Image"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {currentView === 'pair' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                title="Select Existing Pair"
                onClick={handleSelectPair}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                title="Regenerate Pair"
                onClick={handleGeneratePair}
              >
                <Wand2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
        <Label hidden>Caption</Label>
        <div className="flex-1 min-h-0 relative">
          <ScrollArea
            type="always"
            variant="left-border"
            className="h-full border bg-card!"
          >
            <Textarea
              className="flex min-h-full bg-card! h-full w-full resize-none font-mono text-sm border-none focus-visible:ring-0 p-4 border-0! shadow-none"
              value={captionBuffer}
              placeholder="Enter caption..."
              onChange={(e) => setCaptionBuffer(e.target.value)}
            />
          </ScrollArea>
        </div>
        <div className="flex justify-end gap-2 shrink-0 py-1 ">
          <Button
            size="icon-sm"
            variant="outline"
            onClick={handleGenerateCaption}
            disabled={generateCaption.isPending}
          >
            {generateCaption.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Wand2 />
            )}
          </Button>
          <Button
            size="icon-sm"
            onClick={handleSaveCaption}
            disabled={updateItem.isPending}
          >
            {updateItem.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
