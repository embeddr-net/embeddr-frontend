import React, { useState } from 'react'
import { DraggablePanel } from '@/components/ui/DraggablePanel'
import { ImageBrowser } from '@/components/search/ImageBrowser'
import { Switch } from '@embeddr/react-ui/components/switch'
import { Label } from '@embeddr/react-ui/components/label'
import { useWindowStore } from '@/store/windowStore'

interface ZenImageBrowserProps {
  isOpen?: boolean
  onClose?: () => void
  activeImageInput: { nodeId: string; field: string } | null
  onSelect: (image: any) => void
  onMultiSelect?: (images: any[]) => void
}

export function ZenImageBrowser({
  isOpen: propIsOpen,
  onClose: propOnClose,
  activeImageInput,
  onSelect,
  onMultiSelect,
}: ZenImageBrowserProps) {
  const closeWindow = useWindowStore((s) => s.closeWindow)
  // Only subscribe to the minimized state of this window
  const isMinimized = useWindowStore(
    (s) => s.windows['zen-images']?.isMinimized,
  )

  const isOpen = propIsOpen ?? isMinimized === false
  const onClose = propOnClose ?? (() => closeWindow('zen-images'))

  const [isMultiSelect, setIsMultiSelect] = useState(false)

  return (
    <DraggablePanel
      id="zen-images"
      title="Image Browser"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: 450, y: window.innerHeight - 500 }}
      defaultSize={{ width: 600, height: 400 }}
      className="absolute select-none"
    >
      {isOpen && (
        <div className="flex flex-col h-full">
          {activeImageInput && (
            <div className="px-3 py-1.5 border-b bg-muted/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-primary">
                  Selection Mode
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5">
                  Selecting for: {activeImageInput.field}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="multi-select"
                  className="text-xs cursor-pointer"
                >
                  Multi-select
                </Label>
                <Switch
                  id="multi-select"
                  checked={isMultiSelect}
                  onCheckedChange={setIsMultiSelect}
                  className="scale-75 origin-right"
                />
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0 p-2.5">
            <ImageBrowser
              onSelect={onSelect}
              defaultGridCols={3}
              storageKey="zen-grid-cols"
              multiSelectMode={isMultiSelect}
              onMultiSelect={onMultiSelect}
              useV2={true}
            />
          </div>
        </div>
      )}
    </DraggablePanel>
  )
}
