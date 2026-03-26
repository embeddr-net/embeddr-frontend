import React from 'react'
import {
  Info,
  Library,
  Plug,
  Zap,
  Palette,
  Layout,
  Sparkles,
  Cpu,
  Upload,
  User,
  ShieldCheck,
  NetworkIcon,
  Flower,
} from 'lucide-react'
import {
  ZenAutomationTab,
  ZenLibraryTab,
  ZenLotusTab,
  ZenPersonalizationTab,
  ZenPluginsTab,
  ZenSystemTab,
  ZenUploadTab,
  ZenProfileTab,
  ZenSecurityTab,
  ZenTransportTab,
} from '@/components/settings/zen/ZenSettingsTabs'
import { DockSettings } from '@/components/settings/DockSettings'
import { ZenEffectsSettings } from '@/components/settings/ZenEffectsSettings'

export type SettingsTabId =
  | 'profile'
  | 'security'
  | 'transport'
  | 'personalization'
  | 'effects'
  | 'docks'
  | 'automation'
  | 'lotus'
  | 'library'
  | 'upload'
  | 'plugins'
  | 'system'

export interface SettingsSection {
  label?: string // Optional Section Header
  items: SettingsTabItem[]
}

export interface SettingsTabItem {
  id: SettingsTabId
  label: string
  icon: React.ReactNode
  component: React.ReactNode
}

export const settingsConfig: SettingsSection[] = [
  {
    label: 'Account & Security',
    items: [
      {
        id: 'profile',
        label: 'Profile & Auth',
        icon: <User className="h-4 w-4" />,
        component: <ZenProfileTab />,
      },
      {
        id: 'security',
        label: 'Security',
        icon: <ShieldCheck className="h-4 w-4" />,
        component: <ZenSecurityTab />,
      },
      {
        id: 'transport',
        label: 'Transport',
        icon: <NetworkIcon className="h-4 w-4" />,
        component: <ZenTransportTab />,
      },
    ],
  },
  {
    label: 'Appearance',
    items: [
      {
        id: 'personalization',
        label: 'Personalization',
        icon: <Palette className="h-4 w-4" />,
        component: <ZenPersonalizationTab />,
      },
      {
        id: 'effects',
        label: 'Zen Effects',
        icon: <Sparkles className="h-4 w-4" />,
        component: <ZenEffectsSettings />,
      },
      {
        id: 'docks',
        label: 'Docks',
        icon: <Layout className="h-4 w-4" />,
        component: <DockSettings />,
      },
    ],
  },
  {
    label: 'Automation',
    items: [
      {
        id: 'automation',
        label: 'Ingestion',
        icon: <Zap className="h-4 w-4" />,
        component: <ZenAutomationTab />,
      },
      {
        id: 'lotus',
        label: 'Lotus',
        icon: <Flower className="h-4 w-4" />,
        component: <ZenLotusTab />,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        id: 'library',
        label: 'Library',
        icon: <Library className="h-4 w-4" />,
        component: <ZenLibraryTab />,
      },
      {
        id: 'upload',
        label: 'Upload',
        icon: <Upload className="h-4 w-4" />,
        component: <ZenUploadTab />,
      },
      {
        id: 'plugins',
        label: 'Plugins',
        icon: <Plug className="h-4 w-4" />,
        component: <ZenPluginsTab />,
      },
      {
        id: 'system',
        label: 'System',
        icon: <Info className="h-4 w-4" />,
        component: <ZenSystemTab />,
      },
    ],
  },
]

export const getTabById = (id: string): SettingsTabItem | undefined => {
  for (const section of settingsConfig) {
    const found = section.items.find((item) => item.id === id)
    if (found) return found
  }
  return undefined
}
