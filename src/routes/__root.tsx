import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@embeddr/react-ui/ui'
import Header from '../components/ui/Header'
import AppProviders from '@/providers/AppProvider'
import NotFoundPage from '@/pages/NotFoundPage'
import { DragDropOverlay } from '@/components/upload/DragDropOverlay'
import { AppLoadingScreen } from '@/components/AppLoadingScreen'
import { useSettingsStore } from '@/store/settingsStore'
import { GlobalCommandBar } from '@/components/GlobalCommandBar'
import { CustomStyles } from '@/components/ui/CustomStyles'
import { useDefaultWidgets } from '@/hooks/useDefaultWidgets'
import { usePluginWidgets } from '@/hooks/usePluginWidgets'
import { usePinnedPanelWidgets } from '@/hooks/usePinnedPanelWidgets'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { AuthGate } from '@/components/auth/AuthGate'
import { fetchSecurityOverviewStatus } from '@/lib/api/endpoints/security'
import { useUserStore } from '@/store/userStore'
import { usePluginStore } from '@/plugins/store'
import { DockManager } from '@/components/ui/DockManager'

function Root() {
  const { apiKey } = useUserStore()
  const { isLoadingExternal, hasLoadedExternal } = usePluginStore()
  const [showCommandBar, setShowCommandBar] = useState(false)
  const {
    backgroundImage,
    backgroundOpacity,
    backgroundBlur,
    themeMode,
    commandBarPosition,
    commandBarHoverParams,
  } = useSettingsStore()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const hideChrome = pathname === '/access'

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

  useEffect(() => {
    let active = true
    const checkAuthGate = async () => {
      try {
        const status = await fetchSecurityOverviewStatus()
        if (!active) return
        setShowCommandBar(true)
      } catch (err) {
        console.error(err)
        if (active) setShowCommandBar(true)
      }
    }
    checkAuthGate()
    return () => {
      active = false
    }
  }, [apiKey])

  const pluginsReady = hasLoadedExternal && !isLoadingExternal

  const barHeight = hideChrome ? '0px' : '2.25rem'
  const screenBarHeight = hideChrome ? '0px' : '2.20rem'
  const showChrome = showCommandBar && !hideChrome

  return (
    <AppProviders>
      <CommandBarBootstrap />
      <CustomStyles />
      <div
        id="embeddr-app-root"
        className="embeddr h-screen w-full flex flex-col overflow-hidden relative bg-background"
      >
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
          className={cn(
            'relative z-10 flex flex-col h-full w-full transition-opacity duration-500 ease-out',
            pluginsReady ? 'opacity-100' : 'opacity-0',
          )}
          style={
            {
              // CSS Variables for children to respect layout
              '--layout-bar-height': barHeight,
              // Flow Content Safe Area (Outlet)
              '--layout-safe-top':
                !hideChrome && commandBarPosition === 'top' && isOverlay
                  ? barHeight
                  : '0px',
              '--layout-safe-bottom':
                !hideChrome && commandBarPosition === 'bottom' && isOverlay
                  ? barHeight
                  : '0px',
              // Screen/Fixed Content Safe Area (Backdrops/Modals) - Bar is always present in Z-space
              '--layout-screen-safe-top':
                !hideChrome && commandBarPosition === 'top'
                  ? screenBarHeight
                  : '0px',
              '--layout-screen-safe-bottom':
                !hideChrome && commandBarPosition === 'bottom'
                  ? screenBarHeight
                  : '0px',
              // If overlay is active, the content is full-bleed (0 inset).
              // If static, the flex layout handles it (0 inset inside main).
            } as React.CSSProperties
          }
        >
          {showChrome && commandBarPosition === 'top' && (
            <div
              className={cn(
                'relative z-60',
                isOverlay && 'absolute top-0 inset-x-0 transition-colors',
              )}
            >
              <GlobalCommandBar />
            </div>
          )}

          <main className="flex-1 flex flex-col overflow-visible min-h-0 w-full relative">
            <AuthGate>
              <Outlet />
            </AuthGate>
          </main>
          <DockManager />

          {showChrome && commandBarPosition === 'bottom' && (
            <div
              className={cn(
                'relative z-60',
                isOverlay && 'absolute bottom-0 inset-x-0 transition-colors',
              )}
            >
              <GlobalCommandBar />
            </div>
          )}
        </div>
        <div
          className={cn(
            'absolute inset-0 z-20 transition-opacity duration-500',
            pluginsReady ? 'opacity-0 pointer-events-none' : 'opacity-100',
          )}
        >
          <AppLoadingScreen />
        </div>
      </div>
      <DragDropOverlay />
      <Toaster dir="ltr" position="top-center" closeButton />
      {/* <TanStackDevtools ... /> */}
    </AppProviders>
  )
}

function CommandBarBootstrap() {
  useDefaultWidgets()
  usePluginWidgets()
  usePinnedPanelWidgets()
  return null
}

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFoundPage,
})
