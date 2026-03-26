import React from 'react'
import { Input } from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/ui'
import {
  Search,
  Loader2,
  CornerDownLeft,
  Sparkles,
  SlidersHorizontal,
  Cpu,
  Zap,
  Compass,
  Globe,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FinderMode, FinderKind } from './types'
import { FINDER_KIND_OPTIONS } from './types'

const kindIcons: Record<string, React.ElementType> = {
  panel: Cpu,
  action: Zap,
  nav: Compass,
  artifact: ImageIcon,
  resource: Globe,
  feature: Sparkles,
}

interface LotusSearchBarProps {
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  loading?: boolean
  placeholder?: string
  autoFocus?: boolean
  className?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  mode?: FinderMode
  onModeChange?: (mode: FinderMode) => void
  lotusAvailable?: boolean
  hiddenKinds?: Set<FinderKind>
  onToggleKind?: (kind: FinderKind) => void
}

export function LotusSearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder,
  autoFocus,
  className,
  inputRef,
  onKeyDown,
  mode = 'search',
  onModeChange,
  lotusAvailable = false,
  hiddenKinds,
  onToggleKind,
}: LotusSearchBarProps) {
  const isLotus = mode === 'lotus'
  const hasFilters = hiddenKinds && hiddenKinds.size > 0

  const defaultPlaceholder = isLotus
    ? 'Ask Lotus anything...'
    : 'Search actions, panels, artifacts...'

  const toggleMode = () => {
    if (!lotusAvailable) return
    onModeChange?.(isLotus ? 'search' : 'lotus')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return

    if (e.key === 'Tab' && lotusAvailable) {
      const input = e.currentTarget
      if (!value || input.selectionStart === 0) {
        e.preventDefault()
        toggleMode()
        return
      }
    }

    if (e.key === 'Enter') onSubmit()
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        {/* Mode indicator */}
        <button
          type="button"
          onClick={toggleMode}
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors',
            lotusAvailable
              ? 'cursor-pointer hover:bg-muted'
              : 'cursor-default',
            isLotus
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground',
          )}
          title={
            lotusAvailable
              ? 'Switch to ' + (isLotus ? 'Search' : 'Lotus') + ' mode (Tab)'
              : 'Search mode'
          }
        >
          {isLotus ? (
            <Sparkles className="h-3.5 w-3.5" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {isLotus ? 'Lotus' : 'Search'}
          </span>
        </button>

        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          className="pl-[4.5rem] pr-20 h-10 bg-background/60 backdrop-blur-md border border-border/60 focus-visible:ring-0 focus-visible:outline-none"
          onKeyDown={handleKeyDown}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground leading-none">
              {lotusAvailable && (
                <>
                  <kbd className="inline-flex items-center rounded border px-1 py-px text-[9px] font-mono bg-muted leading-none">
                    Tab
                  </kbd>
                  <span>mode</span>
                  <span className="text-border">|</span>
                </>
              )}
              <CornerDownLeft className="h-3 w-3" />
              <span>{isLotus ? 'Send' : 'Go'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter button */}
      {!isLotus && onToggleKind && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-10 w-10 shrink-0', hasFilters && 'text-primary')}
              title="Filter result types"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {hasFilters && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1.5 font-medium">
              Show in results
            </div>
            {FINDER_KIND_OPTIONS.map((opt) => {
              const Icon = kindIcons[opt.value] || Sparkles
              const hidden = hiddenKinds?.has(opt.value)
              return (
                <button
                  key={opt.value}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted',
                    hidden && 'opacity-40',
                  )}
                  onClick={() => onToggleKind(opt.value)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{opt.label}</span>
                  <div
                    className={cn(
                      'h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors',
                      !hidden
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30',
                    )}
                  >
                    {!hidden && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </PopoverContent>
        </Popover>
      )}

      <Button
        onClick={onSubmit}
        disabled={loading}
        variant={isLotus ? 'default' : 'secondary'}
        className="h-10 px-4"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isLotus ? (
          'Send'
        ) : (
          'Go'
        )}
      </Button>
    </div>
  )
}
