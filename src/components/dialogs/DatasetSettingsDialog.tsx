import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/components/dialog'
import { Button } from '@embeddr/react-ui/components/button'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CaptioningModelOption } from '@/hooks/useCaptioning'
import type { Dataset } from '@/hooks/useDatasets'
import {
  useCaptioningModels,
  useCaptioningStatus,
  useLoadCaptioningModel,
  useUnloadCaptioningModel,
} from '@/hooks/useCaptioning'
import { useUpdateDataset } from '@/hooks/useDatasets'
import { cn } from '@/lib/utils'
import { AutoAnalysisSettings } from '@/components/settings/AutoAnalysisSettings'

function CaptionSettingsForm({
  dataset,
  onSaveSuccess,
}: {
  dataset: Dataset
  onSaveSuccess: () => void
}) {
  const updateDataset = useUpdateDataset()
  const { data: models, isLoading: isLoadingModels } = useCaptioningModels()
  const { data: status } = useCaptioningStatus()
  const loadModel = useLoadCaptioningModel()
  const unloadModel = useUnloadCaptioningModel()

  const [modelId, setModelId] = useState('')
  const [mode, setMode] = useState('caption')
  const [config, setConfig] = useState<Record<string, any>>({})

  useEffect(() => {
    if (dataset.captioning_config) {
      try {
        const savedConfig = JSON.parse(dataset.captioning_config)
        setModelId(savedConfig.model || 'vikhyatk/moondream2')
        setMode(savedConfig.mode || 'caption')
        const { model, mode, ...rest } = savedConfig
        setConfig(rest)
      } catch (e) {
        // ignore
      }
    } else if (models && models.length > 0 && !modelId) {
      setModelId(models[0].id)
    }
  }, [dataset, models, modelId])

  const selectedModel = models?.find((m) => m.id === modelId)
  const isCurrentModelLoaded = status?.loaded_model === modelId

  const handleLoadModel = async () => {
    try {
      await loadModel.mutateAsync(modelId)
      toast.success(`Model ${selectedModel?.name} loaded`)
    } catch (e) {
      toast.error('Failed to load model')
    }
  }

  const handleUnloadModel = async () => {
    try {
      await unloadModel.mutateAsync()
      toast.success('Model unloaded')
    } catch (e) {
      toast.error('Failed to unload model')
    }
  }

  const handleSave = async () => {
    try {
      const finalConfig = {
        model: modelId,
        mode,
        ...config,
      }
      await updateDataset.mutateAsync({
        id: dataset.id,
        updates: {
          captioning_config: JSON.stringify(finalConfig),
        },
      })
      toast.success('Settings saved')
      onSaveSuccess()
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  const renderOptionInput = (option: CaptioningModelOption) => {
    const value = config[option.name] ?? option.default ?? ''

    const handleChange = (val: any) => {
      setConfig((prev) => ({ ...prev, [option.name]: val }))
    }

    if (option.type === 'select') {
      return (
        <Select value={value} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {option.options?.map((opt) => (
              <SelectItem
                key={opt.value.toString()}
                value={opt.value.toString()}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (option.type === 'textarea') {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={option.placeholder}
          rows={3}
        />
      )
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={option.placeholder}
      />
    )
  }

  if (isLoadingModels) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={modelId} onValueChange={setModelId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models?.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedModel?.description && (
          <p className="text-xs text-muted-foreground">
            {selectedModel.description}
          </p>
        )}

        <div className="flex items-center justify-between bg-muted/50 p-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2',
                isCurrentModelLoaded ? 'bg-green-500' : 'bg-yellow-500',
              )}
            />
            <span className="text-xs font-medium">
              {isCurrentModelLoaded
                ? 'Model Loaded'
                : status?.loaded_model
                  ? `Other Model Loaded (${status.loaded_model})`
                  : 'No Model Loaded'}
            </span>
          </div>
          <div className="flex gap-2">
            {isCurrentModelLoaded ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnloadModel}
                disabled={unloadModel.isPending}
                className="h-7 text-xs"
              >
                {unloadModel.isPending && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                Unload
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleLoadModel}
                disabled={loadModel.isPending}
                className="h-7 text-xs"
              >
                {loadModel.isPending && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                Load Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {selectedModel && (
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedModel.capabilities.map((cap) => (
                <SelectItem key={cap} value={cap}>
                  {cap.charAt(0).toUpperCase() + cap.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedModel &&
        selectedModel.options[mode]?.map((option) => (
          <div key={option.name} className="space-y-2">
            <Label>
              {option.label}
              {option.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {renderOptionInput(option)}
            {option.description && (
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            )}
          </div>
        ))}

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={updateDataset.isPending || isLoadingModels}
        >
          {updateDataset.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Captioning Settings
        </Button>
      </div>
    </div>
  )
}

export function DatasetSettingsDialog({
  dataset,
  open,
  onOpenChange,
}: {
  dataset: Dataset
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl! h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Dataset Settings: {dataset.name}</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="automation"
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="automation">Auto-Analysis</TabsTrigger>
              <TabsTrigger value="captioning">Captioning Model</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="automation" className="mt-0 h-full">
              <AutoAnalysisSettings
                scope="collection"
                scopeId={String(dataset.id)}
              />
            </TabsContent>

            <TabsContent value="captioning" className="mt-0">
              <CaptionSettingsForm dataset={dataset} onSaveSuccess={() => {}} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
