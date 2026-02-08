import React, { useEffect, useState } from 'react'
import { Button } from '@embeddr/react-ui'
import { Spinner } from '@embeddr/react-ui/components/spinner'
import { EmbeddrProvider } from '@embeddr/zen-shell'
import { toast } from 'sonner'
import {
  ZenImageBrowser,
  ZenQueue,
  ZenSettings,
  ZenToolbox,
  // ZenDatasetPanel,
} from './zen'
import { useGeneration } from '@/context/GenerationContext'
import {
  Box,
  Database,
  Image as ImageIcon,
  List,
  Settings2,
} from 'lucide-react'
import { useCommandBarStore } from '@/store/commandBarStore'
import { useGlobalStore } from '@/store/globalStore'
import {
  extendApiForPlugin,
  useEmbeddrAPI,
  usePluginStore,
} from '@/plugins/store'
import { usePanelStore } from '@/store/panelStore'
import { useUserStore } from '@/store/userStore'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { BACKEND_URL } from '@/lib/api/config'
import { DraggablePanel } from '@/components/ui/DraggablePanel'
import { useWindowStore } from '@/store/windowStore'
import {
  windowRegistry,
  registerWindowComponent,
} from '@/components/ui/windowRegistry'
import { PanelManager } from '@/components/ui/PanelManager'
import { PluginWindowBootstrap } from '@/plugins/PluginWindowBootstrap'
import { ZenEffectsLayer } from '@/components/create/zen/ZenEffectsLayer'
import { useLotus } from '@/providers/LotusProvider'
import { useNavigate, useRouterState } from '@tanstack/react-router'

// ... existing imports

interface ZenInterfaceProps {
  leftSidebarOpen: boolean
  setLeftSidebarOpen: (open: boolean) => void
  rightSidebarOpen: boolean
  setRightSidebarOpen: (open: boolean) => void
}

export function ZenInterface(_props: ZenInterfaceProps) {
  const {
    generate,
    isGenerating,
    selectedWorkflow,
    workflowInputs,
    setWorkflowInput,
    generations,
    selectGeneration,
    workflows,
    selectWorkflow,
  } = useGeneration()

  const { selectedImage, selectImage } = useGlobalStore()
  const navigate = useNavigate()
  const setActivePanel = usePanelStore((s) => s.setActivePanel)
  const activePanelId = usePanelStore((s) => s.activePanelId)

  // Plugin System
  const api = useEmbeddrAPI()
  const getComponents = usePluginStore((s) => s.getComponents)
  const getActions = usePluginStore((s) => s.getActions)
  const isLoadingExternal = usePluginStore((s) => s.isLoadingExternal)
  const hasLoadedExternal = usePluginStore((s) => s.hasLoadedExternal)

  // Debug logging - kept but stabilized
  const overlayComps = getComponents('zen-overlay')
  const windowComps = getComponents('window')

  useEffect(() => {
    /* ... existing logging ... */
  }, [selectedWorkflow, overlayComps, windowComps])

  // Global click handler to clear active panel
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isPanel = target.closest('.embeddr-draggable-panel')
      if (!isPanel && activePanelId !== null) {
        setActivePanel(null)
      }
    }

    window.addEventListener('mousedown', handleGlobalClick)
    return () => window.removeEventListener('mousedown', handleGlobalClick)
  }, [setActivePanel, activePanelId])

  const minimizeWindow = useWindowStore((s) => s.minimizeWindow)
  const restoreWindow = useWindowStore((s) => s.restoreWindow)
  const openWindow = useWindowStore((s) => s.openWindow)
  const closeWindow = useWindowStore((s) => s.closeWindow)
  const updateWindow = useWindowStore((s) => s.updateWindow)
  const showZenToolbar = useWindowStore((s) => s.showZenToolbar)

  // Derive panels state from window store - use per-field selectors to avoid getSnapshot warnings
  const settingsOpen = useWindowStore(
    (s) =>
      !!s.windows['zen-settings'] && !s.windows['zen-settings'].isMinimized,
  )
  const queueOpen = useWindowStore(
    (s) => !!s.windows['zen-queue'] && !s.windows['zen-queue'].isMinimized,
  )
  const toolboxOpen = useWindowStore(
    (s) => !!s.windows['zen-toolbox'] && !s.windows['zen-toolbox'].isMinimized,
  )
  const imagesOpen = useWindowStore(
    (s) => !!s.windows['zen-images'] && !s.windows['zen-images'].isMinimized,
  )
  const datasetsOpen = useWindowStore(
    (s) =>
      !!s.windows['zen-datasets'] && !s.windows['zen-datasets'].isMinimized,
  )

  const panels = React.useMemo(
    () => ({
      settings: settingsOpen,
      queue: queueOpen,
      toolbox: toolboxOpen,
      images: imagesOpen,
      datasets: datasetsOpen,
    }),
    [settingsOpen, queueOpen, toolboxOpen, imagesOpen, datasetsOpen],
  )

  const emptySeedModes = React.useMemo(() => ({}), [])
  const [seedModes, setSeedModes] = useLocalStorage<
    Record<string, 'fixed' | 'increment' | 'randomize'>
  >('zen-seed-modes', emptySeedModes)

  const [workflowSearch, setWorkflowSearch] = useState('')
  const [generateOnChange, setGenerateOnChange] = useState(false)
  const [activeImageInput, setActiveImageInput] = useState<{
    nodeId: string
    field: string
  } | null>(null)

  const emptyOpenPlugins = React.useMemo(() => ({}), [])
  const [openPlugins, setOpenPlugins] = useLocalStorage<
    Record<string, boolean>
  >('zen-open-plugins', emptyOpenPlugins)

  const {
    hiddenWorkflows,
    setHiddenWorkflows,
    pinnedWorkflows,
    setPinnedWorkflows,
    setSettingsOpen,
    setSettingsTab,
  } = useLotus()

  const [notifications] = useLocalStorage('zen-notifications', true)
  const [onboardingDismissed] = useLocalStorage(
    'zen-onboarding-dismissed',
    false,
  )
  const { apiKey } = useUserStore()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const wasGenerating = React.useRef(isGenerating)
  const lastToastTime = React.useRef(0)

  useEffect(() => {
    if (wasGenerating.current && !isGenerating && notifications === true) {
      const now = Date.now()
      if (now - lastToastTime.current > 2000) {
        toast.success('Generation complete!')
        lastToastTime.current = now
      }
    }
    wasGenerating.current = isGenerating
  }, [isGenerating, notifications])

  useEffect(() => {
    if (onboardingDismissed) return
    if (!apiKey) return
    if (pathname !== '/') return
    let cancelled = false
    const checkArtifacts = async () => {
      try {
        const res = await api.artifacts.list({ limit: 1, offset: 0 })
        const count =
          (res?.items && res.items.length) ||
          (res as any)?.total ||
          (res as any)?.count ||
          0
        if (!cancelled && count === 0) {
          navigate({ to: '/onboarding' })
        }
      } catch (err) {
        console.warn('[Onboarding] Failed to check artifacts', err)
      }
    }
    checkArtifacts()
    return () => {
      cancelled = true
    }
  }, [api, apiKey, onboardingDismissed, navigate, pathname])

  const toolboxWindowProps = React.useMemo(
    () => ({
      workflows,
      selectedWorkflow,
      selectWorkflow,
      workflowSearch,
      setWorkflowSearch,
      getComponents,
      getActions,
      api,
      openPlugins,
      setOpenPlugins,
      hiddenWorkflows,
      setHiddenWorkflows,
      pinnedWorkflows,
      setPinnedWorkflows,
    }),
    [
      workflows,
      selectedWorkflow,
      selectWorkflow,
      workflowSearch,
      setWorkflowSearch,
      getComponents,
      getActions,
      api,
      openPlugins,
      setOpenPlugins,
      hiddenWorkflows,
      setHiddenWorkflows,
      pinnedWorkflows,
      setPinnedWorkflows,
    ],
  )

  React.useEffect(() => {
    registerWindowComponent('core-toolbox', ZenToolbox)
  }, [])

  React.useEffect(() => {
    const win = useWindowStore.getState().windows['zen-toolbox']
    if (!win) return
    updateWindow('zen-toolbox', {
      props: { ...win.props, ...toolboxWindowProps },
    })
  }, [toolboxWindowProps, updateWindow])

  const togglePanel = React.useCallback(
    (key: string) => {
      // If it's a window-managed panel, use the window store
      if (
        ['toolbox', 'settings', 'queue', 'images', 'datasets'].includes(key)
      ) {
        const windowId = `zen-${key}`
        const win = useWindowStore.getState().windows[windowId]
        if (!win) {
          const titles: Record<string, string> = {
            toolbox: 'Toolbox',
            settings: 'Settings',
            queue: 'Queue',
            images: 'Images',
            datasets: 'Datasets',
          }
          openWindow({
            id: windowId,
            title: titles[key],
            componentId: `core-${key === 'images' ? 'image-browser' : key}`,
            props: key === 'toolbox' ? toolboxWindowProps : undefined,
          })
        } else if (win.isMinimized) {
          restoreWindow(windowId)
        } else {
          closeWindow(windowId)
        }
        return
      }
    },
    [openWindow, restoreWindow, closeWindow, toolboxWindowProps],
  )

  const setPanel = (key: string, value: boolean) => {
    if (['toolbox', 'settings', 'queue', 'images', 'datasets'].includes(key)) {
      const windowId = `zen-${key}`
      const win = useWindowStore.getState().windows[windowId]
      if (value) {
        if (!win) {
          const titles: Record<string, string> = {
            toolbox: 'Toolbox',
            settings: 'Settings',
            queue: 'Queue',
            images: 'Images',
            datasets: 'Datasets',
          }
          openWindow({
            id: windowId,
            title: titles[key],
            componentId: `core-${key === 'images' ? 'image-browser' : key}`,
            props: key === 'toolbox' ? toolboxWindowProps : undefined,
          })
        } else {
          restoreWindow(windowId)
        }
      } else {
        if (win) {
          minimizeWindow(windowId)
        }
      }
      return
    }
  }

  const handleImageSelect = (image: any) => {
    selectImage(image)
    if (activeImageInput) {
      if (activeImageInput.field === 'image_id') {
        setWorkflowInput(
          activeImageInput.nodeId,
          activeImageInput.field,
          image.id,
        )
      } else {
        setWorkflowInput(
          activeImageInput.nodeId,
          activeImageInput.field,
          `${BACKEND_URL}/images/${image.id}/file`,
        )
      }
      // Also set preview if needed
      setWorkflowInput(
        activeImageInput.nodeId,
        '_preview',
        `${BACKEND_URL}/images/${image.id}/file`,
      )

      if (generateOnChange) {
        generate({
          nodeId: activeImageInput.nodeId,
          field: activeImageInput.field,
          value:
            activeImageInput.field === 'image_id'
              ? image.id
              : `${BACKEND_URL}/images/${image.id}/file`,
        })
      }
    }
  }

  const handleMultiSelect = async (images: any[]) => {
    if (!activeImageInput) return

    toast.info(`Queueing ${images.length} generations...`)

    for (const image of images) {
      if (activeImageInput.field === 'image_id') {
        setWorkflowInput(
          activeImageInput.nodeId,
          activeImageInput.field,
          image.id,
        )
      } else {
        setWorkflowInput(
          activeImageInput.nodeId,
          activeImageInput.field,
          `${BACKEND_URL}/images/${image.id}/file`,
        )
      }
      // Also set preview
      setWorkflowInput(
        activeImageInput.nodeId,
        '_preview',
        `${BACKEND_URL}/images/${image.id}/file`,
      )

      // Trigger generation
      // We pass specific inputs to generate to ensure it uses the correct values
      // even if state update is batched (though zustand is usually sync)
      await generate()
    }
  }

  // Filter zen inputs
  const zenInputs = React.useMemo(() => {
    if (!selectedWorkflow?.meta?.exposed_inputs) return []
    const inputs = Array.isArray(selectedWorkflow.meta.exposed_inputs)
      ? selectedWorkflow.meta.exposed_inputs
      : []
    return inputs.filter((i: any) => i.zen_enabled && i.enabled)
  }, [selectedWorkflow])

  const handleRepeat = (gen: any) => {
    if (!gen.inputs) return
    Object.entries(gen.inputs).forEach(([nodeId, inputs]) => {
      if (typeof inputs === 'object' && inputs !== null) {
        Object.entries(inputs).forEach(([key, value]) => {
          setWorkflowInput(nodeId, key, value)
        })
      }
    })
    toast.success('Restored inputs from generation')
  }

  const handleGenerate = React.useCallback(async () => {
    // Process seeds
    zenInputs.forEach((input: any) => {
      const isSeed =
        input.label.toLowerCase().includes('seed') ||
        input.field === 'seed' ||
        input.field === 'noise_seed'

      if (isSeed) {
        const key = `${input.node_id}-${input.field}`
        const mode = seedModes[key] || 'randomize'
        const currentValue = workflowInputs[input.node_id]?.[input.field]

        if (mode === 'randomize') {
          const newSeed = Math.floor(Math.random() * 1000000000000000)
          setWorkflowInput(input.node_id, input.field, newSeed)
        } else if (mode === 'increment') {
          const current = parseInt(currentValue) || 0
          setWorkflowInput(input.node_id, input.field, current + 1)
        }
      }
    })

    generate()
  }, [zenInputs, seedModes, workflowInputs, setWorkflowInput, generate])

  const handleUseGlobalImage = () => {
    if (!selectedImage || !selectedWorkflow) return

    const imageInput = zenInputs.find(
      (i: any) =>
        i.type === 'image' ||
        i.type === 'image_id' ||
        i.field === 'image_url' ||
        i.field === 'image_id',
    )

    if (imageInput) {
      if (imageInput.type === 'image_id' || imageInput.field === 'image_id') {
        setWorkflowInput(imageInput.node_id, 'image_id', selectedImage.id)
      } else {
        setWorkflowInput(
          imageInput.node_id,
          imageInput.field,
          `${BACKEND_URL}/images/${selectedImage.id}/file`,
        )
      }

      setWorkflowInput(
        imageInput.node_id,
        '_preview',
        `${BACKEND_URL}/images/${selectedImage.id}/file`,
      )

      selectImage(null)
    }
  }

  // Handle keyboard shortcuts and events
  const handleGenerateRef = React.useRef(handleGenerate)
  useEffect(() => {
    handleGenerateRef.current = handleGenerate
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        if (selectedWorkflow) {
          handleGenerateRef.current()
        }
      }
    }

    const handleZenGenerate = () => {
      if (selectedWorkflow) {
        handleGenerateRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    api.events.on('zen:generate', handleZenGenerate)
    const handleOpenPlugin = ({
      id,
      state,
    }: {
      id: string
      state: boolean
    }) => {
      setOpenPlugins((prev) => ({ ...prev, [id]: state }))
    }
    api.events.on('zen:open-plugin', handleOpenPlugin)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      api.events.off('zen:generate', handleZenGenerate)
      api.events.off('zen:open-plugin', handleOpenPlugin)
    }
  }, [selectedWorkflow, api.events])

  const setPageControls = useCommandBarStore((s) => s.setPageControls)

  const pageControls = React.useMemo(() => {
    if (!showZenToolbar) return null
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={panels.toolbox ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-6 w-6"
          onClick={() => togglePanel('toolbox')}
          title="Toolbox"
        >
          <Box className="w-4 h-4" />
        </Button>
      </div>
    )
  }, [showZenToolbar, panels, togglePanel])

  useEffect(() => {
    setPageControls(pageControls)
    return () => setPageControls(null)
  }, [pageControls, setPageControls])

  const showZenLoader = isLoadingExternal || !hasLoadedExternal

  if (showZenLoader) {
    return (
      <EmbeddrProvider api={api}>
        <div className="fixed inset-0 z-[65] bg-background/70 backdrop-blur-sm">
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg"
              style={{
                marginTop: 'env(safe-area-inset-top)',
                marginRight: 'env(safe-area-inset-right)',
                marginBottom: 'env(safe-area-inset-bottom)',
                marginLeft: 'env(safe-area-inset-left)',
              }}
            >
              <Spinner className="size-5" />
              <div className="text-sm">Loading Zen workspace…</div>
            </div>
          </div>
        </div>
      </EmbeddrProvider>
    )
  }

  return (
    <EmbeddrProvider api={api}>
      <PluginWindowBootstrap />

      <ZenEffectsLayer />

      <div className="relative z-[50]">
        <PanelManager />
      </div>
    </EmbeddrProvider>
  )
}
