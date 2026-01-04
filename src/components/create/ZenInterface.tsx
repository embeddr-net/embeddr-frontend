import React, { useEffect, useState } from 'react'
import { EmbeddrProvider } from '@embeddr/react-ui'
import { toast } from 'sonner'
import {
  ZenImageBrowser,
  ZenQueue,
  ZenSettings,
  ZenSettingsDialog,
  ZenToolbar,
  ZenToolbox,
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

// New Components

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

  const [panels, setPanels] = useLocalStorage('zen-panels-state', {
    settings: false,
    queue: false,
    toolbox: false,
    images: false,
  })

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
    if (Object.keys(panels).includes(key)) {
      setPanels((prev) => ({
        ...prev,
        [key]: !prev[key as keyof typeof panels],
      }))
    }
  }

  const setPanel = (key: string, value: boolean) => {
    if (Object.keys(panels).includes(key)) {
      setPanels((prev) => ({
        ...prev,
        [key]: value,
      }))
    }
  }

  const handleImageSelect = (image: any) => {
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

  // Filter zen inputs
  const zenInputs = React.useMemo(() => {
    if (!selectedWorkflow?.meta?.exposed_inputs) return []
    const inputs = Array.isArray(selectedWorkflow.meta.exposed_inputs)
      ? selectedWorkflow.meta.exposed_inputs
      : []
    return inputs.filter((i: any) => i.zen_enabled && i.enabled)
  }, [selectedWorkflow])

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

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      api.events.off('zen:generate', handleZenGenerate)
    }
  }, [selectedWorkflow, api.events])

  return (
    <EmbeddrProvider api={api}>
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

      <ZenSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        hiddenWorkflows={hiddenWorkflows}
        setHiddenWorkflows={setHiddenWorkflows}
      />

      <ZenToolbox
        isOpen={panels.toolbox}
        onClose={() => togglePanel('toolbox')}
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
      />

      <ZenSettings
        isOpen={panels.settings}
        onClose={() => togglePanel('settings')}
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
        isOpen={panels.queue}
        onClose={() => togglePanel('queue')}
        generations={generations}
        selectedGenerationId={selectedGeneration?.id || null}
        selectGeneration={selectGeneration}
      />

      <ZenImageBrowser
        isOpen={panels.images}
        onClose={() => togglePanel('images')}
        activeImageInput={activeImageInput}
        onSelect={handleImageSelect}
      />

      {/* Overlay Plugins (e.g. Generate Button) */}
      {getComponents('zen-overlay').map(({ pluginId, def }) => {
        const Component = def.component
        const isOpen = openPlugins[`${pluginId}-${def.id}`] ?? true
        const pluginApi = extendApiForPlugin(api, pluginId)

        return (
          <DraggablePanel
            key={`${pluginId}-${def.id}`}
            id={`plugin-${pluginId}-${def.id}`}
            title={def.label}
            isOpen={isOpen}
            onClose={() =>
              setOpenPlugins((prev) => ({
                ...prev,
                [`${pluginId}-${def.id}`]: false,
              }))
            }
            defaultPosition={def.defaultPosition || { x: 100, y: 100 }}
            defaultSize={def.defaultSize || { width: 300, height: 200 }}
            className="absolute"
            hideHeader={def.options?.hideHeader}
            transparent={def.options?.transparent}
          >
            <Component api={pluginApi} />
          </DraggablePanel>
        )
      })}
    </EmbeddrProvider>
  )
}
