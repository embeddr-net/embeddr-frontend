import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, PlusIcon, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Checkbox } from '@embeddr/react-ui/components/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/components/popover'
import { HelpCircle } from 'lucide-react'
import { embeddrApi } from '@/lib/api/v2/client'
import type { ScannerTypeInfo } from '@/lib/api/v2/types'
import { usePluginEvent } from '@/hooks/usePluginEvent'
import { StatsPanel } from './StatsPanel'

function LibraryPathItem({
  path,
  isScanning,
}: {
  path: any
  isScanning: boolean
}) {
  const queryClient = useQueryClient()

  // Rescan mutation
  const rescanMutation = useMutation({
    mutationFn: () => embeddrApi.library.rescan(path.id),
    onSuccess: () => {
      // toast.success('Rescan started in background')
    },
    onError: () => {
      toast.error('Failed to start rescan')
    },
  })

  // Delete path mutation
  const deletePathMutation = useMutation({
    mutationFn: () => embeddrApi.library.remove(path.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-roots'] })
      toast.success('Library removed')
    },
    onError: () => {
      toast.error('Failed to remove library')
    },
  })

  return (
    <AccordionItem value={path.id}>
      <AccordionTrigger className="hover:no-underline px-2">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3 text-left">
            <FolderPlus className="w-5 h-5 text-primary/80" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium text-sm">
                {path.label || 'Untitled'}
              </span>
              <span className="text-xs text-muted-foreground font-mono break-all line-clamp-1">
                {path.uri || path.path}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="secondary" className="font-mono text-xs">
              {path.file_count ?? 0} items
            </Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="p-4 mx-2 space-y-3 bg-muted/30 border rounded-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground font-mono">
              <p>ID: {path.id}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => rescanMutation.mutate()}
                disabled={rescanMutation.isPending || isScanning}
              >
                {rescanMutation.isPending || isScanning ? (
                  <Spinner className="w-3 h-3 mr-2" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-2" />
                )}
                {isScanning ? 'Scanning...' : 'Rescan'}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to remove this library root? The files on disk will not be deleted.',
                    )
                  ) {
                    deletePathMutation.mutate()
                  }
                }}
                disabled={deletePathMutation.isPending}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function LibrarySettings() {
  const queryClient = useQueryClient()
  const [newPath, setNewPath] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [selectedScanner, setSelectedScanner] = useState<string>(
    'collection:directory',
  )
  const [scannerConfig, setScannerConfig] = useState<Record<string, any>>({})
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set())

  // WebSocket Events
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

  // Fetch paths
  const { data: paths, isLoading } = useQuery({
    queryKey: ['library-roots'],
    queryFn: () => embeddrApi.library.list(),
  })

  // Fetch scanners
  const { data: scannerData } = useQuery({
    queryKey: ['available-scanners'],
    queryFn: () => embeddrApi.library.listScanners(),
  })
  const scanners = scannerData || []
  const currentScannerInfo = scanners.find(
    (s) => s.type_name === selectedScanner,
  )

  // Add path mutation
  const addPathMutation = useMutation({
    mutationFn: (data: {
      path: string
      label: string
      scanner_type: string
      config: any
    }) =>
      embeddrApi.library.add(
        data.path,
        data.label,
        data.scanner_type,
        data.config,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-roots'] })
      setNewPath('')
      setNewLabel('')
      setScannerConfig({})
      toast.success('Collection added successfully')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to add collection',
      )
    },
  })

  const handleAddPath = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPath) {
      const label = newLabel || newPath.split('/').pop() || 'New Collection'
      addPathMutation.mutate({
        path: newPath,
        label,
        scanner_type: selectedScanner,
        config: scannerConfig,
      })
    }
  }

  return (
    <div className="space-y-6 py-2">
      <StatsPanel />
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
          <CardDescription>
            Manage the collections Embeddr indexes. Local folders, remote
            storage, or other data sources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={handleAddPath}
            className="p-4 bg-muted/20 border rounded-lg space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="path">Path / URL</Label>
                <Input
                  autoComplete="off"
                  id="path"
                  placeholder={
                    currentScannerInfo?.type_name === 'collection:directory'
                      ? '/home/user/images'
                      : 's3://bucket/path'
                  }
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label (Optional)</Label>
                <Input
                  autoComplete="off"
                  id="label"
                  placeholder="e.g. My Portfolio"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="scanner">Scanner Type</Label>
                  {currentScannerInfo && (
                    <Popover>
                      <PopoverTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">
                            {currentScannerInfo.display_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {currentScannerInfo.description}
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <Select
                  value={selectedScanner}
                  onValueChange={setSelectedScanner}
                >
                  <SelectTrigger id="scanner">
                    <SelectValue placeholder="Select scanner" />
                  </SelectTrigger>
                  <SelectContent>
                    {scanners.map((s: ScannerTypeInfo) => (
                      <SelectItem key={s.type_name} value={s.type_name}>
                        {s.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Config Fields */}
              {currentScannerInfo &&
                currentScannerInfo.required_config &&
                Object.keys(currentScannerInfo.required_config).length > 0 && (
                  <div className="col-span-full border-t pt-4 mt-2">
                    <Label className="text-sm font-semibold mb-3 block">
                      Scanner Options
                    </Label>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(currentScannerInfo.required_config).map(
                        ([key, schema]: [string, any]) => {
                          if (schema.type === 'boolean') {
                            return (
                              <div
                                key={key}
                                className="flex items-start space-x-2"
                              >
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
                                <div className="grid gap-1.5 leading-none">
                                  <Label
                                    htmlFor={`config-${key}`}
                                    className="text-sm font-medium cursor-pointer"
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
                          // Fallback for other types if we add them later
                          return null
                        },
                      )}
                    </div>
                  </div>
                )}

              <Button type="submit" disabled={addPathMutation.isPending}>
                {addPathMutation.isPending ? (
                  <Spinner className="w-4 h-4 mr-2" />
                ) : (
                  <PlusIcon className="w-4 h-4 mr-2" />
                )}
                Add Collection
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            ) : !paths || paths.length === 0 ? (
              <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground bg-muted/10">
                <FolderPlus className="mx-auto w-10 h-10 mb-3 opacity-30" />
                <p className="font-medium">No libraries configured yet.</p>
                <p className="text-sm mt-1">
                  Add a directory path above to start indexing your visual
                  assets.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {paths.map((path) => (
                  <LibraryPathItem
                    key={path.id}
                    path={path}
                    isScanning={scanningIds.has(path.id)}
                  />
                ))}
              </Accordion>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
