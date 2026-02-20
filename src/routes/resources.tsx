import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useEmbeddrAPI } from '@/plugins/store'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/ui'
import { Input } from '@embeddr/react-ui/components/ui'
import { Badge } from '@embeddr/react-ui/components/ui'
import { Search, Database, FileBox, Cpu, Activity } from 'lucide-react'
import { SystemResourceBar } from '@embeddr/react-ui'

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
})

function ResourcesPage() {
  const api = useEmbeddrAPI()
  const [loras, setLoras] = useState<{
    items: string[]
    total: number
    page: number
    pages: number
  }>({ items: [], total: 0, page: 1, pages: 0 })
  const [checkpoints, setCheckpoints] = useState<{
    items: string[]
    total: number
    page: number
    pages: number
  }>({ items: [], total: 0, page: 1, pages: 0 })
  const [embeddings, setEmbeddings] = useState<{
    items: string[]
    total: number
    page: number
    pages: number
  }>({ items: [], total: 0, page: 1, pages: 0 })
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('loras')

  const limit = 60

  useEffect(() => {
    loadLoras(1)
    loadCheckpoints(1)
    loadEmbeddings(1)
  }, [api])

  const loadLoras = (page: number) => {
    api.models.list({ category: 'loras', page, limit }).then(setLoras)
  }

  const loadCheckpoints = (page: number) => {
    api.models
      .list({ category: 'checkpoints', page, limit })
      .then(setCheckpoints)
  }

  const loadEmbeddings = (page: number) => {
    api.models
      .list({ category: 'embeddings', page, limit })
      .then(setEmbeddings)
  }

  const filterItems = (items: string[]) =>
    items.filter((item) => item.toLowerCase().includes(search.toLowerCase()))

  const renderPagination = (
    data: { page: number; pages: number },
    onPageChange: (page: number) => void,
  ) => {
    if (data.pages <= 1) return null
    return (
      <div className="flex justify-center gap-2 mt-6">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={data.page === 1}
          onClick={() => onPageChange(data.page - 1)}
        >
          Previous
        </button>
        <span className="px-3 py-1">
          Page {data.page} of {data.pages}
        </span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={data.page === data.pages}
          onClick={() => onPageChange(data.page + 1)}
        >
          Next
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs
        defaultValue="system"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="system">System Status</TabsTrigger>
          <TabsTrigger value="loras">LoRAs ({loras.total})</TabsTrigger>
          <TabsTrigger value="checkpoints">
            Checkpoints ({checkpoints.total})
          </TabsTrigger>
          <TabsTrigger value="embeddings">
            Embeddings ({embeddings.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  VRAM / Memory Tracking
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Active models and system resources currently in use by the
                  backend.
                </p>
              </div>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <SystemResourceBar className="py-4" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Auto-Unload
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Models can be manually unloaded via the context menu on the
                resource bar. Double-click or right-click on a resource block to
                see options.
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loras" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterItems(loras.items).map((lora) => (
              <Card key={lora} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle
                    className="text-sm font-medium truncate"
                    title={lora}
                  >
                    {lora}
                  </CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground truncate">
                    LoRA Model
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterItems(loras.items).length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                No LoRAs found matching your search.
              </div>
            )}
          </div>
          {renderPagination(loras, loadLoras)}
        </TabsContent>

        <TabsContent value="checkpoints" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterItems(checkpoints.items).map((ckpt) => (
              <Card key={ckpt} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle
                    className="text-sm font-medium truncate"
                    title={ckpt}
                  >
                    {ckpt}
                  </CardTitle>
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground truncate">
                    Checkpoint Model
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {renderPagination(checkpoints, loadCheckpoints)}
        </TabsContent>

        <TabsContent value="embeddings" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filterItems(embeddings.items).map((emb) => (
              <Card key={emb} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle
                    className="text-sm font-medium truncate"
                    title={emb}
                  >
                    {emb}
                  </CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground truncate">
                    Embedding / Textual Inversion
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {renderPagination(embeddings, loadEmbeddings)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
