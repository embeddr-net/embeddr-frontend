import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type {Dataset} from '@/hooks/useDatasets';
import {  useExportDataset } from '@/hooks/useDatasets'

export function DatasetHeader({ dataset }: { dataset: Dataset }) {
  const exportDataset = useExportDataset()

  const handleExport = async () => {
    try {
      const result = await exportDataset.mutateAsync(dataset.id)
      toast.success('Dataset exported', {
        description: result.message,
      })
    } catch (error) {
      toast.error('Failed to export dataset')
    }
  }

  return (
    <div className="flex items-center justify-between p-2 border bg-card shrink-0">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {dataset.name}
          <Badge variant="secondary" className="capitalize">
            {dataset.type.replace('_', ' ')}
          </Badge>
        </h2>
        {/* <p className="text-muted-foreground text-sm">{dataset.description}</p> */}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={exportDataset.isPending}
          size="sm"
        >
          {exportDataset.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </div>
    </div>
  )
}
