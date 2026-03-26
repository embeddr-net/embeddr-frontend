import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FolderPlus,
  FolderSearch,
  RefreshCw,
  Trash2,
  PlusIcon,
  Info,
  Folder,
  HardDrive,
  Settings2,
} from 'lucide-react'
import { Button } from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { Label } from '@embeddr/react-ui/ui'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { ScrollArea } from '@embeddr/react-ui/ui'
import { Spinner } from '@embeddr/react-ui/ui'
import { Checkbox } from '@embeddr/react-ui/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/ui'
import { Textarea } from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { embeddrApi } from '@/lib/api/client'
import { FileBrowser } from './FileBrowser'
import { usePluginEvent } from '@/hooks/usePluginEvent'
import type { LotusCapability } from '@/lib/api/types'

type LibrarySource = {
  id: string
  label?: string
  uri?: string
  path?: string
  file_count?: number
  type_name?: string
  metadata?: Record<string, any>
}

type SourceTreeNode = {
  id: string
  label: string
  children: SourceTreeNode[]
  source?: LibrarySource
  count: number
}

type ScannerOption = {
  capabilityId: string
  typeName: string
  title: string
  description?: string
  configSchema: Record<string, any>
  plugin?: string
}

const DEFAULT_SCANNER_TYPE = 'collection:directory'

function SourceSidebarItem({
  source,
  active,
  onClick,
}: {
  source: LibrarySource
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-md px-3 py-2 text-left transition hover:bg-accent/60',
        active && 'bg-accent text-accent-foreground',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
          <Folder className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">
            {source.label || 'Untitled Source'}
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate">
            {source.uri || source.path}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {source.file_count ?? 0} items
            </Badge>
            {source.type_name && (
              <Badge variant="outline" className="text-[10px]">
                {source.type_name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function buildSourceTree(sources: LibrarySource[]): SourceTreeNode {
  const root: SourceTreeNode = {
    id: 'root',
    label: 'Sources',
    children: [],
    count: 0,
  }

  const ensureChild = (parent: SourceTreeNode, id: string, label: string) => {
    let child = parent.children.find((node) => node.id === id)
    if (!child) {
      child = { id, label, children: [], count: 0 }
      parent.children.push(child)
    }
    return child
  }

  const addLeaf = (parent: SourceTreeNode, source: LibrarySource) => {
    const leafId = `leaf:${source.id}`
    const label = source.label || source.uri || source.path || 'Untitled'
    parent.children.push({
      id: leafId,
      label,
      children: [],
      source,
      count: 1,
    })
  }

  sources.forEach((source) => {
    const raw = source.uri || source.path || ''
    if (!raw) return

    if (raw.startsWith('/')) {
      const parts = raw.split('/').filter(Boolean)
      let cursor = root
      parts.forEach((part, index) => {
        const id = `${cursor.id}/${part}`
        cursor = ensureChild(cursor, id, part)
        if (index === parts.length - 1) {
          cursor.source = source
          cursor.label = source.label || part
        }
      })
      return
    }

    const schemeMatch = raw.match(/^([a-zA-Z0-9+.-]+):\/\//)
    const scheme = schemeMatch?.[1] || 'remote'
    const host = raw.replace(/^([a-zA-Z0-9+.-]+):\/\//, '').split('/')[0]
    const groupLabel = host ? `${scheme}://${host}` : scheme
    const group = ensureChild(root, `remote:${groupLabel}`, groupLabel)
    addLeaf(group, source)
  })

  const computeCounts = (node: SourceTreeNode): number => {
    if (node.source && node.children.length === 0) {
      node.count = 1
      return 1
    }
    node.count = node.children.reduce(
      (sum, child) => sum + computeCounts(child),
      0,
    )
    return node.count
  }

  computeCounts(root)
  return root
}

function SourceDetails({
  source,
  isScanning,
  onRescan,
  onRemove,
  onEditScannerConfig,
}: {
  source: LibrarySource
  isScanning: boolean
  onRescan: () => void
  onRemove: () => void
  onEditScannerConfig: () => void
}) {
  const scannerConfig =
    source.metadata?.scanner_config || source.metadata?.scannerConfig || null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">
            {source.label || 'Untitled Source'}
          </div>
          <div className="text-sm text-muted-foreground font-mono break-all">
            {source.uri || source.path}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{source.file_count ?? 0} items</Badge>
            {source.type_name && <Badge>{source.type_name}</Badge>}
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-muted-foreground">
              Scanner config
            </div>
            <pre className="mt-1 max-h-28 overflow-auto rounded-md border border-muted/60 bg-muted/20 p-2 text-[11px]">
              {scannerConfig
                ? JSON.stringify(scannerConfig, null, 2)
                : 'Not set'}
            </pre>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRescan}
            disabled={isScanning}
          >
            {isScanning ? (
              <Spinner className="mr-2 h-3 w-3" />
            ) : (
              <RefreshCw className="mr-2 h-3 w-3" />
            )}
            {isScanning ? 'Scanning…' : 'Rescan'}
          </Button>
          <Button variant="outline" size="sm" onClick={onEditScannerConfig}>
            <Settings2 className="mr-2 h-3 w-3" />
            Scanner config
          </Button>
          <Button variant="destructive" size="sm" onClick={onRemove}>
            <Trash2 className="mr-2 h-3 w-3" />
            Remove
          </Button>
        </div>
      </div>

      <div className="mt-6 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="h-4 w-4" />
          Preview
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Preview the source on the server before ingesting.
        </p>
        {source.type_name === DEFAULT_SCANNER_TYPE ? (
          <div className="mt-3">
            <FileBrowser
              initialPath={source.uri || source.path || ''}
              onSelect={() => undefined}
              className="h-90"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
            Preview not available for this source type.
          </div>
        )}
      </div>
    </div>
  )
}

function SourceAddDialog({
  open,
  onOpenChange,
  scannerOptions,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scannerOptions: ScannerOption[]
  onSubmit: (input: {
    uri: string
    label: string
    scannerType: string
    config: Record<string, any>
  }) => void
  isSubmitting: boolean
}) {
  const [selectedScanner, setSelectedScanner] = useState<string>(
    scannerOptions[0]?.typeName || DEFAULT_SCANNER_TYPE,
  )
  const [newPath, setNewPath] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [scannerConfig, setScannerConfig] = useState<Record<string, any>>({})
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)

  useEffect(() => {
    if (!scannerOptions.length) return
    setSelectedScanner((prev) => prev || scannerOptions[0].typeName)
  }, [scannerOptions])

  const currentScanner = scannerOptions.find(
    (scanner) => scanner.typeName === selectedScanner,
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newPath) return
    const label = newLabel || newPath.split('/').pop() || 'New Source'
    onSubmit({
      uri: newPath,
      label,
      scannerType: selectedScanner,
      config: scannerConfig,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scanner">Source Type</Label>
              <Select
                value={selectedScanner}
                onValueChange={setSelectedScanner}
              >
                <SelectTrigger id="scanner">
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  {scannerOptions.map((scanner) => (
                    <SelectItem key={scanner.typeName} value={scanner.typeName}>
                      {scanner.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentScanner?.description && (
                <p className="text-xs text-muted-foreground">
                  {currentScanner.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="path">Source Path / URL</Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  autoComplete="off"
                  placeholder={
                    selectedScanner === DEFAULT_SCANNER_TYPE
                      ? '/home/user/images'
                      : 's3://bucket/path'
                  }
                  value={newPath}
                  onChange={(event) => setNewPath(event.target.value)}
                />
                {selectedScanner === DEFAULT_SCANNER_TYPE && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsBrowserOpen(true)}
                    title="Browse Server Files"
                  >
                    <FolderSearch className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Use a provider-specific URL if the source is remote (S3, HTTP,
                plugin-backed scanners).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                autoComplete="off"
                placeholder="e.g. Studio Library"
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
              />
            </div>

            {currentScanner?.configSchema &&
              Object.keys(currentScanner.configSchema).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Source Options
                  </Label>
                  <div className="grid gap-3">
                    {Object.entries(currentScanner.configSchema).map(
                      ([key, schema]: [string, any]) => {
                        if (schema.type === 'boolean') {
                          return (
                            <div key={key} className="flex items-start gap-2">
                              <Checkbox
                                id={`config-${key}`}
                                checked={scannerConfig[key] ?? schema.default}
                                onCheckedChange={(checked) =>
                                  setScannerConfig((prev) => ({
                                    ...prev,
                                    [key]: checked,
                                  }))
                                }
                              />
                              <div className="grid gap-1.5">
                                <Label
                                  htmlFor={`config-${key}`}
                                  className="text-sm font-medium"
                                >
                                  {schema.label || key}
                                </Label>
                                {schema.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {schema.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        }
                        return null
                      },
                    )}
                  </div>
                </div>
              )}

            <div className="rounded-md border border-blue-100/50 bg-blue-50/50 p-4 text-sm text-muted-foreground dark:border-blue-900/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4" />
                <span className="font-medium">What happens next?</span>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                <li>Embeddr creates a source collection</li>
                <li>Scanning begins in the background</li>
                <li>Thumbnails + embeddings are generated</li>
              </ul>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <PlusIcon className="mr-2 h-4 w-4" />
              )}
              Add Source
            </Button>
          </form>

          <div className="space-y-2">
            <div className="text-sm font-medium">Preview</div>
            <div className="text-xs text-muted-foreground">
              Confirm the path before saving.
            </div>
            {selectedScanner === DEFAULT_SCANNER_TYPE ? (
              <FileBrowser
                initialPath={newPath}
                onSelect={(path) => {
                  setNewPath(path)
                  setIsBrowserOpen(false)
                }}
                className="h-105"
              />
            ) : (
              <div className="rounded-md border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                Preview not available for this source type.
              </div>
            )}
          </div>
        </div>

        <Dialog open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Browse Server Files</DialogTitle>
            </DialogHeader>
            <FileBrowser
              initialPath={newPath}
              onSelect={(path) => {
                setNewPath(path)
                setIsBrowserOpen(false)
              }}
              className="h-120"
            />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

export function LibrarySourcesPanel() {
  const queryClient = useQueryClient()
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set())
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [configDraft, setConfigDraft] = useState('')
  const [configError, setConfigError] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set(['root']),
  )

  usePluginEvent('scan.started', (data) => {
    if (data.root_id) {
      toast.info(`Scan started for ${data.uri || 'collection'}`)
      setScanningIds((prev) => {
        const next = new Set(prev)
        next.add(data.root_id)
        return next
      })
    }
  })

  usePluginEvent('scan.completed', (data) => {
    if (data.root_id) {
      toast.success(`Scan completed. Processed ${data.added_count} items.`)
      setScanningIds((prev) => {
        const next = new Set(prev)
        next.delete(data.root_id)
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['library-roots'] })
    }
  })

  usePluginEvent('scan.failed', (data) => {
    if (data.root_id) {
      toast.error(`Scan failed: ${data.error}`)
      setScanningIds((prev) => {
        const next = new Set(prev)
        next.delete(data.root_id)
        return next
      })
    }
  })

  const { data: sources, isLoading } = useQuery<LibrarySource[]>({
    queryKey: ['library-roots'],
    queryFn: () => embeddrApi.library.list(),
  })

  const { data: scannersResponse, isLoading: isLoadingScanners } = useQuery({
    queryKey: ['lotus', 'capabilities', 'collection.scanner'],
    queryFn: () =>
      embeddrApi.lotus.list({ slot: 'collection.scanner', limit: 200 }),
  })

  const scannerOptions = useMemo(() => {
    const caps = (scannersResponse?.items || []) as LotusCapability[]
    return caps
      .map((cap) => {
        const data = cap.data || {}
        const typeName = data.scanner_type || data.type_name
        if (!typeName) return null
        return {
          capabilityId: cap.id,
          typeName,
          title: cap.title || typeName,
          description: cap.description,
          configSchema: data.config_schema || {},
          plugin: cap.plugin,
        } satisfies ScannerOption
      })
      .filter(Boolean) as ScannerOption[]
  }, [scannersResponse])

  useEffect(() => {
    if (!sources?.length) return
    if (!selectedSourceId) {
      setSelectedSourceId(sources[0].id)
    }
  }, [sources, selectedSourceId])

  const selectedSource = sources?.find(
    (source) => source.id === selectedSourceId,
  )

  const sourceTree = useMemo(() => buildSourceTree(sources || []), [sources])

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const renderTree = (node: SourceTreeNode, depth: number = 0) => {
    const isLeaf = !!node.source && node.children.length === 0
    if (isLeaf && node.source) {
      return (
        <div key={node.id} style={{ paddingLeft: depth * 12 }}>
          <SourceSidebarItem
            source={node.source}
            active={node.source.id === selectedSourceId}
            onClick={() => setSelectedSourceId(node.source?.id || null)}
          />
        </div>
      )
    }

    const isOpen = expandedNodes.has(node.id)
    return (
      <div key={node.id} className="space-y-1">
        <button
          type="button"
          onClick={() => toggleNode(node.id)}
          className={cn(
            'w-full rounded-md px-3 py-2 text-left transition hover:bg-accent/60 flex items-center justify-between',
            depth === 0 ? 'bg-muted/30' : 'bg-muted/10',
          )}
          style={{ marginLeft: depth * 8 }}
        >
          <span className="text-xs font-semibold text-muted-foreground truncate">
            {node.label}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {node.count}
          </Badge>
        </button>
        {isOpen &&
          node.children
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((child) => renderTree(child, depth + 1))}
      </div>
    )
  }

  const addSourceMutation = useMutation({
    mutationFn: (input: {
      uri: string
      label: string
      scannerType: string
      config: Record<string, any>
    }) =>
      embeddrApi.library.add(
        input.uri,
        input.label,
        input.scannerType,
        input.config,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-roots'] })
      setIsAddOpen(false)
      toast.success('Source added successfully')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add source')
    },
  })

  const updateSourceMutation = useMutation({
    mutationFn: (input: { id: string; scanner_config: Record<string, any> }) =>
      embeddrApi.collections.update(input.id, {
        scanner_config: input.scanner_config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-roots'] })
      setIsConfigOpen(false)
      toast.success('Scanner config updated')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update config',
      )
    },
  })

  const rescanMutation = useMutation({
    mutationFn: (id: string) => embeddrApi.library.rescan(id),
    onError: () => toast.error('Failed to start rescan'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => embeddrApi.library.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-roots'] })
      setSelectedSourceId(null)
      toast.success('Source removed')
    },
    onError: () => toast.error('Failed to remove source'),
  })

  const openScannerConfig = () => {
    if (!selectedSource) return
    const scannerConfig =
      selectedSource.metadata?.scanner_config ||
      selectedSource.metadata?.scannerConfig ||
      {}
    setConfigDraft(JSON.stringify(scannerConfig, null, 2))
    setConfigError(null)
    setIsConfigOpen(true)
  }

  const handleSaveScannerConfig = () => {
    if (!selectedSource) return
    if (!confirm('Update scanner config? This affects future scans.')) return
    try {
      const parsed = configDraft.trim() ? JSON.parse(configDraft) : {}
      setConfigError(null)
      updateSourceMutation.mutate({
        id: selectedSource.id,
        scanner_config: parsed,
      })
    } catch (err: any) {
      setConfigError(err?.message || 'Invalid JSON')
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sources</CardTitle>
        <CardDescription>
          Connect data sources and preview what will be ingested.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="flex h-full flex-col rounded-lg border bg-muted/10">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Connected Sources</div>
              <div className="text-xs text-muted-foreground">
                {sources?.length ?? 0} total
              </div>
            </div>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <ScrollArea className="flex-1 p-2">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <Spinner />
              </div>
            ) : !sources?.length ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <FolderPlus className="h-8 w-8 opacity-40" />
                <div>No sources yet.</div>
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                  Add your first source
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {renderTree(sourceTree)}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="min-h-105 rounded-lg border bg-muted/5 p-5">
          {selectedSource ? (
            <SourceDetails
              source={selectedSource}
              isScanning={scanningIds.has(selectedSource.id)}
              onRescan={() => rescanMutation.mutate(selectedSource.id)}
              onRemove={() => {
                if (
                  confirm(
                    'Remove this source? This will not delete files on disk.',
                  )
                ) {
                  removeMutation.mutate(selectedSource.id)
                }
              }}
              onEditScannerConfig={openScannerConfig}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <FolderPlus className="h-10 w-10 opacity-40" />
              <div className="text-sm">Select a source to view details.</div>
            </div>
          )}
        </div>
      </CardContent>

      <SourceAddDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        scannerOptions={scannerOptions}
        isSubmitting={addSourceMutation.isPending}
        onSubmit={(input) => addSourceMutation.mutate(input)}
      />

      <Dialog
        open={isConfigOpen}
        onOpenChange={(open) => {
          setIsConfigOpen(open)
          if (!open) {
            setConfigError(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scanner config</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scanner-config">Scanner config (JSON)</Label>
            <Textarea
              id="scanner-config"
              value={configDraft}
              onChange={(event) => setConfigDraft(event.target.value)}
              className="min-h-40 font-mono text-[11px]"
            />
            {configError && (
              <div className="text-xs text-destructive">{configError}</div>
            )}
            <div className="text-[11px] text-muted-foreground">
              Tip: set{' '}
              <span className="font-mono">
                {JSON.stringify({ reprocess_existing: true })}
              </span>{' '}
              to re-run the ingestion pipeline on rescan.
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveScannerConfig}
                disabled={updateSourceMutation.isPending}
              >
                Save config
              </Button>
              <Button variant="ghost" onClick={() => setIsConfigOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoadingScanners && (
        <div className="px-6 pb-4 text-xs text-muted-foreground">
          Loading source types from Lotus registry…
        </div>
      )}
    </Card>
  )
}
