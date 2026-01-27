import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Switch } from '@embeddr/react-ui/components/switch'
import { Textarea } from '@embeddr/react-ui/components/textarea'

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
    <Card className="border-muted/60 bg-transparent">
      <CardHeader>
        <CardTitle className="text-sm">Finder Defaults</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-xs">
        <div className="flex items-center justify-between">
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
            checked={finderEnableSearch}
            onCheckedChange={setFinderEnableSearch}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-muted-foreground">
            Shebang shortcuts (JSON)
          </span>
          <Textarea
            value={finderShebangsText}
            onChange={(event) => setFinderShebangsText(event.target.value)}
            className="min-h-30 font-mono text-[11px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
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
