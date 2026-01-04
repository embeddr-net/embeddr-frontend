import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { useEffect, useRef } from 'react'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import PostCard from './PostCard'
import type { PromptImage } from '@/lib/api'
import { cn } from '@/lib/utils'

interface PostsScrollAreaProps {
  posts: Array<PromptImage>
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  queryKey?: Array<any>
  onSelect?: (post: PromptImage) => void
  onSearchByImage?: (post: PromptImage) => void
  onOpenDetails?: (post: PromptImage) => void
  selectedId?: number | null
  gridCols?: number | null
  imageFit?: 'cover' | 'contain'
  useOriginalImages?: boolean
  onArchive?: (post: PromptImage) => void
}

const PostsScrollArea = ({
  posts,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onSelect,
  onSearchByImage,
  onOpenDetails,
  selectedId,
  gridCols = null,
  imageFit = 'contain',
  useOriginalImages = false,
  onArchive,
}: PostsScrollAreaProps) => {
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const observerTarget = useRef<HTMLDivElement>(null)
  const isFetchingRef = useRef(isFetchingNextPage)

  // Track fetching state
  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage
  }, [isFetchingNextPage])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const element = observerTarget.current
    const root = scrollViewportRef.current
    if (!element || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingRef.current
        ) {
          fetchNextPage?.()
        }
      },
      { threshold: 0.1, rootMargin: '200px', root },
    )

    observer.observe(element)
    return () => observer.unobserve(element)
  }, [hasNextPage, fetchNextPage])

  return (
    <ScrollArea
      className="h-full pr-3.5"
      type="always"
      viewportRef={scrollViewportRef}
    >
      <div
        className={cn('grid gap-1 pb-1')}
        style={{
          gridTemplateColumns: gridCols
            ? `repeat(${gridCols}, minmax(0, 1fr))`
            : 'repeat(auto-fill, minmax(250px, 1fr))',
        }}
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onSelect={onSelect}
            onSearchByImage={onSearchByImage}
            onOpenDetails={onOpenDetails}
            onArchive={onArchive}
            isSelected={selectedId === post.id}
            imageFit={imageFit}
            useOriginalImages={useOriginalImages}
          />
        ))}
      </div>

      {/* Infinite scroll observer */}
      <div ref={observerTarget} className="py-24 flex justify-center">
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && posts.length > 0 && (
          <div className="text-sm text-muted-foreground capitalize">
            no more results
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

export default PostsScrollArea
