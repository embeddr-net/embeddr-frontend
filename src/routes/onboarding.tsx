import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { Separator } from '@embeddr/react-ui/ui'
import { ScrollArea } from '@embeddr/react-ui/ui'
import { Switch } from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/ui'
import { PlugZap } from 'lucide-react'
import { CloudOnboarding } from '@/components/onboarding/CloudOnboarding'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useThemePacks } from '@/hooks/useThemePacks'
import { embeddrApi } from '@/lib/api/client'
import { fetchPluginLogos } from '@/lib/api/endpoints/plugins'
import { useUserStore } from '@/store/userStore'
import { useSettingsStore } from '@/store/settingsStore'

const OnboardingPage = () => {
  const navigate = useNavigate()
  const {
    themeMode,
    setThemeMode,
    themePackLightId,
    setThemePackLightId,
    themePackDarkId,
    setThemePackDarkId,
  } = useSettingsStore()
  const [, setOnboardingDismissed] = useLocalStorage(
    'zen-onboarding-dismissed',
    false,
  )
  const { displayName, setDisplayName, apiKey, setApiKey } = useUserStore()
  const [showKey, setShowKey] = useState(false)

  const { data: plugins, isLoading: pluginsLoading } = useQuery({
    queryKey: ['plugins', 'onboarding'],
    queryFn: () => embeddrApi.plugins.list(),
    staleTime: 30_000,
  })

  const { data: pluginLogos } = useQuery({
    queryKey: ['plugins', 'logos', 'onboarding'],
    queryFn: () => fetchPluginLogos(),
    staleTime: 60_000,
  })

  const { data: publicInfo } = useQuery({
    queryKey: ['system', 'public', 'onboarding'],
    queryFn: () => embeddrApi.system.publicInfo(),
    staleTime: 60_000,
  })

  const instanceProfile = publicInfo?.instance

  const { packs, isLoading: themesLoading } = useThemePacks()
  const availablePacks = useMemo(
    () => [{ id: 'default', name: 'Default', version: '' }, ...packs],
    [packs],
  )

  const pluginList = useMemo(() => plugins || [], [plugins])

  const getPluginStats = (plugin: any) => {
    const actions = Array.isArray(plugin?.actions) ? plugin.actions.length : 0
    const components =
      (plugin?.frontend_components?.length || 0) +
      (plugin?.panels?.length || 0) +
      (plugin?.pages?.length || 0) +
      (plugin?.widgets?.length || 0)
    const intents = Array.isArray(plugin?.intents) ? plugin.intents : []
    return { actions, components, intents }
  }

  const handleComplete = () => {
    setOnboardingDismissed(true)
    navigate({ to: '/' })
  }

  // Cloud mode: show simplified onboarding flow
  if (publicInfo?.cloud_mode) {
    return <CloudOnboarding publicInfo={publicInfo} onComplete={handleComplete} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <Card className="mx-auto w-full max-w-6xl p-6 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Welcome to Embeddr</h1>
            <p className="text-sm text-muted-foreground">
              Start with sensible defaults, ingest content quickly, and tune
              advanced options only when you need them.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: '/' })}>
              Enter app
            </Button>
            <Button onClick={handleComplete}>Finish setup</Button>
          </div>
        </div>
        <Separator />

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Quick start</h2>
              <p className="text-sm text-muted-foreground">
                Beginner path with minimal clicks. Nelumbo and Lotus handle the
                heavy lifting; defaults can be applied in one action.
              </p>
            </div>
            <Badge variant="default">Recommended</Badge>
          </div>
          <OnboardingWizard
            onComplete={handleComplete}
            onOpenSettingsTab={(tab) =>
              navigate({ to: '/settings', search: { tab } })
            }
          />
        </Card>

        <Separator />

        <Tabs defaultValue="theme" className="space-y-4">
          <TabsList className="w-full justify-start gap-2">
            <TabsTrigger value="theme">Personalize (optional)</TabsTrigger>
            <TabsTrigger value="plugins">Plugins (optional)</TabsTrigger>
            <TabsTrigger value="advanced">Advanced (optional)</TabsTrigger>
          </TabsList>

          <TabsContent value="theme">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Theme preferences</h2>
                  <p className="text-sm text-muted-foreground">
                    Optional visual preferences. You can skip this for now.
                  </p>
                </div>
                <Badge variant="outline">Current: {themeMode}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={themeMode === 'system' ? 'default' : 'outline'}
                  onClick={() => setThemeMode('system')}
                >
                  System
                </Button>
                <Button
                  variant={themeMode === 'dark' ? 'default' : 'outline'}
                  onClick={() => setThemeMode('dark')}
                >
                  Dark
                </Button>
                <Button
                  variant={themeMode === 'light' ? 'default' : 'outline'}
                  onClick={() => setThemeMode('light')}
                >
                  Light
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Light theme pack
                  </label>
                  <Select
                    value={themePackLightId}
                    onValueChange={(value) => setThemePackLightId(value)}
                    disabled={themesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          themesLoading ? 'Loading themes…' : 'Select a pack'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePacks.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Dark theme pack
                  </label>
                  <Select
                    value={themePackDarkId}
                    onValueChange={(value) => setThemePackDarkId(value)}
                    disabled={themesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          themesLoading ? 'Loading themes…' : 'Select a pack'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePacks.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="plugins">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Plugins</h2>
                  <p className="text-sm text-muted-foreground">
                    Auto-detected plugins in your local environment.
                  </p>
                </div>
                <Badge variant="secondary">{pluginList.length} available</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Beginner setup works without touching plugins. Use this list for
                visibility and optional tuning.
              </div>
              <ScrollArea className="h-90 pr-2">
                <div className="space-y-2">
                  {pluginsLoading && (
                    <div className="text-sm text-muted-foreground">
                      Loading plugins...
                    </div>
                  )}
                  {!pluginsLoading && pluginList.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No plugins detected.
                    </div>
                  )}
                  {pluginList.map((plugin: any) =>
                    (() => {
                      const stats = getPluginStats(plugin)
                      return (
                        <div
                          key={plugin.id || plugin.name}
                          className="flex items-center justify-between rounded-md border border-border/50 bg-background/60 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            {pluginLogos?.[plugin.name || plugin.id] ? (
                              <img
                                src={
                                  pluginLogos[
                                    plugin.name || plugin.id
                                  ] as string
                                }
                                alt={`${plugin.name || plugin.id} logo`}
                                className="h-6 w-6 rounded-md object-contain"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
                                <PlugZap className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {plugin.name || plugin.id}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {plugin.version
                                  ? `v${plugin.version}`
                                  : 'Plugin'}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {stats.actions} actions
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {stats.components} UI
                                </Badge>
                                {stats.intents.map((intent: string) => (
                                  <Badge
                                    key={`${plugin.id || plugin.name}-${intent}`}
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    {intent}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">Loaded</Badge>
                        </div>
                      )
                    })(),
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    Profile & client access
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Optional fields for managed or secured deployments. Local
                    installs can leave these blank.
                  </p>
                </div>
                <Badge variant={apiKey ? 'default' : 'secondary'}>
                  {apiKey ? 'Client key set' : 'Client key optional'}
                </Badge>
              </div>

              {instanceProfile && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-start gap-3">
                    {instanceProfile.logo_url ? (
                      <img
                        src={instanceProfile.logo_url}
                        alt="Instance logo"
                        className="h-12 w-12 rounded-md object-contain bg-background"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        LOGO
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {instanceProfile.name || 'Embeddr Instance'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {instanceProfile.description ||
                          'Connected to your local Embeddr instance.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Display name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    Client key
                  </label>
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey ?? ''}
                    onChange={(e) =>
                      setApiKey(e.target.value ? e.target.value : null)
                    }
                    placeholder="Optional client key"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={showKey} onCheckedChange={setShowKey} />
                    <span>Show client key</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: '/access' })}
                >
                  Open access setup
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate({ to: '/settings', search: { tab: 'automation' } })
                  }
                >
                  Open advanced settings
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Local-first by default: no username/password is required unless
                your deployment enforces it.
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})
