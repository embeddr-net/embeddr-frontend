import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BrainCircuit,
  FolderPlus,
  Image as ImageIcon,
  PlusIcon,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import { Spinner } from '@embeddr/react-ui'
import { toast } from 'sonner'
import { StatsPanel } from './StatsPanel'
import { useSettings } from '@/hooks/useSettings'
import { BACKEND_URL } from '@/lib/api'

function LibraryPathItem({ path }: { path: any }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(path.name || '')
  const { selectedModel, batchSize } = useSettings()

  // Update path mutation
  const updatePathMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch(`${BACKEND_URL}/workspace/paths/${path.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update path')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paths'] })
      toast.success('Path updated')
    },
  })

  // Delete path mutation
  const deletePathMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BACKEND_URL}/workspace/paths/${path.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete path')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paths'] })
      toast.success('Path deleted')
    },
  })

  // Generate thumbnails mutation
  const thumbnailsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${BACKEND_URL}/workspace/paths/${path.id}/thumbnails`,
        {
          method: 'POST',
        },
      )
      if (!res.ok) throw new Error('Failed to generate thumbnails')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(
        `Thumbnail generation complete! Generated ${data.generated} thumbnails.`,
      )
    },
  })

  // Generate embeddings mutation
  const embeddingsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${BACKEND_URL}/workspace/paths/${
          path.id
        }/embeddings?model=${encodeURIComponent(
          selectedModel,
        )}&batch_size=${batchSize}`,
        {
          method: 'POST',
        },
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to generate embeddings')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Embedding generation started! Job ID: ${data.job_id}`)
      // Invalidate job status to trigger immediate update
      queryClient.invalidateQueries({ queryKey: ['job-status'] })
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  return (
    <AccordionItem value={path.id.toString()}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2 text-left">
            <FolderPlus className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start">
              <span className="font-medium">
                {path.name || (
                  <span className="italic text-muted-foreground">
                    Untitled Collection
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground font-mono wrap-anywhere">
                {path.path}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="secondary">{path.image_count} images</Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="p-4 space-y-2 bg-muted/30 border">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Collection Name</Label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nickname"
                />
                <Button
                  size="sm"
                  onClick={() => updatePathMutation.mutate({ name })}
                  disabled={updatePathMutation.isPending}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex flex-wrap lgap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => thumbnailsMutation.mutate()}
                  disabled={thumbnailsMutation.isPending}
                >
                  {thumbnailsMutation.isPending ? (
                    <Spinner className="w-4 h-4 mr-2" />
                  ) : (
                    <ImageIcon className="w-4 h-4 mr-2" />
                  )}
                  Generate Thumbnails
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => embeddingsMutation.mutate()}
                  disabled={embeddingsMutation.isPending}
                >
                  {embeddingsMutation.isPending ? (
                    <Spinner className="w-4 h-4 mr-2" />
                  ) : (
                    <BrainCircuit className="w-4 h-4 mr-2" />
                  )}
                  Generate Embeddings
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this path?')) {
                      deletePathMutation.mutate()
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Path
                </Button>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Path: {path.path}</p>
            <p>ID: {path.id}</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function LibrarySettings() {
  const queryClient = useQueryClient()
  const [newPath, setNewPath] = useState('')

  // Fetch paths
  const { data: paths, isLoading } = useQuery({
    queryKey: ['paths'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/workspace/paths`)
      if (!res.ok) throw new Error('Failed to fetch paths')
      return res.json()
    },
  })

  // Add path mutation
  const addPathMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await fetch(`${BACKEND_URL}/workspace/paths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to add path')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paths'] })
      setNewPath('')
      toast.success('Path added successfully')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BACKEND_URL}/workspace/scan`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to scan')
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Scan complete! Added ${data.added} new images.`)
      queryClient.invalidateQueries({ queryKey: ['paths'] })
    },
  })

  const handleAddPath = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPath) addPathMutation.mutate(newPath)
  }

  return (
    <div className="space-y-1 py-1">
      <StatsPanel />
      <Card>
        <CardHeader>
          <CardTitle>Library Collections</CardTitle>
          <CardDescription>
            Manage your local image libraries and collections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <form onSubmit={handleAddPath} className="flex gap-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="path">Add Directory Path</Label>
              <div className="flex gap-2 h-full">
                <Input
                  id="path"
                  placeholder="/home/user/images"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                />
                <Button type="submit" disabled={addPathMutation.isPending}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Path
                </Button>
              </div>
            </div>
          </form>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">Global Actions</div>
            <Button
              variant="outline"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
            >
              {scanMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Scan All Libraries
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p>Loading paths...</p>
            ) : paths?.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No paths added yet.
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {paths?.map((path: any) => (
                  <LibraryPathItem key={path.id} path={path} />
                ))}
              </Accordion>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
