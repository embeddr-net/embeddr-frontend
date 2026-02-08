import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@embeddr/react-ui/components/resizable'
import { LotusInspector } from './LotusInspector'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useEmbeddrAPI } from '@/plugins/store'
import type { LotusResultItem } from './types'
import { LotusSearchBar } from './LotusSearchBar'
import { LotusResultsList } from './LotusResultsList'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Input } from '@embeddr/react-ui/components/input'
import { Badge } from '@embeddr/react-ui/components/badge'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { embeddrApi } from '@/lib/api/client'

interface LotusQueryResponse {
  query: string
  results: LotusResultItem[]
}

export function LotusExplorer() {
  const api = useEmbeddrAPI()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LotusResultItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [capFilter, setCapFilter] = useState('')
  const [capabilities, setCapabilities] = useState<any[]>([])
  const [capLoading, setCapLoading] = useState(false)

  const selectedItem = results.find((r) => r.id === selectedId) || null

  const filteredCapabilities = useMemo(() => {
    const q = capFilter.trim().toLowerCase()
    if (!q) return capabilities
    return capabilities.filter((cap) => {
      const hay =
        `${cap.id} ${cap.title} ${cap.kind} ${cap.plugin}`.toLowerCase()
      return hay.includes(q)
    })
  }, [capFilter, capabilities])

  const search = useCallback(async () => {
    setLoading(true)
    try {
      const data: LotusQueryResponse = await api.lotus.query(query, 50)
      setResults(data.results || [])
    } catch (e: any) {
      toast.error('Search failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [api.lotus, query])

  // Initial load
  useEffect(() => {
    search()
  }, [])

  const loadCapabilities = useCallback(async () => {
    setCapLoading(true)
    try {
      const data = await api.lotus.list({ limit: 500 })
      setCapabilities(data.items || [])
    } catch (e: any) {
      toast.error('Failed to load capabilities: ' + e.message)
    } finally {
      setCapLoading(false)
    }
  }, [api.lotus])

  useEffect(() => {
    loadCapabilities()
  }, [loadCapabilities])

  const handleDispatch = async (item: LotusResultItem, inputs?: any) => {
    if (item.kind === 'nav') {
      const route = item.data?.route as string | undefined
      if (route) {
        navigate({ to: route })
        toast.success(`Navigating to ${route}`)
      }
      return
    }

    if (item.kind !== 'action') {
      toast.info('This item is not dispatchable action.')
      return
    }

    const baseData = { ...(item.data || {}), inputs: inputs || {} } as Record<
      string,
      any
    >
    const pluginName = baseData.plugin_name as string | undefined
    const actionName = baseData.action_name as string | undefined
    if (!pluginName || !actionName) {
      toast.error('Action missing plugin or action name.')
      return
    }

    setDispatching(true)
    try {
      const payload = {
        result_id: item.id,
        kind: item.kind,
        data: baseData,
      }

      const out = (await embeddrApi.lotus.dispatch(
        payload.result_id,
        'action',
        payload.data,
      )) as { navigate_to?: string; execution_id?: string }

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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex-1 overflow-hidden border rounded-none shadow-sm bg-card">
        <ResizablePanelGroup>
          <ResizablePanel
            defaultSize="35%"
            minSize="20%"
            maxSize="45%"
            className="flex flex-col border-r"
          >
            <Tabs defaultValue="query" className="flex h-full min-h-0 flex-col">
              <div className="border-b bg-muted/10 px-4 py-3">
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="query">Query</TabsTrigger>
                  <TabsTrigger value="introspect">Introspection</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="query" className="m-0 flex-1 min-h-0">
                <div className="p-4 border-b">
                  <LotusSearchBar
                    value={query}
                    onChange={setQuery}
                    onSubmit={search}
                    loading={loading}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <LotusResultsList
                    items={results}
                    selectedId={selectedId}
                    onSelect={(item) => setSelectedId(item.id)}
                    onConfirm={handleDispatch}
                  />
                </div>
              </TabsContent>

              <TabsContent value="introspect" className="m-0 flex-1 min-h-0">
                <div className="p-4 border-b">
                  <Input
                    value={capFilter}
                    onChange={(event) => setCapFilter(event.target.value)}
                    placeholder="Filter capabilities (id, title, kind, plugin)"
                  />
                </div>
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-2 p-4 text-xs">
                    {capLoading ? (
                      <div className="text-muted-foreground">
                        Loading capabilities...
                      </div>
                    ) : filteredCapabilities.length === 0 ? (
                      <div className="text-muted-foreground">No matches.</div>
                    ) : (
                      filteredCapabilities.map((cap) => (
                        <button
                          key={cap.id}
                          className="flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left hover:bg-muted/40"
                          onClick={() => {
                            setSelectedId(null)
                            setResults([
                              {
                                id: cap.id,
                                kind: cap.kind,
                                title: cap.title,
                                description: cap.description,
                                data: cap.data,
                                score: 1,
                              } as LotusResultItem,
                            ])
                            setSelectedId(cap.id)
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium">
                              {cap.title}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {cap.kind}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {cap.id}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="65%">
            <LotusInspector
              item={selectedItem}
              onDispatch={handleDispatch}
              running={dispatching}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
