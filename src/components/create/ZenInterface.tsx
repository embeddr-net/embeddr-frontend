import React, { useEffect, useState } from 'react'
import { Button, EmbeddrProvider } from '@embeddr/react-ui'
import { toast } from 'sonner'
import {
  ZenImageBrowser,
  ZenQueue,
  ZenSettings,
  ZenSettingsDialog,
  ZenToolbar,
  ZenToolbox,
  // ZenDatasetPanel,
} from './zen'
import { useGeneration } from '@/context/GenerationContext'
import { useGlobalStore } from '@/store/globalStore'
import {
  extendApiForPlugin,
  useEmbeddrAPI,
  usePluginStore,
} from '@/plugins/store'
import { usePanelStore } from '@/store/panelStore'
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

// New Components

// Logic component to sync plugin state with window store
// function PluginWindowRegistration({
//   pluginId,
//   def,
// }: {
//   pluginId: string
//   def: any
// }) {
//   useEffect(() => {
//     // Register component for WindowManager
//     const fullId = `${pluginId}-${def.id}`
//     registerWindowComponent(fullId, def.component)
//   }, [pluginId, def.id, def.component])

//   return null
// }

interface ZenInterfaceProps {
  leftSidebarOpen: boolean
  setLeftSidebarOpen: (open: boolean) => void
  rightSidebarOpen: boolean
  setRightSidebarOpen: (open: boolean) => void
}

export function ZenInterface({
  setLeftSidebarOpen,
  setRightSidebarOpen,
}: ZenInterfaceProps) {
  const {
    generate,
    isGenerating,
    selectedWorkflow,
    workflowInputs,
    setWorkflowInput,
    generations,
    selectGeneration,
    selectedGeneration,
    workflows,
    selectWorkflow,
  } = useGeneration()

  const { selectedImage, selectImage } = useGlobalStore()
  const { setActivePanel } = usePanelStore()

  // Plugin System
  const api = useEmbeddrAPI()
  const { getComponents, getActions } = usePluginStore()

  console.log(
    '[ZenInterface] Rendered with selectedWorkflow:',
    selectedWorkflow,
  )
  console.log(usePluginStore.getState().activatePlugin)
  console.log(usePluginStore.getState().knownPlugins)
  console.log(Object.keys(usePluginStore.getState().plugins))

  console.log(
    '[ZenInterface] overlay components:',
    usePluginStore.getState().getComponents('zen-overlay'),
  )
  console.log(
    '[ZenInterface] window components:',
    usePluginStore.getState().getComponents('window'),
  )

  const winComps = usePluginStore.getState().getComponents('window')

  console.log(
    '[ZenInterface] window defs:',
    winComps.map((c) => ({
      pluginId: c.pluginId,
      defId: c.def?.id,
      exportName: c.def?.exportName,
      location: c.def?.location,
      componentId: `${c.pluginId}-${c.def?.id}`,
    })),
  )
  // Global click handler to clear active panel
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isPanel = target.closest('.embeddr-draggable-panel')
      if (!isPanel) {
        setActivePanel(null)
      }
    }

    window.addEventListener('mousedown', handleGlobalClick)
    return () => window.removeEventListener('mousedown', handleGlobalClick)
  }, [setActivePanel])

  const {
    windows: storeWindows,
    minimizeWindow,
    restoreWindow,
    openWindow,
    closeWindow,
    showZenToolbar, // Use store state
  } = useWindowStore()

  // Derive panels state from window store
  const panels = {
    settings:
      !!storeWindows['zen-settings'] &&
      !storeWindows['zen-settings'].isMinimized,
    queue:
      !!storeWindows['zen-queue'] && !storeWindows['zen-queue'].isMinimized,
    toolbox:
      !!storeWindows['zen-toolbox'] && !storeWindows['zen-toolbox'].isMinimized,
    images:
      !!storeWindows['zen-images'] && !storeWindows['zen-images'].isMinimized,
    datasets:
      !!storeWindows['zen-datasets'] &&
      !storeWindows['zen-datasets'].isMinimized,
  }

  const [seedModes, setSeedModes] = useLocalStorage<
    Record<string, 'fixed' | 'increment' | 'randomize'>
  >('zen-seed-modes', {})

  const [workflowSearch, setWorkflowSearch] = useState('')
  const [generateOnChange, setGenerateOnChange] = useState(false)
  const [activeImageInput, setActiveImageInput] = useState<{
    nodeId: string
    field: string
  } | null>(null)

  const [openPlugins, setOpenPlugins] = useLocalStorage<
    Record<string, boolean>
  >('zen-open-plugins', {})

  const [hiddenWorkflows, setHiddenWorkflows] = useLocalStorage<Array<string>>(
    'zen-hidden-workflows',
    [],
  )

  const [pinnedWorkflows, setPinnedWorkflows] = useLocalStorage<Array<string>>(
    'zen-pinned-workflows',
    [],
  )

  const [notifications] = useLocalStorage('zen-notifications', true)
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

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  const togglePanel = (key: string) => {
    // If it's a window-managed panel, use the window store
    if (['toolbox', 'settings', 'queue', 'images', 'datasets'].includes(key)) {
      const windowId = `zen-${key}`
      const win = storeWindows[windowId]
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
        })
      } else if (win.isMinimized) {
        restoreWindow(windowId)
      } else {
        closeWindow(windowId)
      }
      return
    }
  }

  const setPanel = (key: string, value: boolean) => {
    if (['toolbox', 'settings', 'queue', 'images', 'datasets'].includes(key)) {
      const windowId = `zen-${key}`
      const win = storeWindows[windowId]
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

  const handleGenerate = async () => {
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
  }

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

  return (
    <EmbeddrProvider api={api}>
      {/* <Button
        onClick={() => {
          console.log('Hello')
          api.windows.spawn('embeddr-llm-llm-artifact', 'Artifact test', {
            artifactId: '3750283b-c854-4e7d-bd46-973ee9d48983',
            pluginId: 'embeddr-llm',
          })
        }}
      >
        Spawn LLM Artifact Window
      </Button> */}
      {showZenToolbar && (
        <ZenToolbar
          panels={panels}
          togglePanel={togglePanel}
          isGenerating={isGenerating}
          handleGenerate={handleGenerate}
          selectedWorkflow={selectedWorkflow}
          hasPendingGenerations={generations.some(
            (g) => g.status === 'pending' || g.status === 'processing',
          )}
          hasZenInputs={zenInputs.length > 0}
          onExitZenMode={() => {
            setLeftSidebarOpen(true)
            setRightSidebarOpen(true)
          }}
          onOpenSettingsDialog={() => setSettingsDialogOpen(true)}
        />
      )}

      <ZenSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        hiddenWorkflows={hiddenWorkflows}
        setHiddenWorkflows={setHiddenWorkflows}
      />

      <ZenToolbox
        workflows={workflows}
        selectedWorkflow={selectedWorkflow}
        selectWorkflow={selectWorkflow}
        workflowSearch={workflowSearch}
        setWorkflowSearch={setWorkflowSearch}
        getComponents={getComponents}
        getActions={getActions}
        api={api}
        openPlugins={openPlugins}
        setOpenPlugins={setOpenPlugins}
        hiddenWorkflows={hiddenWorkflows}
        setHiddenWorkflows={setHiddenWorkflows}
        pinnedWorkflows={pinnedWorkflows}
        setPinnedWorkflows={setPinnedWorkflows}
      />

      <ZenSettings
        selectedImage={selectedImage}
        handleUseGlobalImage={handleUseGlobalImage}
        selectImage={selectImage}
        zenInputs={zenInputs}
        workflowInputs={workflowInputs}
        activeImageInput={activeImageInput}
        setActiveImageInput={setActiveImageInput}
        togglePanel={togglePanel}
        setPanel={setPanel}
        seedModes={seedModes}
        setSeedModes={setSeedModes}
        setWorkflowInput={setWorkflowInput}
      />

      <ZenQueue
        generations={generations}
        selectedGenerationId={selectedGeneration?.id || null}
        selectGeneration={selectGeneration}
        onRepeat={handleRepeat}
      />

      <ZenImageBrowser
        activeImageInput={activeImageInput}
        onSelect={handleImageSelect}
        onMultiSelect={handleMultiSelect}
      />

      {/* <ZenDatasetPanel /> */}

      {/* Plugin Registration */}
      <PluginWindowBootstrap />
      <PanelManager />
    </EmbeddrProvider>
  )
}
