import React, { useState } from 'react'
import { useMutation, type UseQueryResult } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import { Input } from '@embeddr/react-ui/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/ui'
import { toast } from 'sonner'
import { createSecurityKey, fetchSecurityKeys } from '@/lib/api'
import { baseScopes } from './operator-utils'
import type { SecurityKey, SecurityUser } from './operator-types'

interface OperatorKeysSectionProps {
  users: SecurityUser[]
  keys: SecurityKey[]
  keysQuery: UseQueryResult<Awaited<ReturnType<typeof fetchSecurityKeys>>>
  capabilityScopes: string[]
  isForbidden: boolean
}

export const OperatorKeysSection = ({
  users,
  keys,
  keysQuery,
  capabilityScopes,
  isForbidden,
}: OperatorKeysSectionProps) => {
  const [keyUserId, setKeyUserId] = useState<string>('')
  const [keyName, setKeyName] = useState('')
  const [keyScopes, setKeyScopes] = useState('')
  const [keyPermissions, setKeyPermissions] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [scopeSearch, setScopeSearch] = useState('')

  const createKeyMutation = useMutation({
    mutationFn: createSecurityKey,
    onSuccess: (data) => {
      setCreatedKey(data.key)
      setKeyName('')
      setKeyScopes('')
      setKeyPermissions('')
      keysQuery.refetch()
      toast.success('Client credential created')
    },
    onError: () => toast.error('Failed to create client credential'),
  })

  const allScopes = [...baseScopes, ...capabilityScopes]
  const filteredScopes = allScopes.filter((scope) =>
    scope.toLowerCase().includes(scopeSearch.toLowerCase()),
  )

  const addScope = (scope: string) => {
    const current = keyScopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (current.includes(scope)) return
    setKeyScopes([...current, scope].join(', '))
  }

  const handleCreateKey = () => {
    if (!keyUserId) {
      toast.error('Select a client')
      return
    }
    if (!keyName.trim()) {
      toast.error('Key name is required')
      return
    }
    const scopes = keyScopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const permissions = keyPermissions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    createKeyMutation.mutate({
      user_id: keyUserId,
      name: keyName.trim(),
      scopes,
      permissions,
    })
  }

  return (
    <>
      {isForbidden ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Operator access required</CardTitle>
            <CardDescription>
              You do not have permission to manage client credentials.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Client Credentials</CardTitle>
            <CardDescription>Issued credentials and scopes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border p-3 space-y-3">
              <div className="text-sm font-medium">Create client credential</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Client
                  </label>
                  <Select value={keyUserId} onValueChange={setKeyUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name || user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Credential name
                  </label>
                  <Input
                    value={keyName}
                    onChange={(event) => setKeyName(event.target.value)}
                    placeholder="comfyui"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Scopes (comma-separated)
                  </label>
                  <Input
                    value={keyScopes}
                    onChange={(event) => setKeyScopes(event.target.value)}
                    placeholder="lotus:*, artifacts:*"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Permissions (comma-separated)
                  </label>
                  <Input
                    value={keyPermissions}
                    onChange={(event) => setKeyPermissions(event.target.value)}
                    placeholder="lotus:dispatch, artifacts:write"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide">
                  Search available Lotus scopes
                </label>
                <Input
                  value={scopeSearch}
                  onChange={(event) => setScopeSearch(event.target.value)}
                  placeholder="Search Lotus scope"
                />
                <div className="max-h-48 overflow-auto rounded border p-2 text-sm">
                  {filteredScopes.length === 0 ? (
                    <div className="text-muted-foreground">
                      No scopes found.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {filteredScopes.slice(0, 120).map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          className="rounded border px-2 py-1 text-xs hover:bg-muted"
                          onClick={() => addScope(scope)}
                          title="Add scope"
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Click a scope to add it to the scopes list.
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Store the key immediately. It is shown only once.
                </div>
                <Button
                  onClick={handleCreateKey}
                  disabled={createKeyMutation.isPending}
                >
                  {createKeyMutation.isPending
                    ? 'Creating…'
                    : 'Create client credential'}
                </Button>
              </div>
              {createdKey && (
                <div className="mt-2 rounded border border-primary/30 bg-primary/5 p-2 text-sm">
                  <div className="text-xs uppercase text-muted-foreground">
                    New Client Credential
                  </div>
                  <div className="font-mono break-all">{createdKey}</div>
                </div>
              )}
            </div>

            {keysQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading keys…</div>
            ) : keys.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No client keys found.
              </div>
            ) : (
              keys.map((key) => (
                <div key={key.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{key.name}</div>
                    <Badge variant={key.is_active ? 'default' : 'secondary'}>
                      {key.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Prefix: {key.key_prefix}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(key.scopes.length ? key.scopes : key.permissions).map(
                      (scope) => (
                        <Badge key={scope} variant="outline">
                          {scope}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
