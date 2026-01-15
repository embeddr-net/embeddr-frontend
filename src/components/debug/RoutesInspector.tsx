import { useQuery } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/v2/client'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Input } from '@embeddr/react-ui/components/input'
import { Skeleton } from '@embeddr/react-ui/components/skeleton'
import { Search } from 'lucide-react'
import { useState } from 'react'

export const RoutesInspector = () => {
  const [filter, setFilter] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['system', 'routes'],
    queryFn: () => embeddrApi.system.getRoutes(),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (error)
    return <div className="text-red-500">Error: {(error as Error).message}</div>

  const routes = data?.routes || []
  const filtered = routes.filter(
    (r: any) => r.path.includes(filter) || r.name?.includes(filter),
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter routes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full" variant="left-border" type="always">
          <div className="p-4 h-full">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-2">Method</th>
                  <th className="p-2">Path</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((route: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono">
                      {route.methods.map((m: string) => (
                        <Badge
                          key={m}
                          variant={
                            m === 'GET'
                              ? 'default'
                              : m === 'POST'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="mr-1 text-[10px]"
                        >
                          {m}
                        </Badge>
                      ))}
                    </td>
                    <td className="p-2 font-mono">{route.path}</td>
                    <td className="p-2 text-muted-foreground">{route.name}</td>
                    <td className="p-2">
                      {route.tags.map((t: string) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="mr-1 text-[10px]"
                        >
                          {t}
                        </Badge>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
