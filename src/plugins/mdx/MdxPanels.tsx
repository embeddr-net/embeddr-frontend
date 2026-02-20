import React from 'react'
import { Card } from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/ui'
import { Textarea } from '@embeddr/react-ui/components/ui'
import { useSettingsStore } from '@/store/settingsStore'
import { MdxRenderer } from '@embeddr/react-ui'
import type { EmbeddrAPI } from '@embeddr/react-ui/types'

const PLUGIN_ID = 'core.mdx'

const DEFAULT_CONTENT = `# Embeddr MDX\n\nWelcome to the MDX foundation layer. This content can reference Embeddr UI components.\n\n<Callout type="info" title="Pro tip">\nMDX lets you mix Markdown and JSX to build tutorials and interactive docs.\n</Callout>\n\n## Built-in Components\n\n- <Kbd>Shift</Kbd> + <Kbd>Space</Kbd> toggles the command bar.\n- <Badge>Embeddr</Badge> components can be used directly.\n\n<Button>Trigger action</Button>\n\n---\n\n\`\`\`ts\n// MDX supports fenced code blocks\nconst hello = "Embeddr"\n\`\`\`\n`

type MdxPanelProps = {
  api: EmbeddrAPI
}

const useMdxContent = () => {
  const content = useSettingsStore(
    (state) => state.pluginSettings[PLUGIN_ID]?.content,
  )
  const setPluginSetting = useSettingsStore((state) => state.setPluginSetting)
  const hasContent = content !== undefined

  React.useEffect(() => {
    if (!hasContent) {
      setPluginSetting(PLUGIN_ID, 'content', DEFAULT_CONTENT)
    }
  }, [hasContent, setPluginSetting])

  return {
    content: (content ?? DEFAULT_CONTENT) as string,
    setContent: (value: string) =>
      setPluginSetting(PLUGIN_ID, 'content', value),
  }
}

export function MdxViewerPanel({ api }: MdxPanelProps) {
  const { content } = useMdxContent()
  const panelTitle = api.settings.getPlugin(
    PLUGIN_ID,
    'title',
    'MDX Viewer',
  ) as string

  return (
    <Card className="h-full w-full p-3 overflow-hidden">
      <div className="flex h-full flex-col gap-3 min-h-0">
        <div className="text-lg font-semibold">{panelTitle}</div>
        <div className="flex-1 min-h-0">
          <MdxRenderer source={content} />
        </div>
      </div>
    </Card>
  )
}

export function MdxEditorPanel() {
  const { content, setContent } = useMdxContent()
  const [draft, setDraft] = React.useState(content)

  React.useEffect(() => {
    setDraft(content)
  }, [content])

  const handleReset = () => {
    setDraft(DEFAULT_CONTENT)
    setContent(DEFAULT_CONTENT)
  }

  const handleChange = (value: string) => {
    setDraft(value)
    setContent(value)
  }

  return (
    <Card className="h-full w-full p-3 overflow-hidden">
      <div className="flex h-full flex-col gap-3 min-h-0">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">MDX Editor</div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset sample
          </Button>
        </div>
        <Tabs defaultValue="edit" className="flex-1 min-h-0">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="flex-1 min-h-0 pt-3">
            <Textarea
              value={draft}
              onChange={(event) => handleChange(event.target.value)}
              className="min-h-[320px] h-full"
            />
          </TabsContent>
          <TabsContent value="preview" className="flex-1 min-h-0 pt-3">
            <MdxRenderer source={draft} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  )
}
