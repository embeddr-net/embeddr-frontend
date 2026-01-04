import { useRef, useState } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@embeddr/react-ui/components/resizable'
import { Button } from '@embeddr/react-ui/components/button'
import { EditIcon, Terminal } from 'lucide-react'
import { DatasetGrid } from './DatasetGrid'
import type { Dataset, DatasetItem } from '@/hooks/useDatasets'
import { cn } from '@/lib/utils'
import { DatasetItemEditor } from '@/components/panels/DatasetItemEditor'
import { SystemLogsPanel } from '@/components/panels/SystemLogsPanel'

interface DatasetWorkspaceProps {
  dataset: Dataset
  filteredItems: Array<DatasetItem>
  isLoading: boolean
  selectedItem: DatasetItem | null
  setSelectedItem: (item: DatasetItem) => void
  viewMode: 'base' | 'pair'
}

export function DatasetWorkspace({
  dataset,
  filteredItems,
  isLoading,
  selectedItem,
  setSelectedItem,
  viewMode,
}: DatasetWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'logs' | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  const handleTabClick = (tab: 'editor' | 'logs') => {
    if (activeTab === tab) {
      setActiveTab(null)
    } else {
      setActiveTab(tab)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ResizablePanelGroup orientation="vertical" className="flex-1 gap-1">
        <ResizablePanel
          defaultSize={100}
          minSize={activeTab == null ? 100 : 30}
          maxSize={100}
        >
          <DatasetGrid
            isLoading={isLoading}
            filteredItems={filteredItems}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            viewMode={viewMode}
          />
        </ResizablePanel>

        <ResizablePanel
          collapsible={true}
          collapsedSize={0}
          maxSize={50}
          defaultSize={20}
          minSize={15}
          className={cn(
            isPanelCollapsed &&
              'min-h-0 transition-all duration-300 ease-in-out',
            activeTab !== null ? 'block' : 'hidden',
          )}
        >
          <div className="h-full overflow-hidden bg-muted/30 border border-b-0">
            <div
              className={cn(
                'h-full',
                activeTab === 'editor' ? 'block' : 'hidden',
              )}
            >
              <DatasetItemEditor
                dataset={dataset}
                selectedItem={selectedItem}
              />
            </div>
            <div
              className={cn(
                'h-full',
                activeTab === 'logs' ? 'block' : 'hidden',
              )}
            >
              <SystemLogsPanel
                isActive={activeTab === 'logs' && !isPanelCollapsed}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div
        className={cn(
          'bg-muted/30 shrink-0 h-9 flex items-center justify-between p-1 border',
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleTabClick('editor')}
          className={cn(
            'h-full rounded-none  hover:bg-muted border-none!',
            activeTab === 'editor' && 'bg-primary/50! border-none!',
          )}
        >
          <EditIcon />
        </Button>

        <Button
          variant="link"
          size="icon-sm"
          onClick={() => handleTabClick('logs')}
          className={cn(
            'h-full rounded-none  hover:bg-muted border-none!',
            activeTab === 'logs' && 'bg-primary/50! border-none!',
          )}
        >
          <Terminal />
        </Button>
      </div>
    </div>
  )
}
