import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Link } from '@tanstack/react-router'
import { Settings, CircleHelp, Sun, Moon, Laptop } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@embeddr/react-ui/components/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@embeddr/react-ui/components/tooltip'
import { useLotus } from '@/providers/LotusProvider'
import { useTheme } from '@/hooks/useTheme'

export function SettingsWidget() {
  const { setSettingsOpen } = useLotus()
  const { setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1">
      {/* Help -> General Settings Tab */}
      {/* <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/settings" search={{ tab: 'general' }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              title="Help / General"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Help & General Info</TooltipContent>
      </Tooltip> */}

      {/* Theme Toggle */}
      {/* <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Laptop className="mr-2 h-4 w-4" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu> */}

      {/* Settings Modal */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="h-4 w-4" />
      </Button>
      {/* <Tooltip>
        <TooltipTrigger asChild>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip> */}
    </div>
  )
}
