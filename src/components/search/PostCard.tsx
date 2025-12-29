import { memo } from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Eye, FolderPlus, MoreHorizontal } from 'lucide-react'
import { cn } from '@embeddr/react-ui/lib/utils'
import type { PromptImage } from '@/lib/api'
import { BACKEND_URL } from '@/lib/api'

interface PostCardProps {
  post: PromptImage
  onToggleLike?: (args: { id: number; liked_by_me: boolean }) => void
  onSelect?: (post: PromptImage) => void
  onSearchByImage?: (post: PromptImage) => void
  isSelected?: boolean
  imageFit?: 'cover' | 'contain'
  useOriginalImages?: boolean
}

const PostCard = memo(
  ({
    post,
    onSelect,
    onSearchByImage,
    isSelected,
    imageFit = 'contain',
    useOriginalImages = false,
  }: PostCardProps) => {
    const imageUrl = useOriginalImages
      ? `${BACKEND_URL}/images/${post.id}/file`
      : `${BACKEND_URL}/images/${post.id}/thumbnail`

    return (
      <div
        className={cn(
          'border bg-card text-card-foreground shadow-sm overflow-hidden group border-foreground/10 p-0! gap-0! cursor-pointer transition-all',
          isSelected && 'border-foreground/40',
        )}
        onClick={() => onSelect?.(post)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            'application/embeddr-image-id',
            post.id.toString(),
          )
          e.dataTransfer.setData('text/plain', post.id.toString())
          // Optional: Set drag image or effect
          e.dataTransfer.effectAllowed = 'copy'
        }}
      >
        <div className="relative overflow-hidden aspect-square">
          <img
            src={imageUrl}
            alt={post.prompt}
            loading="lazy"
            className={cn(
              'z-40 w-full h-full duration-300',
              imageFit === 'cover' ? 'object-cover' : 'object-contain',
            )}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100  flex gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8  bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation()
                onSearchByImage?.(post)
              }}
              title="Search similar images"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {/* <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8  bg-background/80 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8  bg-background/80 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button> */}
          </div>
          <div
            className={cn(
              'absolute bottom-2 right-2 opacity-0 group-hover:opacity-100  flex gap-1',
              post.liked_by_me ? 'visible opacity-100!' : '',
            )}
          >
            {/* <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 hover:text-red-500",
                post.liked_by_me && "text-red-500"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike({ id: post.id, liked_by_me: post.liked_by_me });
              }}
            >
              <Heart
                className={cn("h-4 w-4", post.liked_by_me && "fill-current")}
              />
            </Button> */}
          </div>
        </div>
      </div>
    )
  },
)

export default PostCard
