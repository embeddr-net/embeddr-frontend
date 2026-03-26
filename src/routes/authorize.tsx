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
import { Badge } from '@embeddr/react-ui/ui'
import { AlertTriangle, CheckCircle2, Shield, User, XCircle } from 'lucide-react'
import {
  fetchAuthorizationInfo,
  submitAuthorizationConsent,
  type AuthorizationInfo,
} from '@/lib/api/endpoints/security'

const AuthorizePage = () => {
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)

  const clientId = searchParams.get('client_id') ?? ''
  const scope = searchParams.get('scope') ?? ''
  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const state = searchParams.get('state') ?? undefined
  const codeChallenge = searchParams.get('code_challenge') ?? undefined
  const codeChallengeMethod =
    searchParams.get('code_challenge_method') ?? 'S256'

  const [info, setInfo] = useState<AuthorizationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadInfo = useCallback(async () => {
    if (!clientId || !redirectUri) {
      setError('Missing required parameters: client_id and redirect_uri')
      setLoading(false)
      return
    }

    try {
      const data = await fetchAuthorizationInfo({
        client_id: clientId,
        scope: scope || undefined,
        redirect_uri: redirectUri,
        state,
      })
      setInfo(data)
      setError(null)
    } catch (err: any) {
      if (err.message === 'login_required') {
        // Redirect to login with return URL
        const returnUrl = `/authorize${window.location.search}`
        navigate({ to: '/access', search: { next: returnUrl } })
        return
      }
      setError(err.message || 'Failed to load authorization request')
    } finally {
      setLoading(false)
    }
  }, [clientId, scope, redirectUri, state, navigate])

  useEffect(() => {
    loadInfo()
  }, [loadInfo])

  const handleConsent = async (approved: boolean) => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitAuthorizationConsent({
        client_id: clientId,
        scope: info?.requested_scopes.join(' ') ?? scope,
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        approved,
      })
      // Redirect to the app's callback
      window.location.href = result.redirect_to
    } catch (err: any) {
      setError(err.message || 'Failed to process authorization')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading authorization request...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !info) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Authorization Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!info) return null

  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Authorize Application</CardTitle>
          </div>
          <CardDescription>
            <span className="font-semibold text-foreground">
              {info.client_name}
            </span>
            {info.client_description && (
              <span> &mdash; {info.client_description}</span>
            )}
            <br />
            wants access to your Embeddr account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {info.user && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm">
                <div className="font-medium">
                  {info.user.display_name || info.user.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  {info.user.username}
                  {info.user.operator_name && (
                    <span> &middot; {info.user.operator_name}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              This application is requesting permission to:
            </p>
            <ul className="space-y-2 pt-2">
              {info.requested_scopes.map((scope) => (
                <li key={scope} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <span className="text-sm">
                      {info.scope_descriptions[scope] || scope}
                    </span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {scope}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Authorizing will redirect you to{' '}
            <code className="rounded bg-muted px-1">
              {new URL(redirectUri).origin}
            </code>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleConsent(false)}
              disabled={submitting}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Deny
            </Button>
            <Button
              onClick={() => handleConsent(true)}
              disabled={submitting}
            >
              {submitting ? (
                'Authorizing...'
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Allow
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/authorize')({
  component: AuthorizePage,
})
