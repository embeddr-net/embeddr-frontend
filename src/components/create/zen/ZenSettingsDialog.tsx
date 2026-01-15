import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layout,
  Palette,
  Plug,
  Settings,
  Sliders,
  Workflow as WorkflowIcon,
  X as XIcon,
} from 'lucide-react'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Label } from '@embeddr/react-ui/components/label'
import { Switch } from '@embeddr/react-ui/components/switch'
import { Input } from '@embeddr/react-ui/components/input'
import { Slider } from '@embeddr/react-ui/components/slider'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { useGeneration } from '@/context/GenerationContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useSettingsStore } from '@/store/settingsStore'
import { themes } from '@/lib/themes'
import { useEmbeddrAPI, usePluginStore } from '@/plugins/store'
import { cn } from '@/lib/utils'

interface ZenSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hiddenWorkflows: Array<string>
  setHiddenWorkflows: (workflows: Array<string>) => void
}

export function ZenSettingsDialog({
  open,
  onOpenChange,
  hiddenWorkflows,
  setHiddenWorkflows,
}: ZenSettingsDialogProps) {
  const { workflows, selectedWorkflow, selectWorkflow } = useGeneration()
  const { plugins, activePlugins, activatePlugin, deactivatePlugin } =
    usePluginStore()
  const api = useEmbeddrAPI()
  const {
    backgroundImage,
    setBackgroundImage,
    backgroundOpacity,
    setBackgroundOpacity,
    backgroundBlur,
    setBackgroundBlur,
    themeColor,
    setThemeColor,
  } = useSettingsStore()

  const [autoSave, setAutoSave] = useLocalStorage('zen-auto-save', true)
  const [notifications, setNotifications] = useLocalStorage(
    'zen-notifications',
    true,
  )
  const [defaultSteps, setDefaultSteps] = useLocalStorage(
    'zen-default-steps',
    20,
  )
  const [defaultCfg, setDefaultCfg] = useLocalStorage('zen-default-cfg', 7)

  // Generate Button Settings
  const [generateText, setGenerateText] = useLocalStorage(
    'zen-generate-text',
    'Generate',
  )
  const [generateTheme, setGenerateTheme] = useLocalStorage(
    'zen-generate-theme',
    'default',
  )

  const [activeTab, setActiveTab] = useState('general')

  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false)

  const [pluginSettings, setPluginSettings] = useLocalStorage<
    Record<string, Record<string, any>>
  >('zen-plugin-settings', {})

  const updatePluginSetting = (pluginId: string, key: string, value: any) => {
    setPluginSettings((prev) => ({
      ...prev,
      [pluginId]: {
        ...(prev[pluginId] || {}),
        [key]: value,
      },
    }))
    // Dispatch event for plugins to pick up changes
    window.dispatchEvent(new Event('local-storage'))
  }

  const handleResetPanels = (plugin: any) => {
    if (!plugin.components) return

    let count = 0
    plugin.components.forEach((comp: any) => {
      localStorage.removeItem(`panel-${comp.id}-position`)
      localStorage.removeItem(`panel-${comp.id}-size`)
      count++
    })

    toast.success(
      `Reset positions for ${count} panels in ${plugin.name}. You may need to reopen the panel.`,
    )
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('local-storage'))
  }

  const toggleWorkflowVisibility = (id: string | number) => {
    const idStr = String(id)
    if (hiddenWorkflows.includes(idStr)) {
      setHiddenWorkflows(hiddenWorkflows.filter((w) => w !== idStr))
    } else {
      setHiddenWorkflows([...hiddenWorkflows, idStr])
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/30 flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </h2>
              </div>
              <div className="flex-1 py-4">
                <nav className="space-y-1 px-2">
                  <Button
                    variant={activeTab === 'general' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('general')}
                  >
                    <Sliders className="mr-2 h-4 w-4" />
                    General
                  </Button>
                  <Button
                    variant={activeTab === 'workflows' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('workflows')}
                  >
                    <WorkflowIcon className="mr-2 h-4 w-4" />
                    Workflows
                  </Button>
                  <Button
                    variant={activeTab === 'plugins' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('plugins')}
                  >
                    <Plug className="mr-2 h-4 w-4" />
                    Plugins
                  </Button>
                  <Button
                    variant={
                      activeTab === 'personalization' ? 'secondary' : 'ghost'
                    }
                    className="w-full justify-start"
                    onClick={() => setActiveTab('personalization')}
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    Personalization
                  </Button>
                  <Button
                    variant={activeTab === 'interface' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('interface')}
                  >
                    <Layout className="mr-2 h-4 w-4" />
                    Interface
                  </Button>
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
              <div className="h-14 border-b flex items-center px-6 justify-between">
                <h3 className="font-medium text-lg capitalize">{activeTab}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 relative">
                <ScrollArea className="h-full w-full">
                  <div className="p-6 max-w-3xl mx-auto">
                    {activeTab === 'general' && (
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Generation Defaults
                          </h3>
                          <div className="grid gap-6 p-4 border bg-card">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="steps" className="text-right">
                                Default Steps
                              </Label>
                              <Input
                                id="steps"
                                type="number"
                                value={defaultSteps}
                                onChange={(e) =>
                                  setDefaultSteps(parseInt(e.target.value))
                                }
                                className="col-span-3 max-w-[200px]"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="cfg" className="text-right">
                                Default CFG
                              </Label>
                              <Input
                                id="cfg"
                                type="number"
                                value={defaultCfg}
                                onChange={(e) =>
                                  setDefaultCfg(parseFloat(e.target.value))
                                }
                                className="col-span-3 max-w-[200px]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Behavior
                          </h3>
                          <div className="space-y-4 p-4 border bg-card">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label htmlFor="autosave">
                                  Auto-save generations
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Automatically save completed generations to
                                  the gallery
                                </p>
                              </div>
                              <Switch
                                id="autosave"
                                checked={autoSave}
                                onCheckedChange={setAutoSave}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label htmlFor="notifications">
                                  Notifications
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Show toast notifications when generations
                                  complete
                                </p>
                              </div>
                              <Switch
                                id="notifications"
                                checked={notifications}
                                onCheckedChange={setNotifications}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'workflows' && (
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
                                  {selectedWorkflow.description ||
                                    'No description provided'}
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
                            {workflows.map((w) => {
                              const isHidden = hiddenWorkflows.includes(
                                String(w.id),
                              )
                              return (
                                <div
                                  key={w.id}
                                  className={cn(
                                    'flex items-center justify-between p-3 border transition-all',
                                    selectedWorkflow?.id === w.id
                                      ? 'border-primary bg-primary/5'
                                      : 'hover:bg-muted/50',
                                    isHidden && 'opacity-60 bg-muted/30',
                                  )}
                                >
                                  <div
                                    className="flex-1 min-w-0 mr-4"
                                    onClick={() => selectWorkflow(w)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium truncate">
                                        {w.name}
                                      </span>
                                      {isHidden && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
                                          Hidden
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {w.description || 'No description'}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleWorkflowVisibility(w.id)
                                      }}
                                      title={
                                        isHidden
                                          ? 'Show workflow'
                                          : 'Hide workflow'
                                      }
                                    >
                                      {isHidden ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                    {selectedWorkflow?.id !== w.id && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => selectWorkflow(w)}
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
                    )}

                    {activeTab === 'plugins' && (
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
                          {Object.values(plugins).map((plugin) => {
                            const isActive = activePlugins.includes(plugin.id)
                            return (
                              <div
                                key={plugin.id}
                                className="p-4 border  bg-card space-y-4"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">
                                        {plugin.name}
                                      </h4>
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
                                      if (checked) activatePlugin(plugin.id)
                                      else deactivatePlugin(plugin.id)
                                    }}
                                  />
                                </div>

                                {/* Reset Panels Button */}
                                {plugin.components &&
                                  plugin.components.length > 0 && (
                                    <div className="flex justify-end pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleResetPanels(plugin)
                                        }
                                      >
                                        Reset Panels
                                      </Button>
                                    </div>
                                  )}

                                {/* Plugin Settings */}
                                {isActive && plugin.settings ? (
                                  <div className="pt-4 border-t space-y-4">
                                    {plugin.settings.map((setting) => {
                                      const value =
                                        pluginSettings[plugin.id]?.[
                                          setting.key
                                        ] ?? setting.defaultValue

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
                                                updatePluginSetting(
                                                  plugin.id,
                                                  setting.key,
                                                  checked,
                                                )
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
                                              onChange={(e) =>
                                                updatePluginSetting(
                                                  plugin.id,
                                                  setting.key,
                                                  e.target.value,
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
                                                updatePluginSetting(
                                                  plugin.id,
                                                  setting.key,
                                                  val,
                                                )
                                              }
                                            >
                                              <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select option" />
                                              </SelectTrigger>
                                              <SelectContent
                                                side="top"
                                                position="popper"
                                              >
                                                {setting.options?.map((opt) => (
                                                  <SelectItem
                                                    key={opt.value}
                                                    value={opt.value}
                                                  >
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
                                              onClick={() =>
                                                setting.action?.(api)
                                              }
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
                      </div>
                    )}

                    {activeTab === 'personalization' && (
                      <div className="space-y-8">
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
                                  onChange={(e) =>
                                    setBackgroundImage(e.target.value)
                                  }
                                  placeholder="https://example.com/image.jpg"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setIsImageSelectorOpen(true)}
                                  title="Select from Library"
                                >
                                  <ImageIcon className="h-4 w-4" />
                                </Button>
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
                              <p className="text-xs text-muted-foreground">
                                URL to an image to use as background.
                              </p>
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
                                onValueChange={([val]) =>
                                  setBackgroundOpacity(val)
                                }
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
                                onValueChange={([val]) =>
                                  setBackgroundBlur(val)
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Theme
                          </h3>
                          <div className="grid gap-6 p-4 border bg-card">
                            <div className="space-y-2">
                              <Label>Color Scheme</Label>
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {Object.entries(themes).map(([key, theme]) => {
                                  const isActive = themeColor === key
                                  return (
                                    <Button
                                      key={key}
                                      variant="outline"
                                      className={cn(
                                        'justify-start gap-2',
                                        isActive &&
                                          'border-primary ring-1 ring-primary',
                                      )}
                                      onClick={() => setThemeColor(key)}
                                    >
                                      <span
                                        className="h-4 w-4 rounded-full"
                                        style={{
                                          background: theme.activeColor.light,
                                        }}
                                      />
                                      <span className="text-xs">
                                        {theme.name}
                                      </span>
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'interface' && (
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
                                onChange={(e) =>
                                  setGenerateText(e.target.value)
                                }
                                className="col-span-3 max-w-[300px]"
                                placeholder="Generate"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="gen-theme" className="text-right">
                                Theme
                              </Label>
                              <Select
                                value={generateTheme}
                                onValueChange={setGenerateTheme}
                              >
                                <SelectTrigger className="col-span-3 max-w-[300px]">
                                  <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">
                                    Default (Primary)
                                  </SelectItem>
                                  <SelectItem value="amber">
                                    Amber (Creative)
                                  </SelectItem>
                                  <SelectItem value="blue">
                                    Blue (Professional)
                                  </SelectItem>
                                  <SelectItem value="green">
                                    Green (Go)
                                  </SelectItem>
                                  <SelectItem value="purple">
                                    Purple (Magic)
                                  </SelectItem>
                                  <SelectItem value="rose">
                                    Rose (Passion)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Layout
                          </h3>
                          <div className="p-4 border  bg-card text-sm text-muted-foreground">
                            More layout options coming soon.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ImageSelectorDialog
        open={isImageSelectorOpen}
        onOpenChange={setIsImageSelectorOpen}
        onSelect={(image) => {
          if (image.url) {
            setBackgroundImage(image.url)
          } else if (image.id) {
            // Fallback if URL is missing, usually not needed if promptImage structure holds
            setBackgroundImage(`/api/v1/images/${image.id}/file`)
          }
        }}
      />
    </>
  )
}
