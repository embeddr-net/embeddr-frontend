import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Input } from '@embeddr/react-ui/components/input'
import { Label } from '@embeddr/react-ui/components/label'
import { fetchAvailableModels } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'

export function GeneralSettings() {
  const { selectedModel, setSelectedModel, batchSize, setBatchSize } =
    useSettings()
  const [localBatchSize, setLocalBatchSize] = useState(batchSize)

  useEffect(() => {
    setLocalBatchSize(batchSize)
  }, [batchSize])

  const { data: models, isLoading: isLoadingModels } = useQuery({
    queryKey: ['available-models'],
    queryFn: fetchAvailableModels,
  })

  return (
    <Card className="my-1">
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Configure global application settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Global CLIP Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingModels ? (
                <SelectItem value="loading" disabled>
                  Loading models...
                </SelectItem>
              ) : (
                models?.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the CLIP model to use for embedding generation and search.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Batch Size</Label>
          <Input
            type="number"
            value={localBatchSize}
            onChange={(e) => setLocalBatchSize(parseInt(e.target.value, 10))}
            onBlur={() => {
              if (localBatchSize !== batchSize) {
                setBatchSize(localBatchSize)
              }
            }}
            min={1}
            max={100}
          />
          <p className="text-xs text-muted-foreground">
            Number of images to process at once during embedding generation.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
