import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import { ArrowDownToLine, ExternalLink, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { PromptImage } from '@/lib/api/types'
import { BACKEND_URL } from '@/lib/api'
import { useGlobalStore } from '@/store/globalStore'

interface ImageLightboxProps {
  image: PromptImage | null
  onClose: () => void
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const { selectImage } = useGlobalStore()
  const navigate = useNavigate()

  if (!image) return null

  const imageUrl = `${BACKEND_URL}/images/${image.id}/file`

  const handleUseInCreate = () => {
    selectImage(image)
    navigate({ to: '/create' })
    onClose()
  }

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-full h-[90vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-sm border-none">
        <div className="absolute right-4 top-4 z-50 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUseInCreate}
            className="gap-2 shadow-sm"
          >
            <ExternalLink className="h-4 w-4" />
            Use in Create
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-background/50 hover:bg-background/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden">
          {image.media_type === 'video' ? (
            <video
              src={imageUrl}
              controls
              autoPlay
              loop
              className="max-w-full max-h-full object-contain shadow-lg rounded-sm"
            />
          ) : (
            <img
              src={imageUrl}
              alt={image.prompt || 'Image'}
              className="max-w-full max-h-full object-contain shadow-lg rounded-sm"
            />
          )}
        </div>

        <div className="p-4 bg-background/80 backdrop-blur-md border-t shrink-0">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-sm truncate pr-12">
              {image.prompt || 'No prompt'}
            </h3>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>ID: {image.id}</span>
              <span>
                {image.width}x{image.height}
              </span>
              {image.sampler_name && <span>{image.sampler_name}</span>}
              {image.steps && <span>{image.steps} steps</span>}
              {image.cfg_scale && <span>CFG {image.cfg_scale}</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
