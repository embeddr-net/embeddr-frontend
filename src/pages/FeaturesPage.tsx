import React from 'react'
import { Badge } from '@embeddr/react-ui/ui'
import { FeatureExplorer } from '@/features/lotus/components/FeatureExplorer'

const FeaturesPage = () => {
  return (
    <div className="h-full flex flex-col overflow-hidden p-2 gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Features Explorer</span>
          <span className="text-[11px] text-muted-foreground">
            Explore artifacts, attached features, and storage locations.
          </span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          experimental
        </Badge>
      </div>
      <div className="flex-1 min-h-0">
        <FeatureExplorer showHeader={false} />
      </div>
    </div>
  )
}

export default FeaturesPage
