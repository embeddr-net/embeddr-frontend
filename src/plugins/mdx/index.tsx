import type { PluginDefinition } from '@embeddr/react-ui/types'
import { FileText, PenLine } from 'lucide-react'
import { MdxEditorPanel, MdxViewerPanel } from './MdxPanels'

export const MdxPlugin: PluginDefinition = {
  id: 'core.mdx',
  name: 'MDX Studio',
  description: 'Render and edit MDX content with Embeddr components.',
  version: '0.1.0',
  components: [
    {
      id: 'mdx-viewer',
      location: 'zen-toolbox-tab',
      label: 'MDX Viewer',
      icon: FileText,
      component: MdxViewerPanel,
    },
    {
      id: 'mdx-editor',
      location: 'zen-toolbox-tab',
      label: 'MDX Editor',
      icon: PenLine,
      component: MdxEditorPanel,
    },
  ],
}
