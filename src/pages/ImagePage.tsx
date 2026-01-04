import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import { Button } from '@embeddr/react-ui/components/button'
import { Card } from '@embeddr/react-ui/components/card'
import { ArrowLeft, GitBranch, GitCommit } from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { fetchItem } from '@/lib/api'

export default function ImagePage() {
  const { imageId } = useParams({ from: '/images/$imageId' })
  const { data: image, isLoading } = useQuery({
    queryKey: ['image', imageId],
    queryFn: () => fetchItem(imageId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  if (!image) {
    return (
      <div className="flex items-center justify-center h-full">
        Image not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-1 gap-1">
      <div className="flex items-center gap-4 p-1 bg-card border shrink-0">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Image Details</h1>
      </div>

      <div className="flex flex-1 min-h-0 border">
        {/* Main Image Area */}
        <div className="flex-1 bg-muted/30 p-4 flex items-center justify-center overflow-hidden">
          <img
            src={image.image_url}
            alt={image.prompt}
            className="max-w-full max-h-full object-contain shadow-lg"
          />
        </div>

        {/* Sidebar */}
        <div className="w-96 border-l bg-card flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Metadata */}
              <div>
                <h3 className="font-semibold mb-2">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">ID</span>
                    <span className="col-span-2 font-mono">{image.id}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Size</span>
                    <span className="col-span-2">
                      {image.width} x {image.height}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Created</span>
                    <span className="col-span-2">
                      {new Date(image.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Filename</span>
                    <span className="col-span-2 break-all">{image.prompt}</span>
                  </div>
                </div>
              </div>

              {/* Lineage */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Lineage
                </h3>

                {/* Parents */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <GitCommit className="w-3 h-3" />
                    Parents ({image.parents?.length || 0})
                  </h4>
                  {image.parents && image.parents.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {image.parents.map((parent) => (
                        <Link
                          key={parent.id}
                          to="/images/$imageId"
                          params={{ imageId: parent.id.toString() }}
                          className="block aspect-square  overflow-hidden border hover:ring-2 ring-primary transition-all"
                        >
                          <img
                            src={parent.thumb_url}
                            alt={`Parent ${parent.id}`}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No parents recorded
                    </p>
                  )}
                </div>

                {/* Children */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <GitCommit className="w-3 h-3" />
                    Children ({image.children?.length || 0})
                  </h4>
                  {image.children && image.children.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {image.children.map((child) => (
                        <Link
                          key={child.id}
                          to="/images/$imageId"
                          params={{ imageId: child.id.toString() }}
                          className="block aspect-square  overflow-hidden border hover:ring-2 ring-primary transition-all"
                        >
                          <img
                            src={child.thumb_url}
                            alt={`Child ${child.id}`}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No children recorded
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
