import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@embeddr/react-ui/components/tooltip'
import {
  ExternalNavProvider,
  ImageDialogProvider,
} from '@embeddr/react-ui/providers'
import { ThemeProvider } from './ThemeProvider'
import { ThemeSynchronizer } from '@/components/ThemeSynchronizer'
import { SettingsProvider } from '@/providers/SettingsProvider'
import { GenerationProvider } from '@/context/GenerationContext'
import { PluginProvider } from '@/providers/PluginProvider'
import { WebSocketProvider } from '@/providers/WebSocketProvider'
import { CoreUIEventBridge } from './CoreUIEventBridge'
import { LotusProvider } from '@/providers/LotusProvider'

const queryClient = new QueryClient()

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ExternalNavProvider>
        <SettingsProvider>
          <ThemeProvider>
            <ThemeSynchronizer />
            <TooltipProvider disableHoverableContent>
              <ImageDialogProvider>
                <WebSocketProvider>
                  <GenerationProvider>
                    <PluginProvider>
                      <LotusProvider>
                        <CoreUIEventBridge />
                        {children}
                      </LotusProvider>
                    </PluginProvider>
                  </GenerationProvider>
                </WebSocketProvider>
              </ImageDialogProvider>
            </TooltipProvider>
          </ThemeProvider>
        </SettingsProvider>
      </ExternalNavProvider>
    </QueryClientProvider>
  )
}

export default AppProviders
