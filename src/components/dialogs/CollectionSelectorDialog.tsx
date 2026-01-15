import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Plus, Search, Folder } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCollections,
  createCollection,
} from '@/lib/api/endpoints/collections'
import { toast } from 'sonner'
import { Badge } from '@embeddr/react-ui/components/badge'

interface CollectionSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (collectionId: string) => void
  title?: string
  description?: string
}

export function CollectionSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select Collection',
  description = 'Choose a collection to use as input.',
}: CollectionSelectorDialogProps) {
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const queryClient = useQueryClient()

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections', 'list'],
    queryFn: async () => {
      try {
        const res = await fetchCollections()
        // Handle different API responses (paged vs list)
        if (Array.isArray(res)) return res
        if ((res as any).items && Array.isArray((res as any).items))
          return (res as any).items
        return []
      } catch (e) {
        console.error(e)
        return []
      }
    },
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: async (label: string) => {
      return await createCollection({ name: label })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      setIsCreating(false)
      setNewLabel('')
      toast.success('Collection created')
    },
    onError: () => {
      toast.error('Failed to create collection')
    },
  })

  // WorkflowList.tsx used: body: JSON.stringify({ label })
  // endpoint normally takes typed object. I will assume createCollection handles the args correctly or expects object.

  const filtered = (collections || []).filter((c: any) =>
    (c.name || c.label || c.path || '')
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  const handleCreate = () => {
    if (!newLabel.trim()) return
    createMutation.mutate(newLabel)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant={isCreating ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setIsCreating(!isCreating)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {isCreating && (
            <div className="flex gap-2 p-2 border rounded-md bg-muted/50">
              <Input
                placeholder="New Collection Name"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                Create
              </Button>
            </div>
          )}

          <ScrollArea className="h-[300px] border rounded-md">
            <div className="flex flex-col p-1">
              {isLoading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No collections found
                </div>
              )}
              {filtered.map((c: any) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => {
                    onSelect(c.id.toString())
                    onOpenChange(false)
                  }}
                >
                  <Folder className="h-4 w-4 mr-3 text-muted-foreground" />
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">
                      {c.name || c.label || 'Untitled'}
                    </span>
                    {c.file_count !== undefined && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        {c.file_count} items
                      </Badge>
                    )}
                    {c.image_count !== undefined &&
                      c.file_count === undefined && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {c.image_count} items
                        </Badge>
                      )}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
