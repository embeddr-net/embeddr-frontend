import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import { Database, FileImage, Folder, RefreshCw } from 'lucide-react'
import { embeddrApi } from '@/lib/api/client'
import { useMemo, useState } from 'react'

export function SystemInfo() {
  const [backupOpen, setBackupOpen] = useState(false)
  const [selectedType, setSelectedType] = useState('all')
  const {
    data: info,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => embeddrApi.system.info(),
  })

  type LotusTypeResult = {
    kind: string
    data?: { types?: Array<Record<string, any>> }
  }

  const { data: lotusTypeResults } = useQuery<{
    query: string
    results: LotusTypeResult[]
  }>({
    queryKey: ['lotus', 'query', 'artifact-types'],
    queryFn: () => embeddrApi.lotus.query('artifact type', 200),
  })

  const artifactTypes = useMemo(() => {
    const seen = new Map<string, any>()
    const results = lotusTypeResults?.results || []
    results
      .filter((item) => item.kind === 'artifact_type')
      .forEach((item) => {
        const types = (item.data?.types || []) as Array<Record<string, any>>
        types.forEach((spec) => {
          const name = spec?.name
          if (!name || seen.has(name)) return
          seen.set(name, spec)
        })
      })
    return Array.from(seen.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    )
  }, [lotusTypeResults])

  const selectedTypeSpec = useMemo(() => {
    if (selectedType === 'all') return null
    return artifactTypes.find((spec) => spec.name === selectedType) || null
  }, [artifactTypes, selectedType])

  const backupMutation = useMutation({
    mutationFn: () => embeddrApi.system.backupDatabase(),
    onSuccess: () => {
      refetch()
      setBackupOpen(false)
    },
  })

  return (
    <Card className="my-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Information</CardTitle>
            <CardDescription>
              Details about the running instance.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">
              Frontend Version
            </span>
            <span className="font-mono text-sm">{__APP_VERSION__}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">
              Backend Version
            </span>
            <span className="font-mono text-sm">{info?.version || '...'}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">
              DB Version
            </span>
            <span className="font-mono text-sm">
              {info?.db_version || '...'}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-medium">
              Mode
            </span>
            <div className="flex gap-2">
              {import.meta.env.DEV && (
                <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20">
                  FE: DEV
                </span>
              )}
              {info?.dev_mode && (
                <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20">
                  BE: DEV
                </span>
              )}
              {!import.meta.env.DEV && !info?.dev_mode && (
                <span className="inline-flex items-center rounded-md bg-green-400/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-400/20">
                  PROD
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <FileImage className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold">
                {info?.stats?.images?.toLocaleString() || 0}
              </span>
              <span className="text-xs text-muted-foreground">
                Tracked Images
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Database className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold">
                {info?.stats?.artifacts?.toLocaleString() || 0}
              </span>
              <span className="text-xs text-muted-foreground">
                Tracked Artifacts
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Folder className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold">
                {info?.stats?.libraries?.toLocaleString() || 0}
              </span>
              <span className="text-xs text-muted-foreground">Libraries</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Database className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {info?.db?.provider || 'unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                {info?.db?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Artifact Types</div>
              <div className="text-xs text-muted-foreground">
                Inspect Lotus-registered artifact types
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-55">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All artifacts</SelectItem>
                {artifactTypes.map((spec) => (
                  <SelectItem key={spec.name} value={spec.name}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Selected</div>
              <div className="font-mono">
                {selectedType === 'all' ? 'all' : selectedType}
              </div>
            </div>
            <div className="rounded-md border border-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Parent Type</div>
              <div className="font-mono">
                {selectedTypeSpec?.parent_name || '—'}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-muted/60 p-3 text-xs text-muted-foreground">
            {selectedTypeSpec?.description ||
              (selectedType === 'all'
                ? 'All artifact types combined.'
                : 'No description available.')}
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Database</div>
              <div className="text-xs text-muted-foreground">
                Connection status and configuration
              </div>
            </div>
            {info?.db?.supports_backup && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBackupOpen(true)}
                disabled={backupMutation.isPending}
              >
                Backup Database
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Driver</div>
              <div className="font-mono">
                {info?.db?.url?.driver || 'unknown'}
              </div>
            </div>
            <div className="rounded-md border border-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Database</div>
              <div className="font-mono">
                {info?.db?.url?.database || 'unknown'}
              </div>
            </div>
            <div className="rounded-md border border-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Host</div>
              <div className="font-mono">{info?.db?.url?.host || 'local'}</div>
            </div>
            <div className="rounded-md border border-muted/60 p-3">
              <div className="text-xs text-muted-foreground">Latency</div>
              <div className="font-mono">
                {info?.db?.latency_ms != null
                  ? `${info.db.latency_ms.toFixed(1)} ms`
                  : 'n/a'}
              </div>
            </div>
          </div>

          {info?.db?.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {info.db.error}
            </div>
          )}

          {info?.db?.latest_backup && (
            <div className="text-xs text-muted-foreground">
              Latest backup: {info.db.latest_backup}
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <Button variant="outline" size="sm" disabled>
            Check for Updates
          </Button>
        </div>
      </CardContent>

      <Dialog open={backupOpen} onOpenChange={setBackupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup database</DialogTitle>
            <DialogDescription>
              This will create a new SQLite backup file on disk. Proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBackupOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
            >
              Create backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
