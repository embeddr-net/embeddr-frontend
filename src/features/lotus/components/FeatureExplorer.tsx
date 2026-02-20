import React from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/ui'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/ui'
import { ApiExplorer } from '@/components/debug/ApiExplorer'
import { ArtifactFileManager } from '@/components/debug/ArtifactFileManager'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@embeddr/react-ui/components/ui'
import { HardDrive, Search } from 'lucide-react'

export const FeatureExplorer = ({
  showHeader = true,
}: {
  showHeader?: boolean
}) => {
  return (
    <Card className="border-muted/60 bg-transparent h-full min-h-0 flex flex-col">
      <Tabs defaultValue="explorer" className="h-full flex flex-col">
        {showHeader && (
          <CardHeader className="pb-1">
            <TabsList className="bg-transparent h-8 gap-1 justify-start">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="explorer"
                    className="h-7 w-7 p-0 data-[state=active]:bg-background"
                  >
                    <Search className="h-4 w-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Explorer</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="storage"
                    className="h-7 w-7 p-0 data-[state=active]:bg-background"
                  >
                    <HardDrive className="h-4 w-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Storage</TooltipContent>
              </Tooltip>
            </TabsList>
          </CardHeader>
        )}
        <CardContent className="flex-1 min-h-0">
          {!showHeader && (
            <TabsList className="bg-transparent h-8 gap-1 mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="explorer"
                    className="h-7 w-7 p-0 data-[state=active]:bg-background"
                  >
                    <Search className="h-4 w-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Explorer</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="storage"
                    className="h-7 w-7 p-0 data-[state=active]:bg-background"
                  >
                    <HardDrive className="h-4 w-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Storage</TooltipContent>
              </Tooltip>
            </TabsList>
          )}
          <TabsContent value="explorer" className="flex-1 min-h-0 mt-2">
            <ApiExplorer />
          </TabsContent>
          <TabsContent value="storage" className="flex-1 min-h-0 mt-2">
            <ArtifactFileManager />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
