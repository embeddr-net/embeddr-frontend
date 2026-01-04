import React, { useEffect, useMemo, useState } from 'react'
import { Input } from '@embeddr/react-ui/components/input'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import { Button } from '@embeddr/react-ui/components/button'
import { Switch } from '@embeddr/react-ui/components/switch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@embeddr/react-ui/components/tabs'
import { Badge } from '@embeddr/react-ui/components/badge'
import { Bot, Eye, EyeOff, Loader2, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@embeddr/react-ui/components/label'
import { useUpdateWorkflow, useWorkflow } from '@/hooks/useWorkflows'
import { getObjectInfo } from '@/lib/api/endpoints/comfy'

interface WorkflowEditorProps {
  workflowId: number
}

interface ComfyNode {
  inputs: Record<string, any>
  class_type: string
  _meta?: { title?: string }
}

type ComfyWorkflow = Record<string, ComfyNode>

interface ExposedInput {
  node_id: string
  field: string
  type: string
  label: string
  description?: string
  enabled: boolean
  mcp_enabled: boolean
  zen_enabled?: boolean
  order: number
}

export default function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const { data: workflow, isLoading } = useWorkflow(workflowId)
  const updateWorkflow = useUpdateWorkflow()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [exposedInputs, setExposedInputs] = useState<Array<ExposedInput>>([])
  const [objectInfo, setObjectInfo] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    getObjectInfo().then(setObjectInfo).catch(console.error)
  }, [])

  useEffect(() => {
    if (workflow) {
      setName(workflow.name)
      setDescription(workflow.description || '')
      setIsActive(workflow.is_active ?? true)

      // Handle legacy object format or new array format
      const inputs = workflow.meta?.exposed_inputs
      if (Array.isArray(inputs)) {
        setExposedInputs(inputs)
      } else if (inputs && typeof inputs === 'object') {
        // Convert legacy object to array
        const newInputs: Array<ExposedInput> = []
        Object.entries(inputs).forEach(([nodeId, fields]: [string, any]) => {
          Object.entries(fields).forEach(([field, meta]: [string, any]) => {
            newInputs.push({
              node_id: nodeId,
              field,
              type: meta.type || 'string',
              label: field,
              description: meta.description,
              enabled: true,
              mcp_enabled: true, // Default to true for legacy
              zen_enabled: false,
              order: newInputs.length,
            })
          })
        })
        setExposedInputs(newInputs)
      } else {
        setExposedInputs([])
      }
    }
  }, [workflow])

  const handleSave = async () => {
    if (!workflow) return
    try {
      await updateWorkflow.mutateAsync({
        id: workflow.id,
        data: {
          name,
          description,
          is_active: isActive,
          meta: {
            ...workflow.meta,
            exposed_inputs: exposedInputs,
          },
        },
      })
      toast.success('Workflow saved')
    } catch (error) {
      toast.error('Failed to save workflow')
    }
  }

  const nodes = useMemo(() => {
    if (!workflow?.data) return []

    // Handle Standard Format
    if ('nodes' in workflow.data && Array.isArray(workflow.data.nodes)) {
      // Extract subgraph definitions if available
      const subgraphDefs: Record<string, any> = {}
      if (
        'definitions' in workflow.data &&
        (workflow.data.definitions)?.subgraphs
      ) {
        ;(workflow.data.definitions).subgraphs.forEach((sg: any) => {
          // Convert subgraph inputs to object info format
          const required: Record<string, any> = {}
          if (sg.inputs) {
            sg.inputs.forEach((inp: any) => {
              // Subgraph inputs are usually typed
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

      // Merge global object info with subgraph definitions
      const effectiveObjectInfo = { ...(objectInfo || {}), ...subgraphDefs }

      return workflow.data.nodes.map((node: any) => {
        const inputs: Record<string, any> = {}

        if (effectiveObjectInfo[node.type]) {
          const nodeDef = effectiveObjectInfo[node.type]
          const required = nodeDef.input?.required || {}
          const optional = nodeDef.input?.optional || {}
          // Combine required and optional, preserving order of required
          const allInputs = { ...required, ...optional }

          // Map widgets_values to inputs
          const linkedInputs = new Set()
          if (node.inputs) {
            node.inputs.forEach((inp: any) => {
              if (inp.link) linkedInputs.add(inp.name)
            })
          }

          const widgetsValues = node.widgets_values || []

          // Check for proxyWidgets (Subgraph Group Node)
          const proxyWidgets = (node.properties)?.proxyWidgets
          if (proxyWidgets && Array.isArray(proxyWidgets)) {
            proxyWidgets.forEach((mapping: Array<any>, idx: number) => {
              const name = mapping[1]
              if (idx < widgetsValues.length) {
                inputs[name] = widgetsValues[idx]
              } else {
                // Provide default value so it appears in the editor
                if (name === 'seed' || name === 'noise_seed') inputs[name] = 0
                else if (name === 'steps') inputs[name] = 20
                else if (name === 'cfg') inputs[name] = 8.0
                else if (name === 'control_after_generate')
                  inputs[name] = 'randomize'
                else inputs[name] = ''
              }
            })
          } else {
            let widgetIdx = 0

            Object.entries(allInputs).forEach(
              ([name, config]: [string, any]) => {
                // Check if it's a widget
                // config is usually [TYPE, {options}]
                const typeName = Array.isArray(config) ? config[0] : config
                let isWidget = false

                if (Array.isArray(typeName))
                  isWidget = true // Combo is always a widget
                else if (
                  typeof typeName === 'string' &&
                  ['INT', 'FLOAT', 'STRING', 'BOOLEAN'].includes(typeName)
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
        }

        return {
          id: String(node.id),
          title:
            node.title ||
            effectiveObjectInfo[node.type]?.display_name ||
            node.type,
          class_type: node.type,
          inputs,
          isStandard: true,
        }
      })
    }

    const data = workflow.data as ComfyWorkflow
    return Object.entries(data).map(([id, node]) => ({
      id,
      ...node,
      title: node._meta?.title || node.class_type,
    }))
  }, [workflow?.data, objectInfo])

  const updateInputConfig = (
    nodeId: string,
    field: string,
    updates: Partial<ExposedInput>,
    defaultValue: any,
  ) => {
    setExposedInputs((prev) => {
      const index = prev.findIndex(
        (i) => i.node_id === nodeId && i.field === field,
      )
      if (index >= 0) {
        const newInputs = [...prev]
        newInputs[index] = { ...newInputs[index], ...updates }
        return newInputs
      } else {
        // Create new config
        let type: string = typeof defaultValue
        if (field === 'image_url' || field === 'image') type = 'image'
        if (field === 'image_id') type = 'image_id'

        return [
          ...prev,
          {
            node_id: nodeId,
            field,
            type,
            label: field,
            description: '',
            enabled: false,
            mcp_enabled: false,
            order: prev.length,
            zen_enabled: false,
            ...updates,
          },
        ]
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!workflow) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-card flex items-start justify-between gap-4 shrink-0">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="wf-name" className="sr-only">
              Name
            </Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold h-auto py-1 px-2 -ml-2 border-transparent hover:border-input focus:border-input transition-colors"
            />
            {'nodes' in (workflow.data || {}) && (
              <Badge variant="secondary" className="ml-2">
                Standard Format
              </Badge>
            )}
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="resize-none h-16 text-sm text-muted-foreground min-h-[60px]"
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="is-active"
              className="text-sm text-muted-foreground"
            >
              Active
            </Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <Button onClick={handleSave} disabled={updateWorkflow.isPending}>
            {updateWorkflow.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="comfy" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-4 border-b bg-muted/10">
          <TabsList>
            <TabsTrigger value="comfy" className="gap-2">
              <Settings2 className="w-4 h-4" />
              ComfyUI Settings
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2">
              <Bot className="w-4 h-4" />
              MCP Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <TabsContent value="comfy" className="mt-0 space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">ComfyUI Inputs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select which inputs should be exposed in the Generation UI.
                </p>
                <NodeList
                  nodes={nodes}
                  exposedInputs={exposedInputs}
                  onUpdate={updateInputConfig}
                  mode="comfy"
                />
              </div>
            </TabsContent>

            <TabsContent value="mcp" className="mt-0 space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">MCP Inputs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select which inputs should be exposed to the AI Agent. Add
                  descriptions to help the agent understand what each input
                  controls.
                </p>
                <NodeList
                  nodes={nodes}
                  exposedInputs={exposedInputs}
                  onUpdate={updateInputConfig}
                  mode="mcp"
                />
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

function NodeList({
  nodes,
  exposedInputs,
  onUpdate,
  mode,
}: {
  nodes: Array<any>
  exposedInputs: Array<ExposedInput>
  onUpdate: (
    nodeId: string,
    field: string,
    updates: Partial<ExposedInput>,
    defaultValue: any,
  ) => void
  mode: 'comfy' | 'mcp'
}) {
  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {nodes.map((node) => {
        // If standard format but we failed to map inputs (e.g. objectInfo missing), show warning
        // But if inputs are mapped, treat as normal node
        const hasInputs = Object.keys(node.inputs || {}).length > 0

        if (node.isStandard && !hasInputs) {
          // Only show if we really can't do anything
          return null
        }

        const primitiveInputs = Object.entries(node.inputs || {}).filter(
          ([_, value]) => !Array.isArray(value) && typeof value !== 'object',
        )

        if (primitiveInputs.length === 0) return null

        const exposedCount = exposedInputs.filter(
          (i) =>
            i.node_id === node.id &&
            (mode === 'comfy' ? i.enabled : i.mcp_enabled),
        ).length

        return (
          <AccordionItem
            key={node.id}
            value={node.id}
            className="border px-4 bg-card border-b!"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className="font-medium">{node.title}</span>
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground"
                >
                  ID: {node.id}
                </Badge>
                {exposedCount > 0 && (
                  <Badge variant="secondary" className="ml-auto mr-4">
                    {exposedCount} exposed
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 space-y-4">
              {primitiveInputs.map(([key, value]) => {
                const config = exposedInputs.find(
                  (i) => i.node_id === node.id && i.field === key,
                )
                const isExposed =
                  mode === 'comfy' ? config?.enabled : config?.mcp_enabled

                return (
                  <div
                    key={key}
                    className="flex items-start gap-4 p-3 border bg-background/50"
                  >
                    <div className="pt-1">
                      <Switch
                        checked={!!isExposed}
                        onCheckedChange={(checked) =>
                          onUpdate(
                            node.id,
                            key,
                            {
                              [mode === 'comfy' ? 'enabled' : 'mcp_enabled']:
                                checked,
                            },
                            value,
                          )
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{key}</Label>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                          Current: {String(value)}
                        </span>
                      </div>

                      {isExposed && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                          {mode === 'comfy' ? (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Label
                                </Label>
                                <Input
                                  placeholder="Label in UI"
                                  value={config?.label || key}
                                  onChange={(e) =>
                                    onUpdate(
                                      node.id,
                                      key,
                                      { label: e.target.value },
                                      value,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`zen-${node.id}-${key}`}
                                  checked={!!config?.zen_enabled}
                                  onCheckedChange={(checked) =>
                                    onUpdate(
                                      node.id,
                                      key,
                                      { zen_enabled: checked },
                                      value,
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`zen-${node.id}-${key}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Show in Zen Mode
                                </Label>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Description for AI
                              </Label>
                              <Input
                                placeholder={`Describe what '${key}' controls...`}
                                value={config?.description || ''}
                                onChange={(e) =>
                                  onUpdate(
                                    node.id,
                                    key,
                                    { description: e.target.value },
                                    value,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="pt-1 text-muted-foreground">
                      {isExposed ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4 opacity-20" />
                      )}
                    </div>
                  </div>
                )
              })}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
