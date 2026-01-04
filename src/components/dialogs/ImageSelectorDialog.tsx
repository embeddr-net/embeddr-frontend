import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import type { PromptImage } from '@/lib/api/types'
import { ImageBrowser } from '@/components/search/ImageBrowser'

interface ImageSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (image: PromptImage) => void
  title?: string
  description?: string
}

export function ImageSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select Image',
  description = 'Choose an image from your library.',
}: ImageSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-2 gap-1!">
        <DialogHeader className="pt-4 shrink-0 gap-1!">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/10 p-2">
          <ImageBrowser
            onSelect={(image) => {
              onSelect(image)
              onOpenChange(false)
            }}
          />
        </div>

        <DialogFooter className="px-6 py-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
