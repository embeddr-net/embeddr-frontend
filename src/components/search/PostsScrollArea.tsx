import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { useEffect, useRef } from 'react'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import { cn } from '@embeddr/react-ui/lib/utils'
import PostCard from './PostCard'
import type { PromptImage } from '@/lib/api'

interface PostsScrollAreaProps {
  posts: Array<PromptImage>
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  queryKey?: Array<any>
  onSelect?: (post: PromptImage) => void
  onSearchByImage?: (post: PromptImage) => void
  selectedId?: number | null
  gridCols?: number | null
  imageFit?: 'cover' | 'contain'
  useOriginalImages?: boolean
}

const PostsScrollArea = ({
  posts,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onSelect,
  onSearchByImage,
  selectedId,
  gridCols = null,
  imageFit = 'contain',
  useOriginalImages = false,
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
        className={cn(
          'grid gap-1 pb-1',
          !gridCols &&
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
        )}
        style={
          gridCols
            ? {
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onSelect={onSelect}
            onSearchByImage={onSearchByImage}
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
