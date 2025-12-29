import { Button } from '@embeddr/react-ui/components/button'
import { Link } from '@tanstack/react-router'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Settings } from 'lucide-react'
import { ModeToggle } from './ThemeToggle'

const mode = import.meta.env.MODE

export default function Header() {
  const links = [
    { to: '/umap', label: 'UMAP' },
    { to: '/docs', label: 'Docs' },
    // { to: '/prompts', label: 'Prompts' },
  ]

  return (
    <div className=" border border-foreground/10 bg-card text-card-foreground ">
      <div className="links space-x-2 min-w-full flex items-center text-sm p-1 pl-2">
        <Link
          to={'/'}
          className="hover:underline text-xl"
          activeProps={{
            'data-active': 'true',
            className: 'underline font-bold',
          }}
        >
          embeddr
        </Link>

        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="hover:underline"
            activeProps={{
              'data-active': 'true',
              className: 'underline font-bold',
            }}
          >
            {label}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {mode && mode !== 'production' && (
            <Badge variant="secondary" className="bg-amber-500 text-gray-800">
              {mode && mode}
            </Badge>
          )}

          <Link to="/settings" search={{ tab: 'library' }}>
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
