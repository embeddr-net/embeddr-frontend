import { useQuery } from '@tanstack/react-query'
import { Card } from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import { Slider } from '@embeddr/react-ui/components/slider'
import {
  ArrowDownToLine,
  Edit,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Save,
  Settings2,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Switch } from '@embeddr/react-ui/components/switch'
import { ImageIdInput } from './inputs/ImageIdInput'
import { BACKEND_URL } from '@/lib/api/config'
import { getObjectInfo } from '@/lib/api/endpoints/comfy'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import { useGeneration } from '@/context/GenerationContext'
import { useGlobalStore } from '@/store/globalStore'
import { useGenerationStore } from '@/store/generationStore'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { fetchLibraries } from '@/lib/api/endpoints/library'
import { fetchCollections } from '@/lib/api/endpoints/collections'
import { cn } from '@/lib/utils'

export function GenerationSettings() {
  const { data: libraries } = useQuery({
    queryKey: ['libraries'],
    queryFn: fetchLibraries,
  })

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  })

  const {
    workflows,
    selectedWorkflow,
    selectWorkflow,
    workflowInputs,
    setWorkflowInput,
    generate,
    isGenerating,
    isLoadingWorkflows,
    updateWorkflowMeta,
  } = useGeneration()

  const { selectedImage, selectImage } = useGlobalStore()
  const { quickWorkflowIds, toggleQuickWorkflow } = useGenerationStore()
  const [activeTab, setActiveTab] = useLocalStorage(
    'create-settings-tab',
    'parameters',
  )

  const [imageSelectorOpen, setImageSelectorOpen] = useState(false)
  const [activeImageInputId, setActiveImageInputId] = useState<string | null>(
    null,
  )
  const [mode, setMode] = useState<'run' | 'configure'>('run')
  const [exposedInputs, setExposedInputs] = useState<Array<any>>([])
  const [objectInfo, setObjectInfo] = useState<Record<string, any> | null>(null)

  // Fetch object info on mount
  useEffect(() => {
    getObjectInfo()
      .then(setObjectInfo)
      .catch((err) => console.error('Failed to fetch object info:', err))
  }, [])

  // Initialize exposed inputs from workflow meta
  useEffect(() => {
    if (selectedWorkflow) {
      const inputs = selectedWorkflow.meta?.exposed_inputs
      setExposedInputs(Array.isArray(inputs) ? inputs : [])
    }
  }, [selectedWorkflow])

  const handleSaveConfig = () => {
    if (selectedWorkflow) {
      updateWorkflowMeta(selectedWorkflow.id, {
        ...selectedWorkflow.meta,
        exposed_inputs: exposedInputs,
      })
      setMode('run')
    }
  }

  const toggleExposed = (
    nodeId: string,
    field: string,
    type: string,
    label: string,
  ) => {
    setExposedInputs((prev) => {
      const safePrev = Array.isArray(prev) ? prev : []
      const exists = safePrev.find(
        (i) => i.node_id === nodeId && i.field === field,
      )
      if (exists) {
        return safePrev.map((i) =>
          i.node_id === nodeId && i.field === field
            ? { ...i, enabled: !i.enabled }
            : i,
        )
      } else {
        return [
          ...safePrev,
          {
            node_id: nodeId,
            field,
            type,
            label,
            enabled: true,
            order: safePrev.length,
          },
        ]
      }
    })
  }

  const isExposed = (nodeId: string, field: string) => {
    const safeInputs = Array.isArray(exposedInputs) ? exposedInputs : []
    const config = safeInputs.find(
      (i) => i.node_id === nodeId && i.field === field,
    )
    return config ? config.enabled : false // Default to hidden if not configured? Or maybe default to visible for known types?
    // Let's default to hidden unless explicitly enabled in config mode, OR if no config exists at all, use heuristic.
  }

  const getLabel = (nodeId: string, field: string, defaultLabel: string) => {
    const safeInputs = Array.isArray(exposedInputs) ? exposedInputs : []
    const config = safeInputs.find(
      (i) => i.node_id === nodeId && i.field === field,
    )
    return config?.label || defaultLabel
  }

  const handleImageSelect = (image: any) => {
    if (activeImageInputId) {
      // Check if the node expects an ID or a URL/Path
      // We can infer this from the node type in the workflow data
      let node = selectedWorkflow?.data[activeImageInputId]

      // Handle Standard Format lookup
      if (
        !node &&
        selectedWorkflow?.data &&
        Array.isArray((selectedWorkflow.data as any).nodes)
      ) {
        const standardNode = (selectedWorkflow.data as any).nodes.find(
          (n: any) => String(n.id) === String(activeImageInputId),
        )
        if (standardNode) {
          // Normalize to match API format structure for the check below
          node = { ...standardNode, class_type: standardNode.type }
        }
      }

      if (
        node &&
        (node.class_type === 'EmbeddrLoadImageID' ||
          node.class_type === 'embeddr.LoadImageID')
      ) {
        setWorkflowInput(activeImageInputId, 'image_id', image.id)
      } else {
        const imageUrl = `${BACKEND_URL}/images/${image.id}/file`
        setWorkflowInput(activeImageInputId, 'image_url', imageUrl)
      }

      // Also store the preview URL for UI
      setWorkflowInput(
        activeImageInputId,
        '_preview',
        `${BACKEND_URL}/images/${image.id}/file`,
      )

      setImageSelectorOpen(false)
      setActiveImageInputId(null)
    }
  }

  const renderNodeInputs = (nodeId: string, node: any) => {
    const inputs = node.inputs || {}
    const isConfigMode = mode === 'configure'

    // Helper to render wrapper with config controls
    const renderWrapper = (
      field: string,
      type: string,
      defaultLabel: string,
      content: React.ReactNode,
    ) => {
      const exposed = isExposed(nodeId, field)

      // If in run mode and not exposed (and we have some config), hide it
      // If no config exists at all for the workflow, we might want to show everything by default (heuristic mode)
      const safeInputs = Array.isArray(exposedInputs) ? exposedInputs : []
      const hasAnyConfig = safeInputs.length > 0
      if (!isConfigMode && hasAnyConfig && !exposed) return null

      // If no config exists, use heuristic (show known types)
      if (!isConfigMode && !hasAnyConfig) {
        // Allow through
      }

      return (
        <div
          key={`${nodeId}-${field}`}
          className={cn(
            'relative group border border-transparent max-w-70',
            isConfigMode && 'border-border bg-muted/20',
          )}
        >
          {isConfigMode && (
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={exposed}
                  onCheckedChange={() =>
                    toggleExposed(nodeId, field, type, defaultLabel)
                  }
                />
                <span className="text-xs font-mono text-muted-foreground">
                  {nodeId}.{field}
                </span>
              </div>
              <Input
                className="h-6 w-32 text-xs"
                value={getLabel(nodeId, field, defaultLabel)}
                onChange={(e) => {
                  setExposedInputs((prev) => {
                    const safePrev = Array.isArray(prev) ? prev : []
                    const exists = safePrev.find(
                      (i) => i.node_id === nodeId && i.field === field,
                    )
                    if (exists) {
                      return safePrev.map((i) =>
                        i.node_id === nodeId && i.field === field
                          ? { ...i, label: e.target.value }
                          : i,
                      )
                    }
                    return [
                      ...safePrev,
                      {
                        node_id: nodeId,
                        field,
                        type,
                        label: e.target.value,
                        enabled: true,
                        order: safePrev.length,
                      },
                    ]
                  })
                }}
              />
            </div>
          )}
          <div
            className={cn(
              isConfigMode && !exposed && 'opacity-50 pointer-events-none',
            )}
          >
            {content}
          </div>
        </div>
      )
    }

    if (
      node.class_type === 'EmbeddrLoadImage' ||
      node.class_type === 'embeddr.LoadImage'
    ) {
      const field = 'image_url'
      const currentValue =
        workflowInputs[nodeId]?._preview ||
        workflowInputs[nodeId]?.image_url ||
        inputs.image_url

      return renderWrapper(
        field,
        'image',
        node._meta?.title || 'Input Image',
        <div className="flex gap-2 items-center">
          {currentValue ? (
            <div
              className="h-16 w-16 shrink-0 overflow-hidden border cursor-pointer hover:ring-2 ring-primary transition-all relative group"
              onClick={() => {
                setActiveImageInputId(nodeId)
                setImageSelectorOpen(true)
              }}
            >
              <img
                src={currentValue}
                className="h-full w-full object-cover"
                alt="Input"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Edit className="h-4 w-4 text-white" />
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="h-16 w-16 shrink-0 flex flex-col gap-1 items-center justify-center p-0 border-dashed"
              onClick={() => {
                setActiveImageInputId(nodeId)
                setImageSelectorOpen(true)
              }}
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Select</span>
            </Button>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <Input
              value={currentValue || ''}
              readOnly
              placeholder="No image selected"
              className="h-7 text-xs"
            />
            <p className="text-[10px] text-muted-foreground truncate">
              {getLabel(nodeId, field, node._meta?.title || 'Input Image')}
            </p>
          </div>
        </div>,
      )
    }

    if (
      node.class_type === 'EmbeddrLoadImageID' ||
      node.class_type === 'embeddr.LoadImageID'
    ) {
      const field = 'image_id'
      const previewUrl = workflowInputs[nodeId]?._preview
      const currentId = workflowInputs[nodeId]?.image_id || inputs.image_id

      return renderWrapper(
        field,
        'image_id',
        node._meta?.title || 'Input Image ID',
        <ImageIdInput
          label={getLabel(nodeId, field, node._meta?.title || 'Input Image ID')}
          imageId={currentId}
          previewUrl={previewUrl}
          onClick={() => {
            setActiveImageInputId(nodeId)
            setImageSelectorOpen(true)
          }}
        />,
      )
    }

    if (node.class_type === 'CLIPTextEncode') {
      const field = 'text'
      const currentValue = workflowInputs[nodeId]?.text || inputs.text
      return renderWrapper(
        field,
        'text',
        node._meta?.title || `Text Prompt`,
        <div className="space-y-2">
          <Label>
            {getLabel(nodeId, field, node._meta?.title || `Text Prompt`)}
          </Label>
          <Textarea
            value={currentValue || ''}
            onChange={(e) => setWorkflowInput(nodeId, 'text', e.target.value)}
            placeholder="Enter prompt..."
            className="min-h-[100px]"
          />
        </div>,
      )
    }

    if (node.class_type === 'KSampler') {
      const seedInput = renderWrapper(
        'seed',
        'number',
        'Seed',
        <div className="space-y-2">
          <Label>{getLabel(nodeId, 'seed', 'Seed')}</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              value={workflowInputs[nodeId]?.seed ?? inputs.seed}
              onChange={(e) =>
                setWorkflowInput(nodeId, 'seed', parseInt(e.target.value))
              }
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setWorkflowInput(
                  nodeId,
                  'seed',
                  Math.floor(Math.random() * 1000000000000000),
                )
              }
              title="Randomize"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>,
      )

      const stepsInput = renderWrapper(
        'steps',
        'number',
        'Steps',
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{getLabel(nodeId, 'steps', 'Steps')}</Label>
            <span className="text-xs text-muted-foreground">
              {workflowInputs[nodeId]?.steps ?? inputs.steps}
            </span>
          </div>
          <Slider
            value={[workflowInputs[nodeId]?.steps ?? inputs.steps]}
            min={1}
            max={100}
            step={1}
            onValueChange={([val]) => setWorkflowInput(nodeId, 'steps', val)}
          />
        </div>,
      )

      const cfgInput = renderWrapper(
        'cfg',
        'number',
        'CFG Scale',
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{getLabel(nodeId, 'cfg', 'CFG Scale')}</Label>
            <span className="text-xs text-muted-foreground">
              {workflowInputs[nodeId]?.cfg ?? inputs.cfg}
            </span>
          </div>
          <Slider
            value={[workflowInputs[nodeId]?.cfg ?? inputs.cfg]}
            min={1}
            max={20}
            step={0.1}
            onValueChange={([val]) => setWorkflowInput(nodeId, 'cfg', val)}
          />
        </div>,
      )

      if (!seedInput && !stepsInput && !cfgInput) return null

      return (
        <div key={nodeId} className="space-y-4 border-t pt-4">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {node._meta?.title || 'Sampler Settings'}
          </Label>
          {seedInput}
          {stepsInput}
          {cfgInput}
        </div>
      )
    }

    if (node.class_type === 'embeddr.SaveToFolder') {
      const libraryInput = renderWrapper(
        'library',
        'combo',
        'Library',
        <div className="space-y-2">
          <Label>{getLabel(nodeId, 'library', 'Library')}</Label>
          <Select
            value={
              workflowInputs[nodeId]?.library || inputs.library || 'Default'
            }
            onValueChange={(val) => setWorkflowInput(nodeId, 'library', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Library" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Default">Default</SelectItem>
              {libraries?.map((lib) => (
                <SelectItem key={lib.id} value={`${lib.id}: ${lib.name}`}>
                  {lib.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>,
      )

      const collectionInput = renderWrapper(
        'collection',
        'combo',
        'Collection',
        <div className="space-y-2">
          <Label>{getLabel(nodeId, 'collection', 'Collection')}</Label>
          <Select
            value={
              workflowInputs[nodeId]?.collection || inputs.collection || 'None'
            }
            onValueChange={(val) => setWorkflowInput(nodeId, 'collection', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {collections?.map((col) => (
                <SelectItem key={col.id} value={`${col.id}: ${col.name}`}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>,
      )

      const tagsInput = renderWrapper(
        'tags',
        'string',
        'Tags',
        <div className="space-y-2">
          <Label>{getLabel(nodeId, 'tags', 'Tags')}</Label>
          <Input
            value={workflowInputs[nodeId]?.tags || inputs.tags || ''}
            onChange={(e) => setWorkflowInput(nodeId, 'tags', e.target.value)}
            placeholder="tag1, tag2"
          />
        </div>,
      )

      const captionInput = renderWrapper(
        'caption',
        'string',
        'Caption',
        <div className="space-y-2">
          <Label>{getLabel(nodeId, 'caption', 'Caption')}</Label>
          <Input
            value={workflowInputs[nodeId]?.caption || inputs.caption || ''}
            onChange={(e) =>
              setWorkflowInput(nodeId, 'caption', e.target.value)
            }
          />
        </div>,
      )

      const saveBackupInput = renderWrapper(
        'save_backup',
        'boolean',
        'Save to Comfy History',
        <div className="flex items-center space-x-2">
          <Switch
            checked={
              workflowInputs[nodeId]?.save_backup ?? inputs.save_backup ?? false
            }
            onCheckedChange={(val) =>
              setWorkflowInput(nodeId, 'save_backup', val)
            }
          />
          <Label>
            {getLabel(nodeId, 'save_backup', 'Save to Comfy History')}
          </Label>
        </div>,
      )

      return (
        <div key={nodeId} className="space-y-4 border-t pt-4">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {node._meta?.title || 'Save Settings'}
          </Label>
          {libraryInput}
          {collectionInput}
          {tagsInput}
          {captionInput}
          {saveBackupInput}
        </div>
      )
    }

    if (node.class_type === 'EmptyLatentImage') {
      const width = workflowInputs[nodeId]?.width ?? inputs.width
      const height = workflowInputs[nodeId]?.height ?? inputs.height

      const widthInput = renderWrapper(
        'width',
        'number',
        'Width',
        <div className="space-y-1">
          <Label className="text-xs">
            {getLabel(nodeId, 'width', 'Width')}
          </Label>
          <Input
            type="number"
            value={width}
            onChange={(e) =>
              setWorkflowInput(nodeId, 'width', parseInt(e.target.value))
            }
          />
        </div>,
      )

      const heightInput = renderWrapper(
        'height',
        'number',
        'Height',
        <div className="space-y-1">
          <Label className="text-xs">
            {getLabel(nodeId, 'height', 'Height')}
          </Label>
          <Input
            type="number"
            value={height}
            onChange={(e) =>
              setWorkflowInput(nodeId, 'height', parseInt(e.target.value))
            }
          />
        </div>,
      )

      if (!widthInput && !heightInput) return null

      return (
        <div key={nodeId} className="space-y-2 border-t pt-4">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {node._meta?.title || 'Image Size'}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {widthInput}
            {heightInput}
          </div>
        </div>
      )
    }

    // Generic handler for any other node with primitive inputs
    // This ensures we can toggle/configure ANY input that is a value (not a link)
    const primitiveInputs = Object.entries(inputs).filter(([_, value]) => {
      return (
        typeof value !== 'object' &&
        value !== null &&
        value !== undefined &&
        !Array.isArray(value)
      )
    })

    if (primitiveInputs.length > 0) {
      const renderedInputs = primitiveInputs
        .map(([key, value]) => {
          const currentValue = workflowInputs[nodeId]?.[key] ?? value
          const isNumber = typeof value === 'number'
          const isMultiline =
            typeof value === 'string' &&
            (value.length > 50 || value.includes('\n'))

          return renderWrapper(
            key,
            isNumber ? 'number' : 'text',
            key,
            <div className="space-y-2">
              <Label>{getLabel(nodeId, key, key)}</Label>
              {isNumber ? (
                <Input
                  type="number"
                  value={currentValue}
                  onChange={(e) =>
                    setWorkflowInput(nodeId, key, parseFloat(e.target.value))
                  }
                />
              ) : isMultiline ? (
                <Textarea
                  value={currentValue}
                  onChange={(e) =>
                    setWorkflowInput(nodeId, key, e.target.value)
                  }
                  className="min-h-[80px]"
                />
              ) : (
                <Input
                  value={currentValue}
                  onChange={(e) =>
                    setWorkflowInput(nodeId, key, e.target.value)
                  }
                />
              )}
            </div>,
          )
        })
        .filter(Boolean)

      if (renderedInputs.length === 0) return null

      return (
        <div key={nodeId} className="space-y-4 border-t pt-4">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {node._meta?.title || node.class_type}
          </Label>
          {renderedInputs}
        </div>
      )
    }

    return null
  }

  const handleUseGlobalImage = () => {
    if (!selectedImage || !selectedWorkflow) return

    // Find the first image input node
    // Heuristic: Look for EmbeddrLoadImage or LoadImage
    const nodes = selectedWorkflow.data
    let targetNodeId = null

    for (const [id, node] of Object.entries(nodes)) {
      if (
        node.class_type === 'EmbeddrLoadImage' ||
        node.class_type === 'LoadImage'
      ) {
        targetNodeId = id
        break
      }
    }

    if (targetNodeId) {
      // For EmbeddrLoadImage, we likely pass the ID
      // For LoadImage, we might need the filename, but let's assume ID for now if using our custom nodes
      setWorkflowInput(targetNodeId, 'image', selectedImage.id)
      // We keep the selection active so the user can easily switch workflows or change settings
      // selectImage(null)
    }
  }

  // Auto-populate first image input when selection changes
  useEffect(() => {
    if (selectedImage && selectedWorkflow) {
      handleUseGlobalImage()
    }
  }, [selectedImage?.id, selectedWorkflow?.id])

  return (
    <div className="col-span-1 flex flex-col overflow-visible h-full border-none ring-0! shadow-none bg-transparent p-0! min-h-0 gap-1">
      <Card className="flex-1 p-0! gap-0! flex flex-col overflow-visible min-h-0">
        <div className="flex items-center justify-between shrink-0 border-b border-foreground/10 p-2 bg-muted/35">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="h-3 w-3" />
            Generation Settings
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant={mode === 'configure' ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setMode(mode === 'run' ? 'configure' : 'run')}
              title={mode === 'run' ? 'Configure Inputs' : 'Back to Run'}
            >
              {mode === 'run' ? (
                <Edit className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
            {mode === 'configure' && (
              <Button
                variant="default"
                size="icon-sm"
                onClick={handleSaveConfig}
                title="Save Configuration"
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Global Image Selection Indicator */}
        {selectedImage && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10  overflow-hidden bg-muted shrink-0 border border-primary/30">
              <img
                src={selectedImage.thumb_url || selectedImage.image_url}
                className="w-full h-full object-cover"
                alt="Selected"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Selected Image</p>
              <p className="text-[10px] text-muted-foreground truncate">
                #{selectedImage.id}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => selectImage(null)}
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="secondary"
                onClick={handleUseGlobalImage}
                title="Use as input"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="h-full overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Workflow Selection */}
              <div className="space-y-2">
                <Label>Workflow</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedWorkflow?.id.toString()}
                    onValueChange={(val) => {
                      const wf = workflows.find((w) => w.id.toString() === val)
                      if (wf) selectWorkflow(wf)
                    }}
                    disabled={isLoadingWorkflows}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingWorkflows ? 'Loading...' : 'Select workflow'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent side="top" position="popper">
                      {workflows.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id.toString()}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{wf.name}</span>
                            {quickWorkflowIds.includes(wf.id) && (
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedWorkflow && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'shrink-0',
                        quickWorkflowIds.includes(selectedWorkflow.id) &&
                          'text-yellow-400 hover:text-yellow-500',
                      )}
                      onClick={() => toggleQuickWorkflow(selectedWorkflow.id)}
                      title="Toggle Quick Workflow"
                    >
                      <Star
                        className={cn(
                          'w-4 h-4',
                          quickWorkflowIds.includes(selectedWorkflow.id) &&
                            'fill-current',
                        )}
                      />
                    </Button>
                  )}
                </div>
              </div>

              {/* Dynamic Inputs */}
              {selectedWorkflow &&
                (() => {
                  // Check if standard format (has nodes array)
                  const isStandard = Array.isArray(
                    (selectedWorkflow.data as any).nodes,
                  )

                  if (isStandard) {
                    // Extract subgraph definitions if available
                    const subgraphDefs: Record<string, any> = {}
                    if (
                      'definitions' in selectedWorkflow.data &&
                      (selectedWorkflow.data.definitions as any)?.subgraphs
                    ) {
                      ;(
                        selectedWorkflow.data.definitions as any
                      ).subgraphs.forEach((sg: any) => {
                        const required: Record<string, any> = {}
                        if (sg.inputs) {
                          sg.inputs.forEach((inp: any) => {
                            required[inp.name] = [inp.type || 'STRING', {}]
                          })
                        }
                        subgraphDefs[sg.id] = {
                          input: { required },
                          output: (sg.outputs || []).map((o: any) => o.type),
                          display_name: sg.name,
                        }
                      })
                    }

                    const effectiveObjectInfo = {
                      ...(objectInfo || {}),
                      ...subgraphDefs,
                    }

                    if (!objectInfo) {
                      return (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          Loading node definitions...
                        </div>
                      )
                    }

                    return (selectedWorkflow.data as any).nodes.map(
                      (node: any) => {
                        const def = effectiveObjectInfo[node.type]
                        // If we don't have definition, we can't map inputs, so skip
                        if (!def) return null

                        const inputs: Record<string, any> = {}

                        // Map widgets to named inputs
                        const proxyWidgets = (node.properties)
                          ?.proxyWidgets
                        if (proxyWidgets && Array.isArray(proxyWidgets)) {
                          // Subgraph Group Node Logic
                          const widgetsValues = node.widgets_values || []
                          proxyWidgets.forEach(
                            (mapping: Array<any>, idx: number) => {
                              // mapping is [node_id, widget_name]
                              const name = mapping[1]
                              if (idx < widgetsValues.length) {
                                inputs[name] = widgetsValues[idx]
                              } else {
                                // Provide default value so it renders if missing from widgets_values
                                if (name === 'seed' || name === 'noise_seed')
                                  inputs[name] = 0
                                else if (name === 'steps') inputs[name] = 20
                                else if (name === 'cfg') inputs[name] = 8.0
                                else if (name === 'control_after_generate')
                                  inputs[name] = 'randomize'
                                else inputs[name] = '' // Default to string
                              }
                            },
                          )

                          // Also include linked inputs (slots) that are not in proxyWidgets
                          if (def.input && def.input.required) {
                            // Object.entries(def.input.required).forEach(
                            // //   ([name, config]) => {
                            // //     // If it's linked, it's an input slot, not a widget value
                            // //     // But we only care about exposing it if it has a value?
                            // //     // No, GenerationSettings needs to know about all inputs.
                            // //     // But here we are extracting DEFAULT values from the node.
                            // //     // Linked inputs don't have values in widgets_values.
                            // //   },
                            // )
                          }
                        } else if (def.input && def.input.required) {
                          const widgetsValues = node.widgets_values || []
                          let widgetIdx = 0

                          // Identify linked inputs to skip them
                          const linkedInputs = new Set()
                          if (node.inputs) {
                            node.inputs.forEach((inp: any) => {
                              if (inp.link) linkedInputs.add(inp.name)
                            })
                          }

                          Object.entries(def.input.required).forEach(
                            ([name, config]: [string, any]) => {
                              const typeName = Array.isArray(config)
                                ? config[0]
                                : config
                              let isWidget = false

                              // Heuristic for widgets
                              if (Array.isArray(typeName)) isWidget = true
                              else if (
                                typeof typeName === 'string' &&
                                ['INT', 'FLOAT', 'STRING', 'BOOLEAN'].includes(
                                  typeName,
                                )
                              )
                                isWidget = true

                              if (!linkedInputs.has(name)) {
                                if (isWidget) {
                                  if (widgetIdx < widgetsValues.length) {
                                    inputs[name] = widgetsValues[widgetIdx]
                                    widgetIdx++
                                  }
                                }
                              }

                              if (name === 'seed' || name === 'noise_seed') {
                                widgetIdx++
                              }
                            },
                          )
                        }

                        const apiNode = {
                          class_type: node.type,
                          inputs,
                          _meta: { title: node.title || def.display_name },
                        }

                        return renderNodeInputs(node.id.toString(), apiNode)
                      },
                    )
                  }

                  // API Format
                  return Object.entries(selectedWorkflow.data).map(
                    ([id, node]) => renderNodeInputs(id, node),
                  )
                })()}
            </div>
          </ScrollArea>
        </div>
      </Card>
      <div className="text-xs text-muted-foreground w-full  flex items-center justify-end gap-2">
        {mode === 'run' && (
          <Button
            variant="default"
            onClick={() => generate()}
            disabled={!selectedWorkflow}
            className="ring-0! border-1 w-full border-muted"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
          </Button>
        )}
      </div>

      <ImageSelectorDialog
        open={imageSelectorOpen}
        onOpenChange={setImageSelectorOpen}
        onSelect={handleImageSelect}
      />
    </div>
  )
}
