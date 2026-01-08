import { createFileRoute } from '@tanstack/react-router'
import PluginPage from '@/pages/PluginPage'

export const Route = createFileRoute('/plugins/$pluginId')({
  component: PluginPage,
})
