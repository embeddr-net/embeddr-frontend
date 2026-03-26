import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@embeddr/react-ui/ui'
import type { UseQueryResult } from '@tanstack/react-query'
import type { SecurityOperator } from './operator-types'
import { fetchSecurityOperators } from '@/lib/api'

interface OperatorOperatorsSectionProps {
  operators: SecurityOperator[]
  operatorsQuery: UseQueryResult<
    Awaited<ReturnType<typeof fetchSecurityOperators>>
  >
  isForbidden: boolean
}

export const OperatorOperatorsSection = ({
  operators,
  operatorsQuery,
  isForbidden,
}: OperatorOperatorsSectionProps) => (
  <>
    {isForbidden ? (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Operator access required</CardTitle>
          <CardDescription>
            You do not have permission to view operators.
          </CardDescription>
        </CardHeader>
      </Card>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>Operators</CardTitle>
          <CardDescription>
            Root operators are reserved for server administration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {operatorsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading operators…
            </div>
          ) : operatorsQuery.isError ? (
            <div className="text-sm text-destructive">
              Unable to load operators.
            </div>
          ) : operators.length === 0 ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>No operators found.</div>
              <div>
                If this is an older workspace, run the bootstrap flow or
                migration to create root and user operators.
              </div>
            </div>
          ) : (
            operators.map((op) => (
              <div key={op.id} className="rounded border p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={op.avatar_url || undefined}
                        alt={op.display_name || op.name}
                      />
                      <AvatarFallback>
                        {(op.display_name || op.name).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {op.display_name || op.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {op.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {op.is_root && <Badge>Root</Badge>}
                    <Badge variant={op.is_active ? 'default' : 'secondary'}>
                      {op.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    Clients: {op.user_count} total, {op.active_user_count}{' '}
                    active
                  </div>
                  <div>Client keys: {op.api_key_count}</div>
                  <div>
                    Last activity:{' '}
                    {op.last_activity_at
                      ? new Date(op.last_activity_at).toLocaleString()
                      : 'No activity yet'}
                  </div>
                  {op.created_at ? (
                    <div>
                      Created {new Date(op.created_at).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    )}
  </>
)
