import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@embeddr/react-ui/components/card'
import { useEffect, useRef, useState } from 'react'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import { fetchSystemLogs } from '@/lib/api'

export function LogViewer() {
  const [isOpen, setIsOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: logs } = useQuery({
    queryKey: ['system-logs-viewer'],
    queryFn: () => fetchSystemLogs(50),
    refetchInterval: isOpen ? 2000 : false,
  })

  // Auto-scroll to bottom using scrollIntoView
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [logs, isOpen])

  return (
    <Card className="p-0! gap-0!">
      <Accordion
        type="single"
        collapsible
        className="w-full"
        onValueChange={(value) => setIsOpen(value === 'logs')}
      >
        <AccordionItem value="logs" className="border-none">
          <AccordionTrigger className="py-3 px-4 hover:no-underline bg-muted/20">
            <span className="text-sm font-medium">System Logs</span>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <ScrollArea
              type="always"
              variant="left-border"
              className="h-50 w-full bg-muted/50 border-t border-border"
            >
              <div className="p-4 font-mono text-xs">
                {logs?.map((log: string, i: number) => (
                  <div
                    key={i}
                    className="whitespace-pre-wrap border-b border-border/50 py-0.5 last:border-0"
                  >
                    {log}
                  </div>
                ))}
                {(!logs || logs.length === 0) && (
                  <div className="text-muted-foreground italic py-2">
                    No logs available...
                  </div>
                )}
                {/* Anchor for auto-scrolling */}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
