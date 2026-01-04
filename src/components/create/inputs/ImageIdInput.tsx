import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageIdInputProps {
  label: string
  imageId?: string | number
  previewUrl?: string
  onClick: () => void
  className?: string
}

export function ImageIdInput({
  label,
  imageId,
  previewUrl,
  onClick,
  className,
}: ImageIdInputProps) {
  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <div
        onClick={onClick}
        className={cn(
          'relative group cursor-pointer overflow-hidden border  bg-background hover:ring-2 ring-primary transition-all shrink-0',
          previewUrl
            ? 'h-16 w-16'
            : 'h-16 w-16 flex items-center justify-center border-dashed',
        )}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"></div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
            <ImageIcon className="h-5 w-5 opacity-50" />
            <span className="text-[9px]">Select</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="h-7 px-2 py-1 text-xs border  bg-muted/20 text-muted-foreground truncate flex items-center">
          {imageId ? `#${imageId}` : 'No image selected'}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  )
}
