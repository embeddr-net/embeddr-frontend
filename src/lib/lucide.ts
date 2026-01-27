import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FALLBACK_NAMES = ['Icon']

export const lucideIconFromName = (name?: string | null): LucideIcon | null => {
  if (!name) return null
  const iconMap = Icons as unknown as Record<string, LucideIcon>
  const direct = iconMap[name]
  if (direct) return direct

  for (const suffix of FALLBACK_NAMES) {
    const key = `${name}${suffix}`
    const icon = iconMap[key]
    if (icon) return icon
  }

  return null
}
