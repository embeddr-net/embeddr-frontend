import { memo } from 'react'
import { Button } from '@embeddr/react-ui/ui'
import { EmbeddrDnDTypes } from '@embeddr/react-ui'
import {
  Archive,
  ArrowDownToLine,
  ExternalLink,
  Eye,
  FileText,
  FolderPlus,
  GitFork,
  ImagePlus,
  MoreHorizontal,
  Video,
  Folder,
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
} from '@embeddr/react-ui/ui'
import type { PromptImage } from '@/lib/api'
import { useGlobalStore } from '@/store/globalStore'
import { useLineageStore } from '@/store/lineageStore'
import { updateImage } from '@/lib/api/endpoints/images'
import { embeddrApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface PostCardProps {
  post: PromptImage
  onToggleLike?: (args: { id: number; liked_by_me: boolean }) => void
  onSelect?: (post: PromptImage, e?: React.MouseEvent) => void
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
        ? embeddrApi.artifacts.getContentUrl(post.id)
        : post.thumb_url ||
          embeddrApi.artifacts.getPreviewUrl(post.id, 'thumbnail')

    const handleUseInCreate = () => {
      selectGlobalImage(post)
      navigate({ to: '/lotus' })
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
              'border bg-card/40 text-card-foreground shadow-sm overflow-hidden group/post border-foreground/10 p-0! gap-0! cursor-pointer transition-all hover:border hover:border-primary rounded-md',
              isSelected && 'border-foreground/40',
            )}
            onClick={(e) => onSelect?.(post, e)}
            draggable
            onDragStart={(e) => {
              // Force the use of the API URL for DnD to permit browser/plugin access
              // Do not use post.image_url as it might contain the local filesystem path
              const contentUrl = embeddrApi.artifacts.getContentUrl(post.id)
              const previewUrl = embeddrApi.artifacts.getPreviewUrl(
                post.id,
                'thumbnail',
              )

              console.log('[DnD] DragStart detected on PostCard', {
                id: post.id,
                url: contentUrl,
                previewUrl,
                mediaType: post.media_type,
                path: (post as any).path,
              })

              // Standardized Tags
              e.dataTransfer.setData(
                EmbeddrDnDTypes.ARTIFACT_ID,
                post.id.toString(),
              )
              // Legacy/Compat
              e.dataTransfer.setData(
                EmbeddrDnDTypes.IMAGE_ID,
                post.id.toString(),
              )

              e.dataTransfer.setData(
                EmbeddrDnDTypes.ARTIFACT_PATH,
                (post as any).path || '',
              )

              e.dataTransfer.setData(
                EmbeddrDnDTypes.ARTIFACT_TYPE,
                post.media_type || 'image',
              )

              // Set URL in text/plain for general compatibility (if it looks like a URL)
              // But standard text/plain might be expected to be ID in some internal parts?
              // Existing code set it to ID: e.dataTransfer.setData('text/plain', post.id.toString())
              // Let's keep ID in text/plain for safety if other components rely on it,
              // but ALSO provide the URL in specific formats.
              e.dataTransfer.setData('text/plain', contentUrl)
              e.dataTransfer.setData(EmbeddrDnDTypes.PREVIEW_URL, previewUrl)

              if (post.media_type === 'video') {
                e.dataTransfer.setData(EmbeddrDnDTypes.VIDEO_URL, contentUrl)
              } else {
                e.dataTransfer.setData(EmbeddrDnDTypes.IMAGE_URL, contentUrl)
              }

              // Optional: Set drag image or effect
              e.dataTransfer.effectAllowed = 'copy'
            }}
          >
            <div className="relative overflow-hidden aspect-square">
              {(post as any).media_type === 'collection' ? (
                post.thumb_url ? (
                  <img
                    src={post.thumb_url}
                    alt={post.prompt}
                    loading="lazy"
                    className={cn(
                      'z-40 w-full h-full duration-300',
                      imageFit === 'cover' ? 'object-cover' : 'object-contain',
                    )}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-4">
                    <Folder className="w-16 h-16 opacity-50 mb-2" />
                    <span className="text-xs font-medium text-center line-clamp-2 px-2">
                      {post.prompt || 'Collection'}
                    </span>
                  </div>
                )
              ) : (post.media_type as string) === 'document' ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  {/* Fallback to preview if available, else icon */}
                  {post.thumb_url ? (
                    <img
                      src={post.thumb_url}
                      alt={post.prompt}
                      className={cn(
                        'z-40 w-full h-full duration-300 object-contain',
                      )}
                    />
                  ) : (
                    <FileText className="w-16 h-16 text-muted-foreground/50" />
                  )}
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt={post.prompt}
                  loading="lazy"
                  className={cn(
                    'z-40 w-full h-full duration-300',
                    imageFit === 'cover' ? 'object-cover' : 'object-contain',
                  )}
                />
              )}
              {post.media_type === 'video' && (
                <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md backdrop-blur-sm">
                  <Video className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'absolute bottom-2 right-2 opacity-0 group-hover/post:opacity-100  flex gap-1',
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
