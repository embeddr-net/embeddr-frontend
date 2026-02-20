import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@embeddr/react-ui/components/ui'
import {
  HomeIcon,
  SearchIcon,
  FlowerIcon,
  Plug,
  BookOpenIcon,
  Globe,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@embeddr/react-ui/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/ui'
import { usePluginStore } from '@/plugins/store'
import { useSystemStatus } from '@/hooks/useSystemStatus'
import { BASE_URL } from '@/lib/api/config'

interface NavLink {
  to: string
  label: string
  icon: any
  target?: string
}

export function NavWidget() {
  const { getComponents } = usePluginStore()
  const { status } = useSystemStatus()
  const navigate = useNavigate()

  const links: Array<NavLink> = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/search', label: 'Search', icon: SearchIcon },
    { to: '/lotus', label: 'Lotus', icon: FlowerIcon },
  ]

  // Add Plugin Links (Top Level)
  const pluginLinks = getComponents('header-nav')
  pluginLinks.forEach(({ pluginId, def }) => {
    links.push({
      to: `/plugins/${pluginId}`,
      label: def.label,
      icon: def.icon || Plug,
    })
  })

  // Plugin Pages (Dropdown)
  const pluginPages = getComponents('page')

  // API Docs
  if (status?.docs) {
    const apiDocsUrl = BASE_URL ? `${BASE_URL}/docs` : '/docs'
    links.push({
      to: apiDocsUrl,
      label: 'API Docs',
      icon: BookOpenIcon,
      target: '_blank',
    })
  }

  return (
    <div className="flex items-center gap-1">
      {links.map(({ to, label, icon: Icon, target }) => (
        <Tooltip key={to}>
          <TooltipTrigger asChild>
            <Link
              to={to}
              target={target}
              activeProps={{
                'data-active': 'true',
              }}
            >
              {(props: { isActive: boolean }) => (
                <Button
                  variant={props.isActive ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}

      {pluginPages.length > 0 && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Plugin Pages</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>Plugin Pages</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {pluginPages.map(({ pluginId, def }) => {
              const pageId = def.id || def.name || def.exportName
              if (!pageId) return null
              const label = def.label || pageId || pluginId
              return (
                <DropdownMenuItem
                  key={`${pluginId}:${pageId}`}
                  onClick={() =>
                    navigate({
                      to: `/plugins/${pluginId}/${pageId}`,
                    })
                  }
                >
                  {label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
