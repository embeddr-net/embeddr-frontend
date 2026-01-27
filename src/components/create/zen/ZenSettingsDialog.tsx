import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Layout,
  Library,
  Palette,
  Plug,
  Settings,
  Sliders,
  FileText,
  Info,
  Zap,
  Leaf,
  Workflow as WorkflowIcon,
  X as XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import { useGeneration } from '@/context/GenerationContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useSettingsStore } from '@/store/settingsStore'
import { themes } from '@/lib/themes'
import { useEmbeddrAPI, usePluginStore } from '@/plugins/store'
import {
  ZenAutomationTab,
  ZenGeneralTab,
  ZenInterfaceTab,
  ZenLibraryTab,
  ZenLotusTab,
  ZenLogsTab,
  ZenPersonalizationTab,
  ZenPluginsTab,
  ZenSystemTab,
  ZenUploadTab,
  ZenWorkflowsTab,
} from '@/components/settings/zen/ZenSettingsTabs'

interface ZenSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hiddenWorkflows: Array<string>
  setHiddenWorkflows: (workflows: Array<string>) => void
  activeTab?: string
  onActiveTabChange?: (tab: string) => void
}

export function ZenSettingsDialog({
  open,
  onOpenChange,
  hiddenWorkflows,
  setHiddenWorkflows,
  activeTab: controlledTab,
  onActiveTabChange,
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

  // Generate Button Settings
  const [generateText, setGenerateText] = useLocalStorage(
    'zen-generate-text',
    'Generate',
  )
  const [generateTheme, setGenerateTheme] = useLocalStorage(
    'zen-generate-theme',
    'default',
  )

  const [activeTab, setActiveTab] = useState(controlledTab || 'general')
  const currentTab = controlledTab ?? activeTab
  const setCurrentTab = onActiveTabChange ?? setActiveTab

  useEffect(() => {
    if (controlledTab) {
      setActiveTab(controlledTab)
    }
  }, [controlledTab])

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
        <DialogContent className="max-w-[90vw] w-300 h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex h-full">
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
                    variant={currentTab === 'general' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('general')}
                  >
                    <Sliders className="mr-2 h-4 w-4" />
                    General
                  </Button>
                  <Button
                    variant={currentTab === 'workflows' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('workflows')}
                  >
                    <WorkflowIcon className="mr-2 h-4 w-4" />
                    Workflows
                  </Button>
                  <Button
                    variant={currentTab === 'library' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('library')}
                  >
                    <Library className="mr-2 h-4 w-4" />
                    Library
                  </Button>
                  <Button
                    variant={currentTab === 'upload' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('upload')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <Button
                    variant={currentTab === 'plugins' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('plugins')}
                  >
                    <Plug className="mr-2 h-4 w-4" />
                    Plugins
                  </Button>
                  <Button
                    variant={currentTab === 'lotus' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('lotus')}
                  >
                    <Leaf className="mr-2 h-4 w-4" />
                    Lotus
                  </Button>
                  <Button
                    variant={
                      currentTab === 'automation' ? 'secondary' : 'ghost'
                    }
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('automation')}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Ingestion Pipeline
                  </Button>
                  <Button
                    variant={currentTab === 'system' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('system')}
                  >
                    <Info className="mr-2 h-4 w-4" />
                    System Info
                  </Button>
                  <Button
                    variant={
                      currentTab === 'personalization' ? 'secondary' : 'ghost'
                    }
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('personalization')}
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    Personalization
                  </Button>
                  <Button
                    variant={currentTab === 'interface' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('interface')}
                  >
                    <Layout className="mr-2 h-4 w-4" />
                    Interface
                  </Button>
                  <Button
                    variant={currentTab === 'logs' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTab('logs')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Logs
                  </Button>
                </nav>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-background">
              <div className="h-14 border-b flex items-center px-6 justify-between">
                <h3 className="font-medium text-lg capitalize">{currentTab}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 relative flex">
                <div className="flex-1 min-h-0">
                  {currentTab === 'general' && <ZenGeneralTab />}
                  {currentTab === 'workflows' && (
                    <ZenWorkflowsTab
                      workflows={workflows}
                      selectedWorkflow={selectedWorkflow}
                      hiddenWorkflows={hiddenWorkflows}
                      onSelectWorkflow={selectWorkflow}
                      onToggleHidden={toggleWorkflowVisibility}
                    />
                  )}
                  {currentTab === 'library' && <ZenLibraryTab />}
                  {currentTab === 'upload' && <ZenUploadTab />}
                  {currentTab === 'plugins' && (
                    <ZenPluginsTab
                      plugins={plugins}
                      activePlugins={activePlugins}
                      pluginSettings={pluginSettings}
                      onActivate={activatePlugin}
                      onDeactivate={deactivatePlugin}
                      onResetPanels={handleResetPanels}
                      onUpdateSetting={updatePluginSetting}
                      api={api}
                    />
                  )}
                  {currentTab === 'lotus' && <ZenLotusTab />}
                  {currentTab === 'automation' && <ZenAutomationTab />}
                  {currentTab === 'system' && <ZenSystemTab />}
                  {currentTab === 'personalization' && (
                    <ZenPersonalizationTab />
                  )}
                  {currentTab === 'interface' && (
                    <ZenInterfaceTab
                      generateText={generateText}
                      generateTheme={generateTheme}
                      onGenerateTextChange={setGenerateText}
                      onGenerateThemeChange={setGenerateTheme}
                    />
                  )}
                  {currentTab === 'logs' && <ZenLogsTab />}
                </div>
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
            setBackgroundImage(`/api/v1/images/${image.id}/file`)
          }
        }}
      />
    </>
  )
}
