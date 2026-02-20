import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@embeddr/react-ui/components/ui'
import { Input } from '@embeddr/react-ui/components/ui'
import { Label } from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/ui'
import { Slider } from '@embeddr/react-ui/components/ui'
import { Switch } from '@embeddr/react-ui/components/ui'
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  X as XIcon,
  KeyRound,
  User,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { AdvancedAppearanceSettings } from '@/components/settings/AdvancedAppearanceSettings'
import { useThemePacks } from '@/hooks/useThemePacks'
import { LibrarySettings } from '@/components/settings/LibrarySettings'
import { UploadSettings } from '@/components/settings/UploadSettings'
import { PluginSettings } from '@/components/settings/PluginSettings'
import { IngestionWorkflowEditor } from '@/components/settings/IngestionWorkflowEditor'
import { IngestionProfiles } from '@/components/settings/IngestionProfiles'
import { SystemInfo } from '@/components/settings/SystemInfo'
import { LogViewer } from '@/components/settings/LogViewer'
import { LotusDashboard } from '@/features/lotus/LotusDashboard'
import { useUserStore } from '@/store/userStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useShallow } from 'zustand/react/shallow'
import { embeddrApi } from '@/lib/api/client'
import {
  fetchSecurityOverview,
  fetchSecurityRoles,
  fetchSecurityKeys,
  updateSecurityProfile,
  createSecurityKeySelf,
  listLotusCapabilities,
} from '@/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@embeddr/react-ui/components/ui'
import { toast } from 'sonner'
import { useGeneration } from '@/context/GenerationContext'
import { useLotus } from '@/providers/LotusProvider'
import { usePluginStore, useEmbeddrAPI } from '@/plugins/store'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { CommandBarCustomizer } from '@/components/settings/CommandBarCustomizer'
import { HotkeysSettings } from '@/components/settings/HotkeysSettings'

function TabScrollArea({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full w-full p-3 flex flex-col">{children}</div>
}

export function ZenGeneralTab() {
  return (
    <TabScrollArea>
      <div className="space-y-6">
        <AppearanceSettings />
      </div>
    </TabScrollArea>
  )
}

export function ZenWorkflowsTab() {
  const { workflows, selectedWorkflow, selectWorkflow } = useGeneration()
  const { hiddenWorkflows, setHiddenWorkflows } = useLotus()

  const onSelectWorkflow = selectWorkflow
  const onToggleHidden = (id: string | number) => {
    const idStr = String(id)
    if (hiddenWorkflows.includes(idStr)) {
      setHiddenWorkflows(hiddenWorkflows.filter((w) => w !== idStr))
    } else {
      setHiddenWorkflows([...hiddenWorkflows, idStr])
    }
  }

  return (
    <TabScrollArea>
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Active Workflow
          </h3>
          <div className="p-4 border bg-primary/5 border-primary/20">
            {selectedWorkflow ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-lg">
                    {selectedWorkflow.name}
                  </div>
                  <div className="px-2 py-1 bg-primary/10 text-xs font-mono text-primary">
                    Active
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedWorkflow.description || 'No description provided'}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-2">
                  ID: {selectedWorkflow.id}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                No workflow selected
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Manage Workflows
          </h3>
          <div className="grid gap-3">
            {workflows.map((workflow) => {
              const isHidden = hiddenWorkflows.includes(String(workflow.id))
              return (
                <div
                  key={workflow.id}
                  className={cn(
                    'flex items-center justify-between p-3 border transition-all',
                    selectedWorkflow?.id === workflow.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50',
                    isHidden && 'opacity-60 bg-muted/30',
                  )}
                >
                  <div
                    className="flex-1 min-w-0 mr-4"
                    onClick={() => onSelectWorkflow(workflow)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {workflow.name}
                      </span>
                      {isHidden && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {workflow.description || 'No description'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleHidden(workflow.id)
                      }}
                      title={isHidden ? 'Show workflow' : 'Hide workflow'}
                    >
                      {isHidden ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {selectedWorkflow?.id !== workflow.id && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSelectWorkflow(workflow)}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </TabScrollArea>
  )
}

export function ZenLotusTab() {
  return (
    <div className="h-full min-h-0">
      <LotusDashboard />
    </div>
  )
}

export function ZenPluginsTab() {
  const { plugins, activePlugins, activatePlugin, deactivatePlugin } =
    usePluginStore()
  const api = useEmbeddrAPI()
  const { pluginSettings, setPluginSetting } = useSettingsStore(
    useShallow((s) => ({
      pluginSettings: s.pluginSettings,
      setPluginSetting: s.setPluginSetting,
    })),
  )

  const onUpdateSetting = (pluginId: string, key: string, value: any) => {
    setPluginSetting(pluginId, key, value)
  }

  const onResetPanels = (plugin: any) => {
    if (!plugin.components) return
    let count = 0
    plugin.components.forEach((comp: any) => {
      localStorage.removeItem(`panel-${comp.id}-position`)
      localStorage.removeItem(`panel-${comp.id}-size`)
      count++
    })
    toast.success(`Reset ${count} panels for ${plugin.name}`)
    window.dispatchEvent(new Event('local-storage'))
  }

  const onActivate = activatePlugin
  const onDeactivate = deactivatePlugin

  return (
    <TabScrollArea>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Installed Plugins
          </h3>
          <span className="text-xs text-muted-foreground">
            {Object.keys(plugins).length} installed
          </span>
        </div>

        <div className="grid gap-4">
          {Object.values(plugins).map((plugin: any) => {
            const isActive = activePlugins.includes(plugin.id)
            return (
              <div key={plugin.id} className="p-4 border bg-card space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{plugin.name}</h4>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5">
                        v{plugin.version}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plugin.description}
                    </p>
                    {plugin.author && (
                      <p className="text-xs text-muted-foreground">
                        by {plugin.author}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => {
                      if (checked) onActivate(plugin.id)
                      else onDeactivate(plugin.id)
                    }}
                  />
                </div>

                {plugin.components && plugin.components.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResetPanels(plugin)}
                    >
                      Reset Panels
                    </Button>
                  </div>
                )}

                {isActive && plugin.settings ? (
                  <div className="pt-4 border-t space-y-4">
                    {plugin.settings.map((setting: any) => {
                      const value =
                        pluginSettings[plugin.id]?.[setting.key] ??
                        setting.defaultValue

                      if (setting.type === 'boolean') {
                        return (
                          <div
                            key={setting.key}
                            className="flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <Label>{setting.label}</Label>
                              {setting.description && (
                                <p className="text-xs text-muted-foreground">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={value}
                              onCheckedChange={(checked) =>
                                onUpdateSetting(plugin.id, setting.key, checked)
                              }
                            />
                          </div>
                        )
                      }

                      if (setting.type === 'string') {
                        return (
                          <div
                            key={setting.key}
                            className="grid grid-cols-4 items-center gap-4"
                          >
                            <div className="col-span-1 space-y-0.5">
                              <Label>{setting.label}</Label>
                              {setting.description && (
                                <p className="text-xs text-muted-foreground">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <Input
                              value={value}
                              onChange={(event) =>
                                onUpdateSetting(
                                  plugin.id,
                                  setting.key,
                                  event.target.value,
                                )
                              }
                              className="col-span-3"
                            />
                          </div>
                        )
                      }

                      if (setting.type === 'select') {
                        return (
                          <div
                            key={setting.key}
                            className="grid grid-cols-4 items-center gap-4"
                          >
                            <div className="col-span-1 space-y-0.5">
                              <Label>{setting.label}</Label>
                              {setting.description && (
                                <p className="text-xs text-muted-foreground">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <Select
                              open
                              value={value}
                              onValueChange={(val) =>
                                onUpdateSetting(plugin.id, setting.key, val)
                              }
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent side="top" position="popper">
                                {setting.options?.map((opt: any) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      }

                      if (setting.type === 'action') {
                        return (
                          <div
                            key={setting.key}
                            className="flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <Label>{setting.label}</Label>
                              {setting.description && (
                                <p className="text-xs text-muted-foreground">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setting.action?.(api)}
                            >
                              Run
                            </Button>
                          </div>
                        )
                      }

                      return null
                    })}
                  </div>
                ) : (
                  isActive && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground italic">
                        No configuration options available.
                      </div>
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t">
          <PluginSettings />
        </div>
      </div>
    </TabScrollArea>
  )
}

export function ZenLibraryTab() {
  return (
    // <TabScrollArea>
    <LibrarySettings />
    // </TabScrollArea>
  )
}

export function ZenUploadTab() {
  return (
    <TabScrollArea>
      <UploadSettings />
    </TabScrollArea>
  )
}

export function ZenAutomationTab() {
  return (
    <TabScrollArea>
      <div className="space-y-6">
        <IngestionProfiles />
        <div className="px-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Advanced pipeline editor
          </div>
          <IngestionWorkflowEditor scope="global" />
        </div>
      </div>
    </TabScrollArea>
  )
}

export function ZenSystemTab() {
  return (
    <TabScrollArea>
      <div className="space-y-6">
        <SystemInfo />
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Logs
          </div>
          <LogViewer />
        </div>
      </div>
    </TabScrollArea>
  )
}

export function ZenPersonalizationTab() {
  const {
    backgroundImage,
    setBackgroundImage,
    backgroundOpacity,
    setBackgroundOpacity,
    backgroundBlur,
    setBackgroundBlur,
    themeMode,
    setThemeMode,
    themePackLightId,
    setThemePackLightId,
    themePackDarkId,
    setThemePackDarkId,
    themePackSources,
    setThemePackSources,
    commandBarPosition,
    setCommandBarPosition,
    commandBarHoverParams,
    setCommandBarHoverParams,
    showPluginLogos,
    setShowPluginLogos,
  } = useSettingsStore(
    useShallow((s) => ({
      backgroundImage: s.backgroundImage,
      setBackgroundImage: s.setBackgroundImage,
      backgroundOpacity: s.backgroundOpacity,
      setBackgroundOpacity: s.setBackgroundOpacity,
      backgroundBlur: s.backgroundBlur,
      setBackgroundBlur: s.setBackgroundBlur,
      themeMode: s.themeMode,
      setThemeMode: s.setThemeMode,
      themePackLightId: s.themePackLightId,
      setThemePackLightId: s.setThemePackLightId,
      themePackDarkId: s.themePackDarkId,
      setThemePackDarkId: s.setThemePackDarkId,
      themePackSources: s.themePackSources,
      setThemePackSources: s.setThemePackSources,
      commandBarPosition: s.commandBarPosition,
      setCommandBarPosition: s.setCommandBarPosition,
      commandBarHoverParams: s.commandBarHoverParams,
      setCommandBarHoverParams: s.setCommandBarHoverParams,
      showPluginLogos: s.showPluginLogos,
      setShowPluginLogos: s.setShowPluginLogos,
    })),
  )

  const { packs } = useThemePacks()
  const [themePackUrl, setThemePackUrl] = React.useState('')
  const availablePacks = React.useMemo(
    () => [{ id: 'default', name: 'Default', version: '' }, ...packs],
    [packs],
  )
  const selectedLightPack = React.useMemo(
    () => packs.find((pack) => pack.id === themePackLightId) || null,
    [packs, themePackLightId],
  )
  const selectedDarkPack = React.useMemo(
    () => packs.find((pack) => pack.id === themePackDarkId) || null,
    [packs, themePackDarkId],
  )

  // Local state helper for image input if needed, but managing via store directly for now

  return (
    <TabScrollArea>
      <div className="space-y-8">
        {/* --- Theme Mode Section --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Appearance
          </h3>
          <div className="grid gap-6 p-4 border bg-card">
            <div className="space-y-2">
              <Label>Theme Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map((theme) => (
                  <Button
                    key={theme.value}
                    variant={themeMode === theme.value ? 'default' : 'outline'}
                    className="flex gap-2 justify-start"
                    onClick={() => setThemeMode(theme.value as any)}
                  >
                    <theme.icon className="h-4 w-4" /> {theme.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Light and Dark modes map to selected theme packs.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Light Pack</Label>
                <Select
                  value={themePackLightId}
                  onValueChange={(value) => setThemePackLightId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select light pack" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePacks.map((pack) => (
                      <SelectItem key={pack.id} value={pack.id}>
                        <span className="flex items-center gap-2">
                          {'iconUrl' in pack && pack.iconUrl ? (
                            <img
                              src={pack.iconUrl}
                              alt=""
                              className="h-4 w-4 rounded-sm object-contain"
                            />
                          ) : null}
                          <span>
                            {pack.name}
                            {pack.version ? ` v${pack.version}` : ''}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLightPack &&
                  (selectedLightPack.iconUrl ||
                    selectedLightPack.bannerUrl) && (
                    <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/20">
                      {selectedLightPack.iconUrl && (
                        <img
                          src={selectedLightPack.iconUrl}
                          alt=""
                          className="h-8 w-8 rounded-md object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {selectedLightPack.name}
                        </div>
                        {selectedLightPack.description && (
                          <div className="text-xs text-muted-foreground">
                            {selectedLightPack.description}
                          </div>
                        )}
                      </div>
                      {selectedLightPack.bannerUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setBackgroundImage(
                              selectedLightPack.bannerUrl || null,
                            )
                          }
                        >
                          Use banner
                        </Button>
                      )}
                    </div>
                  )}
              </div>

              <div className="space-y-2">
                <Label>Dark Pack</Label>
                <Select
                  value={themePackDarkId}
                  onValueChange={(value) => setThemePackDarkId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dark pack" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePacks.map((pack) => (
                      <SelectItem key={pack.id} value={pack.id}>
                        <span className="flex items-center gap-2">
                          {'iconUrl' in pack && pack.iconUrl ? (
                            <img
                              src={pack.iconUrl}
                              alt=""
                              className="h-4 w-4 rounded-sm object-contain"
                            />
                          ) : null}
                          <span>
                            {pack.name}
                            {pack.version ? ` v${pack.version}` : ''}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Theme packs can override fonts, overlays, and custom CSS.
                </p>
                {selectedDarkPack &&
                  (selectedDarkPack.iconUrl || selectedDarkPack.bannerUrl) && (
                    <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/20">
                      {selectedDarkPack.iconUrl && (
                        <img
                          src={selectedDarkPack.iconUrl}
                          alt=""
                          className="h-8 w-8 rounded-md object-contain"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {selectedDarkPack.name}
                        </div>
                        {selectedDarkPack.description && (
                          <div className="text-xs text-muted-foreground">
                            {selectedDarkPack.description}
                          </div>
                        )}
                      </div>
                      {selectedDarkPack.bannerUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setBackgroundImage(
                              selectedDarkPack.bannerUrl || null,
                            )
                          }
                        >
                          Use banner
                        </Button>
                      )}
                    </div>
                  )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Install Theme Pack URL</Label>
              <div className="flex gap-2">
                <Input
                  value={themePackUrl}
                  onChange={(event) => setThemePackUrl(event.target.value)}
                  placeholder="https://themes.embeddr.net/my-pack.json"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const next = themePackUrl.trim()
                    if (!next) return
                    setThemePackSources(
                      themePackSources.includes(next)
                        ? themePackSources
                        : [...themePackSources, next],
                    )
                    setThemePackUrl('')
                  }}
                >
                  Add
                </Button>
              </div>
              {themePackSources.length > 0 && (
                <div className="space-y-2">
                  {themePackSources.map((source) => (
                    <div
                      key={source}
                      className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                    >
                      <span className="truncate">{source}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setThemePackSources(
                            themePackSources.filter((item) => item !== source),
                          )
                        }
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Command Bar Customizer --- */}
        <div className="space-y-4">
          <div className="grid gap-6 p-4 border bg-card">
            <CommandBarCustomizer />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={commandBarPosition}
                  onValueChange={(v: any) => setCommandBarPosition(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility Behavior</Label>
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm">Auto-hide until hovered</span>
                  <Switch
                    checked={commandBarHoverParams.enabled}
                    onCheckedChange={(c) =>
                      setCommandBarHoverParams({
                        ...commandBarHoverParams,
                        enabled: c,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <HotkeysSettings />
          </div>
        </div>

        {/* --- Panel Chrome --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Panel Chrome
          </h3>
          <div className="grid gap-6 p-4 border bg-card">
            <div className="flex items-center justify-between p-2 border rounded-md">
              <span className="text-sm">
                Show plugin logos in panel headers
              </span>
              <Switch
                checked={showPluginLogos}
                onCheckedChange={(checked) => setShowPluginLogos(checked)}
              />
            </div>
          </div>
        </div>

        {/* --- Background Section (Keep existing) --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Background
          </h3>
          <div className="grid gap-6 p-4 border bg-card">
            <div className="space-y-2">
              <Label>Background Image URL</Label>
              <div className="flex gap-2">
                <Input
                  value={backgroundImage || ''}
                  onChange={(event) => setBackgroundImage(event.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                {/* Image picker button would need explicit callback passed or handled here, simplifying for now */}
                {backgroundImage && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setBackgroundImage(null)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Background Opacity</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(backgroundOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[backgroundOpacity]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([val]) => setBackgroundOpacity(val)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Background Blur</Label>
                <span className="text-sm text-muted-foreground">
                  {backgroundBlur}px
                </span>
              </div>
              <Slider
                value={[backgroundBlur]}
                min={0}
                max={20}
                step={1}
                onValueChange={([val]) => setBackgroundBlur(val)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Advanced Visuals
          </h3>
          <AppearanceSettings />
          <AdvancedAppearanceSettings />
        </div>
      </div>
    </TabScrollArea>
  )
}

export function ZenInterfaceTab() {
  const [generateText, setGenerateText] = useLocalStorage(
    'zen-generate-text',
    'Generate',
  )
  const [generateTheme, setGenerateTheme] = useLocalStorage(
    'zen-generate-theme',
    'default',
  )

  return (
    <TabScrollArea>
      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Generate Button
          </h3>
          <div className="grid gap-6 p-4 border bg-card">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gen-text" className="text-right">
                Button Text
              </Label>
              <Input
                id="gen-text"
                value={generateText}
                onChange={(event) => setGenerateText(event.target.value)}
                className="col-span-3 max-w-75"
                placeholder="Generate"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gen-theme" className="text-right">
                Theme
              </Label>
              <Select value={generateTheme} onValueChange={setGenerateTheme}>
                <SelectTrigger className="col-span-3 max-w-75">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Primary)</SelectItem>
                  <SelectItem value="amber">Amber (Creative)</SelectItem>
                  <SelectItem value="blue">Blue (Professional)</SelectItem>
                  <SelectItem value="green">Green (Go)</SelectItem>
                  <SelectItem value="purple">Purple (Magic)</SelectItem>
                  <SelectItem value="rose">Rose (Passion)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Layout
          </h3>
          <div className="p-4 border bg-card text-sm text-muted-foreground">
            More layout options coming soon.
          </div>
        </div>
      </div>
    </TabScrollArea>
  )
}

export function ZenLogsTab() {
  return (
    <TabScrollArea>
      <LogViewer />
    </TabScrollArea>
  )
}

export function ZenLotusConfigTab({
  activeTab: _activeTab,
  children,
}: {
  activeTab: string
  children: React.ReactNode
}) {
  return (
    <TabScrollArea>
      <div className="min-h-0 flex-1">{children}</div>
    </TabScrollArea>
  )
}

export function ZenProfileTab() {
  const {
    displayName,
    setDisplayName,
    avatarUrl,
    setAvatarUrl,
    apiKey,
    setApiKey,
  } = useUserStore()

  // Local state for basic form handling
  const [name, setName] = useState(displayName)
  const [avatar, setAvatar] = useState(avatarUrl)
  const [key, setKey] = useState(apiKey || '')
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [newKeyPermissions, setNewKeyPermissions] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [scopeSearch, setScopeSearch] = useState('')

  useEffect(() => {
    setName(displayName)
    setAvatar(avatarUrl)
    setKey(apiKey || '')
  }, [displayName, avatarUrl, apiKey])

  const handleSaveProfile = async () => {
    try {
      const result = await updateSecurityProfile({
        display_name: name,
        avatar_url: avatar || null,
      })
      setDisplayName(result.display_name || result.username)
      setAvatarUrl(result.avatar_url || '')
      setName(result.display_name || result.username)
      setAvatar(result.avatar_url || '')
      toast.success('Profile updated')
    } catch (error) {
      console.error('Failed to update profile', error)
      toast.error('Failed to update server profile')
    }
  }

  const lotusCapsQuery = useQuery({
    queryKey: ['lotus', 'capabilities', 'profile'],
    queryFn: () => listLotusCapabilities({ limit: 500 }),
    staleTime: 60_000,
  })

  const scopeSearchValue = scopeSearch.trim().toLowerCase()
  const capabilityScopes = (lotusCapsQuery.data?.items ?? []).map(
    (cap) => `lotus:capability:${cap.id}`,
  )

  const scopeGroups = [
    {
      label: 'Core data access',
      description: 'Read and write artifacts and collections.',
      scopes: [
        'artifacts:read',
        'artifacts:write',
        'collections:read',
        'collections:write',
      ],
    },
    {
      label: 'System access',
      description: 'Diagnostics and system settings.',
      scopes: ['system:read', 'system:write'],
    },
    {
      label: 'Plugins',
      description: 'Discover plugin metadata.',
      scopes: ['plugins:read'],
    },
    {
      label: 'Key management',
      description: 'Allow creating personal keys.',
      scopes: ['keys:create:self'],
    },
    {
      label: 'Lotus global',
      description: 'Search and dispatch Lotus capabilities.',
      scopes: ['lotus:list', 'lotus:dispatch', 'lotus:*'],
    },
  ]

  const presets = [
    {
      id: 'comfyui',
      label: 'ComfyUI',
      scopes: [
        'artifacts:read',
        'artifacts:write',
        'collections:read',
        'system:read',
      ],
    },
    {
      id: 'readonly',
      label: 'Read-only',
      scopes: ['artifacts:read', 'collections:read', 'lotus:list'],
    },
  ]

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((item) => item !== scope)
        : [...prev, scope],
    )
  }

  const applyPreset = (scopes: string[]) => {
    setSelectedScopes((prev) => Array.from(new Set([...prev, ...scopes])))
  }

  const createKeyMutation = useMutation({
    mutationFn: createSecurityKeySelf,
    onSuccess: (data) => {
      setCreatedKey(data.key)
      setNewKeyName('')
      setSelectedScopes([])
      setNewKeyPermissions('')
      toast.success('Client key created')
    },
    onError: () => toast.error('Failed to create client key'),
  })

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Key name is required')
      return
    }
    const permissions = newKeyPermissions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    createKeyMutation.mutate({
      name: newKeyName.trim(),
      scopes: selectedScopes,
      permissions,
    })
  }

  const handleSaveAuth = async () => {
    // If empty string, treat as removing key
    const val = key.trim() === '' ? null : key.trim()
    setApiKey(val)
    try {
      await embeddrApi.auth.setSession({ apiKey: val, clear: !val })
      toast.success('Authentication settings updated')
    } catch (error) {
      console.error('Failed to update auth session', error)
      toast.error('Failed to update server auth session')
    }
  }

  return (
    <TabScrollArea>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Connected Client Profile</CardTitle>
            </div>
            <CardDescription>
              Identity for the connected client provider, not the operator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatar} />
                <AvatarFallback>
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    placeholder="Guest Client"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="avatar-url">Avatar URL</Label>
                  <Input
                    id="avatar-url"
                    placeholder="https://github.com/shadcn.png"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to an image file for your profile picture.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile}>Save Profile</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>Personal Client Keys</CardTitle>
            </div>
            <CardDescription>
              Create keys scoped to your permissions. Keys are shown once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="self-key-name">Key name</Label>
                <Input
                  id="self-key-name"
                  placeholder="comfyui"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="self-key-permissions">
                  Advanced permissions (comma-separated)
                </Label>
                <Input
                  id="self-key-permissions"
                  placeholder="artifacts:read, artifacts:write"
                  value={newKeyPermissions}
                  onChange={(e) => setNewKeyPermissions(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Permissions are optional for advanced, fine-grained control.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset.scopes)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Selected scopes</Label>
                  {selectedScopes.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No scopes selected yet.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedScopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <span>{scope}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => toggleScope(scope)}
                            aria-label={`Remove ${scope}`}
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Search available scopes</Label>
                  <Input
                    value={scopeSearch}
                    onChange={(e) => setScopeSearch(e.target.value)}
                    placeholder="Search scopes"
                  />
                  <ScrollArea className="h-72 rounded border">
                    <div className="grid gap-3 p-3">
                      {scopeGroups.map((group) => {
                        const scopes = group.scopes.filter((scope) =>
                          scopeSearchValue
                            ? scope.toLowerCase().includes(scopeSearchValue)
                            : true,
                        )
                        if (scopeSearchValue && scopes.length === 0) return null
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
                              {scopes.map((scope) => (
                                <button
                                  key={scope}
                                  type="button"
                                  className={cn(
                                    'rounded border px-2 py-1 text-xs transition-colors',
                                    selectedScopes.includes(scope)
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'hover:bg-muted',
                                  )}
                                  onClick={() => toggleScope(scope)}
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
                          {lotusCapsQuery.isLoading ? (
                            <div className="text-muted-foreground">
                              Loading Lotus capabilities…
                            </div>
                          ) : capabilityScopes.length === 0 ? (
                            <div className="text-muted-foreground">
                              No Lotus capabilities found.
                            </div>
                          ) : (
                            capabilityScopes
                              .filter((scope) =>
                                scopeSearchValue
                                  ? scope
                                      .toLowerCase()
                                      .includes(scopeSearchValue)
                                  : true,
                              )
                              .slice(0, 120)
                              .map((scope) => (
                                <button
                                  key={scope}
                                  type="button"
                                  className={cn(
                                    'rounded border px-2 py-1 text-xs transition-colors',
                                    selectedScopes.includes(scope)
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'hover:bg-muted',
                                  )}
                                  onClick={() => toggleScope(scope)}
                                >
                                  {scope}
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  <div className="text-xs text-muted-foreground">
                    Click a scope to toggle it. Use presets to start quickly.
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Store the key immediately. It is shown only once.
              </div>
              <Button
                onClick={handleCreateKey}
                disabled={createKeyMutation.isPending}
              >
                {createKeyMutation.isPending
                  ? 'Creating…'
                  : 'Create client key'}
              </Button>
            </div>
            {createdKey && (
              <div className="rounded border border-primary/30 bg-primary/5 p-2 text-sm">
                <div className="text-xs uppercase text-muted-foreground">
                  New Client Key
                </div>
                <div className="font-mono break-all">{createdKey}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>Authentication</CardTitle>
            </div>
            <CardDescription>
              Credentials for accessing secured Embeddr services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="api-key">Client Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="em_..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required if the server is running in secured mode
                (EMBEDDR_API_KEY is set).
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveAuth} variant="secondary">
                Update Credentials
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabScrollArea>
  )
}

export function ZenSecurityTab() {
  const overviewQuery = useQuery({
    queryKey: ['security', 'overview'],
    queryFn: fetchSecurityOverview,
  })
  const rolesQuery = useQuery({
    queryKey: ['security', 'roles'],
    queryFn: fetchSecurityRoles,
  })
  const keysQuery = useQuery({
    queryKey: ['security', 'keys'],
    queryFn: fetchSecurityKeys,
  })

  const overview = overviewQuery.data
  const roles = rolesQuery.data?.items ?? []
  const keys = keysQuery.data?.items ?? []

  return (
    <TabScrollArea>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Security Overview</CardTitle>
            </div>
            <CardDescription>
              RBAC and client key access status for this instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overviewQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : overviewQuery.isError ? (
              <div className="text-sm text-destructive">
                Failed to load security overview.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Auth Mode</div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={overview?.auth_enabled ? 'default' : 'secondary'}
                    >
                      {overview?.auth_enabled ? 'Enabled' : 'Open'}
                    </Badge>
                    <span className="text-sm font-medium uppercase">
                      {overview?.auth_mode ?? 'unknown'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Current Client
                  </div>
                  <div className="text-sm font-medium">
                    {overview?.current_user?.display_name || 'Anonymous'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Clients</div>
                  <div className="text-sm font-medium">
                    {overview?.users ?? 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Client Keys
                  </div>
                  <div className="text-sm font-medium">
                    {overview?.api_keys ?? 0}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Current role definitions and permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rolesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading roles...
              </div>
            ) : rolesQuery.isError ? (
              <div className="text-sm text-destructive">
                Unable to load roles.
              </div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No roles configured.
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
                    {role.permissions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No permissions
                      </span>
                    ) : (
                      role.permissions.map((perm) => (
                        <Badge key={perm} variant="outline">
                          {perm}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Keys</CardTitle>
            <CardDescription>Issued keys and scopes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {keysQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading keys...
              </div>
            ) : keysQuery.isError ? (
              <div className="text-sm text-destructive">
                Unable to load keys.
              </div>
            ) : keys.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No client keys found.
              </div>
            ) : (
              keys.map((key) => (
                <div key={key.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{key.name}</div>
                    <Badge variant={key.is_active ? 'default' : 'secondary'}>
                      {key.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Prefix: {key.key_prefix}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(key.scopes.length ? key.scopes : key.permissions).map(
                      (scope) => (
                        <Badge key={scope} variant="outline">
                          {scope}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </TabScrollArea>
  )
}
