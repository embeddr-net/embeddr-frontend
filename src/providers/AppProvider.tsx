import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@embeddr/react-ui/ui'
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
import { HotkeysProvider } from '@/providers/HotkeysProvider'

const queryClient = new QueryClient()

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <HotkeysProvider>
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
      </HotkeysProvider>
    </QueryClientProvider>
  )
}

export default AppProviders
