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
} from 'lucide-react'
import { IconRobot } from '@tabler/icons-react'
import { ModeToggle } from './ThemeToggle'
import type { IconNode, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemStatus } from '@/hooks/useSystemStatus'

const mode = import.meta.env.MODE

interface NavLink {
  to: string
  label: string
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >
  target?: string
}

export default function Header() {
  const { status } = useSystemStatus()
  const navigate = useNavigate()
  const currentPath = window.location.pathname
  const links: Array<NavLink> = [
    { to: '/', label: 'Home', icon: HomeIcon },
    {
      to: '/datasets',
      label: 'Datasets',
      icon: DraftingCompassIcon,
    },
  ]

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
