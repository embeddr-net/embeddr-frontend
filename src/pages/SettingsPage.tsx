import { useNavigate } from '@tanstack/react-router'
import { Card } from '@embeddr/react-ui/components/card'
import {
  FileText,
  Info,
  Library,
  Settings as SettingsIcon,
  Plug,
  Zap,
} from 'lucide-react'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { GeneralSettings } from '@/components/settings/GeneralSettings'
import { LibrarySettings } from '@/components/settings/LibrarySettings'
import { AutomationSettings } from '@/components/settings/AutomationSettings'
import { LogViewer } from '@/components/settings/LogViewer'
import { SystemInfo } from '@/components/settings/SystemInfo'
import { UploadSettings } from '@/components/settings/UploadSettings'
import { PluginSettings } from '@/components/settings/PluginSettings'
import { Route } from '@/routes/settings'
import { cn } from '@/lib/utils'

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
    {
      title: 'Upload',
      icon: <FileText className="h-4 w-4" />,
      value: 'upload',
    },
    {
      title: 'Plugins',
      icon: <Plug className="h-4 w-4" />,
      value: 'plugins',
    },
    {
      title: 'Automation',
      icon: <Zap className="h-4 w-4" />,
      value: 'automation',
    },
    {
      title: 'System Info',
      icon: <Info className="h-4 w-4" />,
      value: 'info',
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
              {activeTab === 'upload' && <UploadSettings />}
              {activeTab === 'plugins' && <PluginSettings />}
              {activeTab === 'automation' && <AutomationSettings />}
              {activeTab === 'info' && <SystemInfo />}
            </ScrollArea>
          </div>
          <LogViewer />
        </div>
      </Card>
    </div>
  )
}

export default SettingsPage
