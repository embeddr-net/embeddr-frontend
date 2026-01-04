import { useCallback, useEffect, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { UploadDialog } from './UploadDialog'

export function DragDropOverlay() {
  const [isDragging, setIsDragging] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<Array<File>>([])
  const [showDialog, setShowDialog] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : []
    if (
      types.includes('Files') &&
      !types.includes('application/embeddr-image-id')
    ) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if leaving the window
    if (e.clientX === 0 && e.clientY === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (files.length > 0) {
        setDroppedFiles(files)
        setShowDialog(true)
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [handleDragOver, handleDragLeave, handleDrop])

  return (
    <>
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary m-4 rounded-lg pointer-events-none">
          <div className="flex flex-col items-center gap-4 text-primary animate-bounce">
            <UploadCloud className="h-20 w-20" />
            <h2 className="text-2xl font-bold">Drop image to upload</h2>
          </div>
        </div>
      )}
      <UploadDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        files={droppedFiles}
      />
    </>
  )
}
