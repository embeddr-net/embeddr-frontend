import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateDataset } from '@/hooks/useDatasets'
import { useCollections } from '@/hooks/useCollections'

export function CreateDatasetDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'regular' | 'image_pair'>('regular')
  const [collectionId, setCollectionId] = useState<string>('')

  const { data: collections } = useCollections()
  const createDataset = useCreateDataset()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !collectionId) return

    try {
      await createDataset.mutateAsync({
        name,
        description,
        type,
        collection_id: parseInt(collectionId),
      })
      toast.success('Dataset created successfully')
      onOpenChange(false)
      setName('')
      setDescription('')
      setCollectionId('')
    } catch (error) {
      toast.error('Failed to create dataset')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg!">
        <DialogHeader>
          <DialogTitle>Create New Dataset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              autoComplete="off"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Dataset"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              autoComplete="off"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">
                  Regular (Images + Captions)
                </SelectItem>
                <SelectItem value="image_pair">
                  Image Pair (Input + Target)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="collection">Source Collection</Label>
            <Select
              value={collectionId}
              onValueChange={setCollectionId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections?.map((col) => (
                  <SelectItem key={col.id} value={col.id.toString()}>
                    {col.name} ({col.item_count} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createDataset.isPending}>
              {createDataset.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Dataset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
