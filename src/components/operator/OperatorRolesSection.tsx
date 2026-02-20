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
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  createSecurityRole,
  updateSecurityRole,
  fetchSecurityRoles,
} from '@/lib/api'
import { areArraysEqual, scopeGroups } from './operator-utils'
import type { SecurityRole } from './operator-types'

interface OperatorRolesSectionProps {
  roles: SecurityRole[]
  rolesQuery: UseQueryResult<Awaited<ReturnType<typeof fetchSecurityRoles>>>
  capabilityScopes: string[]
  isForbidden: boolean
}

export const OperatorRolesSection = ({
  roles,
  rolesQuery,
  capabilityScopes,
  isForbidden,
}: OperatorRolesSectionProps) => {
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([])
  const [roleSearch, setRoleSearch] = useState('')
  const [editRoleId, setEditRoleId] = useState<string>('')
  const [editRoleDescription, setEditRoleDescription] = useState('')
  const [editRolePermissions, setEditRolePermissions] = useState<string[]>([])

  const createRoleMutation = useMutation({
    mutationFn: createSecurityRole,
    onSuccess: () => {
      setNewRoleName('')
      setNewRoleDescription('')
      setNewRolePermissions([])
      rolesQuery.refetch()
      toast.success('Scope preset created')
    },
    onError: () => toast.error('Failed to create scope preset'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: updateSecurityRole,
    onSuccess: () => {
      rolesQuery.refetch()
      toast.success('Scope preset updated')
    },
    onError: () => toast.error('Failed to update scope preset'),
  })

  const togglePermission = (
    permission: string,
    selected: string[],
    setter: (next: string[]) => void,
  ) => {
    if (selected.includes(permission)) {
      setter(selected.filter((item) => item !== permission))
    } else {
      setter([...selected, permission])
    }
  }

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Scope preset name is required')
      return
    }
    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDescription.trim() || null,
      permissions: newRolePermissions,
    })
  }

  const handleUpdateRole = () => {
    if (!editRoleId) {
      toast.error('Select a scope preset')
      return
    }
    updateRoleMutation.mutate({
      role_id: editRoleId,
      description: editRoleDescription.trim() || null,
      permissions: editRolePermissions,
    })
  }

  React.useEffect(() => {
    if (!editRoleId) return
    const role = roles.find((item) => item.id === editRoleId)
    if (!role) return
    const nextDescription = role.description || ''
    const nextPermissions = role.permissions || []
    setEditRoleDescription((prev) =>
      prev === nextDescription ? prev : nextDescription,
    )
    setEditRolePermissions((prev) =>
      areArraysEqual(prev, nextPermissions) ? prev : nextPermissions,
    )
  }, [editRoleId, roles])

  return (
    <>
      {isForbidden ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Operator access required</CardTitle>
            <CardDescription>
              You do not have permission to manage scope presets.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scope Presets</CardTitle>
            <CardDescription>Scope presets and permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border p-3 space-y-4">
              <div className="text-sm font-medium">Create scope preset</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Scope preset name
                  </label>
                  <Input
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                    placeholder="comfyui-client"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Description
                  </label>
                  <Input
                    value={newRoleDescription}
                    onChange={(event) =>
                      setNewRoleDescription(event.target.value)
                    }
                    placeholder="ComfyUI access"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide">
                  Permissions
                </label>
                <ScrollArea className="h-56 rounded border">
                  <div className="grid gap-3 p-3">
                    {scopeGroups.map((group) => (
                      <div key={group.label} className="space-y-2">
                        <div>
                          <div className="text-sm font-medium">
                            {group.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {group.description}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.scopes.map((scope) => (
                            <button
                              key={scope}
                              type="button"
                              className={cn(
                                'rounded border px-2 py-1 text-xs transition-colors',
                                newRolePermissions.includes(scope)
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'hover:bg-muted',
                              )}
                              onClick={() =>
                                togglePermission(
                                  scope,
                                  newRolePermissions,
                                  setNewRolePermissions,
                                )
                              }
                            >
                              {scope}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium">
                          Lotus capabilities
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Scope specific Lotus actions by capability id.
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {capabilityScopes.slice(0, 120).map((scope) => (
                          <button
                            key={scope}
                            type="button"
                            className={cn(
                              'rounded border px-2 py-1 text-xs transition-colors',
                              newRolePermissions.includes(scope)
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'hover:bg-muted',
                            )}
                            onClick={() =>
                              togglePermission(
                                scope,
                                newRolePermissions,
                                setNewRolePermissions,
                              )
                            }
                          >
                            {scope}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateRole}
                  disabled={createRoleMutation.isPending}
                >
                  {createRoleMutation.isPending
                    ? 'Creating…'
                    : 'Create scope preset'}
                </Button>
              </div>
            </div>

            <div className="rounded border p-3 space-y-4">
              <div className="text-sm font-medium">Edit scope preset</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Scope preset
                  </label>
                  <Select value={editRoleId} onValueChange={setEditRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a scope preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Description
                  </label>
                  <Input
                    value={editRoleDescription}
                    onChange={(event) =>
                      setEditRoleDescription(event.target.value)
                    }
                    placeholder="Role description"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide">
                  Permissions
                </label>
                <Input
                  value={roleSearch}
                  onChange={(event) => setRoleSearch(event.target.value)}
                  placeholder="Search permissions"
                />
                <ScrollArea className="h-56 rounded border">
                  <div className="grid gap-3 p-3">
                    {scopeGroups.map((group) => {
                      const filtered = group.scopes.filter((scope) =>
                        roleSearch.trim()
                          ? scope
                              .toLowerCase()
                              .includes(roleSearch.trim().toLowerCase())
                          : true,
                      )
                      if (roleSearch.trim() && filtered.length === 0)
                        return null
                      return (
                        <div key={group.label} className="space-y-2">
                          <div>
                            <div className="text-sm font-medium">
                              {group.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {group.description}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {filtered.map((scope) => (
                              <button
                                key={scope}
                                type="button"
                                className={cn(
                                  'rounded border px-2 py-1 text-xs transition-colors',
                                  editRolePermissions.includes(scope)
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'hover:bg-muted',
                                )}
                                onClick={() =>
                                  togglePermission(
                                    scope,
                                    editRolePermissions,
                                    setEditRolePermissions,
                                  )
                                }
                              >
                                {scope}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium">
                          Lotus capabilities
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Scope specific Lotus actions by capability id.
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {capabilityScopes
                          .filter((scope) =>
                            roleSearch.trim()
                              ? scope
                                  .toLowerCase()
                                  .includes(roleSearch.trim().toLowerCase())
                              : true,
                          )
                          .slice(0, 120)
                          .map((scope) => (
                            <button
                              key={scope}
                              type="button"
                              className={cn(
                                'rounded border px-2 py-1 text-xs transition-colors',
                                editRolePermissions.includes(scope)
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'hover:bg-muted',
                              )}
                              onClick={() =>
                                togglePermission(
                                  scope,
                                  editRolePermissions,
                                  setEditRolePermissions,
                                )
                              }
                            >
                              {scope}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleUpdateRole}
                  disabled={updateRoleMutation.isPending}
                >
                  {updateRoleMutation.isPending
                    ? 'Updating…'
                    : 'Update scope preset'}
                </Button>
              </div>
            </div>

            {rolesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading scope presets…
              </div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No scope presets configured.
              </div>
            ) : (
              roles.map((role) => (
                <div key={role.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{role.name}</div>
                    {role.is_system && (
                      <Badge variant="secondary">System</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {role.description || 'No description'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.length ? (
                      role.permissions.map((perm) => (
                        <Badge key={perm} variant="outline">
                          {perm}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No permissions
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
