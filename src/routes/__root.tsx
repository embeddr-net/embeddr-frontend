import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@embeddr/react-ui/components/sonner'
import Header from '../components/ui/Header'
import AppProviders from '@/providers/AppProvider'
import NotFoundPage from '@/pages/NotFoundPage'

export const Route = createRootRoute({
  component: () => (
    <AppProviders>
      <div className="h-screen w-full flex flex-col overflow-hidden">
        <div className="shrink-0 p-1 pb-0">
          <Header />
        </div>
        <main className="flex-1 flex flex-col overflow-visible  min-h-0 w-full">
          <Outlet />
        </main>
      </div>
      <Toaster dir="ltr" position="bottom-left" />
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
  ),
  notFoundComponent: NotFoundPage,
})
