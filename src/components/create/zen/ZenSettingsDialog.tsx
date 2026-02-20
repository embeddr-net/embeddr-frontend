import React, { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Dialog, DialogContent } from '@embeddr/react-ui/components/ui'
import { ScrollArea } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import { ArrowUpRight, Settings, X as XIcon } from 'lucide-react'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import {
  settingsConfig,
  getTabById,
} from '@/components/settings/settingsConfig'

interface ZenSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab?: string
  onActiveTabChange?: (tab: string) => void
}

export function ZenSettingsDialog({
  open,
  onOpenChange,
  activeTab: controlledTab,
  onActiveTabChange,
}: ZenSettingsDialogProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(controlledTab || 'profile')
  const currentTab = controlledTab ?? activeTab
  const setCurrentTab = onActiveTabChange ?? setActiveTab
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false)

  // Sync internal state if controlled prop changes
  useEffect(() => {
    if (controlledTab) {
      setActiveTab(controlledTab)
    }
  }, [controlledTab])

  useEffect(() => {
    if (!open) return
    if (getTabById(currentTab)) return
    setCurrentTab('profile')
  }, [open, currentTab, setCurrentTab])

  const activeTabConfig = getTabById(currentTab) ?? getTabById('profile')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] w-300 h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex h-full">
            <div className="w-64 border-r bg-muted/30 flex flex-col overflow-y-auto">
              <div className="p-6 border-b shrink-0 sticky top-0 bg-muted/30 backdrop-blur-sm z-10">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </h2>
              </div>
              <div className="flex-1 py-4 px-2 space-y-6">
                {settingsConfig.map((section, idx) => (
                  <div key={idx} className="space-y-1">
                    {section.label && (
                      <h4 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-70">
                        {section.label}
                      </h4>
                    )}
                    {section.items.map((item) => (
                      <Button
                        key={item.id}
                        variant={currentTab === item.id ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start h-9"
                        onClick={() => setCurrentTab(item.id)}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </span>
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-background rounded-md">
              <div className="h-14 border-b flex items-center px-6 justify-between shrink-0">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  {activeTabConfig?.icon}
                  {activeTabConfig?.label}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tab = activeTabConfig?.id ?? 'profile'
                      onOpenChange(false)
                      navigate({ to: '/settings', search: { tab } })
                    }}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Open full settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 relative flex">
                <ScrollArea className="flex-1 min-h-0 h-full w-full">
                  {activeTabConfig?.component}
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ImageSelectorDialog
        open={isImageSelectorOpen}
        onOpenChange={setIsImageSelectorOpen}
        onSelect={(_image) => {
          // handled inside components via store now usually
          // keeping this dialog logic if needed for deeper integrations
        }}
      />
    </>
  )
}
