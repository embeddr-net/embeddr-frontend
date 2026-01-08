import { Button } from '@embeddr/react-ui/components/button'
import { Link, useNavigate } from '@tanstack/react-router'
import { Badge } from '@embeddr/react-ui/components/badge'
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
} from 'lucide-react'
import { IconRobot } from '@tabler/icons-react'
import { ModeToggle } from './ThemeToggle'
import type { IconNode, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemStatus } from '@/hooks/useSystemStatus'
import { useGenerationStore } from '@/store/generationStore'
import { usePluginStore } from '@/plugins/store'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/popover'

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
  const { connectionStatus, queueStatus } = useGenerationStore()
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
          size="sm"
          className="relative h-8 gap-2 px-2"
          title={`WebSocket: ${connectionStatus}`}
        >
          <div className={cn('h-3 w-3 rounded-full', statusColor)} />
          <span className="text-xs font-mono hidden md:inline-block uppercase">
            {connectionStatus}
          </span>
          {queueStatus?.remaining !== undefined &&
            queueStatus.remaining > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {queueStatus.remaining}
              </span>
            )}
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
  const navigate = useNavigate()
  const currentPath = window.location.pathname
  const links: Array<NavLink> = [
    { to: '/', label: 'Home', icon: HomeIcon },
    {
      to: '/datasets',
      label: 'Datasets',
      icon: DraftingCompassIcon,
    },
    {
      to: '/resources',
      label: 'Resources',
      icon: Database,
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

  if (status?.mcp) {
    links.push({ to: '/comfy', label: 'MCP', icon: IconRobot })
  }

  // links.push({ to: '/umap', label: 'UMAP', icon: ChartNetworkIcon })

  if (status?.docs) {
    // Get api url from env api/v1/docs
    const apiDocsUrl = import.meta.env.VITE_BACKEND_URL
      ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '')}/docs`
      : '/api/v1/docs'
    // Open New Tab
    links.push({
      to: apiDocsUrl,
      label: 'API Docs',
      icon: BookOpenIcon,
      target: '_blank',
    })
  }

  return (
    <div className=" border border-foreground/10 bg-card text-card-foreground ">
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
          <ConnectionStatus />
          {mode && mode !== 'production' && (
            <Button
              variant="link"
              size="sm"
              className="bg-amber-500 text-gray-800"
            >
              {mode && mode}
            </Button>
          )}

          <Link
            to="/create"
            activeProps={{
              'data-active': 'true',
              className: 'bg-primary/20!',
            }}
          >
            <Button variant="ghost" size="icon-sm">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>

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
          </Link>
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}
