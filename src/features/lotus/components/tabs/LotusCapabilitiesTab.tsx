import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import type { LotusCapability } from '@/lib/api/types'

export function LotusCapabilitiesTab({
  capabilities,
}: {
  capabilities: LotusCapability[]
}) {
  return (
    <Card className="border-muted/60 flex h-full min-h-0 flex-col bg-transparent">
      <CardHeader>
        <CardTitle className="text-sm">Capability Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full rounded-md border">
          <div className="flex flex-col gap-2 p-3 text-xs">
            {capabilities.length === 0 ? (
              <div className="text-muted-foreground">
                No capabilities found.
              </div>
            ) : (
              capabilities.slice(0, 120).map((cap) => (
                <div
                  key={cap.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium">{cap.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {cap.id}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {cap.kind}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
