import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import SettingsPage from '@/pages/SettingsPage'

const settingsSearchSchema = z.object({
  tab: z.string().optional().default('general'),
})

export const Route = createFileRoute('/settings')({
  validateSearch: (search) => settingsSearchSchema.parse(search),
  component: SettingsPage,
})
