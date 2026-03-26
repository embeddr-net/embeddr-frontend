import React, { useCallback, useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { AlertTriangle } from 'lucide-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { fetchSecurityOverviewStatus } from '@/lib/api/endpoints/security'
import { useUserStore } from '@/store/userStore'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { apiKey, setDisplayName, setAvatarUrl, setIsOperator } = useUserStore()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAccessRoute = pathname === '/access'
  const [status, setStatus] = useState<
    'checking' | 'ok' | 'required' | 'error'
  >('checking')
  const [error, setError] = useState<string | null>(null)

  const checkAuth = useCallback(async () => {
    setStatus('checking')
    setError(null)
    try {
      const result = await fetchSecurityOverviewStatus()
      if (result.ok) {
        if (result.data?.current_user) {
          setDisplayName(
            result.data.current_user.display_name ||
              result.data.current_user.username,
          )
          setAvatarUrl(result.data.current_user.avatar_url || '')
          setIsOperator(!!result.data.current_user.is_admin)
        }
        setStatus('ok')
        return
      }
      if (result.status === 401 || result.status === 403) {
        setIsOperator(false)
        setStatus('required')
        return
      }
      setStatus('error')
      setError(`Server responded with ${result.status}`)
    } catch (err) {
      console.error(err)
      setStatus('error')
      setError('Unable to reach the server')
    }
  }, [setAvatarUrl, setDisplayName, setIsOperator])

  useEffect(() => {
    checkAuth()
  }, [checkAuth, apiKey])

  useEffect(() => {
    if (status === 'required' && !isAccessRoute) {
      navigate({ to: '/access', replace: true })
    }
  }, [isAccessRoute, navigate, status])

  if (isAccessRoute) {
    return <>{children}</>
  }

  if (status === 'ok') {
    return <>{children}</>
  }

  if (status === 'checking') {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Checking access…</CardTitle>
            <CardDescription>Verifying authentication status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Please wait.</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <Card className="w-full max-w-lg border-destructive/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Unable to verify access</CardTitle>
            </div>
            <CardDescription>
              {error || 'Check your server and try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button variant="outline" onClick={checkAuth}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
