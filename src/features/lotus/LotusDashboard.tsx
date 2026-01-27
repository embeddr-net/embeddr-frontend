import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { toast } from 'sonner'
import { useEmbeddrAPI } from '@/plugins/store'
import { embeddrApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useWorkflows } from '@/hooks/useWorkflows'
import { listLotusClients } from '@/lib/api/endpoints/lotus'
import type { LotusResultItem } from './types'
import { LotusStoragePanel } from './components/LotusStoragePanel'
import { LotusOverviewPanel } from './components/LotusOverviewPanel'
import { LotusConfigsTab } from './components/tabs/LotusConfigsTab'
import { LotusDefaultsTab } from './components/tabs/LotusDefaultsTab'
import { LotusFinderTab } from './components/tabs/LotusFinderTab'
import { LotusCapabilitiesTab } from './components/tabs/LotusCapabilitiesTab'
import { LotusFeaturesTab } from './components/tabs/LotusFeaturesTab'
import { LotusWorkflowsTab } from './components/tabs/LotusWorkflowsTab'
import {
  LayoutDashboard,
  HardDrive,
  Workflow,
  Settings,
  Search,
  Cpu,
  Paperclip,
} from 'lucide-react'
import { useCommandBarStore } from '@/store/commandBarStore'
import { globalEventBus } from '@/lib/eventBus'
import { useWebSocket } from '@/providers/WebSocketProvider'

type ConfigGetResponse = {
  ok: boolean
  plugin_name: string
  config_id?: string | null
  scope: string
  scope_id?: string | null
  value: {
    text_provider?: string
    similar_provider?: string
    shebangs?: Record<string, any>
  }
}

type ConfigSetResponse = {
  ok: boolean
  value: {
    text_provider?: string
    similar_provider?: string
    shebangs?: Record<string, any>
  }
}

type WorkflowRegistryConfig = {
  ingestion_workflow_id?: string | null
  default_workflow_ids?: string[]
}

type FinderDefaultsConfig = {
  enable_search?: boolean
  shebangs?: Record<string, any>
}

type BlobRegistryResponse = {
  providers: string[]
  resolvers: string[]
  provider_resolvers: Record<string, string>
  default_provider?: string | null
  default_resolver?: string | null
}

export function LotusDashboard() {
  const api = useEmbeddrAPI()
  const { setPageControls } = useCommandBarStore()
  const { lastMessage } = useWebSocket()

  const capsQuery = useQuery({
    queryKey: ['lotus', 'capabilities', 'dashboard'],
    queryFn: () => api.lotus.list({ limit: 200 }),
  })

  const capabilities = capsQuery.data?.items || []

  const pluginsQuery = useQuery({
    queryKey: ['plugins', 'loaded'],
    queryFn: () => embeddrApi.plugins.list(),
  })

  const artifactsQuery = useQuery({
    queryKey: ['artifacts', 'count'],
    queryFn: () => embeddrApi.artifacts.list({ limit: 1, offset: 0 }),
  })

  const automationStatus = useMemo(() => {
    const data = lastMessage?.data as any
    const automation = data?.automation_status
    return {
      total: automation?.total ?? 0,
      active: automation?.active ?? 0,
    }
  }, [lastMessage])

  const blobRegistryQuery = useQuery({
    queryKey: ['system', 'blob-registry'],
    queryFn: () => embeddrApi.system.getBlobRegistry(),
  })

  const searchDefaultsQuery = useQuery({
    queryKey: ['lotus', 'search-defaults'],
    queryFn: async () => {
      const data = await api.lotus.invoke('embeddr-core.config.get', {
        plugin_name: 'embeddr-core',
        config_id: 'embeddr-core.search.config',
        scope: 'global',
        include_capability: true,
      })
      return data as ConfigGetResponse
    },
  })

  const workflowRegistryQuery = useQuery({
    queryKey: ['lotus', 'workflow-registry'],
    queryFn: async () => {
      const data = await api.lotus.invoke('embeddr-core.config.get', {
        plugin_name: 'embeddr-core',
        config_id: 'embeddr-core.workflow.registry',
        scope: 'global',
        include_capability: true,
      })
      return data as ConfigGetResponse
    },
  })

  const finderDefaultsQuery = useQuery({
    queryKey: ['lotus', 'finder-defaults'],
    queryFn: async () => {
      const data = await api.lotus.invoke('embeddr-core.config.get', {
        plugin_name: 'embeddr-core',
        config_id: 'embeddr-core.finder.config',
        scope: 'global',
        include_capability: true,
      })
      return data as ConfigGetResponse
    },
  })

  const { data: workflows } = useWorkflows()

  const lotusWorkflowQuery = useQuery({
    queryKey: ['lotus', 'workflow-results'],
    queryFn: () =>
      api.lotus.query('workflow', 50) as Promise<{
        results: LotusResultItem[]
      }>,
  })

  const lotusClientsQuery = useQuery({
    queryKey: ['lotus', 'clients'],
    queryFn: () => listLotusClients(),
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const refreshClients = () => {
      lotusClientsQuery.refetch()
    }
    const unsubConnect = globalEventBus.on('client_connected', refreshClients)
    const unsubDisconnect = globalEventBus.on(
      'client_disconnected',
      refreshClients,
    )
    const unsubSocket = globalEventBus.on('websocket:connected', refreshClients)
    return () => {
      unsubConnect()
      unsubDisconnect()
      unsubSocket()
    }
  }, [lotusClientsQuery])

  const [textProvider, setTextProvider] = useState('')
  const [similarProvider, setSimilarProvider] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [ingestionWorkflowId, setIngestionWorkflowId] = useState('')
  const [defaultWorkflowIdsText, setDefaultWorkflowIdsText] = useState('[]')
  const [defaultBlobProvider, setDefaultBlobProvider] = useState('')
  const [defaultBlobResolver, setDefaultBlobResolver] = useState('')
  const [finderEnableSearch, setFinderEnableSearch] = useState(true)
  const [finderShebangsText, setFinderShebangsText] = useState('{}')

  // Register dashboard navigation with global command bar
  useEffect(() => {
    setPageControls(
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6',
            activeTab === 'overview' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => setActiveTab('overview')}
          title="Overview"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6',
            activeTab === 'features' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => setActiveTab('features')}
          title="Features"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6',
            activeTab === 'storage' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => setActiveTab('storage')}
          title="Storage"
        >
          <HardDrive className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6',
            activeTab === 'workflows' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => setActiveTab('workflows')}
          title="Workflows"
        >
          <Workflow className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6',
            activeTab === 'configs' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => setActiveTab('configs')}
          title="Configurations"
        >
          <Cpu className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6',
            activeTab === 'finder' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => setActiveTab('finder')}
          title="Finder"
        >
          <Search className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'h-6 w-6',
            activeTab === 'defaults' && 'bg-accent text-accent-foreground',
          )}
          onClick={() => setActiveTab('defaults')}
          title="Defaults"
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </>,
    )
    return () => setPageControls(null)
  }, [activeTab, setPageControls])

  useEffect(() => {
    const value = searchDefaultsQuery.data?.value
    if (!value) return
    setTextProvider(value.text_provider || '')
    setSimilarProvider(value.similar_provider || '')
  }, [searchDefaultsQuery.data])

  useEffect(() => {
    const value = workflowRegistryQuery.data?.value as
      | WorkflowRegistryConfig
      | undefined
    if (!value) return
    setIngestionWorkflowId(value.ingestion_workflow_id || '')
    setDefaultWorkflowIdsText(
      JSON.stringify(value.default_workflow_ids || [], null, 2),
    )
  }, [workflowRegistryQuery.data])

  useEffect(() => {
    const value = finderDefaultsQuery.data?.value as
      | FinderDefaultsConfig
      | undefined
    if (!value) return
    setFinderEnableSearch(value.enable_search ?? true)
    setFinderShebangsText(JSON.stringify(value.shebangs || {}, null, 2))
  }, [finderDefaultsQuery.data])

  useEffect(() => {
    const data = blobRegistryQuery.data as BlobRegistryResponse | undefined
    if (!data) return
    setDefaultBlobProvider(data.default_provider || '')
    setDefaultBlobResolver(data.default_resolver || '')
  }, [blobRegistryQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = await api.lotus.invoke('embeddr-core.config.set', {
        plugin_name: 'embeddr-core',
        config_id: 'embeddr-core.search.config',
        scope: 'global',
        value: {
          text_provider: textProvider,
          similar_provider: similarProvider,
        },
      })
      return data as ConfigSetResponse
    },
    onSuccess: () => {
      toast.success('Routing defaults saved')
      searchDefaultsQuery.refetch()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save routing defaults')
    },
  })

  const saveWorkflowRegistry = useMutation({
    mutationFn: async () => {
      let defaultIds: string[] = []
      if (defaultWorkflowIdsText.trim()) {
        try {
          const parsed = JSON.parse(defaultWorkflowIdsText)
          if (Array.isArray(parsed)) {
            defaultIds = parsed.map((id) => String(id))
          } else {
            throw new Error('Default workflow ids must be a JSON array')
          }
        } catch (err) {
          throw new Error('Default workflow ids must be valid JSON')
        }
      }

      const data = await api.lotus.invoke('embeddr-core.config.set', {
        plugin_name: 'embeddr-core',
        config_id: 'embeddr-core.workflow.registry',
        scope: 'global',
        value: {
          ingestion_workflow_id: ingestionWorkflowId || null,
          default_workflow_ids: defaultIds,
        },
      })
      return data as ConfigSetResponse
    },
    onSuccess: () => {
      toast.success('Workflow registry saved')
      workflowRegistryQuery.refetch()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save workflow registry')
    },
  })

  const saveFinderDefaults = useMutation({
    mutationFn: async () => {
      let shebangs: Record<string, any> = {}
      if (finderShebangsText.trim()) {
        try {
          shebangs = JSON.parse(finderShebangsText)
        } catch (err) {
          throw new Error('Finder shebangs must be valid JSON')
        }
      }

      const data = await api.lotus.invoke('embeddr-core.config.set', {
        plugin_name: 'embeddr-core',
        config_id: 'embeddr-core.finder.config',
        scope: 'global',
        value: {
          enable_search: finderEnableSearch,
          shebangs,
        },
      })
      return data as ConfigSetResponse
    },
    onSuccess: () => {
      toast.success('Finder defaults saved')
      finderDefaultsQuery.refetch()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save finder defaults')
    },
  })

  const saveBlobDefaults = useMutation({
    mutationFn: async () => {
      return embeddrApi.system.setBlobDefaults({
        default_provider: defaultBlobProvider || null,
        default_resolver: defaultBlobResolver || null,
      })
    },
    onSuccess: () => {
      toast.success('Blob routing defaults saved')
      blobRegistryQuery.refetch()
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save blob routing defaults')
    },
  })

  const counts = useMemo(() => {
    const byKind: Record<string, number> = {}
    for (const cap of capabilities) {
      byKind[cap.kind] = (byKind[cap.kind] || 0) + 1
    }
    return byKind
  }, [capabilities])

  const providerCount = useMemo(() => {
    return capabilities.filter((cap) => cap.kind === 'provider' || cap.slot)
      .length
  }, [capabilities])

  const searchProviders = useMemo(() => {
    return capabilities.filter(
      (cap) => cap.kind === 'action' && String(cap.id).includes('search.'),
    )
  }, [capabilities])

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'features', label: 'Features' },
    { value: 'storage', label: 'Storage' },
    { value: 'configs', label: 'Configs' },
    { value: 'workflows', label: 'Workflows' },
    { value: 'defaults', label: 'Defaults' },
    { value: 'finder', label: 'Finder' },
    { value: 'capabilities', label: 'Capabilities' },
  ]

  const overviewStats = [
    { label: 'Artifacts', value: artifactsQuery.data?.total ?? 0 },
    { label: 'Plugins Loaded', value: pluginsQuery.data?.length ?? 0 },
    { label: 'Capabilities', value: capabilities.length },
    { label: 'Providers', value: providerCount },
  ]

  const blobProviders = useMemo(() => {
    const data = blobRegistryQuery.data as BlobRegistryResponse | undefined
    return data?.providers || []
  }, [blobRegistryQuery.data])

  const blobResolvers = useMemo(() => {
    const data = blobRegistryQuery.data as BlobRegistryResponse | undefined
    return data?.resolvers || []
  }, [blobRegistryQuery.data])

  const providerResolvers = useMemo(() => {
    const data = blobRegistryQuery.data as BlobRegistryResponse | undefined
    return data?.provider_resolvers || {}
  }, [blobRegistryQuery.data])

  const storageCapabilities = useMemo(() => {
    return capabilities.filter((cap) => {
      if (cap.kind === 'storage') return true
      const id = String(cap.id || '')
      if (id.includes('blob_storage') || id.includes('storage')) return true
      return false
    })
  }, [capabilities])

  const configCapabilities = useMemo(() => {
    return capabilities
      .filter((cap) => cap.kind === 'config')
      .sort((a, b) =>
        String(a.title || a.id).localeCompare(String(b.title || b.id)),
      )
  }, [capabilities])

  const workflowOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    ;(workflows || []).forEach((workflow) => {
      map.set(String(workflow.id), {
        id: String(workflow.id),
        name: workflow.name || String(workflow.id),
      })
    })

    const lotusResults = lotusWorkflowQuery.data?.results || []
    lotusResults
      .filter((item) => item.kind === 'artifact' || item.kind === 'action')
      .forEach((item) => {
        if (!map.has(item.id)) {
          map.set(item.id, {
            id: item.id,
            name: item.title || item.subtitle || item.id,
          })
        }
      })

    return Array.from(map.values())
  }, [workflows, lotusWorkflowQuery.data])

  const tabLabel = tabs.find((t) => t.value === activeTab)?.label || 'Dashboard'

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Top Navigation Bar (Only show when NOT on overview) */}
      {activeTab !== 'overview' && (
        <div className="shrink-0 rounded-md p-2 border m-1 flex items-center px-4 gap-4 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => setActiveTab('overview')}
          >
            <div className="flex items-center gap-1">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
              >
                <path
                  d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
              Back to Dashboard
            </div>
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="font-semibold text-sm">{tabLabel}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative p-1">
        {activeTab === 'overview' && (
          <LotusOverviewPanel
            capabilities={capabilities}
            plugins={pluginsQuery.data || []}
            stats={{
              artifacts: artifactsQuery.data?.total ?? 0,
              plugins: pluginsQuery.data?.length ?? 0,
              automations: automationStatus.total,
              providers: providerCount,
            }}
            clientCount={lotusClientsQuery.data?.count}
            clientDetails={lotusClientsQuery.data?.details}
            onManage={(section) => {
              if (section === 'storage') {
                setActiveTab('storage')
              } else if (section === 'defaults') {
                setActiveTab('defaults')
              } else if (section === 'compute') {
                setActiveTab('workflows')
              } else if (section === 'llm' || section === 'embedding') {
                setActiveTab('configs')
              } else {
                setActiveTab('capabilities')
              }
            }}
          />
        )}

        {activeTab !== 'overview' && activeTab === 'features' && (
          <div className="h-full">
            <LotusFeaturesTab />
          </div>
        )}

        {activeTab !== 'overview' && activeTab !== 'features' && (
          <ScrollArea className="h-full pr-3" type="always">
            <div className="mx-auto w-full">
              {activeTab === 'storage' && (
                <LotusStoragePanel
                  blobProviders={blobProviders}
                  blobResolvers={blobResolvers}
                  providerResolvers={providerResolvers}
                  defaultBlobProvider={defaultBlobProvider}
                  defaultBlobResolver={defaultBlobResolver}
                  storageCapabilities={storageCapabilities}
                />
              )}

              {activeTab === 'configs' && (
                <LotusConfigsTab configCapabilities={configCapabilities} />
              )}

              {activeTab === 'workflows' && <LotusWorkflowsTab />}

              {activeTab === 'defaults' && (
                <LotusDefaultsTab
                  blobProviders={blobProviders}
                  blobResolvers={blobResolvers}
                  providerResolvers={providerResolvers}
                  defaultBlobProvider={defaultBlobProvider}
                  setDefaultBlobProvider={setDefaultBlobProvider}
                  defaultBlobResolver={defaultBlobResolver}
                  setDefaultBlobResolver={setDefaultBlobResolver}
                  saveBlobDefaultsPending={saveBlobDefaults.isPending}
                  onSaveBlobDefaults={() => saveBlobDefaults.mutate()}
                  automationTotal={automationStatus.total}
                  automationActive={automationStatus.active}
                  ingestionWorkflowId={ingestionWorkflowId}
                  setIngestionWorkflowId={setIngestionWorkflowId}
                  workflowOptions={workflowOptions}
                  defaultWorkflowIdsText={defaultWorkflowIdsText}
                  setDefaultWorkflowIdsText={setDefaultWorkflowIdsText}
                  saveWorkflowRegistryPending={saveWorkflowRegistry.isPending}
                  onSaveWorkflowRegistry={() => saveWorkflowRegistry.mutate()}
                  textProvider={textProvider}
                  setTextProvider={setTextProvider}
                  similarProvider={similarProvider}
                  setSimilarProvider={setSimilarProvider}
                  searchProviders={searchProviders}
                  saveRoutingPending={saveMutation.isPending}
                  onSaveRouting={() => saveMutation.mutate()}
                />
              )}

              {activeTab === 'finder' && (
                <LotusFinderTab
                  finderEnableSearch={finderEnableSearch}
                  setFinderEnableSearch={setFinderEnableSearch}
                  finderShebangsText={finderShebangsText}
                  setFinderShebangsText={setFinderShebangsText}
                  onSaveFinderDefaults={() => saveFinderDefaults.mutate()}
                  saveFinderDefaultsPending={saveFinderDefaults.isPending}
                />
              )}

              {activeTab === 'capabilities' && (
                <LotusCapabilitiesTab capabilities={capabilities} />
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
