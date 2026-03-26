import { BACKEND_URL } from '../config'
import { fetchWithAuth } from '../fetch'

export interface SecurityOverview {
  auth_mode: string
  auth_enabled: boolean
  users: number
  roles: number
  api_keys: number
  current_user?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string | null
    is_admin?: boolean
  } | null
}

export interface SecurityRole {
  id: string
  name: string
  description?: string | null
  is_system: boolean
  permissions: string[]
}

export interface SecurityApiKey {
  id: string
  user_id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at?: string | null
  expires_at?: string | null
  permissions: string[]
}

export interface SecurityUser {
  id: string
  username: string
  display_name: string
  avatar_url?: string | null
  is_admin: boolean
  roles: string[]
  role_ids?: string[]
}

export interface SecurityProfile {
  id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
}

export interface SecurityOperator {
  id: string
  name: string
  display_name?: string | null
  avatar_url?: string | null
  is_root: boolean
  is_active: boolean
  created_at?: string | null
  user_count: number
  active_user_count: number
  api_key_count: number
  last_activity_at?: string | null
}

export interface SecurityOverviewStatus {
  ok: boolean
  status: number
  data?: SecurityOverview
}

export const fetchSecurityOverview = async (): Promise<SecurityOverview> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/overview`)
  if (!res.ok) {
    throw new Error('Failed to load security overview')
  }
  return res.json()
}

export const fetchSecurityOverviewStatus =
  async (): Promise<SecurityOverviewStatus> => {
    const res = await fetchWithAuth(`${BACKEND_URL}/security/overview`)
    if (!res.ok) {
      return { ok: false, status: res.status }
    }
    const data = await res.json()
    return { ok: true, status: res.status, data }
  }

export const fetchSecurityRoles = async (): Promise<{
  items: SecurityRole[]
}> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/roles`)
  if (!res.ok) {
    throw new Error('Failed to load roles')
  }
  return res.json()
}

export const fetchSecurityKeys = async (): Promise<{
  items: SecurityApiKey[]
}> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/keys`)
  if (!res.ok) {
    throw new Error('Failed to load client keys')
  }
  return res.json()
}

export const fetchSecurityUsers = async (): Promise<{
  items: SecurityUser[]
}> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/users`)
  if (!res.ok) {
    throw new Error('Failed to load users')
  }
  return res.json()
}

export const fetchSecurityOperators = async (): Promise<{
  items: SecurityOperator[]
}> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/operators`)
  if (!res.ok) {
    throw new Error('Failed to load operators')
  }
  return res.json()
}

export const fetchSecurityOperatorProfile =
  async (): Promise<SecurityOperator> => {
    const res = await fetchWithAuth(`${BACKEND_URL}/security/operator`)
    if (!res.ok) {
      throw new Error('Failed to load operator profile')
    }
    return res.json()
  }

export const updateSecurityOperatorProfile = async (payload: {
  display_name?: string | null
  avatar_url?: string | null
}): Promise<SecurityOperator> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/operator`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name: payload.display_name ?? null,
      avatar_url: payload.avatar_url ?? null,
      confirm: true,
    }),
  })
  if (!res.ok) {
    throw new Error('Failed to update operator profile')
  }
  return res.json()
}

export const createSecurityKey = async (payload: {
  user_id: string
  name: string
  scopes?: string[]
  permissions?: string[]
}): Promise<{ id: string; name: string; key: string; key_prefix: string }> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.user_id,
      name: payload.name,
      scopes: payload.scopes ?? [],
      permissions: payload.permissions ?? [],
      confirm: true,
    }),
  })
  if (!res.ok) {
    throw new Error('Failed to create client key')
  }
  return res.json()
}

export const createSecurityKeySelf = async (payload: {
  name: string
  scopes?: string[]
  permissions?: string[]
}): Promise<{ id: string; name: string; key: string; key_prefix: string }> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/keys/self`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      scopes: payload.scopes ?? [],
      permissions: payload.permissions ?? [],
      confirm: true,
    }),
  })
  if (!res.ok) {
    throw new Error('Failed to create client key')
  }
  return res.json()
}

export const updateSecurityUser = async (payload: {
  user_id: string
  display_name?: string | null
  avatar_url?: string | null
  is_admin?: boolean
  role_ids?: string[]
}): Promise<SecurityUser> => {
  const res = await fetchWithAuth(
    `${BACKEND_URL}/security/users/${payload.user_id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: payload.display_name,
        avatar_url: payload.avatar_url,
        is_admin: payload.is_admin,
        role_ids: payload.role_ids ?? null,
        confirm: true,
      }),
    },
  )
  if (!res.ok) {
    throw new Error('Failed to update user')
  }
  return res.json()
}

export const createSecurityUser = async (payload: {
  username: string
  display_name?: string | null
  is_admin?: boolean
  role_ids?: string[]
  password?: string | null
}): Promise<{ id: string; username: string }> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: payload.username,
      display_name: payload.display_name,
      is_admin: payload.is_admin ?? false,
      role_ids: payload.role_ids ?? [],
      password: payload.password ?? null,
      confirm: true,
    }),
  })
  if (!res.ok) {
    throw new Error('Failed to create user')
  }
  return res.json()
}

export const loginWithPassword = async (payload: {
  username: string
  password: string
}): Promise<{ ok: boolean; key: string; key_prefix: string }> => {
  const res = await fetch(`${BACKEND_URL}/security/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error('Failed to login')
  }
  return res.json()
}

export const createSecurityRole = async (payload: {
  name: string
  description?: string | null
  permissions?: string[]
}): Promise<{ id: string; name: string }> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      description: payload.description ?? null,
      permissions: payload.permissions ?? [],
      confirm: true,
    }),
  })
  if (!res.ok) {
    throw new Error('Failed to create role')
  }
  return res.json()
}

export const revokeSecurityKey = async (
  keyId: string,
): Promise<{ ok: boolean }> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/keys/${keyId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error('Failed to revoke key')
  }
  return res.json()
}

export const updateSecurityRole = async (payload: {
  role_id: string
  description?: string | null
  permissions?: string[]
}): Promise<{ ok: boolean }> => {
  const res = await fetchWithAuth(
    `${BACKEND_URL}/security/roles/${payload.role_id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: payload.description ?? null,
        permissions: payload.permissions ?? null,
        confirm: true,
      }),
    },
  )
  if (!res.ok) {
    throw new Error('Failed to update role')
  }
  return res.json()
}

export const fetchSecurityProfile = async (): Promise<SecurityProfile> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/profile`)
  if (!res.ok) {
    throw new Error('Failed to load profile')
  }
  return res.json()
}

export const updateSecurityProfile = async (payload: {
  display_name?: string | null
  avatar_url?: string | null
}): Promise<SecurityProfile> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('Failed to update profile')
  }
  return res.json()
}

export const logoutCurrentKey = async (): Promise<void> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/logout`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error('Failed to logout')
  }
}

export const logoutAllKeys = async (): Promise<void> => {
  const res = await fetchWithAuth(`${BACKEND_URL}/security/logout-all`, {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error('Failed to logout all sessions')
  }
}

// ── OAuth2 Authorization Code Flow ──────────────────────────────────

export interface AuthorizationInfo {
  client_name: string
  client_description?: string | null
  client_id: string
  requested_scopes: string[]
  scope_descriptions: Record<string, string>
  redirect_uri: string
  state?: string | null
  user?: {
    username: string
    display_name?: string | null
    operator_name?: string | null
  } | null
}

export async function fetchAuthorizationInfo(params: {
  client_id: string
  scope?: string
  redirect_uri: string
  state?: string
}): Promise<AuthorizationInfo> {
  const qs = new URLSearchParams()
  qs.set('client_id', params.client_id)
  qs.set('redirect_uri', params.redirect_uri)
  if (params.scope) qs.set('scope', params.scope)
  if (params.state) qs.set('state', params.state)

  const res = await fetchWithAuth(
    `${BACKEND_URL}/security/auth/authorize?${qs.toString()}`,
  )
  if (res.status === 401) {
    throw new Error('login_required')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Failed to fetch authorization info')
  }
  return res.json()
}

export async function submitAuthorizationConsent(body: {
  client_id: string
  scope: string
  redirect_uri: string
  state?: string
  code_challenge?: string
  code_challenge_method?: string
  approved: boolean
}): Promise<{ redirect_to: string }> {
  const res = await fetchWithAuth(
    `${BACKEND_URL}/security/auth/authorize/consent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Authorization consent failed')
  }
  return res.json()
}
