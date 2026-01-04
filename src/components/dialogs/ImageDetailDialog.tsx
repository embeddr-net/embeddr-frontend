import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import type { PromptImage } from '@/lib/api/types'
import { BACKEND_URL } from '@/lib/api/config'

interface ImageDetailDialogProps {
  imageId: string | number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageDetailDialog({
  imageId,
  open,
  onOpenChange,
}: ImageDetailDialogProps) {
  const [image, setImage] = useState<PromptImage | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && imageId) {
      setLoading(true)
      fetch(`${BACKEND_URL}/images/${imageId}`)
        .then((res) => res.json())
        .then((data) => setImage(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false))
    } else {
      setImage(null)
    }
  }, [open, imageId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle>Image Details</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : image ? (
            <>
              {/* Main Image */}
              <div className="flex-1 bg-muted/10 flex items-center justify-center p-4 overflow-hidden">
                {image.media_type === 'video' ? (
                  <video
                    src={`${BACKEND_URL}/images/${image.id}/file`}
                    className="max-w-full max-h-full object-contain shadow-sm"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={`${BACKEND_URL}/images/${image.id}/file`}
                    className="max-w-full max-h-full object-contain shadow-sm"
                    alt={image.prompt}
                  />
                )}
              </div>

              {/* Sidebar */}
              <div className="w-96 border-l bg-background flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-6">
                    {/* Prompt */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">
                        Prompt
                      </h3>
                      <ScrollArea
                        type="always"
                        className="border"
                        variant="left-border"
                      >
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-24 pr-3 p-2">
                          {image.prompt || 'No prompt'}
                        </p>
                      </ScrollArea>
                    </div>

                    {/* Parents */}
                    {image.parents && image.parents.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                          Parents
                          <span className="text-xs text-muted-foreground font-normal">
                            ({image.parents.length})
                          </span>
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {image.parents.map((p) => (
                            <div
                              key={p.id}
                              className="aspect-square overflow-hidden border bg-muted cursor-pointer hover:ring-2 ring-primary/50 transition-all"
                              onClick={() => {
                                // Simple navigation within dialog
                                setLoading(true)
                                fetch(`${BACKEND_URL}/images/${p.id}`)
                                  .then((res) => res.json())
                                  .then((data) => setImage(data))
                                  .finally(() => setLoading(false))
                              }}
                            >
                              <img
                                src={`${BACKEND_URL}/images/${p.id}/file`}
                                className="w-full h-full object-cover"
                                alt=""
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Children (if available in API) */}
                    {image.children && image.children.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                          Children
                          <span className="text-xs text-muted-foreground font-normal">
                            ({image.children.length})
                          </span>
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {image.children.map((c) => (
                            <div
                              key={c.id}
                              className="aspect-square  overflow-hidden border bg-muted cursor-pointer hover:ring-2 ring-primary/50 transition-all"
                              onClick={() => {
                                setLoading(true)
                                fetch(`${BACKEND_URL}/images/${c.id}`)
                                  .then((res) => res.json())
                                  .then((data) => setImage(data))
                                  .finally(() => setLoading(false))
                              }}
                            >
                              <img
                                src={`${BACKEND_URL}/images/${c.id}/file`}
                                className="w-full h-full object-cover"
                                alt=""
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="space-y-2 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Width</span>
                          <p>{image.width}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Height</span>
                          <p>{image.height}</p>
                        </div>
                        {image.seed && (
                          <div>
                            <span className="text-muted-foreground">Seed</span>
                            <p className="font-mono">{image.seed}</p>
                          </div>
                        )}
                        {image.steps && (
                          <div>
                            <span className="text-muted-foreground">Steps</span>
                            <p>{image.steps}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Image not found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
