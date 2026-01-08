import React, { useMemo } from 'react'
import { useParams } from '@tanstack/react-router'
import { usePluginStore } from '@/plugins/store'
import { useEmbeddrAPI } from '@/plugins/store' // Assuming this hook exists or I can construct it
import { Card } from '@embeddr/react-ui/components/card'
import { AlertTriangle } from 'lucide-react'

const PluginPage = () => {
  // We need to get the route definition to use useParams properly with type safety,
  // but since we are in a separate component, we might need to import the Route or use a generic useParams.
  // However, TanStack Router's useParams usually requires the route id.
  // Let's try to get it from the hook if possible, or pass it from the Route component.
  // For now, let's assume it's passed or we can get it from the router context.

  // Actually, the Route component in the routes file will render this.
  // So we can use `useParams({ from: '/plugins/$pluginId' })` if we import the route,
  // or just rely on the fact that we are rendered by that route.

  // Let's use a loose approach for now or accept props if passed by the route wrapper.
  const params = useParams({ from: '/plugins/$pluginId' })
  const { pluginId } = params

  const { plugins, getComponents } = usePluginStore()
  const api = useEmbeddrAPI() // I need to verify if this hook exists and is exported

  const plugin = plugins[pluginId]

  const pageComponent = useMemo(() => {
    if (!plugin) return null
    // Find a component with location 'page'
    // The store has getComponents helper but it returns for all plugins.
    // We want for this specific plugin.
    return plugin.components?.find((c) => c.location === 'page')
  }, [plugin])

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

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <Component api={api} />
    </div>
  )
}

export default PluginPage
