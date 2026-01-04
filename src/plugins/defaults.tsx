import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import { Card } from '@embeddr/react-ui/components/card'
import { Dice5, Info, Terminal } from 'lucide-react'
import type { EmbeddrAPI, PluginDefinition } from '@embeddr/react-ui/types'

// --- Plugin 1: Workflow Metadata Viewer (UI) ---
const WorkflowInfoComponent: React.FC<{ api: EmbeddrAPI }> = ({ api }) => {
  const { selectedWorkflow } = api.stores.generation

  if (!selectedWorkflow) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        No workflow selected
      </div>
    )
  }

  return (
    <div className="p-2 space-y-2">
      <h3 className="font-medium text-sm">Workflow Details</h3>
      <div className="text-xs space-y-1 text-muted-foreground">
        <p>
          <span className="font-semibold">ID:</span> {selectedWorkflow.id}
        </p>
        <p>
          <span className="font-semibold">Name:</span> {selectedWorkflow.name}
        </p>
        <p>
          <span className="font-semibold">Nodes:</span>{' '}
          {Object.keys(selectedWorkflow.data).length}
        </p>
        {selectedWorkflow.description && (
          <p className="italic mt-2">{selectedWorkflow.description}</p>
        )}
      </div>
    </div>
  )
}

export const WorkflowInfoPlugin: PluginDefinition = {
  id: 'core.workflow-info',
  name: 'Workflow Info',
  description: 'Displays details about the current workflow',
  version: '1.0.0',
  components: [
    {
      id: 'info-panel',
      location: 'zen-toolbox-tab',
      label: 'Info',
      component: WorkflowInfoComponent,
    },
  ],
}

// --- Plugin 2: Random Seed Action (Action) ---
export const RandomSeedPlugin: PluginDefinition = {
  id: 'core.random-seed',
  name: 'Random Seed',
  description: 'Randomizes the seed for the current workflow',
  version: '1.0.0',
  actions: [
    {
      id: 'randomize-seed',
      location: 'zen-toolbox-action',
      label: 'Randomize Seed',
      icon: Dice5,
      handler: (api: EmbeddrAPI) => {
        const { selectedWorkflow, setWorkflowInput } = api.stores.generation

        if (!selectedWorkflow) {
          api.toast.error('No workflow selected')
          return
        }

        // Find a seed input (heuristic)
        const inputs = selectedWorkflow.meta?.exposed_inputs || []
        const seedInput = inputs.find(
          (i: any) =>
            i.field.includes('seed') || i.label?.toLowerCase().includes('seed'),
        )

        if (seedInput) {
          const newSeed = Math.floor(Math.random() * 1000000000)
          setWorkflowInput(seedInput.node_id, seedInput.field, newSeed)
          api.toast.success(`Seed set to ${newSeed}`)
        } else {
          api.toast.info('No exposed seed input found in this workflow')
        }
      },
    },
  ],
}

// --- Plugin 3: Debug Logger (Action) ---
// export const DebugLoggerPlugin: PluginDefinition = {
//   id: 'core.debug-logger',
//   name: 'Debug Logger',
//   description: 'Logs current state to console',
//   version: '1.0.0',
//   actions: [
//     {
//       id: 'log-state',
//       location: 'zen-toolbox-action',
//       label: 'Log State',
//       icon: Terminal,
//       handler: (api: EmbeddrAPI) => {
//         console.log('--- Embeddr State Debug ---')
//         console.log('Selected Image:', api.stores.global.selectedImage)
//         console.log(
//           'Selected Workflow:',
//           api.stores.generation.selectedWorkflow,
//         )
//         api.toast.info('State logged to console')
//       },
//     },
//   ],
// }

// --- Plugin 4: Zen Mode Core (Settings) ---
// export const ZenModeCorePlugin: PluginDefinition = {
//   id: 'core.zen-mode',
//   name: 'Zen Mode Core',
//   description: 'Core settings and features for Zen Mode',
//   version: '1.0.0',
//   settings: [
//     {
//       type: 'boolean',
//       key: 'showTimer',
//       label: 'Show Timer',
//       description: 'Display the generation timer in the toolbar',
//       defaultValue: true,
//     },
//     {
//       type: 'action',
//       key: 'clearCache',
//       label: 'Clear Cache',
//       description: 'Clear local generation cache',
//       action: (api) => api.toast.success('Cache cleared'),
//     },
//   ],
// }

export const DEFAULT_PLUGINS = [
  WorkflowInfoPlugin,
  RandomSeedPlugin,
  //   DebugLoggerPlugin,
  //   ZenModeCorePlugin,
]
