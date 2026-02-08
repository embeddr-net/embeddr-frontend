import { useQuery } from '@tanstack/react-query'
import {
  fetchSecurityRoles,
  fetchSecurityUsers,
  fetchSecurityKeys,
  fetchSecurityOperators,
  fetchSecurityOperatorProfile,
  listLotusCapabilities,
} from '@/lib/api'
import type {
  LotusCapability,
  SecurityKey,
  SecurityOperator,
  SecurityOperatorProfile,
  SecurityRole,
  SecurityUser,
} from '@/components/operator/operator-types'

export const useOperatorConsoleData = () => {
  const operatorQuery = useQuery({
    queryKey: ['security', 'operator'],
    queryFn: fetchSecurityOperatorProfile,
  })
  const usersQuery = useQuery({
    queryKey: ['security', 'users'],
    queryFn: fetchSecurityUsers,
  })
  const rolesQuery = useQuery({
    queryKey: ['security', 'roles'],
    queryFn: fetchSecurityRoles,
  })
  const keysQuery = useQuery({
    queryKey: ['security', 'keys'],
    queryFn: fetchSecurityKeys,
  })
  const operatorsQuery = useQuery({
    queryKey: ['security', 'operators'],
    queryFn: fetchSecurityOperators,
  })
  const lotusCapsQuery = useQuery({
    queryKey: ['lotus', 'capabilities', 'operator'],
    queryFn: () => listLotusCapabilities({ limit: 500 }),
    staleTime: 60_000,
  })

  const operator = operatorQuery.data as SecurityOperatorProfile | undefined
  const users = (usersQuery.data?.items ?? []) as SecurityUser[]
  const roles = (rolesQuery.data?.items ?? []) as SecurityRole[]
  const keys = (keysQuery.data?.items ?? []) as SecurityKey[]
  const operators = (operatorsQuery.data?.items ?? []) as SecurityOperator[]
  const capabilityScopes = (
    (lotusCapsQuery.data?.items ?? []) as LotusCapability[]
  ).map((cap) => `lotus:capability:${cap.id}`)

  const isForbidden =
    usersQuery.isError || rolesQuery.isError || keysQuery.isError

  return {
    operatorQuery,
    usersQuery,
    rolesQuery,
    keysQuery,
    operatorsQuery,
    operator,
    users,
    roles,
    keys,
    operators,
    capabilityScopes,
    isForbidden,
  }
}
