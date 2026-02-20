import React, { useEffect, useState } from 'react'
import { useMutation, type UseQueryResult } from '@tanstack/react-query'
import {
  updateSecurityOperatorProfile,
  fetchSecurityOperatorProfile,
} from '@/lib/api'
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@embeddr/react-ui/components/ui'
import { toast } from 'sonner'
import type { SecurityOperatorProfile } from './operator-types'

interface OperatorOverviewSectionProps {
  operatorQuery: UseQueryResult<
    Awaited<ReturnType<typeof fetchSecurityOperatorProfile>>
  >
}

export const OperatorOverviewSection = ({
  operatorQuery,
}: OperatorOverviewSectionProps) => {
  const operator = operatorQuery.data as SecurityOperatorProfile | undefined
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (!operator) return
    setDisplayName(operator.display_name || operator.name)
    setAvatarUrl(operator.avatar_url || '')
  }, [operator])

  const updateOperatorMutation = useMutation({
    mutationFn: updateSecurityOperatorProfile,
    onSuccess: (data) => {
      setDisplayName(data.display_name || data.name)
      setAvatarUrl(data.avatar_url || '')
      operatorQuery.refetch()
      toast.success('Operator profile updated')
    },
    onError: () => toast.error('Failed to update operator profile'),
  })

  const handleSave = () => {
    updateOperatorMutation.mutate({
      display_name: displayName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Operator Profile</CardTitle>
          <CardDescription>
            Customize the operator display name and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {operatorQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading operator…
            </div>
          ) : operatorQuery.isError || !operator ? (
            <div className="text-sm text-destructive">
              Unable to load operator profile.
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>
                  {(displayName || operator.name).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Operator name
                  </label>
                  <Input value={operator.name} disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Display name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Operator display name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Avatar URL
                  </label>
                  <Input
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://example.com/operator.png"
                  />
                  <div className="text-xs text-muted-foreground">
                    Used across the UI for this operator.
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={updateOperatorMutation.isPending}
                  >
                    {updateOperatorMutation.isPending
                      ? 'Saving…'
                      : 'Save operator'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operator Activity</CardTitle>
          <CardDescription>Usage based on client key activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {operatorQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading activity…
            </div>
          ) : operatorQuery.isError || !operator ? (
            <div className="text-sm text-destructive">
              Unable to load operator activity.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {operator.is_root && <Badge>Root</Badge>}
                <Badge variant={operator.is_active ? 'default' : 'secondary'}>
                  {operator.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div>
                  Clients: {operator.user_count} total,{' '}
                  {operator.active_user_count} active
                </div>
                <div>Client keys: {operator.api_key_count}</div>
                <div>
                  Last activity:{' '}
                  {operator.last_activity_at
                    ? new Date(operator.last_activity_at).toLocaleString()
                    : 'No activity yet'}
                </div>
                <div>
                  Created:{' '}
                  {operator.created_at
                    ? new Date(operator.created_at).toLocaleDateString()
                    : 'Unknown'}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
