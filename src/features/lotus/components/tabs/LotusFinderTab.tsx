import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { Switch } from '@embeddr/react-ui/ui'
import { Textarea } from '@embeddr/react-ui/ui'

export function LotusFinderTab({
  finderEnableSearch,
  setFinderEnableSearch,
  finderShebangsText,
  setFinderShebangsText,
  onSaveFinderDefaults,
  saveFinderDefaultsPending,
}: {
  finderEnableSearch: boolean
  setFinderEnableSearch: (value: boolean) => void
  finderShebangsText: string
  setFinderShebangsText: (value: string) => void
  onSaveFinderDefaults: () => void
  saveFinderDefaultsPending: boolean
}) {
  return (
    <Card className="embeddr-lotus-finder embeddr-lotus-finder-card border-muted/60 bg-transparent">
      <CardHeader className="embeddr-lotus-finder-header">
        <CardTitle className="text-sm">Finder Defaults</CardTitle>
      </CardHeader>
      <CardContent className="embeddr-lotus-finder-body flex flex-col gap-4 text-xs">
        <div className="embeddr-lotus-finder-toggle-row flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">
              Enable server search by default
            </span>
            <span className="text-[10px] text-muted-foreground">
              When disabled, Finder only matches local actions unless you use a
              shebang.
            </span>
          </div>
          <Switch
            className="embeddr-lotus-finder-toggle"
            checked={finderEnableSearch}
            onCheckedChange={setFinderEnableSearch}
          />
        </div>

        <div className="embeddr-lotus-finder-inputs flex flex-col gap-2">
          <span className="text-[11px] text-muted-foreground">
            Shebang shortcuts (JSON)
          </span>
          <Textarea
            value={finderShebangsText}
            onChange={(event) => setFinderShebangsText(event.target.value)}
            className="embeddr-lotus-finder-textarea min-h-30 font-mono text-[11px]"
          />
        </div>

        <div className="embeddr-lotus-finder-actions flex items-center gap-2">
          <Button
            className="embeddr-lotus-finder-save"
            onClick={onSaveFinderDefaults}
            disabled={saveFinderDefaultsPending}
          >
            Save Finder Defaults
          </Button>
          {saveFinderDefaultsPending && (
            <span className="text-[11px] text-muted-foreground">Saving...</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
