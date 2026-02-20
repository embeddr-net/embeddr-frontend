import { useActionGraph } from '@/hooks/useActionGraph'
import { usePluginWorkflows } from '@/hooks/usePluginWorkflows'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@embeddr/react-ui/components/ui'
import { Button } from '@embeddr/react-ui/components/ui'
import { Input } from '@embeddr/react-ui/components/ui'
import { Label } from '@embeddr/react-ui/components/ui'
import { Spinner } from '@embeddr/react-ui/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/ui'
import { Switch } from '@embeddr/react-ui/components/ui'
import {
  Play,
  ArrowRight,
  Settings,
  Box,
  Database,
  FileImage,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  Type,
} from 'lucide-react'
import { ImageSelectorDialog } from '@/components/dialogs/ImageSelectorDialog'
import { Badge } from '@embeddr/react-ui/components/ui'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchAvailableActions,
  type AvailableAction,
} from '@/lib/api/endpoints/actions'
import { Checkbox } from '@embeddr/react-ui/components/ui'
import { toast } from 'sonner'
import { ScrollArea } from '@embeddr/react-ui/components/ui'

const getIconForPlugin = (pluginName: string) => {
  if (pluginName.includes('scraper')) return <Database className="h-4 w-4" />
  if (pluginName.includes('thumbnail')) return <FileImage className="h-4 w-4" />
  if (pluginName.includes('embed')) return <Box className="h-4 w-4" />
  if (pluginName.includes('comfy')) return <Settings className="h-4 w-4" />
  return <Box className="h-4 w-4" />
}

export const ActionGraphEditor = ({ artifactId }: { artifactId: string }) => {
  const {
    artifact,
    graph: initialGraph,
    isLoading,
    runGraph,
    isRunning,
    saveGraph,
    isSaving,
  } = useActionGraph(artifactId)

  const { lastMessage } = useWebSocket()

  // Local Graph State for Editing
  const [nodes, setNodes] = useState<any[]>([])
  const [isDirty, setIsDirty] = useState(false)

  // Execution State
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, string>>({})
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null,
  )
  const [logs, setLogs] = useState<string[]>([])
  const [globalInputs, setGlobalInputs] = useState<Record<string, any>>({})
  const [imageSelectorState, setImageSelectorState] = useState<{
    open: boolean
    nodeId: string | null
    key: string | null
  }>({ open: false, nodeId: null, key: null })

  // Available Actions
  const { data: availableActions, isLoading: actionsLoading } = useQuery({
    queryKey: ['available-actions'],
    queryFn: fetchAvailableActions,
  })

  // Workflow provider plugin workflows for selection inputs (registry-resolved)
  const { data: pluginWorkflows } = usePluginWorkflows()

  // Sync initial graph
  useEffect(() => {
    if (initialGraph?.nodes) {
      const loaded = JSON.parse(JSON.stringify(initialGraph.nodes))

      // Migration: Ensure schema validity (e.g. outputs array -> dict)
      loaded.forEach((n: any) => {
        if (Array.isArray(n.outputs)) {
          const newOutputs: any = {}
          n.outputs.forEach((k: string) => {
            newOutputs[k] = { type: 'artifact_refs', accepts: ['*'] }
          })
          n.outputs = newOutputs
        }
      })

      setNodes(loaded)
    }
  }, [initialGraph])

  // Sync Global Inputs Defaults
  useEffect(() => {
    const defaults: Record<string, any> = {}
    nodes.forEach((node) => {
      if (node.inputs) {
        Object.entries(node.inputs).forEach(([key, input]: [string, any]) => {
          if (input.exposed && input.value !== undefined) {
            const paramName = `${node.id}.${key}`
            defaults[paramName] = input.value
          }
        })
      }
    })
    setGlobalInputs((prev) => {
      const next = { ...prev }
      let changed = false
      Object.entries(defaults).forEach(([k, v]) => {
        if (next[k] === undefined) {
          next[k] = v
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [nodes])

  // WebSocket for Execution Updates
  useEffect(() => {
    if (!lastMessage) return
    const msg = lastMessage as any
    if (msg.type === 'execution_update') {
      const { id, node_id, status, primary_artifact_id } = msg.data
      if (id === currentExecutionId || primary_artifact_id === artifactId) {
        if (node_id) {
          setNodeStatuses((prev) => ({ ...prev, [node_id]: status }))
        }
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ${node_id || 'System'}: ${status}`,
        ])
      }
    }
  }, [lastMessage, currentExecutionId, artifactId])

  /* --- Graph Operations --- */

  const addNode = (action: AvailableAction) => {
    // Sanitize ID
    const safeName = action.name
      ? action.name.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'action'
    const newNodeId = `${safeName}_${nodes.length + 1}`

    const inputs: any = {}
    // Initialize inputs based on action definition
    if (action.inputs) {
      const inputKeys = Array.isArray(action.inputs)
        ? action.inputs
        : Object.keys(action.inputs)

      const schema = (action as any).payload_schema || {}

      inputKeys.forEach((key) => {
        const inputSchema = schema[key] || {}
        // Heuristic: if key contains 'seed', imply integer
        let type = inputSchema.type || 'string'
        if (!inputSchema.type) {
          if (
            key.toLowerCase().includes('seed') ||
            key.toLowerCase().includes('steps') ||
            key.toLowerCase().includes('width') ||
            key.toLowerCase().includes('height')
          ) {
            type = 'integer'
          }
        }

        inputs[key] = {
          type: type,
          value:
            inputSchema.default !== undefined
              ? inputSchema.default
              : type === 'integer'
                ? 0
                : '',
          link: null,
          exposed: false,
          schema: inputSchema,
        }
      })
    }

    // Initialize Outputs (convert array to dict if needed)
    const outputs: any = {}
    if (action.outputs) {
      if (Array.isArray(action.outputs)) {
        action.outputs.forEach((key: string) => {
          outputs[key] = {
            type: 'artifact_refs', // Default safest assumption
            accepts: ['*'],
            hidden: false,
          }
        })
      } else {
        // Deep copy definition
        Object.entries(action.outputs).forEach(([k, v]) => {
          outputs[k] = { ...v }
        })
      }
    }

    const newNode = {
      id: newNodeId,
      kind: 'plugin_action',
      plugin: action.plugin_name,
      action: action.job_type, // or action.name
      inputs,
      outputs,
      metadata: {
        ui: { x: 0, y: 0 },
      },
    }
    setNodes([...nodes, newNode])
    setIsDirty(true)
  }

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId))
    setIsDirty(true)
    // Also remove links to this node?
    // Ideally yes, but let's leave that for user to fix for now.
  }

  const updateNodeInput = (nodeId: string, inputKey: string, updates: any) => {
    setNodes(
      nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          inputs: {
            ...node.inputs,
            [inputKey]: {
              ...node.inputs[inputKey],
              ...updates,
            },
          },
        }
      }),
    )
    setIsDirty(true)
  }

  const handleSave = async () => {
    try {
      // Construct graph object
      // We might need to regenerate edges if the backend expects them explicitly
      // But based on usage, nodes with links inside inputs are key.
      const newGraph = {
        nodes,
        edges: [], // clear edges, let backend infer or ignore
        interface: initialGraph.interface || {}, // preserve interface
      }
      await saveGraph(newGraph)
      setIsDirty(false)
    } catch (e) {
      // Error handled in hook
    }
  }

  const handleRun = async () => {
    setLogs([])
    setNodeStatuses({})
    try {
      const res = await runGraph(globalInputs)
      if (res?.execution_id) setCurrentExecutionId(res.execution_id)
    } catch (e) {
      console.error(e)
      setLogs((prev) => [...prev, `[Error] Run failed: ${String(e)}`])
    }
  }

  if (isLoading)
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    )
  if (!artifact) return <div>Artifact not found</div>

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-1 p-1">
      {/* Header */}
      <div className="flex justify-between items-center bg-card p-4  border shadow-sm">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Box className="w-6 h-6" />
            {artifact.metadata_json?.name || artifact.id}
            {isDirty && <Badge variant="secondary">Unsaved Changes</Badge>}
          </h1>
          <p className="text-xs text-muted-foreground">
            {artifact.metadata_json?.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button onClick={handleRun} disabled={isRunning || isDirty}>
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Graph'}
          </Button>
        </div>
      </div>

      <div className="w-full p-1 h-full items-center justify-center flex flex-col">
        <div className="flex items-center justify-center  w-full h-full  flex-col gap-3">
          <div className="flex-1 flex gap-1 overflow-hidden">
            {/* Main Editor (Node List) */}
            <div className="flex-1 flex flex-col min-w-0">
              <ScrollArea className="flex-1 pr-4">
                <div className="flex flex-col gap-8 pb-20">
                  {nodes.length === 0 && (
                    <div className="text-center p-10 text-muted-foreground border-2 border-dashed ">
                      Graph is empty. Add actions from the right panel.
                    </div>
                  )}

                  {nodes.map((node, idx) => {
                    const status = nodeStatuses[node.id] || 'idle'
                    return (
                      <div key={node.id} className="relative group">
                        {/* Connector Line Visual */}
                        {idx > 0 && (
                          <div className="absolute -top-6 left-8 w-0.5 h-6 bg-border -z-10 group-hover:bg-primary/50 transition-colors" />
                        )}

                        <Card
                          className={`
                       transition-all duration-200
                       ${status === 'running' ? 'border-blue-500 ring-1 ring-blue-500' : ''}
                       ${status === 'completed' ? 'border-green-500' : ''}
                       ${status === 'failed' ? 'border-red-500' : ''}
                     `}
                        >
                          <CardHeader className="py-3 px-4 bg-muted/40 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className="bg-background"
                              >
                                {idx + 1}
                              </Badge>
                              <div className="font-medium flex items-center gap-2">
                                {getIconForPlugin(node.plugin)}
                                {node.id}
                                <span className="text-xs text-muted-foreground font-normal">
                                  ({node.plugin} / {node.action})
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeNode(node.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </CardHeader>

                          <CardContent className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Inputs */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                                Inputs
                              </h4>
                              {node.inputs &&
                                Object.entries(node.inputs).map(
                                  ([key, input]: [string, any]) => (
                                    <div
                                      key={key}
                                      className="bg-secondary/20 p-2  border text-sm space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium">
                                          {key}
                                        </Label>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant={
                                              input.link ? 'secondary' : 'ghost'
                                            }
                                            size="icon"
                                            className={`h-5 w-5 ${input.link ? 'text-primary' : 'text-muted-foreground'}`}
                                            onClick={() =>
                                              updateNodeInput(node.id, key, {
                                                link: input.link
                                                  ? null
                                                  : {
                                                      node_id: '',
                                                      output_port: '',
                                                    },
                                              })
                                            }
                                            title="Toggle Link"
                                          >
                                            <LinkIcon className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      {input.link ? (
                                        <div className="flex gap-2">
                                          <Select
                                            value={input.link.node_id}
                                            onValueChange={(val) =>
                                              updateNodeInput(node.id, key, {
                                                link: {
                                                  ...input.link,
                                                  node_id: val,
                                                },
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue placeholder="Node" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {nodes
                                                .filter((n) => n.id !== node.id)
                                                .map((n) => (
                                                  <SelectItem
                                                    key={n.id}
                                                    value={n.id}
                                                  >
                                                    {n.id}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>

                                          {/* If we had schema for outputs, we could show select. For now input text for port */}
                                          <Input
                                            className="h-7 text-xs"
                                            placeholder="Output Port"
                                            value={input.link.output_port || ''}
                                            onChange={(e) =>
                                              updateNodeInput(node.id, key, {
                                                link: {
                                                  ...input.link,
                                                  output_port: e.target.value,
                                                },
                                              })
                                            }
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex gap-2 items-center">
                                          {/* Dynamic Control based on Type */}
                                          {(() => {
                                            const type = input.type || 'string'
                                            const isNumber =
                                              type === 'integer' ||
                                              type === 'number'
                                            const isBool = type === 'boolean'
                                            const isImage =
                                              type === 'image' ||
                                              type === 'artifact' ||
                                              type === 'artifact:image'
                                            const isReadOnly =
                                              input.schema?.readOnly

                                            // Special Handling for Options Source or Heuristic Name
                                            const isWorkflowSelector =
                                              input.schema?.options_source ===
                                                'comfy:workflows' ||
                                              input.schema?.options_source ===
                                                'artifact:action:comfy.workflow' ||
                                              (node.action ===
                                                'comfy_run_workflow' &&
                                                key === 'workflow_name') ||
                                              (node.action === 'run_workflow' &&
                                                key === 'workflow_artifact_id')

                                            if (
                                              isWorkflowSelector &&
                                              pluginWorkflows
                                            ) {
                                              return (
                                                <Select
                                                  disabled={isReadOnly}
                                                  value={input.value || ''}
                                                  onValueChange={(val) => {
                                                    updateNodeInput(
                                                      node.id,
                                                      key,
                                                      {
                                                        value: val,
                                                      },
                                                    )
                                                  }}
                                                >
                                                  <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue placeholder="Select Workflow..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {pluginWorkflows.map(
                                                      (wf) => (
                                                        <SelectItem
                                                          key={String(
                                                            wf.id ?? wf.name,
                                                          )}
                                                          value={String(
                                                            wf.name ?? wf.id,
                                                          )}
                                                        >
                                                          {wf.name ?? wf.id}
                                                        </SelectItem>
                                                      ),
                                                    )}
                                                  </SelectContent>
                                                </Select>
                                              )
                                            }
                                            if (isImage) {
                                              return (
                                                <div className="flex gap-2 w-full">
                                                  <Input
                                                    disabled={isReadOnly}
                                                    value={
                                                      typeof input.value ===
                                                      'object'
                                                        ? JSON.stringify(
                                                            input.value,
                                                          )
                                                        : (input.value ?? '')
                                                    }
                                                    onChange={(e) =>
                                                      updateNodeInput(
                                                        node.id,
                                                        key,
                                                        {
                                                          value: e.target.value,
                                                        },
                                                      )
                                                    }
                                                    placeholder="Artifact ID or Path..."
                                                    className="h-7 text-xs font-mono flex-1"
                                                  />
                                                  <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() =>
                                                      setImageSelectorState({
                                                        open: true,
                                                        nodeId: node.id,
                                                        key,
                                                      })
                                                    }
                                                    title="Select Image from Library"
                                                  >
                                                    <FileImage className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              )
                                            }
                                            if (isBool) {
                                              return (
                                                <div className="flex items-center h-7">
                                                  <Switch
                                                    disabled={isReadOnly}
                                                    checked={!!input.value}
                                                    onCheckedChange={(c) =>
                                                      updateNodeInput(
                                                        node.id,
                                                        key,
                                                        { value: c },
                                                      )
                                                    }
                                                  />
                                                </div>
                                              )
                                            }

                                            return (
                                              <Input
                                                disabled={isReadOnly}
                                                type={
                                                  isNumber ? 'number' : 'text'
                                                }
                                                className="h-7 text-xs font-mono"
                                                value={
                                                  typeof input.value ===
                                                  'object'
                                                    ? JSON.stringify(
                                                        input.value,
                                                      )
                                                    : (input.value ?? '')
                                                }
                                                onChange={(e) =>
                                                  updateNodeInput(
                                                    node.id,
                                                    key,
                                                    {
                                                      value: isNumber
                                                        ? Number(e.target.value)
                                                        : e.target.value,
                                                    },
                                                  )
                                                }
                                                placeholder="Value..."
                                              />
                                            )
                                          })()}

                                          <Checkbox
                                            checked={input.exposed}
                                            onCheckedChange={(c) =>
                                              updateNodeInput(node.id, key, {
                                                exposed: !!c,
                                              })
                                            }
                                            title="Expose as Global Input"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ),
                                )}
                              {(!node.inputs ||
                                Object.keys(node.inputs).length === 0) && (
                                <div className="text-xs text-muted-foreground italic">
                                  No inputs defined
                                </div>
                              )}
                            </div>

                            {/* Outputs (Read-only view for now) */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                                Outputs
                              </h4>
                              <div className="space-y-1">
                                {node.outputs &&
                                  Object.keys(node.outputs).map((outKey) => (
                                    <div
                                      key={outKey}
                                      className="flex justify-between items-center text-xs bg-muted/30 p-1.5  border border-transparent"
                                    >
                                      <span>{outKey}</span>
                                      <div className="w-2 h-2  bg-blue-400" />
                                    </div>
                                  ))}
                                {(!node.outputs ||
                                  Object.keys(node.outputs).length === 0) && (
                                  <div className="text-xs text-muted-foreground italic">
                                    No outputs defined
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Global Inputs / Run Params (Bottom Panel) */}
              <div className="border-t bg-card h-48 flex flex-col mt-4  overflow-hidden">
                <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase flex justify-between items-center">
                  <span>Input Parameters & Logs</span>
                  {isRunning && (
                    <span className="animate-pulse text-blue-500">
                      Executing...
                    </span>
                  )}
                </div>
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-1/3 border-r p-4 overflow-y-auto space-y-3">
                    <h5 className="text-xs font-bold text-muted-foreground">
                      Global Inputs
                    </h5>
                    {nodes
                      .flatMap((n) =>
                        Object.entries(n.inputs).map(
                          ([k, v]: [string, any]) => ({
                            nodeId: n.id,
                            port: k,
                            ...v,
                          }),
                        ),
                      )
                      .filter((i) => i.exposed).length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">
                        Check "Expose" on node inputs to invoke them here.
                      </div>
                    ) : (
                      nodes.flatMap((n) =>
                        Object.entries(n.inputs).map(
                          ([k, v]: [string, any]) => {
                            if (!v.exposed) return null
                            const paramName = `${n.id}.${k}`
                            return (
                              <div key={paramName}>
                                <Label className="text-xs">{paramName}</Label>
                                <Input
                                  className="h-7 text-xs"
                                  value={globalInputs[paramName] || ''}
                                  onChange={(e) =>
                                    setGlobalInputs((prev) => ({
                                      ...prev,
                                      [paramName]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            )
                          },
                        ),
                      )
                    )}
                  </div>
                  <div className="flex-1 bg-black/95 text-green-400 font-mono text-xs p-4 overflow-y-auto">
                    {logs.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                    {logs.length === 0 && (
                      <span className="opacity-30">
                        Waiting for execution logs...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Palette */}
            <div className="w-64 bg-card border  flex flex-col shadow-sm">
              <div className="p-3 border-b bg-muted/40 font-semibold text-sm">
                Action Palette
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {actionsLoading ? (
                    <Spinner />
                  ) : (
                    availableActions?.map((action, i) => (
                      <div
                        key={i}
                        className="border  bg-background p-2 hover:border-primary/50 transition-colors cursor-pointer group"
                        onClick={() => addNode(action)}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm text-foreground/90">
                            {action.name || action.job_type}
                          </span>
                          <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate wrap-break-word whitespace-pre-wrap">
                          {action.description}
                        </div>
                        <div className="text-[10px] text-muted-foreground/50 mt-1 uppercase">
                          {action.plugin_name}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
      <ImageSelectorDialog
        open={imageSelectorState.open}
        onOpenChange={(open) =>
          setImageSelectorState((prev) => ({ ...prev, open }))
        }
        onSelect={(img) => {
          if (imageSelectorState.nodeId && imageSelectorState.key) {
            // Determine what to save. If the input expects an Artifact ID (UUID), use img.id
            // If it expects a path and we have a path, use a path?
            // Ideally we standardize on Artifact IDs or URIs.
            // transform plugin expects artifact usage if possible.
            updateNodeInput(imageSelectorState.nodeId, imageSelectorState.key, {
              value: img.id,
            })
            setImageSelectorState({ open: false, nodeId: null, key: null })
          }
        }}
      />
    </div>
  )
}
