import React, { useMemo } from 'react'
import { usePluginStore } from '@/plugins/store'
import { useEmbeddrAPI } from '@/plugins/store'
import { AlertTriangle } from 'lucide-react'
import { DynamicPluginComponent } from '@/plugins/DynamicLoader'

interface PluginPageProps {
  pluginId?: string
  pageId?: string
}

const PluginPage = ({
  pluginId: propPluginId,
  pageId: propPageId,
}: PluginPageProps) => {
  // We need to get the route definition to use useParams properly with type safety,
  // but since we are in a separate component, we might need to import the Route or use a generic useParams.
  // However, TanStack Router's useParams usually requires the route id.
  // Let's try to get it from the hook if possible, or pass it from the Route component.
  // For now, let's assume it's passed or we can get it from the router context.

  // Actually, the Route component in the routes file will render this.
  // So we can use `useParams({ from: '/plugins/$pluginId' })` if we import the route,
  // or just rely on the fact that we are rendered by that route.

  // Let's use a loose approach for now or accept props if passed by the route wrapper.
  const pluginId = propPluginId
  const pageId = propPageId

  const { plugins } = usePluginStore()
  const api = useEmbeddrAPI() // I need to verify if this hook exists and is exported

  const plugin = pluginId ? plugins[pluginId] : undefined

  const pageComponent = useMemo(() => {
    if (!plugin) return null
    // Find a component with location 'page'
    const pages = plugin.components?.filter((c) => c.location === 'page') || []
    if (pageId) {
      return pages.find(
        (c) => c.id === pageId || (c as any).exportName === pageId,
      )
    }
    return pages[0]
  }, [plugin, pageId])

  if (!plugin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-semibold">Plugin Not Found</h2>
          <p className="text-muted-foreground">
            The plugin "{pluginId}" could not be found.
          </p>
        </div>
      </div>
    )
  }

  if (!pageComponent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-semibold">No Page Component</h2>
          <p className="text-muted-foreground">
            The plugin "{plugin.name}" does not define a page component.
          </p>
        </div>
      </div>
    )
  }

  const Component = pageComponent.component
  const exportName = (pageComponent as any).exportName as string | undefined
  const pageProps = (pageComponent as any).props || {}

  if (!Component && !exportName) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-semibold">Invalid Page Component</h2>
          <p className="text-muted-foreground">
            The plugin "{plugin.name}" page component could not be resolved.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden flex flex-col p-1">
      <div className="h-full border">
        {Component ? (
          <PluginPageErrorBoundary pluginName={plugin.name} pageId={pageId}>
            <Component api={api} pluginId={pluginId} {...pageProps} />
          </PluginPageErrorBoundary>
        ) : (
          <PluginPageErrorBoundary pluginName={plugin.name} pageId={pageId}>
            <DynamicPluginComponent
              pluginId={pluginId!}
              componentName={exportName!}
              api={api}
              {...pageProps}
            />
          </PluginPageErrorBoundary>
        )}
      </div>
    </div>
  )
}

export default PluginPage

class PluginPageErrorBoundary extends React.Component<
  { pluginName: string; pageId?: string; children: React.ReactNode },
  { error?: Error }
> {
  constructor(props: {
    pluginName: string
    pageId?: string
    children: React.ReactNode
  }) {
    super(props)
    this.state = { error: undefined }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-semibold">Plugin Page Error</h2>
            <p className="text-muted-foreground">
              {this.props.pluginName} page
              {this.props.pageId ? ` (${this.props.pageId})` : ''} failed to
              render.
            </p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-w-xl">
              {error.message}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
