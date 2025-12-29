import { Button } from '@embeddr/react-ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import { IconBrandDiscord } from '@tabler/icons-react'
import { LucideGithub, SettingsIcon } from 'lucide-react'
import { useExternalNav } from '@embeddr/react-ui'
import { ModeToggle } from './ThemeToggle'

export function DropdownMenuDemo() {
  const { openExternal } = useExternalNav()
  const session = { user: { name: 'Local User', email: 'local@example.com' } }

  // const navigateTo = (tab: string) => {
  //   navigate({ to: "/dashboard", search: { tab } });
  // };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-7 h-7 p-0">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal flex-row flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session?.user?.email}
            </p>
          </div>

          <ModeToggle />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* <DropdownMenuItem
            onClick={() =>
              navigate({ to: "/settings", search: { tab: "status" } })
            }
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem> */}
          {/* <DropdownMenuItem
            onClick={() =>
              navigate({ to: "/settings", search: { tab: "api-keys" } })
            }
          >
            <Key className="mr-2 h-4 w-4" />
            <span>API Keys</span>
          </DropdownMenuItem> */}
          {/* <DropdownMenuItem onClick={() => navigateTo('billing')}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem> */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => openExternal('https://discord.gg/nSSxykjzfX')}
        >
          <IconBrandDiscord className="mr-2 h-4 w-4" />
          <span>Discord</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openExternal('https://github.com/nynxz/embeddr')}
        >
          <LucideGithub className="mr-2 h-4 w-4" />
          <span>GitHub</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
