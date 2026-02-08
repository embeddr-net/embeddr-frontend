import { Button } from '@embeddr/react-ui/components/button'
import { Link, useNavigate } from '@tanstack/react-router'
import { Badge } from '@embeddr/react-ui/components/badge'
import { SystemResourceBar } from '@embeddr/react-ui'
import {
  BookOpenIcon,
  ChartNetworkIcon,
  CircleQuestionMarkIcon,
  DraftingCompassIcon,
  HelpCircleIcon,
  HomeIcon,
  Icon,
  Plus,
  Settings,
  Database,
  Plug,
  GitBranch,
  SearchIcon,
  FlowerIcon,
} from 'lucide-react'
import { IconRobot } from '@tabler/icons-react'
import { ModeToggle } from './ThemeToggle'
import type { IconNode, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemStatus } from '@/hooks/useSystemStatus'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useGenerationStore } from '@/store/generationStore'
import { usePluginStore } from '@/plugins/store'
import { useSettingsStore } from '@/store/settingsStore'
import { usePluginLogos } from '@/hooks/usePluginLogos'
import { BASE_URL } from '@/lib/api/config'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import { useLotus } from '@/providers/LotusProvider'

const mode = import.meta.env.MODE

interface NavLink {
  to: string
  label: string
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >
  target?: string
}

const ConnectionStatus = () => {
  const { isConnected } = useWebSocket()
  // const isConnected = false

  const { queueStatus } = useGenerationStore()
  const connectionStatus = isConnected ? 'connected' : 'disconnected'
  const navigate = useNavigate()
  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-red-500',
  }[connectionStatus]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative  gap-2 px-2"
          title={`WebSocket: ${connectionStatus}`}
        >
          <div className={cn('h-3 w-3 rounded-full', statusColor)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="space-y-2 cursor-pointer hover:bg-card/60 w-60">
        <div className="grid gap-4">
          <div onClick={() => navigate({ to: '/debug' })}>
            <h4 className="font-medium leading-none">Connection Status</h4>
            <p className="text-sm text-muted-foreground">
              WebSocket: <span className="font-mono">{connectionStatus}</span>
            </p>
            {queueStatus && (
              <p className="text-sm text-muted-foreground">
                Queue Remaining:{' '}
                <span className="font-mono">{queueStatus.remaining}</span>
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function Header() {
  const { status } = useSystemStatus()
  const { getComponents } = usePluginStore()
  const showPluginLogos = useSettingsStore((s) => s.showPluginLogos)
  const { logos } = usePluginLogos()
  const navigate = useNavigate()
  const { setSettingsOpen } = useLotus()
  const currentPath = window.location.pathname
  const pluginPages = getComponents('page')
  const links: Array<NavLink> = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/search', label: 'Search', icon: SearchIcon },
    { to: '/features', label: 'Features', icon: Database },
    // {
    //   to: '/actions',
    //   label: 'Actions',
    //   icon: GitBranch,
    // },
    // // {
    //   to: '/datasets',
    //   label: 'Datasets',
    //   icon: DraftingCompassIcon,
    // },
    // {
    //   to: '/resources',
    //   label: 'Resources',
    //   icon: Database,
    // },
    // {
    {
      to: '/lotus',
      label: 'Lotus',
      icon: FlowerIcon,
    },
  ]

  // Add Plugin Links
  const pluginLinks = getComponents('header-nav')
  pluginLinks.forEach(({ pluginId, def }) => {
    links.push({
      to: `/plugins/${pluginId}`,
      label: def.label,
      icon: def.icon || Plug,
    })
  })

  // MCP route removed while workflows are refactored.

  // links.push({ to: '/umap', label: 'UMAP', icon: ChartNetworkIcon })

  if (status?.docs) {
    const apiDocsUrl = BASE_URL ? `${BASE_URL}/docs` : '/docs'
    // Open New Tab
    links.push({
      to: apiDocsUrl,
      label: 'API Docs',
      icon: BookOpenIcon,
      target: '_blank',
    })
  }

  return (
    <div className=" border border-foreground/10 bg-card/20 backdrop-blur-md text-card-foreground ">
      <div className="links space-x-1 min-w-full flex items-center text-sm p-1">
        {links.map(({ to, label, icon: IconNode, target }) => (
          // <Link
          //   key={to}
          //   to={to}
          //   title={label}
          //   className="hover:underline text-muted hover:text-foreground/60 "
          //   activeProps={{
          //     'data-active': 'true',
          //     className: 'underline font-bold text-primary!',
          //   }}
          // >
          //   <IconNode size={24} />
          //   {/* {label} */}
          // </Link>
          <Link
            to={to}
            key={to}
            title={label}
            activeProps={{
              'data-active': 'true',
              className: 'bg-primary/20!',
            }}
            target={target}
          >
            <Button variant="ghost" size="icon-sm">
              <IconNode className="h-4 w-4" />
            </Button>
          </Link>
        ))}

        <div className="ml-auto flex items-center space-x-1">
          <div className="hidden lg:block w-48 mr-2 px-2 border-r border-border"></div>
          <SystemResourceBar variant="compact" />
          {mode && mode !== 'production' && (
            <Link
              to="/debug"
              search={{ tab: 'library' }}
              activeProps={{
                'data-active': 'true',
                className: 'bg-primary/20!',
              }}
            >
              <Button
                variant="link"
                size="sm"
                className="bg-amber-500 text-gray-800"
              >
                {mode && mode}
              </Button>
            </Link>
          )}

          <ConnectionStatus />
          <Link
            to="/settings"
            search={{ tab: 'profile' }}
            activeProps={{
              'data-active': 'true',
              className: 'bg-primary/20!',
            }}
          >
            <Button variant="ghost" size="icon-sm">
              <CircleQuestionMarkIcon className="h-4 w-4" />
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="Plugin Pages">
                <Plug className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Plugin Pages</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {pluginPages.length === 0 && (
                <DropdownMenuItem disabled>No plugin pages</DropdownMenuItem>
              )}
              {pluginPages.map(({ pluginId, def }) => {
                const pageId = def.id || def.name || def.exportName
                if (!pageId) return null
                const label = def.label || pageId || pluginId
                const logoUrl = showPluginLogos ? logos?.[pluginId] : null
                return (
                  <DropdownMenuItem
                    key={`${pluginId}:${pageId}`}
                    onClick={() =>
                      navigate({
                        to: `/plugins/${pluginId}/${pageId}`,
                      })
                    }
                  >
                    <span className="flex items-center gap-2">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={`${pluginId} logo`}
                          className="h-4 w-4 rounded-sm object-contain"
                        />
                      ) : null}
                      <span>{label}</span>
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* <Link
            to="/help"
            activeProps={{
              'data-active': 'true',
              className: 'bg-primary/20!',
            }}
          >
            <Button variant="ghost" size="icon-sm">
              <HelpCircleIcon className="h-4 w-4" />
            </Button>
          </Link> */}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          {/* 
          <Link
            to="/settings"
            search={{ tab: 'library' }}
            activeProps={{
              'data-active': 'true',
              className: 'bg-primary/20!',
            }}
          >
            <Button variant="ghost" size="icon-sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link> */}
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}
