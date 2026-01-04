import React, { useCallback } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@embeddr/react-ui/components/resizable'
import { Card } from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Layers } from 'lucide-react'
import type { PromptImage } from '@/lib/api/types'
import { useLineageStore } from '@/store/lineageStore'
import { ImageBrowser } from '@/components/search/ImageBrowser'
import { CustomGraph } from '@/components/lineage/CustomGraph'

const LineagePage = () => {
  const { loadLineage, toggleStacking, stackByPHash } = useLineageStore()

  const handleImageSelect = useCallback(
    (image: PromptImage) => {
      loadLineage(image.id.toString())
    },
    [loadLineage],
  )

  return (
    <div className="h-[calc(100vh)] p-1  w-full overflow-hidden bg-background">
      {/* @ts-ignore */}
      <ResizablePanelGroup direction="horizontal" className="border">
        <ResizablePanel defaultSize="25%" minSize="20%" maxSize="40%">
          <div className="h-full border-r bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Image Browser</h2>
              <p className="text-xs text-muted-foreground">
                Select an image to view lineage
              </p>
            </div>
            <div className="h-[calc(100%-5rem)] overflow-y-auto p-4">
              <ImageBrowser onSelect={handleImageSelect} />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={75}>
          <div className="h-full w-full relative">
            <div className="absolute top-4 left-4 z-10">
              <Card className="p-2 bg-background/80 backdrop-blur border-border/50 flex items-center gap-2">
                <h1 className="text-lg font-bold">Lineage Graph</h1>
                <Button
                  variant={stackByPHash ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleStacking}
                  title="Toggle PHash Stacking"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  {stackByPHash ? 'Stacked' : 'Stack'}
                </Button>
              </Card>
            </div>
            <CustomGraph />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default LineagePage
