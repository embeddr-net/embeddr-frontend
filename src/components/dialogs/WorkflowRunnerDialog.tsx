import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import { Label } from '@embeddr/react-ui/components/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { WorkflowSelector } from '@/components/comfy/WorkflowSelector'
import { NodeSelector } from '@/components/comfy/NodeSelector'
import { useRunWorkflow, useWorkflow } from '@/hooks/useWorkflows'
import { uploadImageFromPath } from '@/lib/api/endpoints/comfy'
import { fetchLocalImage } from '@/lib/api/endpoints/images'

interface WorkflowRunnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imagePath: string
  imageId?: number
  onSuccess: (resultImagePath: string) => void
  title?: string
  description?: string
}

export function WorkflowRunnerDialog({
  open,
  onOpenChange,
  imagePath,
  imageId,
  onSuccess,
  title = 'Generate Image Pair',
  description = 'Select a workflow to generate a pair for this image.',
}: WorkflowRunnerDialogProps) {
  const [workflowId, setWorkflowId] = useState<number | null>(null)
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const runWorkflow = useRunWorkflow()
  const { data: workflow } = useWorkflow(workflowId)

  const handleRun = async () => {
    if (!workflowId || !nodeId) return

    setIsRunning(true)
    try {
      let inputs: Record<string, any> = {}

      // Determine input type based on exposed inputs or node type
      // We check if the selected node expects an image_id or an image file
      const exposedInputs = workflow?.meta?.exposed_inputs?.[nodeId]
      const useImageId = exposedInputs && 'image_id' in exposedInputs

      if (useImageId) {
        if (!imageId) {
          toast.error(
            'This workflow requires an Image ID, but none was provided.',
          )
          setIsRunning(false)
          return
        }
        inputs = {
          [nodeId]: {
            image_id: imageId,
          },
        }
      } else {
        // Default to uploading image
        toast.info('Uploading image to ComfyUI...')
        const uploadResult = await uploadImageFromPath(
          imagePath,
          undefined,
          true,
        )
        inputs = {
          [nodeId]: {
            image: uploadResult.name,
          },
        }
      }

      // 2. Run workflow
      toast.info('Running workflow...')
      const result = await runWorkflow.mutateAsync({
        id: workflowId,
        inputs,
      })

      // 3. Handle result
      const outputImages = result.outputs.filter((o: any) => o.type === 'image')
      const outputIds = result.outputs.filter(
        (o: any) => o.type === 'embeddr_id',
      )

      if (outputIds.length > 0) {
        const lastId = outputIds[outputIds.length - 1].value
        try {
          const image = await fetchLocalImage(lastId)
          if (image && image.path) {
            onSuccess(image.path)
            onOpenChange(false)
            toast.success('Generation complete!')
            return
          }
        } catch (e) {
          console.error('Failed to fetch image details', e)
          toast.error('Failed to retrieve generated image details')
        }
      }

      if (outputImages.length > 0) {
        const lastImage = outputImages[outputImages.length - 1]
        // Construct path relative to ComfyUI output or just use the filename if we have a way to serve it
        // The backend serves ComfyUI images via /images/file?path=...
        // But we need the absolute path.
        // The result gives filename and subfolder.
        // We might need to construct the path.
        // For now, let's assume the backend can handle just the filename if it's in output.
        // Actually, `DatasetItem` expects a path.
        // We might need to move the output image to our storage or just use the ComfyUI output path.
        // Let's pass the filename and let the parent handle it, or better, return the full info.

        // For now, just return the filename. The parent might need to know it's a ComfyUI image.
        // But `DatasetItem` stores `pair_image_path`.
        // If we use `EmbeddrSaveImage` node, it might save to a specific place.
        // If we use standard `SaveImage`, it's in ComfyUI output.

        // Let's assume standard SaveImage for now.
        // We'll return the filename.
        onSuccess(lastImage.filename)
        onOpenChange(false)
        toast.success('Generation complete!')
      } else {
        toast.error('Workflow completed but no image output found.')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to run workflow')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Workflow</Label>
            <WorkflowSelector value={workflowId} onChange={setWorkflowId} />
          </div>

          <div className="grid gap-2">
            <Label>Input Node (Load Image)</Label>
            <NodeSelector
              workflowId={workflowId}
              value={nodeId}
              onChange={setNodeId}
              nodeType={[
                'LoadImage',
                'EmbeddrLoadImage',
                'EmbeddrLoadImageID',
                'embeddr.LoadImageID',
                'embeddr.LoadImage',
              ]}
              label="Select image input node"
              disabled={!workflowId}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRun}
            disabled={!workflowId || !nodeId || isRunning}
          >
            {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
