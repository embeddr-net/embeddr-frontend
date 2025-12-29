import { useNavigate } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  FileText,
  Key,
  Library,
  Server,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'

import { cn } from '@embeddr/react-ui/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import { fetchAvailableModels } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'
import { LibrarySettings } from '@/components/settings/LibrarySettings'
import { LogViewer } from '@/components/settings/LogViewer'
import { Route } from '@/routes/settings'

function GeneralSettings() {
  const { selectedModel, setSelectedModel, batchSize, setBatchSize } =
    useSettings()

  const { data: models, isLoading: isLoadingModels } = useQuery({
    queryKey: ['available-models'],
    queryFn: fetchAvailableModels,
  })

  return (
    <Card className="my-1">
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Configure global application settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Global CLIP Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingModels ? (
                <SelectItem value="loading" disabled>
                  Loading models...
                </SelectItem>
              ) : (
                models?.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the CLIP model to use for embedding generation and search.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Batch Size</Label>
          <Input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
            min={1}
            max={100}
          />
          <p className="text-xs text-muted-foreground">
            Number of images to process at once during embedding generation.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

const SettingsPage = () => {
  const { tab: activeTab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const setActiveTab = (tab: string) => {
    navigate({ search: { tab } })
  }

  const sidebarNavItems = [
    {
      title: 'General',
      icon: <SettingsIcon className="h-4 w-4" />,
      value: 'general',
    },
    {
      title: 'Library',
      icon: <Library className="h-4 w-4" />,
      value: 'library',
    },
  ]

  return (
    <div className="p-1 w-full grid grid-cols-4 grid-rows-[auto_1fr] md:grid-rows-[1fr] gap-1 h-full overflow-visible ">
      {/* Left Sidebar */}
      <div className=" col-span-4 md:col-span-1 shrink-0!  overflow-visible h-auto md:h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 gap-1">
        <Card className="flex-1 h-auto md:h-full p-0! gap-0! shrink-0 flex flex-col overflow-visible min-h-0">
          <div className="flex items-center justify-between shrink-0 border-b border-foreground/10 p-2 bg-muted/35">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Settings
            </span>
          </div>
          <ScrollArea className="flex-1 flex-col">
            <div className="p-2 flex flex-row space-x-2 space-y-0 md:flex-col md:space-y-1 md:space-x-0">
              <div>
                {sidebarNavItems.map((item) => (
                  <Button
                    key={item.value}
                    variant={activeTab === item.value ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-fit md:w-full justify-start font-normal h-9',
                      activeTab === item.value && 'bg-muted font-medium',
                    )}
                    onClick={() => setActiveTab(item.value)}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {item.icon}
                      <span className="hidden md:inline">{item.title}</span>
                    </span>
                  </Button>
                ))}
              </div>
              <div className="md:hidden flex items-center justify-between shrink-0 p-2 bg-card ml-auto ">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium">
                    {sidebarNavItems.find((i) => i.value === activeTab)?.title}
                  </h2>
                  {sidebarNavItems.find((i) => i.value === activeTab)?.icon}
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="col-span-4 md:col-span-3 flex grow flex-col overflow-hidden h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0">
        <div className="h-full flex flex-col w-full! min-h-0 gap-1! space-y-0!">
          {/* Header */}

          {/* Content */}
          <div className="flex-1 m-0 overflow-y-auto border border-foreground/10 bg-card">
            <ScrollArea
              className="h-full pl-1 pr-4"
              variant="left-border"
              type="always"
            >
              {activeTab === 'general' && <GeneralSettings />}
              {activeTab === 'library' && <LibrarySettings />}
            </ScrollArea>
          </div>
          <LogViewer />
        </div>
      </Card>
    </div>
  )
}

export default SettingsPage
