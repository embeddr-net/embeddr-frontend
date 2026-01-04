import { memo } from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Archive,
  ArrowDownToLine,
  ExternalLink,
  Eye,
  FolderPlus,
  GitFork,
  ImagePlus,
  MoreHorizontal,
  Video,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@embeddr/react-ui/components/context-menu'
import type { PromptImage } from '@/lib/api'
import { useGlobalStore } from '@/store/globalStore'
import { useLineageStore } from '@/store/lineageStore'
import { updateImage } from '@/lib/api/endpoints/images'
import { BACKEND_URL } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PostCardProps {
  post: PromptImage
  onToggleLike?: (args: { id: number; liked_by_me: boolean }) => void
  onSelect?: (post: PromptImage) => void
  onSearchByImage?: (post: PromptImage) => void
  onOpenDetails?: (post: PromptImage) => void
  onArchive?: (post: PromptImage) => void
  isSelected?: boolean
  imageFit?: 'cover' | 'contain'
  useOriginalImages?: boolean
}

const PostCard = memo(
  ({
    post,
    onSelect,
    onSearchByImage,
    onOpenDetails,
    onArchive,
    isSelected,
    imageFit = 'contain',
    useOriginalImages = false,
  }: PostCardProps) => {
    const navigate = useNavigate()
    const { selectImage: selectGlobalImage } = useGlobalStore()
    const { loadLineage } = useLineageStore()

    const imageUrl =
      useOriginalImages && post.media_type !== 'video'
        ? `${BACKEND_URL}/images/${post.id}/file`
        : `${BACKEND_URL}/images/${post.id}/thumbnail`

    const handleUseInCreate = () => {
      selectGlobalImage(post)
      navigate({ to: '/create' })
    }

    const handleViewLineage = () => {
      loadLineage(post.id.toString())
      navigate({ to: '/lineage' })
    }

    const handleArchive = async () => {
      try {
        const newStatus = !post.is_archived
        await updateImage(post.id, { is_archived: newStatus })
        onArchive?.({ ...post, is_archived: newStatus })
      } catch (error) {
        console.error('Failed to update archive status', error)
      }
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger>
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
              {post.media_type === 'video' && (
                <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md backdrop-blur-sm">
                  <Video className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'absolute bottom-2 right-2 opacity-0 group-hover:opacity-100  flex gap-1',
                  post.liked_by_me ? 'visible opacity-100!' : '',
                )}
              ></div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleUseInCreate}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Use in Create
          </ContextMenuItem>
          <ContextMenuItem onClick={handleViewLineage}>
            <GitFork className="mr-2 h-4 w-4" />
            View Lineage
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onSearchByImage?.(post)}>
            <Eye className="mr-2 h-4 w-4" />
            Find Similar
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onOpenDetails?.(post)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Details
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            {post.is_archived ? 'Unarchive' : 'Archive'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
)

export default PostCard
