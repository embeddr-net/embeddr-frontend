import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { Shield, Trash2, RefreshCw } from 'lucide-react'
import { fetchWithAuth } from '@/lib/api/fetch'
import { BACKEND_URL } from '@/lib/api/config'

interface ServiceClientItem {
  id: string
  client_id: string
  name: string
  description?: string | null
  allowed_scopes: string[]
  grant_types: string[]
  is_active: boolean
  created_at?: string | null
  last_used_at?: string | null
  active_sessions: number
}

export const OperatorServiceClientsSection = () => {
  const [clients, setClients] = useState<ServiceClientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth(`${BACKEND_URL}/security/service-clients`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json()
      setClients(data.items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleRevokeSessions = async (clientId: string) => {
    try {
      const res = await fetchWithAuth(
        `${BACKEND_URL}/security/service-clients/${clientId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      fetchClients()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Service Clients
            </CardTitle>
            <CardDescription>
              Applications authorized to access this Embeddr instance via OAuth.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchClients}>
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : clients.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No service clients registered yet.
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-start justify-between rounded-md border p-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{client.name}</span>
                    <Badge
                      variant={client.is_active ? 'outline' : 'destructive'}
                      className="text-[9px]"
                    >
                      {client.is_active ? 'active' : 'disabled'}
                    </Badge>
                    {client.active_sessions > 0 && (
                      <Badge variant="secondary" className="text-[9px]">
                        {client.active_sessions} session
                        {client.active_sessions !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {client.description && (
                    <div className="text-xs text-muted-foreground">
                      {client.description}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {client.client_id}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {client.allowed_scopes.map((scope) => (
                      <Badge
                        key={scope}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0"
                      >
                        {scope}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-1 text-[10px] text-muted-foreground">
                    <span>
                      Grants: {client.grant_types.join(', ')}
                    </span>
                    {client.last_used_at && (
                      <span>
                        Last used:{' '}
                        {new Date(client.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleRevokeSessions(client.id)}
                  title="Deactivate and revoke all sessions"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
