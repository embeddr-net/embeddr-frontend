import React from 'react'
import { Input } from '@embeddr/react-ui/components/input'
import { Button } from '@embeddr/react-ui/components/button'
import { Search, Loader2, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LotusSearchBarProps {
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  loading?: boolean
  placeholder?: string
  autoFocus?: boolean
  className?: string
  inputRef?: React.RefObject<HTMLInputElement | null>

  /**
   * Let parent intercept arrows/escape/etc.
   */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function LotusSearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder = 'Search actions, panels, navigation…',
  autoFocus,
  className,
  inputRef,
  onKeyDown,
}: LotusSearchBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-20 h-10  bg-background/60 backdrop-blur-md border border-border/60 focus-visible:ring-0 focus-visible:outline-none"
          onKeyDown={(e) => {
            onKeyDown?.(e)
            if (e.defaultPrevented) return
            if (e.key === 'Enter') onSubmit()
          }}
        />
        <div className="absolute right-3 top-3.5 flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CornerDownLeft className="h-3 w-3" />
              <span>Enter</span>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={onSubmit}
        disabled={loading}
        variant="secondary"
        className="h-10  px-4"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
      </Button>
    </div>
  )
}
