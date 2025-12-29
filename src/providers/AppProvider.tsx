import { ExternalNavProvider } from '@embeddr/react-ui/providers/ExternalNav'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImageDialogProvider } from '@embeddr/react-ui'
import { ThemeProvider } from './ThemeProvider'
import { SettingsProvider } from '@/providers/SettingsProvider'

const queryClient = new QueryClient()

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ExternalNavProvider>
        <SettingsProvider>
          <ThemeProvider>
            <ImageDialogProvider>{children}</ImageDialogProvider>
          </ThemeProvider>
        </SettingsProvider>
      </ExternalNavProvider>
    </QueryClientProvider>
  )
}

export default AppProviders
