import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@embeddr/react-ui/components/sonner'
import Header from '../components/ui/Header'
import AppProviders from '@/providers/AppProvider'
import NotFoundPage from '@/pages/NotFoundPage'
import { DragDropOverlay } from '@/components/upload/DragDropOverlay'
import { useSettingsStore } from '@/store/settingsStore'
import { LotusRequirementsBanner } from '@/components/lotus/LotusRequirementsBanner'
import { GlobalCommandBar } from '@/components/GlobalCommandBar'
import { VHSEffect } from '@/components/ui/VHSEffect'
import { useDefaultWidgets } from '@/hooks/useDefaultWidgets'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

function Root() {
  const {
    backgroundImage,
    backgroundOpacity,
    backgroundBlur,
    themeMode,
    commandBarPosition,
    commandBarHoverParams,
    vhsEnabled,
  } = useSettingsStore()

  useDefaultWidgets()

  // "Overlay" means the bar floats (auto-hides).
  // If false (default), it's "Docked" (static blocks layout).
  const isOverlay = commandBarHoverParams.enabled

  // Apply Theme Mode
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove(
      'light',
      'dark',
      'midnight',
      'latte',
      'forest',
      'frappe',
    )

    if (themeMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(themeMode)
  }, [themeMode])

  return (
    <AppProviders>
      {vhsEnabled && <VHSEffect />}
      <div className="h-screen w-full flex flex-col overflow-hidden relative bg-background">
        {backgroundImage && (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-300 ease-in-out pointer-events-none"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              opacity: backgroundOpacity,
              filter: `blur(${backgroundBlur}px)`,
            }}
          />
        )}
        <div
          className="relative z-10 flex flex-col h-full w-full"
          style={
            {
              // CSS Variables for children to respect layout
              '--layout-bar-height': '2.25rem',
              // Flow Content Safe Area (Outlet)
              '--layout-safe-top':
                commandBarPosition === 'top' && isOverlay ? '2.25rem' : '0px',
              '--layout-safe-bottom':
                commandBarPosition === 'bottom' && isOverlay
                  ? '2.25rem'
                  : '0px',
              // Screen/Fixed Content Safe Area (Backdrops/Modals) - Bar is always present in Z-space
              '--layout-screen-safe-top':
                commandBarPosition === 'top' ? '2.20rem' : '0px',
              '--layout-screen-safe-bottom':
                commandBarPosition === 'bottom' ? '2.20rem' : '0px',
              // If overlay is active, the content is full-bleed (0 inset).
              // If static, the flex layout handles it (0 inset inside main).
            } as React.CSSProperties
          }
        >
          {commandBarPosition === 'top' && (
            <div
              className={cn(
                isOverlay && 'absolute top-0 inset-x-0 z-50  transition-colors',
              )}
            >
              <GlobalCommandBar />
            </div>
          )}

          <LotusRequirementsBanner />
          <main className="flex-1 flex flex-col overflow-visible min-h-0 w-full relative">
            <Outlet />
          </main>

          {commandBarPosition === 'bottom' && (
            <div
              className={cn(
                isOverlay &&
                  'absolute bottom-0 inset-x-0 z-50  transition-colors',
              )}
            >
              <GlobalCommandBar />
            </div>
          )}
        </div>
      </div>
      <DragDropOverlay />
      <Toaster dir="ltr" position="top-center" closeButton />
      {/* <TanStackDevtools ... /> */}
    </AppProviders>
  )
}

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFoundPage,
})
