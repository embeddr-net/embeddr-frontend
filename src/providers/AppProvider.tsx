import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@embeddr/react-ui/components/tooltip'
import {
  ExternalNavProvider,
  ImageDialogProvider,
} from '@embeddr/react-ui/providers'
import { ThemeProvider } from './ThemeProvider'
import { SettingsProvider } from '@/providers/SettingsProvider'
import { GenerationProvider } from '@/context/GenerationContext'
import { PluginProvider } from '@/providers/PluginProvider'

const queryClient = new QueryClient()

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ExternalNavProvider>
        <SettingsProvider>
          <ThemeProvider>
            <TooltipProvider disableHoverableContent>
              <ImageDialogProvider>
                <GenerationProvider>
                  <PluginProvider>{children}</PluginProvider>
                </GenerationProvider>
              </ImageDialogProvider>
            </TooltipProvider>
          </ThemeProvider>
        </SettingsProvider>
      </ExternalNavProvider>
    </QueryClientProvider>
  )
}

export default AppProviders
