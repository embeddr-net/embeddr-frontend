import { createFileRoute } from '@tanstack/react-router'
import ExplorePage from '@/pages/ExplorePage'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown> | undefined) => {
    if (!search) return {}
    return {
      imageId: search.imageId ? Number(search.imageId) : undefined,
    }
  },
  component: ExplorePage,
})
