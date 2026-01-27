import { createFileRoute } from '@tanstack/react-router'
import PluginPage from '@/pages/PluginPage'

const PluginPageRoute = () => {
  const { pluginId } = Route.useParams()
  return <PluginPage pluginId={pluginId} />
}

export const Route = createFileRoute('/plugins/$pluginId')({
  component: PluginPageRoute,
})
