import React from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/ui'
import { ScrollArea } from '@embeddr/react-ui/ui'
import { WebSocketMonitor } from '@/components/debug/WebSocketMonitor'
import { ClientsMonitor } from '@/components/debug/ClientsMonitor'
import { PluginsList } from '@/components/debug/PluginsList'
import { RoutesInspector } from '@/components/debug/RoutesInspector'
import { CliConsole } from '@/components/debug/CliConsole'
import { MaintenanceManager } from '@/components/debug/MaintenanceManager'
import ExecutionQueue from '@/components/debug/ExecutionQueue'
import { VectorIndexDebug } from '@/components/debug/VectorIndexDebug'
import { AuthSessionDebug } from '@/components/debug/AuthSessionDebug'
import { tabContentClasses, tabsTriggerClasses } from '@/styles/DebugPage'

// --- Main Page Component ---

const DebugPage = () => {
  const tabs = [
    {
      value: 'server',
      label: 'Websockets',
      component: <WebSocketMonitor />,
    },
    {
      value: 'queue',
      label: 'Execution Queue',
      component: <ExecutionQueue />,
    },
    {
      value: 'clients',
      label: 'Connected Clients',
      component: <ClientsMonitor />,
    },
    { value: 'plugins', label: 'Plugins', component: <PluginsList /> },
    { value: 'routes', label: 'Routes', component: <RoutesInspector /> },
    // { value: 'cli', label: 'CLI', component: <CliConsole /> },
    // { value: 'scraper', label: 'Scraper', component: <ScraperDebugger /> },
    {
      value: 'orphans',
      label: 'Maintenance',
      component: <MaintenanceManager />,
    },
    {
      value: 'vectors',
      label: 'Vector Index',
      component: <VectorIndexDebug />,
    },
    {
      value: 'auth',
      label: 'Auth Session',
      component: <AuthSessionDebug />,
    },
  ]
  return (
    <div className="h-full flex flex-col overflow-hidden p-1">
      <Tabs
        defaultValue="server"
        className="flex-1 flex flex-col min-h-0 gap-1!"
      >
        <div className="p-1 border bg-muted rounded">
          <TabsList className="bg-transparent h-10 w-full justify-start gap-2">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={tabsTriggerClasses}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={tabContentClasses}
          >
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default DebugPage
