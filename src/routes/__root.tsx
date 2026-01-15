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

function Root() {
  const { backgroundImage, backgroundOpacity, backgroundBlur } =
    useSettingsStore()
  return (
    <AppProviders>
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
        <div className="relative z-10 flex flex-col h-full w-full">
          <div className="shrink-0 p-1 pb-0!">
            <Header />
          </div>
          <main className="flex-1 flex flex-col overflow-visible  min-h-0 w-full">
            <Outlet />
          </main>
        </div>
      </div>
      <DragDropOverlay />
      <Toaster dir="ltr" position="top-center" closeButton />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
          {
            name: 'Tanstack Query',
            render: <ReactQueryDevtools />,
          },
        ]}
      />
    </AppProviders>
  )
}

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFoundPage,
})
