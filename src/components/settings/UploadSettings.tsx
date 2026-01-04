import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Label } from '@embeddr/react-ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { Input } from '@embeddr/react-ui/components/input'
import { fetchLibraries } from '@/lib/api/endpoints/library'
import { fetchCollections } from '@/lib/api/endpoints/collections'
import { useSettings } from '@/hooks/useSettings'

export function UploadSettings() {
  const { uploadConfig, setUploadConfig } = useSettings()

  const { data: libraries } = useQuery({
    queryKey: ['libraries'],
    queryFn: fetchLibraries,
  })

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  })

  const handleLibraryChange = (value: string) => {
    setUploadConfig({
      ...uploadConfig,
      default_library_id: value === 'none' ? null : parseInt(value),
    })
  }

  const handleCollectionChange = (value: string) => {
    setUploadConfig({
      ...uploadConfig,
      default_collection_id: value === 'none' ? null : parseInt(value),
    })
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadConfig({
      ...uploadConfig,
      default_tags: e.target.value,
    })
  }

  return (
    <Card className="my-1">
      <CardHeader>
        <CardTitle>Upload Settings</CardTitle>
        <CardDescription>
          Configure default settings for drag-and-drop uploads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Default Library</Label>
          <Select
            value={uploadConfig.default_library_id?.toString() || 'none'}
            onValueChange={handleLibraryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a library" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Use Default)</SelectItem>
              {libraries?.map((lib) => (
                <SelectItem key={lib.id} value={lib.id.toString()}>
                  {lib.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Default Collection</Label>
          <Select
            value={uploadConfig.default_collection_id?.toString() || 'none'}
            onValueChange={handleCollectionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {collections?.map((col) => (
                <SelectItem key={col.id} value={col.id.toString()}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Default Tags</Label>
          <Input
            value={uploadConfig.default_tags}
            onChange={handleTagsChange}
            placeholder="tag1, tag2"
          />
        </div>
      </CardContent>
    </Card>
  )
}
