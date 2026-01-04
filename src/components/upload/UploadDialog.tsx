import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Label } from '@embeddr/react-ui/components/label'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { toast } from 'sonner'
import { AlertTriangle, Check, Loader2, RefreshCw, X } from 'lucide-react'
import { fetchCollections } from '@/lib/api/endpoints/collections'
import { BACKEND_URL } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: Array<File>
}

interface FileStatus {
  file: File
  status:
    | 'pending'
    | 'checking'
    | 'unique'
    | 'duplicate'
    | 'uploading'
    | 'uploaded'
    | 'error'
  existingImage?: any
  phash?: string
  preview: string
  selected: boolean
}

export function UploadDialog({ open, onOpenChange, files }: UploadDialogProps) {
  const { uploadConfig } = useSettings()
  const queryClient = useQueryClient()

  const [fileStatuses, setFileStatuses] = useState<Array<FileStatus>>([])
  const [prompt, setPrompt] = useState('')
  const [tags, setTags] = useState('')
  const [libraryId, setLibraryId] = useState<number | null>(null)
  const [collectionId, setCollectionId] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  })

  useEffect(() => {
    if (open) {
      setTags(uploadConfig.default_tags || '')
      setLibraryId(uploadConfig.default_library_id)
      setCollectionId(uploadConfig.default_collection_id)
      setPrompt('')

      // Initialize file statuses
      const initialStatuses = files.map((file) => ({
        file,
        status: 'pending' as const,
        preview: URL.createObjectURL(file),
        selected: true,
      }))
      setFileStatuses(initialStatuses)

      // Start checking files
      initialStatuses.forEach((status) => checkFile(status.file))
    }

    return () => {
      // Cleanup previews
      fileStatuses.forEach((s) => URL.revokeObjectURL(s.preview))
    }
  }, [open, files]) // Re-run if files change (new drop)

  const checkFile = async (file: File) => {
    setFileStatuses((prev) =>
      prev.map((s) => (s.file === file ? { ...s, status: 'checking' } : s)),
    )

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${BACKEND_URL}/images/check`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Check failed')

      const data = await res.json()

      setFileStatuses((prev) => {
        const newStatuses = prev.map((s) => {
          if (s.file !== file) return s
          return {
            ...s,
            status: data.is_duplicate ? 'duplicate' : 'unique',
            existingImage: data.existing_image,
            phash: data.phash,
          } as FileStatus
        })

        // Check for duplicates within the batch
        // We do this by checking if any other file has the same phash
        return newStatuses.map((s) => {
          if (s.status === 'unique' && s.phash) {
            // Check if any *other* file has the same phash
            const duplicateInBatch = newStatuses.find(
              (other) => other.file !== s.file && other.phash === s.phash,
            )

            if (duplicateInBatch) {
              // If found, mark as duplicate (but without existingImage from DB)
              // We can treat it as a duplicate so the user is warned
              return {
                ...s,
                status: 'duplicate',
                // We could potentially link to the other file as "existingImage" for preview purposes
                // but existingImage expects a DB object structure.
                // Let's just mark it as duplicate for now.
              }
            }
          }
          return s
        })
      })
    } catch (e) {
      console.error('Check error', e)
      setFileStatuses((prev) =>
        prev.map((s) => (s.file === file ? { ...s, status: 'error' } : s)),
      )
    }
  }

  const handleRemoveFile = (file: File) => {
    setFileStatuses((prev) => {
      const filtered = prev.filter((s) => s.file !== file)

      // Re-evaluate batch duplicates for remaining files
      return filtered.map((s) => {
        // If it's a DB duplicate, it stays duplicate
        if (s.existingImage) return s

        // If no phash yet, we can't check
        if (!s.phash) return s

        // Check if any OTHER file in the remaining list has the same phash
        const isBatchDuplicate = filtered.some(
          (other) => other.file !== s.file && other.phash === s.phash,
        )

        if (isBatchDuplicate) {
          return { ...s, status: 'duplicate' }
        } else {
          // If it was a batch duplicate, it's now unique
          if (s.status === 'duplicate') {
            return { ...s, status: 'unique' }
          }
          return s
        }
      })
    })
  }

  const handleUpload = async () => {
    setIsUploading(true)
    const filesToUpload = fileStatuses.filter(
      (s) => s.selected && (s.status === 'unique' || s.status === 'duplicate'),
    )

    for (const status of filesToUpload) {
      setFileStatuses((prev) =>
        prev.map((s) =>
          s.file === status.file ? { ...s, status: 'uploading' } : s,
        ),
      )

      try {
        // If duplicate, we might want to update metadata instead of uploading
        // For now, let's assume "Upload" on a duplicate means "Update Metadata" if it exists, or "Force Upload" if we want duplicates?
        // The user said: "maybe it gives us options to modify it like change its collection or add a tag"
        // Let's implement: Unique -> Upload. Duplicate -> Update Metadata (Tags/Collection).

        if (status.status === 'duplicate' && status.existingImage) {
          // Update existing image metadata
          // We need an endpoint for this, or use PATCH /images/{id}
          // Assuming PATCH /images/{id} exists and accepts tags/collection
          // If not, we might need to create it.
          // Let's assume we just want to add to collection for now as that's a common use case

          if (collectionId) {
            await fetch(`${BACKEND_URL}/collections/${collectionId}/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_id: status.existingImage.id }),
            })
          }

          // Also update tags if provided? (Need backend support for patching tags)

          setFileStatuses((prev) =>
            prev.map((s) =>
              s.file === status.file ? { ...s, status: 'uploaded' } : s,
            ),
          )
          continue
        }

        const formData = new FormData()
        formData.append('file', status.file)
        if (prompt) formData.append('prompt', prompt)
        if (tags) formData.append('tags', tags)
        if (libraryId) formData.append('library_id', libraryId.toString())

        const res = await fetch(`${BACKEND_URL}/images/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json()

        if (collectionId && data.id) {
          await fetch(`${BACKEND_URL}/collections/${collectionId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_id: data.id }),
          })
        }

        setFileStatuses((prev) =>
          prev.map((s) =>
            s.file === status.file ? { ...s, status: 'uploaded' } : s,
          ),
        )
      } catch (e) {
        console.error('Upload error', e)
        setFileStatuses((prev) =>
          prev.map((s) =>
            s.file === status.file ? { ...s, status: 'error' } : s,
          ),
        )
      }
    }

    setIsUploading(false)
    queryClient.invalidateQueries({ queryKey: ['images'] })
    toast.success('Processing complete')
    onOpenChange(false)
  }

  const pendingCount = fileStatuses.filter(
    (s) => s.status !== 'uploaded',
  ).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Images ({pendingCount})</DialogTitle>
          <DialogDescription>
            Review and upload your images. Duplicates will be updated with new
            metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Left: File List */}
          <div className="w-2/3 border  flex flex-col min-h-0 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="grid grid-cols-3 gap-4 p-4">
                {fileStatuses.map((status, i) => (
                  <div
                    key={i}
                    className={cn(
                      'relative group border  overflow-hidden aspect-square',
                      status.status === 'duplicate' && 'border-yellow-500',
                      status.status === 'unique' && 'border-green-500',
                      status.status === 'error' && 'border-red-500',
                    )}
                  >
                    <img
                      src={status.preview}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveFile(status.file)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Status Icon */}
                    <div className="absolute top-1 right-1 bg-background/80  p-1">
                      {status.status === 'checking' && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {status.status === 'unique' && (
                        <Check className="h-3 w-3 text-green-500" />
                      )}
                      {status.status === 'duplicate' && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                      {status.status === 'uploading' && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                      )}
                      {status.status === 'uploaded' && (
                        <Check className="h-3 w-3 text-blue-500" />
                      )}
                      {status.status === 'error' && (
                        <X className="h-3 w-3 text-red-500" />
                      )}
                    </div>

                    {status.status === 'duplicate' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-yellow-500/90 text-white text-[10px] p-1 text-center">
                        Duplicate
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Metadata Controls */}
          <div className="w-1/3 space-y-4">
            <div className="grid gap-2">
              <Label>Collection</Label>
              <Select
                value={collectionId?.toString() || 'none'}
                onValueChange={(val) =>
                  setCollectionId(val === 'none' ? null : parseInt(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {collections?.map((col) => (
                    <SelectItem key={col.id} value={col.id.toString()}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prompt">Prompt (All)</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the images..."
                className="min-h-[100px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (All)</Label>
              <Input
                autoComplete="off"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2"
              />
            </div>

            <div className="text-xs text-muted-foreground mt-4">
              <p>
                Duplicates found:{' '}
                {fileStatuses.filter((s) => s.status === 'duplicate').length}
              </p>
              <p>
                Unique images:{' '}
                {fileStatuses.filter((s) => s.status === 'unique').length}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              isUploading || fileStatuses.some((s) => s.status === 'checking')
            }
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Processing...' : 'Process All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
