import { Card } from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import {
  ArrowLeftRight,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Loader2,
  Maximize,
  RefreshCw,
  Split,
  Wand2,
  ZoomIn,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { MediaCanvas } from '@embeddr/react-ui/components/lightbox'
import { useGeneration } from '@/context/GenerationContext'
import { useGlobalStore } from '@/store/globalStore'
import { usePanelStore } from '@/store/panelStore'
import { ImageDetailDialog } from '@/components/dialogs/ImageDetailDialog'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import { BACKEND_URL } from '@/lib/api/config'

export function ImagePreview({ children }: { children?: React.ReactNode }) {
  const {
    selectedGeneration,
    retry,
    followLatest,
    toggleFollowLatest,
    selectNextGeneration,
    selectPreviousGeneration,
  } = useGeneration()
  const { selectedImage } = useGlobalStore()
  const [detailImageId, setDetailImageId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single')
  const [activeVersion, setActiveVersion] = useState<'output' | 'parent'>(
    'output',
  )
  const [customComparisonImage, setCustomComparisonImage] = useState<
    string | null
  >(null)
  const [customPrimaryImage, setCustomPrimaryImage] = useState<string | null>(
    null,
  )
  const [isComparisonSelectorOpen, setIsComparisonSelectorOpen] =
    useState(false)
  const [selectionTarget, setSelectionTarget] = useState<
    'primary' | 'secondary'
  >('secondary')

  // Extract parent image
  const inputValues = Object.values(selectedGeneration?.inputs || {})
  const parentInput = inputValues.find(
    (val: any) => val?.image_id || val?._preview,
  )
  const parentPreview = parentInput?._preview
  const hasParent = !!parentPreview
  const currentImage = selectedGeneration?.images?.[0]
  const previewImage = selectedGeneration?.preview_url

  const imageToShow =
    customPrimaryImage ||
    (selectedImage
      ? selectedImage.image_url ||
        `${BACKEND_URL}/images/${selectedImage.id}/file`
      : null) ||
    (activeVersion === 'parent' && hasParent
      ? parentPreview
      : currentImage || previewImage)
  const secondaryImage = customComparisonImage || parentPreview

  const mediaType = customPrimaryImage
    ? /\.(mp4|webm|mov|mkv)$/i.test(customPrimaryImage)
      ? 'video'
      : 'image'
    : selectedImage
      ? selectedImage.media_type === 'video'
        ? 'video'
        : 'image'
      : imageToShow && /\.(mp4|webm|mov|mkv)$/i.test(imageToShow)
        ? 'video'
        : 'image'

  // Reset active version when generation changes
  useEffect(() => {
    setActiveVersion('output')
    setCustomComparisonImage(null)
    setCustomPrimaryImage(null)
    // If the generation has a parent (input image), default to comparison mode
    if (hasParent) {
      setViewMode('compare')
    } else {
      setViewMode('single')
    }
  }, [selectedGeneration?.id, hasParent])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        usePanelStore.getState().activePanelId
      ) {
        return
      }

      if (e.key === 'ArrowUp') {
        selectPreviousGeneration()
      } else if (e.key === 'ArrowDown') {
        selectNextGeneration()
      } else if (e.key === 'ArrowLeft') {
        if (hasParent) {
          setActiveVersion('parent')
          setViewMode('single')
        }
      } else if (e.key === 'ArrowRight') {
        setActiveVersion('output')
        setViewMode('single')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectNextGeneration, selectPreviousGeneration, hasParent])

  const handleImageClick = () => {
    if (selectedGeneration?.images?.[0]) {
      const match = selectedGeneration.images[0].match(/\/images\/(\d+)\/file/)
      if (match) {
        setDetailImageId(match[1])
      }
    }
  }

  const handleSwapImages = () => {
    const temp = imageToShow
    setCustomPrimaryImage(secondaryImage)
    setCustomComparisonImage(temp)
  }

  const openSelector = (target: 'primary' | 'secondary') => {
    setSelectionTarget(target)
    setIsComparisonSelectorOpen(true)
  }

  return (
    <Card
      className="col-span-3 flex flex-col overflow-hidden h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 select-none"
      draggable={false}
    >
      <div className="h-full flex flex-col w-full! min-h-0 gap-1! space-y-0!">
        <div className="flex-1 m-0 overflow-hidden bg-card flex items-center justify-center bg-muted/20 relative group">
          {selectedGeneration ? (
            selectedGeneration.status === 'completed' && currentImage ? (
              <MediaCanvas
                mode={viewMode}
                primaryImage={imageToShow}
                secondaryImage={secondaryImage}
                mediaType={mediaType}
                className="w-full h-full"
              >
                {/* Version Indicator */}
                {viewMode === 'single' && hasParent && (
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {activeVersion === 'parent' ? 'Original' : 'Generated'}
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity items-center z-10">
                  <div className="flex bg-background/80 backdrop-blur-sm border shadow-sm p-0.5">
                    <Button
                      variant={viewMode === 'single' ? 'secondary' : 'ghost'}
                      size="icon-sm"
                      onClick={() => setViewMode('single')}
                      title="Zoom/Pan View"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'compare' ? 'secondary' : 'ghost'}
                      size="icon-sm"
                      onClick={() => setViewMode('compare')}
                      title="Compare with Input"
                    >
                      <Split className="h-4 w-4" />
                    </Button>
                  </div>

                  {viewMode === 'compare' && (
                    <div className="flex bg-background/80 backdrop-blur-sm border shadow-sm p-0.5  gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openSelector('secondary')}
                        title="Change Left Image"
                        className="text-xs font-bold w-8 h-8 p-0 overflow-hidden"
                      >
                        {secondaryImage ? (
                          /\.(mp4|webm|mov|mkv)$/i.test(secondaryImage) ? (
                            <video
                              src={secondaryImage}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              loop
                              autoPlay // Autoplay might be heavy but for a tiny preview it's cool
                              playsInline
                            />
                          ) : (
                            <img
                              src={secondaryImage}
                              className="w-full h-full object-cover"
                              alt="L"
                            />
                          )
                        ) : (
                          'L'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleSwapImages}
                        title="Swap Images"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openSelector('primary')}
                        title="Change Right Image"
                        className="text-xs font-bold w-8 h-8 p-0 overflow-hidden"
                      >
                        {imageToShow ? (
                          /\.(mp4|webm|mov|mkv)$/i.test(imageToShow) ? (
                            <video
                              src={imageToShow}
                              className="w-full h-full object-cover pointer-events-none"
                              muted
                              loop
                              autoPlay
                              playsInline
                            />
                          ) : (
                            <img
                              src={imageToShow}
                              className="w-full h-full object-cover"
                              alt="R"
                            />
                          )
                        ) : (
                          'R'
                        )}
                      </Button>
                    </div>
                  )}

                  <Button
                    variant={followLatest ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    className="h-8 w-8 shadow-md bg-background/80 backdrop-blur-sm"
                    onClick={toggleFollowLatest}
                    title={followLatest ? 'Following Latest' : 'Follow Latest'}
                  >
                    {followLatest ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon-sm"
                    className="h-8 w-8 shadow-md"
                    onClick={handleImageClick}
                    title="View Details"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
                {children}
              </MediaCanvas>
            ) : selectedGeneration.status === 'failed' ? (
              <div className="text-center space-y-4 p-4">
                <div className="text-destructive font-medium">
                  Generation Failed
                </div>
                <p className="text-sm text-muted-foreground max-w-md break-words">
                  {selectedGeneration.error_message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retry(selectedGeneration.id)}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
                {children}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground text-sm">
                  {selectedGeneration.status === 'pending'
                    ? 'Pending...'
                    : 'Generating...'}
                </p>
                <p className="text-xs text-muted-foreground max-w-md truncate px-4">
                  {selectedGeneration.prompt}
                </p>
                {children}
              </div>
            )
          ) : (
            <div className="text-center space-y-4">
              <div className="w-64 h-64 border-2 border-dashed flex items-center justify-center mx-auto text-muted-foreground bg-background/50 ">
                <Wand2 className="h-12 w-12 opacity-20" />
              </div>
              <p className="text-muted-foreground text-sm">
                Generated images will appear here
              </p>
              {children}
            </div>
          )}
        </div>
      </div>

      <ImageDetailDialog
        imageId={detailImageId}
        open={!!detailImageId}
        onOpenChange={(open) => !open && setDetailImageId(null)}
      />

      <ImageSelectorDialog
        open={isComparisonSelectorOpen}
        onOpenChange={setIsComparisonSelectorOpen}
        onSelect={(image) => {
          const imageUrl = `${BACKEND_URL}/images/${image.id}/file`
          if (selectionTarget === 'primary') {
            setCustomPrimaryImage(imageUrl)
          } else {
            setCustomComparisonImage(imageUrl)
          }
          setIsComparisonSelectorOpen(false)
          setViewMode('compare')
        }}
      />
    </Card>
  )
}
