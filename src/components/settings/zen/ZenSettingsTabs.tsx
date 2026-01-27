import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Slider } from '@embeddr/react-ui/components/slider'
import { Switch } from '@embeddr/react-ui/components/switch'
import { Eye, EyeOff, Image as ImageIcon, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GeneralSettings } from '@/components/settings/GeneralSettings'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { LibrarySettings } from '@/components/settings/LibrarySettings'
import { UploadSettings } from '@/components/settings/UploadSettings'
import { PluginSettings } from '@/components/settings/PluginSettings'
import { IngestionWorkflowEditor } from '@/components/settings/IngestionWorkflowEditor'
import { SystemInfo } from '@/components/settings/SystemInfo'
import { LogViewer } from '@/components/settings/LogViewer'
import { LotusDashboard } from '@/features/lotus/LotusDashboard'

function TabScrollArea({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="h-full w-full" variant="left-border" type="always">
      <div className="min-h-full w-full p-3 flex flex-col">{children}</div>
    </ScrollArea>
  )
}

export function ZenGeneralTab() {
  return (
    <TabScrollArea>
      <div className="space-y-6">
        <GeneralSettings />
        <AppearanceSettings />
      </div>
    </TabScrollArea>
  )
}

export function ZenWorkflowsTab({
  workflows,
  selectedWorkflow,
  hiddenWorkflows,
  onSelectWorkflow,
  onToggleHidden,
}: {
  workflows: Array<{
    id: string | number
    name: string
    description?: string | null
  }>
  selectedWorkflow: {
    id: string | number
    name: string
    description?: string | null
  } | null
  hiddenWorkflows: string[]
  onSelectWorkflow: (workflow: any) => void
  onToggleHidden: (id: string | number) => void
}) {
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

export function ZenPluginsTab({
  plugins,
  activePlugins,
  pluginSettings,
  onActivate,
  onDeactivate,
  onResetPanels,
  onUpdateSetting,
  api,
}: {
  plugins: Record<string, any>
  activePlugins: string[]
  pluginSettings: Record<string, Record<string, any>>
  onActivate: (id: string) => void
  onDeactivate: (id: string) => void
  onResetPanels: (plugin: any) => void
  onUpdateSetting: (pluginId: string, key: string, value: any) => void
  api: any
}) {
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
      <IngestionWorkflowEditor scope="global" />
    </TabScrollArea>
  )
}

export function ZenSystemTab() {
  return (
    <TabScrollArea>
      <SystemInfo />
    </TabScrollArea>
  )
}

import { VisualCommandBarEditor } from '@/components/settings/VisualCommandBarEditor'
import { useSettingsStore } from '@/store/settingsStore'
import { useShallow } from 'zustand/react/shallow'
import { Monitor, Moon, Sun, Leaf, Coffee, Cat } from 'lucide-react'

export function ZenPersonalizationTab() {
  const {
    backgroundImage,
    setBackgroundImage,
    backgroundOpacity,
    setBackgroundOpacity,
    backgroundBlur,
    setBackgroundBlur,
    themeColor,
    setThemeColor, // We might deprecate this visual color picker eventually
    themeMode,
    setThemeMode,
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
      themeColor: s.themeColor,
      setThemeColor: s.setThemeColor,
      themeMode: s.themeMode,
      setThemeMode: s.setThemeMode,
      commandBarPosition: s.commandBarPosition,
      setCommandBarPosition: s.setCommandBarPosition,
      commandBarHoverParams: s.commandBarHoverParams,
      setCommandBarHoverParams: s.setCommandBarHoverParams,
      showPluginLogos: s.showPluginLogos,
      setShowPluginLogos: s.setShowPluginLogos,
    })),
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
                  { value: 'midnight', label: 'Midnight', icon: Moon },
                  { value: 'forest', label: 'Forest', icon: Leaf },
                  { value: 'frappe', label: 'Frappé', icon: Cat },
                  { value: 'latte', label: 'Latte', icon: Coffee },
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
            </div>
          </div>
        </div>

        {/* --- Command Bar Customizer --- */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Command Bar
          </h3>
          <div className="grid gap-6 p-4 border bg-card">
            {/* Editor */}
            <div className="space-y-2">
              <Label>Layout & Ordering</Label>
              <VisualCommandBarEditor />
            </div>

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
      </div>
    </TabScrollArea>
  )
}

export function ZenInterfaceTab({
  generateText,
  generateTheme,
  onGenerateTextChange,
  onGenerateThemeChange,
}: {
  generateText: string
  generateTheme: string
  onGenerateTextChange: (value: string) => void
  onGenerateThemeChange: (value: string) => void
}) {
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
                onChange={(event) => onGenerateTextChange(event.target.value)}
                className="col-span-3 max-w-75"
                placeholder="Generate"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gen-theme" className="text-right">
                Theme
              </Label>
              <Select
                value={generateTheme}
                onValueChange={onGenerateThemeChange}
              >
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
