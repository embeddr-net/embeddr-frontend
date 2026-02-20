import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@embeddr/react-ui/components/ui'
import { LotusSearchBar } from './LotusSearchBar'
import { LotusResultsList } from './LotusResultsList'
import { LotusInspector } from './LotusInspector'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@embeddr/react-ui/components/ui'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { embeddrApi } from '@/lib/api/client'
import type { LotusResultItem } from './types'

interface LotusCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LotusQueryResponse {
  query: string
  results: LotusResultItem[]
}

export function LotusCommandPalette({
  open,
  onOpenChange,
}: LotusCommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LotusResultItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dispatching, setDispatching] = useState(false)

  const selectedItem = results.find((r) => r.id === selectedId) || null

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedId(null)
    }
  }, [open])

  const search = async () => {
    setLoading(true)
    try {
      const data: LotusQueryResponse = await embeddrApi.lotus.query(query, 20)
      setResults(data.results || [])
      // Auto-select first result
      if (data.results?.length > 0) {
        setSelectedId(data.results[0].id)
      }
    } catch (e: any) {
      toast.error('Search failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Search on type with debounce? For now just manual or enter.
  // Actually, let's trigger search on Enter in LotusSearch, which calls onSearch.

  const handleDispatch = async (item: LotusResultItem, inputs?: any) => {
    if (item.kind === 'nav') {
      const route = item.data?.route as string | undefined
      if (route) {
        navigate({ to: route })
        onOpenChange(false)
        toast.success(`Navigating to ${route}`)
      }
      return
    }

    if (item.kind !== 'action') {
      toast.info('This item is not dispatchable action.')
      return
    }

    const payloadData = {
      ...(item.data || {}),
      inputs: inputs || {},
    } as Record<string, any>
    const pluginName = (payloadData.plugin_name || payloadData.plugin) as string | undefined
    const actionName = (payloadData.action_name || payloadData.action) as string | undefined
    if (!pluginName || !actionName) {
      toast.error('Action missing plugin or action name.')
      return
    }
    payloadData.plugin_name = pluginName
    payloadData.action_name = actionName

    setDispatching(true)
    try {
      const payload = {
        result_id: item.id,
        kind: 'action' as const,
        data: payloadData,
      }

      const out = (await embeddrApi.lotus.dispatch(
        payload.result_id,
        payload.kind,
        payload.data,
      )) as { navigate_to?: string; execution_id?: string }

      onOpenChange(false)

      if (out.navigate_to) {
        navigate({ to: out.navigate_to })
      }

      if (out.execution_id) {
        toast.success('Action queued', {
          description: `Execution ID: ${out.execution_id}`,
        })
      }
    } catch (e: any) {
      toast.error('Dispatch failed: ' + e.message)
    } finally {
      setDispatching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[60vh] p-0 gap-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-muted/10">
          <LotusSearchBar
            value={query}
            onChange={setQuery}
            onSubmit={search}
            loading={loading}
          />
        </div>

        {results.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Type to search...</p>
          </div>
        )}

        {results.length > 0 && (
          <ResizablePanelGroup className="flex-1">
            <ResizablePanel
              defaultSize={40}
              minSize={30}
              maxSize={50}
              className="border-r"
            >
              <LotusResultsList
                items={results}
                selectedId={selectedId}
                onSelect={(item) => setSelectedId(item.id)}
                onConfirm={(item) => handleDispatch(item)}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={60}>
              <LotusInspector
                item={selectedItem}
                onDispatch={handleDispatch}
                running={dispatching}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </DialogContent>
    </Dialog>
  )
}
