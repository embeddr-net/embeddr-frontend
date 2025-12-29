import { Label } from '@embeddr/react-ui/components/label'
import { Slider } from '@embeddr/react-ui/components/slider'
import { Switch } from '@embeddr/react-ui/components/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Separator } from '@embeddr/react-ui/components/separator'

interface FilterConfigPanelProps {
  gridCols: number
  setGridCols: (cols: number) => void
  imageFit: 'cover' | 'contain'
  setImageFit: (fit: 'cover' | 'contain') => void
  autoGrid: boolean
  setAutoGrid: (auto: boolean) => void
  useOriginalImages: boolean
  setUseOriginalImages: (useOriginal: boolean) => void
}

export function FilterConfigPanel({
  gridCols,
  setGridCols,
  imageFit,
  setImageFit,
  autoGrid,
  setAutoGrid,
  useOriginalImages,
  setUseOriginalImages,
}: FilterConfigPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">View Settings</h4>
        <p className="text-sm text-muted-foreground">
          Customize how images are displayed.
        </p>
      </div>
      <Separator />
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-grid">Auto Grid Layout</Label>
          <Switch
            id="auto-grid"
            checked={autoGrid}
            onCheckedChange={setAutoGrid}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="use-original">Full Size Images</Label>
          <Switch
            id="use-original"
            checked={useOriginalImages}
            onCheckedChange={setUseOriginalImages}
          />
        </div>

        {!autoGrid && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="grid-cols">Grid Columns</Label>
              <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                {gridCols}
              </span>
            </div>
            <Slider
              id="grid-cols"
              max={10}
              min={1}
              step={1}
              value={[gridCols]}
              onValueChange={(value) => setGridCols(value[0])}
              className="**:[[role=slider]]:h-4 **:[[role=slider]]:w-4"
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="image-fit">Image Fit</Label>
          <Select
            value={imageFit}
            onValueChange={(value: 'cover' | 'contain') => setImageFit(value)}
          >
            <SelectTrigger id="image-fit">
              <SelectValue placeholder="Select fit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
