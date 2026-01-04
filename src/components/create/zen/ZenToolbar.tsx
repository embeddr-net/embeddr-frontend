import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Box,
  Image as ImageIcon,
  List,
  Loader2,
  PanelLeftOpen,
  Play,
  Settings2,
  Sliders,
} from 'lucide-react'
import { Separator } from '@embeddr/react-ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@embeddr/react-ui/components/tooltip'
import type { Generation } from '@/lib/api/types'
import { cn } from '@/lib/utils'

import { useLocalStorage } from '@/hooks/useLocalStorage'

interface ZenToolbarProps {
  panels: {
    settings: boolean
    queue: boolean
    toolbox: boolean
    images: boolean
  }
  togglePanel: (key: keyof ZenToolbarProps['panels']) => void
  isGenerating: boolean
  handleGenerate: () => void
  selectedWorkflow: any
  hasPendingGenerations: boolean
  onExitZenMode: () => void
  hasZenInputs: boolean
  onOpenSettingsDialog: () => void
}

export function ZenToolbar({
  panels,
  togglePanel,
  isGenerating,
  handleGenerate,
  selectedWorkflow,
  hasPendingGenerations,
  onExitZenMode,
  hasZenInputs,
  onOpenSettingsDialog,
}: ZenToolbarProps) {
  const [generateText] = useLocalStorage('zen-generate-text', 'Generate')
  const [generateTheme] = useLocalStorage('zen-generate-theme', 'default')
  const [pluginSettings] = useLocalStorage<Record<string, Record<string, any>>>(
    'zen-plugin-settings',
    {},
  )
  const showTimer = pluginSettings['core.zen-mode']?.showTimer ?? true

  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (isGenerating) {
      const start = Date.now()
      const interval = setInterval(() => {
        setElapsed((Date.now() - start) / 1000)
      }, 100)
      return () => clearInterval(interval)
    } else {
      setElapsed(0)
    }
  }, [isGenerating])

  const getGenerateButtonClass = () => {
    if (isGenerating) return 'bg-amber-500 hover:bg-amber-600'

    switch (generateTheme) {
      case 'amber':
        return 'bg-amber-500 hover:bg-amber-600 text-white'
      case 'blue':
        return 'bg-blue-500 hover:bg-blue-600 text-white'
      case 'green':
        return 'bg-green-500 hover:bg-green-600 text-white'
      case 'purple':
        return 'bg-purple-500 hover:bg-purple-600 text-white'
      case 'rose':
        return 'bg-rose-500 hover:bg-rose-600 text-white'
      default:
        return 'bg-primary hover:bg-primary/90'
    }
  }

  return (
    <div className="absolute bottom-4 left-4 z-40 flex flex-col gap-2 p-2 bg-background/80 backdrop-blur-md border shadow-lg animate-in slide-in-from-left-4 duration-300">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenSettingsDialog}>
              <Settings2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Global Settings</TooltipContent>
        </Tooltip>

        <Separator className="my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.toolbox ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => togglePanel('toolbox')}
            >
              <Box className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toolbox</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.settings ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => togglePanel('settings')}
              disabled={!hasZenInputs}
            >
              <Sliders className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Quick Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.queue ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => togglePanel('queue')}
            >
              <List className="h-5 w-5" />
              {hasPendingGenerations && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">History & Queue</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={panels.images ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => togglePanel('images')}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Image Browser</TooltipContent>
        </Tooltip>

        <Separator className="my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className={cn(getGenerateButtonClass())}
              onClick={() => handleGenerate()}
              disabled={!selectedWorkflow}
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isGenerating ? 'Queueing...' : generateText}
          </TooltipContent>
        </Tooltip>

        {isGenerating && showTimer && (
          <div className="text-[10px] font-mono text-center text-muted-foreground animate-in fade-in">
            {elapsed.toFixed(1)}s
          </div>
        )}

        <Separator className="my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onExitZenMode}>
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Exit Zen Mode</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
