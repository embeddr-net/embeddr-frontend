import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import {
  ArrowDownToLine,
  ArrowUp01,
  Dices,
  Image as ImageIcon,
  Lock,
  X,
} from 'lucide-react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import { ZenInput } from '../ZenInput'
import { cn } from '@/lib/utils'
import { DraggablePanel } from '@/components/ui/DraggablePanel'

interface ZenSettingsProps {
  isOpen: boolean
  onClose: () => void
  selectedImage: any
  handleUseGlobalImage: () => void
  selectImage: (image: any) => void
  zenInputs: Array<any>
  workflowInputs: any
  activeImageInput: { nodeId: string; field: string } | null
  setActiveImageInput: (input: { nodeId: string; field: string } | null) => void
  togglePanel: (key: string) => void
  setPanel: (key: string, value: boolean) => void
  seedModes: Record<string, 'fixed' | 'increment' | 'randomize'>
  setSeedModes: (
    modes: Record<string, 'fixed' | 'increment' | 'randomize'>,
  ) => void
  setWorkflowInput: (nodeId: string, field: string, value: any) => void
}

export function ZenSettings({
  isOpen,
  onClose,
  selectedImage,
  handleUseGlobalImage,
  selectImage,
  zenInputs,
  workflowInputs,
  activeImageInput,
  setActiveImageInput,
  setPanel,
  seedModes,
  setSeedModes,
  setWorkflowInput,
}: ZenSettingsProps) {
  return (
    <DraggablePanel
      id="zen-settings"
      title="Quick Settings"
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: 80, y: window.innerHeight - 500 }}
      defaultSize={{ width: 350, height: 200 }}
      className="absolute"
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* Global Image Selection Indicator */}
          {selectedImage && (
            <div className="mb-4 p-2 bg-primary/10 border border-primary/20  flex items-center gap-2">
              <div className="w-10 h-10  overflow-hidden bg-muted shrink-0 border border-primary/30">
                <img
                  src={selectedImage.thumb_url || selectedImage.image_url}
                  className="w-full h-full object-cover"
                  alt="Selected"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Selected Image</p>
                <div className="flex gap-1 mt-1">
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="h-5 w-5"
                    onClick={handleUseGlobalImage}
                    title="Use as input"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={() => selectImage(null)}
                    title="Clear selection"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {zenInputs.map((input: any) => {
            const value = workflowInputs[input.node_id]?.[input.field] || ''

            if (
              input.type === 'image_id' ||
              input.type === 'image' ||
              input.field === 'image_url' ||
              input.field === 'image_id'
            ) {
              const preview =
                workflowInputs[input.node_id]?._preview ||
                workflowInputs[input.node_id]?.[input.field + '_preview'] ||
                (input.field === 'image_url' ? value : undefined)
              return (
                <div
                  key={`${input.node_id}-${input.field}`}
                  className="flex items-center gap-3"
                >
                  <div
                    className={cn(
                      'h-12 w-12 border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all shrink-0',
                      activeImageInput?.nodeId === input.node_id &&
                        activeImageInput?.field === input.field &&
                        'ring-2 ring-primary',
                    )}
                    onClick={() => {
                      setActiveImageInput({
                        nodeId: input.node_id,
                        field: input.field,
                      })
                      setPanel('images', true)
                    }}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {input.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {activeImageInput?.nodeId === input.node_id &&
                      activeImageInput?.field === input.field
                        ? 'Select image from browser...'
                        : 'Click to select image'}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={`${input.node_id}-${input.field}`}
                className="space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground ml-1">
                    {input.label}
                  </div>
                  {(input.label.toLowerCase().includes('seed') ||
                    input.field === 'seed' ||
                    input.field === 'noise_seed') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-5 w-5"
                          title="Seed Mode"
                        >
                          {seedModes[`${input.node_id}-${input.field}`] ===
                          'fixed' ? (
                            <Lock className="h-3 w-3" />
                          ) : seedModes[`${input.node_id}-${input.field}`] ===
                            'increment' ? (
                            <ArrowUp01 className="h-3 w-3" />
                          ) : (
                            <Dices className="h-3 w-3" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50">
                        <DropdownMenuItem
                          onClick={() =>
                            setSeedModes({
                              ...seedModes,
                              [`${input.node_id}-${input.field}`]: 'randomize',
                            })
                          }
                        >
                          <Dices className="mr-2 h-4 w-4" /> Randomize
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setSeedModes({
                              ...seedModes,
                              [`${input.node_id}-${input.field}`]: 'increment',
                            })
                          }
                        >
                          <ArrowUp01 className="mr-2 h-4 w-4" /> Increment
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setSeedModes({
                              ...seedModes,
                              [`${input.node_id}-${input.field}`]: 'fixed',
                            })
                          }
                        >
                          <Lock className="mr-2 h-4 w-4" /> Fixed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <ZenInput
                  input={input}
                  value={value}
                  onChange={(val) =>
                    setWorkflowInput(input.node_id, input.field, val)
                  }
                />
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </DraggablePanel>
  )
}
