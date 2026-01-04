import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Database, FileImage, Folder, RefreshCw } from 'lucide-react'
import { BACKEND_URL } from '@/lib/api'

export function SystemInfo() {
  const {
    data: info,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/system/info`)
      if (!res.ok) throw new Error('Failed to fetch system info')
      return res.json()
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
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
              <span className="text-sm font-medium">SQLite</span>
              <span className="text-xs text-muted-foreground">
                Database Type
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button variant="outline" size="sm" disabled>
            Check for Updates
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
