import * as React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { ChevronDown, Maximize2, Minimize2 } from 'lucide-react'
import { Card } from '@embeddr/react-ui/components/card'
import { cn } from '@/lib/utils'

export interface BottomPanelItem {
  id: string
  icon: React.ReactNode
  label: string
  content: React.ReactNode
  disabled?: boolean
}

interface BottomPanelProps {
  items: Array<BottomPanelItem>
  activeTab: string | null
  onTabChange: (tabId: string | null) => void
  className?: string
}

export function BottomPanel({
  items,
  activeTab,
  onTabChange,
  className,
}: BottomPanelProps) {
  const activeItem = items.find((item) => item.id === activeTab)
  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <Card
      className={cn(
        'flex flex-col bg-background shrink-0 p-0! gap-0!',
        className,
      )}
    >
      {/* Content Area */}
      {activeTab && activeItem && (
        <div
          className={cn(
            'bg-card relative animate-in slide-in-from-bottom-2 fade-in duration-200 flex flex-col',
            isExpanded ? 'h-[50vh]' : 'h-64',
          )}
        >
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Restore size' : 'Maximize size'}
            >
              {isExpanded ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={() => onTabChange(null)}
              title="Close panel"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-full w-full overflow-hidden">
            {activeItem.content}
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-muted/40">
        {items.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() =>
              !item.disabled &&
              onTabChange(activeTab === item.id ? null : item.id)
            }
            disabled={item.disabled}
            className={cn(
              'text-xs h-7',
              activeTab === item.id && 'bg-background shadow-sm font-medium',
              item.disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>
    </Card>
  )
}
