import React, { useState } from 'react'
import { useMutation, type UseQueryResult } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { Switch } from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import { toast } from 'sonner'
import {
  createSecurityUser,
  updateSecurityUser,
  fetchSecurityUsers,
} from '@/lib/api'
import type { SecurityRole, SecurityUser } from './operator-types'

interface OperatorClientsSectionProps {
  users: SecurityUser[]
  roles: SecurityRole[]
  usersQuery: UseQueryResult<Awaited<ReturnType<typeof fetchSecurityUsers>>>
  isForbidden: boolean
}

export const OperatorClientsSection = ({
  users,
  roles,
  usersQuery,
  isForbidden,
}: OperatorClientsSectionProps) => {
  const [roleUserId, setRoleUserId] = useState<string>('')
  const [roleSelection, setRoleSelection] = useState<string[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newIsOperator, setNewIsOperator] = useState(false)
  const [newUserRoles, setNewUserRoles] = useState<string[]>([])
  const [newUserConfirm, setNewUserConfirm] = useState(false)

  const updateUserMutation = useMutation({
    mutationFn: updateSecurityUser,
    onSuccess: () => {
      usersQuery.refetch()
      toast.success('Client updated')
    },
    onError: () => toast.error('Failed to update client'),
  })

  const createUserMutation = useMutation({
    mutationFn: createSecurityUser,
    onSuccess: () => {
      setNewUsername('')
      setNewDisplayName('')
      setNewIsOperator(false)
      setNewUserRoles([])
      setNewUserConfirm(false)
      usersQuery.refetch()
      toast.success('Client created')
    },
    onError: () => toast.error('Failed to create client'),
  })

  React.useEffect(() => {
    if (!roleUserId) {
      setRoleSelection([])
      return
    }
    const user = users.find((item) => item.id === roleUserId)
    if (!user) return
    setRoleSelection(user.role_ids ?? user.roles ?? [])
  }, [roleUserId, users])

  const toggleRole = (roleId: string, enabled: boolean) => {
    setRoleSelection((prev) => {
      const next = new Set(prev)
      if (enabled) next.add(roleId)
      else next.delete(roleId)
      return Array.from(next)
    })
  }

  const toggleNewUserRole = (roleId: string, enabled: boolean) => {
    setNewUserRoles((prev) => {
      const next = new Set(prev)
      if (enabled) next.add(roleId)
      else next.delete(roleId)
      return Array.from(next)
    })
  }

  const handleCreateUser = () => {
    if (!newUserConfirm) {
      toast.error('Confirmation required')
      return
    }
    if (!newUsername.trim()) {
      toast.error('Username is required')
      return
    }
    createUserMutation.mutate({
      username: newUsername.trim(),
      display_name: newDisplayName.trim() || null,
      is_admin: newIsOperator,
      role_ids: newUserRoles,
    })
  }

  const handleUpdateRoles = () => {
    if (!roleUserId) {
      toast.error('Select a client')
      return
    }
    updateUserMutation.mutate({
      user_id: roleUserId,
      role_ids: roleSelection,
    })
  }

  return (
    <>
      {isForbidden ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Operator access required</CardTitle>
            <CardDescription>
              You do not have permission to view clients.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              Clients registered in this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border p-3 space-y-3">
              <div className="text-sm font-medium">Create client</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Client name
                  </label>
                  <Input
                    value={newUsername}
                    onChange={(event) => setNewUsername(event.target.value)}
                    placeholder="new-client"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Display name
                  </label>
                  <Input
                    value={newDisplayName}
                    onChange={(event) => setNewDisplayName(event.target.value)}
                    placeholder="New Client"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Operator
                  </label>
                  <div className="flex items-center justify-between rounded border p-2">
                    <span className="text-sm">Grant operator access</span>
                    <Switch
                      checked={newIsOperator}
                      onCheckedChange={setNewIsOperator}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Scope presets
                  </label>
                  <div className="space-y-2 rounded border p-2">
                    {roles.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No scope presets available.
                      </div>
                    ) : (
                      roles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{role.name}</span>
                          <Switch
                            checked={newUserRoles.includes(role.id)}
                            onCheckedChange={(checked) =>
                              toggleNewUserRole(role.id, checked)
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={newUserConfirm}
                    onCheckedChange={setNewUserConfirm}
                  />
                  <span>Confirm client creation (destructive)</span>
                </div>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating…' : 'Create client'}
                </Button>
              </div>
            </div>

            <div className="rounded border p-3 space-y-3">
              <div className="text-sm font-medium">Assign roles</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Client
                  </label>
                  <Select value={roleUserId} onValueChange={setRoleUserId}>
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
                    Roles
                  </label>
                  <div className="space-y-2 rounded border p-2">
                    {roles.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No roles available.
                      </div>
                    ) : (
                      roles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{role.name}</span>
                          <Switch
                            checked={roleSelection.includes(role.id)}
                            onCheckedChange={(checked) =>
                              toggleRole(role.id, checked)
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleUpdateRoles}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? 'Updating…' : 'Update roles'}
                </Button>
              </div>
            </div>

            {usersQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading clients…
              </div>
            ) : users.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No clients found.
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.username}
                      </div>
                    </div>
                    {user.is_admin && <Badge>Operator</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {user.roles.length ? (
                      user.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No roles
                      </span>
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
