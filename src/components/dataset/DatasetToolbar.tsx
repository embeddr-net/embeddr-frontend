import { Button } from '@embeddr/react-ui/components/button'
import { Tabs, TabsList, TabsTrigger } from '@embeddr/react-ui/components/tabs'
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Image as ImageIcon,
  Layers,
  Loader2,
  Settings,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Dataset, DatasetItem } from '@/hooks/useDatasets'
import { useAutoCaptionDataset } from '@/hooks/useDatasets'
import { useCaptioningStatus } from '@/hooks/useCaptioning'
import { cn } from '@/lib/utils'

interface DatasetToolbarProps {
  dataset: Dataset
  items: Array<DatasetItem> | undefined
  filter: string
  setFilter: (filter: any) => void
  viewMode: 'base' | 'pair'
  setViewMode: (mode: 'base' | 'pair') => void
  onOpenSettings: () => void
}

export function DatasetToolbar({
  dataset,
  filter,
  setFilter,
  viewMode,
  setViewMode,
  onOpenSettings,
}: DatasetToolbarProps) {
  const autoCaption = useAutoCaptionDataset()
  const { data: status } = useCaptioningStatus()

  const isCurrentModelLoaded =
    status?.loaded_model === JSON.parse(dataset.captioning_config || '{}').model

  const handleAutoCaption = async () => {
    try {
      await autoCaption.mutateAsync(dataset.id)
      toast.success('Auto-captioning started', {
        description: 'This process runs in the background.',
      })
    } catch (error) {
      toast.error('Failed to start auto-captioning')
    }
  }

  return (
    <div className="flex items-center gap-2 p-1  bg-muted/30 shrink-0 border">
      {/* <Filter className="w-4 h-4 text-muted-foreground" /> */}
      <Tabs
        value={filter}
        onValueChange={(v: any) => setFilter(v)}
        className="w-auto"
      >
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="missing_caption" className="text-xs">
            Missing Caption
          </TabsTrigger>
          <TabsTrigger value="has_caption" className="text-xs">
            Captioned
          </TabsTrigger>
          <TabsTrigger value="processed" className="text-xs">
            Processed
          </TabsTrigger>
          {dataset.type === 'image_pair' && (
            <TabsTrigger value="paired" className="text-xs">
              Paired
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {dataset.type === 'image_pair' && (
        <>
          <div className="flex bg-background/80 backdrop-blur-sm  border shadow-sm gap-1">
            <Button
              size="icon-sm"
              variant={viewMode === 'base' ? 'outline' : 'ghost'}
              onClick={() => setViewMode('base')}
              title="Show Base Images"
            >
              <ImageIcon />
            </Button>
            <Button
              size="icon-sm"
              variant={viewMode === 'pair' ? 'outline' : 'ghost'}
              onClick={() => setViewMode('pair')}
              title="Show Pair Images"
            >
              <Layers />
            </Button>
          </div>
        </>
      )}

      <div className="flex-1" />
      {isCurrentModelLoaded ? (
        <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
          <CheckCircle2 className="w-4 h-4" />
        </span>
      ) : status?.loaded_model ? (
        <span className="flex items-center gap-1 text-sm text-yellow-600 font-medium">
          <AlertCircle className="w-4 h-4" />
        </span>
      ) : (
        <span className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
          <AlertCircle className="w-4 h-4" />
        </span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenSettings}
        title="Captioning Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={handleAutoCaption}
        disabled={autoCaption.isPending}
      >
        {autoCaption.isPending ? (
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
        ) : (
          <Wand2 className="w-3 h-3 mr-2" />
        )}
        Auto-Caption
      </Button>
    </div>
  )
}
