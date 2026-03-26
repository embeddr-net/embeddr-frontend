import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { AlertTriangle, LockKeyhole } from 'lucide-react'
import {
  fetchSecurityOverviewStatus,
  loginWithPassword,
} from '@/lib/api/endpoints/security'
import { embeddrApi } from '@/lib/api/client'
import { useUserStore } from '@/store/userStore'

const AccessPage = () => {
  const navigate = useNavigate()
  const { apiKey, setApiKey, setDisplayName, setAvatarUrl, setIsOperator } =
    useUserStore()
  const [status, setStatus] = useState<
    'checking' | 'ok' | 'required' | 'error'
  >('checking')
  const [error, setError] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(apiKey ?? '')
  const [loginMode, setLoginMode] = useState<'key' | 'password'>('key')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  // Auto-login from query param (used by hosted dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const keyFromUrl = params.get('api_key')
    if (keyFromUrl && keyFromUrl !== apiKey) {
      embeddrApi.auth.setSession({ apiKey: keyFromUrl }).then(() => {
        setApiKey(keyFromUrl)
        // Clean the key from the URL
        const url = new URL(window.location.href)
        url.searchParams.delete('api_key')
        window.history.replaceState({}, '', url.pathname + url.search)
      }).catch(console.error)
      return
    }
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (apiKey) checkAuth()
  }, [checkAuth, apiKey])

  useEffect(() => {
    setInputKey(apiKey ?? '')
  }, [apiKey])

  useEffect(() => {
    if (status === 'ok') {
      const nextUrl = new URLSearchParams(window.location.search).get('next')
      if (nextUrl && nextUrl.startsWith('/')) {
        window.location.href = nextUrl
      } else {
        navigate({ to: '/' })
      }
    }
  }, [navigate, status])

  const handleLogin = async () => {
    const trimmed = inputKey.trim()
    if (!trimmed) {
      setStatus('required')
      setError('Client key is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await embeddrApi.auth.setSession({ apiKey: trimmed })
      setApiKey(trimmed)
      await checkAuth()
    } catch (err) {
      console.error(err)
      setStatus('required')
      setError('Client key rejected by server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordLogin = async () => {
    if (!username.trim() || !password) {
      setStatus('required')
      setError('Username and password are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await loginWithPassword({
        username: username.trim(),
        password,
      })
      setApiKey(result.key)
      await checkAuth()
    } catch (err) {
      console.error(err)
      setStatus('required')
      setError('Username or password is incorrect.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-primary" />
            <CardTitle>Sign in to Embeddr</CardTitle>
          </div>
          <CardDescription>
            Sign in with a client key or a username and password. The initial
            admin key is printed once on first boot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'error' && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{error || 'Unable to verify access.'}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Check your server connection and try again.
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={loginMode === 'key' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLoginMode('key')}
            >
              Client key
            </Button>
            <Button
              type="button"
              variant={loginMode === 'password' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLoginMode('password')}
            >
              Username + password
            </Button>
          </div>
          {loginMode === 'key' ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide">
                Client key
              </label>
              <Input
                type="password"
                placeholder="em_..."
                value={inputKey}
                onChange={(event) => setInputKey(event.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide">
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
          )}
          {error && status !== 'error' && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {status === 'checking' ? 'Checking access…' : 'Auth required'}
            </Badge>
            <Button
              onClick={loginMode === 'key' ? handleLogin : handlePasswordLogin}
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/access')({
  component: AccessPage,
})
