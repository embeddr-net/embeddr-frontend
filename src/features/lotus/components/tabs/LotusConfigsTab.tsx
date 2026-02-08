import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@embeddr/react-ui/components/card'
import { Button } from '@embeddr/react-ui/components/button'
import { Badge } from '@embeddr/react-ui/components/badge'
import { ScrollArea } from '@embeddr/react-ui/components/scroll-area'
import { toast } from 'sonner'
import { globalEventBus } from '@/lib/eventBus'
import { useEmbeddrAPI } from '@/plugins/store'
import { ConfigEditor } from '../config/ConfigEditor'
import {
  type ConfigUI,
  type JsonSchema,
  type LotusCapabilityLike,
  extractConfigDefaults,
  extractConfigSchema,
  extractConfigUI,
  normalizeSchemaType,
} from '../config/schema'

type ConfigGetResponse = {
  ok: boolean
  plugin_name: string
  config_id?: string | null
  scope: string
  scope_id?: string | null
  value: Record<string, any>
}

type ConfigSetResponse = {
  ok: boolean
  value: Record<string, any>
}

function parseJsonValue(value: string) {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Invalid JSON' }
  }
}

function ConfigAccordionItem({ cap }: { cap: LotusCapabilityLike }) {
  const api = useEmbeddrAPI()
  const pluginName =
    cap.plugin ||
    (cap.data?.plugin as string | undefined) ||
    (cap.data?.plugin_name as string | undefined)
  const [configValue, setConfigValue] = useState<Record<string, any>>({})
  const [lastSavedValue, setLastSavedValue] = useState<Record<string, any>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const schema = useMemo<JsonSchema>(() => extractConfigSchema(cap), [cap])
  const ui = useMemo<ConfigUI>(() => extractConfigUI(cap), [cap])
  const defaults = useMemo(() => extractConfigDefaults(cap) || {}, [cap])
  const schemaProps = schema?.properties || {}

  const getQuery = useQuery({
    queryKey: ['lotus', 'config', cap.id],
    queryFn: async () => {
      return api.lotus.invoke('embeddr-core.config.get', {
        plugin_name: pluginName,
        config_id: cap.id,
        scope: 'global',
        include_capability: true,
      }) as Promise<ConfigGetResponse>
    },
  })

  useEffect(() => {
    const value = (getQuery.data as ConfigGetResponse | undefined)?.value
    if (value === undefined) return
    const merged = { ...defaults, ...(value ?? {}) }
    setConfigValue(merged)
    setLastSavedValue(merged)
    const nextDrafts: Record<string, string> = {}
    Object.keys(merged).forEach((key) => {
      const type = normalizeSchemaType(schemaProps[key])
      if (type === 'object' || type === 'array') {
        nextDrafts[key] = JSON.stringify(
          merged[key] ?? (type === 'array' ? [] : {}),
          null,
          2,
        )
      }
    })
    setDrafts(nextDrafts)
    setErrors({})
  }, [getQuery.data, defaults, schemaProps])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (Object.keys(errors).length > 0) {
        throw new Error('Fix invalid fields before saving')
      }
      return api.lotus.invoke('embeddr-core.config.set', {
        plugin_name: pluginName,
        config_id: cap.id,
        scope: 'global',
        value: configValue,
      }) as Promise<ConfigSetResponse>
    },
    onSuccess: () => {
      toast.success('Config saved')
      setLastSavedValue(configValue)
      getQuery.refetch()
      globalEventBus.emit('lotus:config-updated', {
        pluginName,
        configId: cap.id,
        value: configValue,
      })
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save config')
    },
  })

  const hasChanges =
    JSON.stringify(configValue) !== JSON.stringify(lastSavedValue)

  const updateValue = (key: string, next: any) => {
    setConfigValue((prev) => ({ ...prev, [key]: next }))
  }

  const updateDraft = (key: string, next: string) => {
    setDrafts((prev) => ({ ...prev, [key]: next }))
    const parsed = parseJsonValue(next)
    if (parsed.ok) {
      setErrors((prev) => {
        const nextErrors = { ...prev }
        delete nextErrors[key]
        return nextErrors
      })
      setConfigValue((prev) => ({ ...prev, [key]: parsed.value }))
    } else {
      setErrors((prev) => ({ ...prev, [key]: parsed.error }))
    }
  }

  return (
    <AccordionItem value={cap.id} className="border-muted/40">
      <AccordionTrigger className="hover:no-underline px-2">
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-medium">{cap.title || cap.id}</span>
          <span className="text-[10px] text-muted-foreground">{cap.id}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3">
        <div className="flex flex-col gap-2 text-xs">
          {cap.description && (
            <div className="text-[11px] text-muted-foreground">
              {cap.description}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground">
            plugin: {pluginName || 'unknown'}
          </div>
          <ConfigEditor
            value={configValue}
            schema={schema}
            ui={ui}
            drafts={drafts}
            errors={errors}
            onValueChange={updateValue}
            onDraftChange={updateDraft}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending || Object.keys(errors).length > 0
              }
            >
              Save Config
            </Button>
            {Object.keys(defaults).length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setConfigValue(defaults)
                  const nextDrafts: Record<string, string> = {}
                  Object.keys(defaults).forEach((key) => {
                    const type = normalizeSchemaType(schemaProps[key])
                    if (type === 'object' || type === 'array') {
                      nextDrafts[key] = JSON.stringify(defaults[key], null, 2)
                    }
                  })
                  setDrafts(nextDrafts)
                  setErrors({})
                }}
              >
                Reset to Defaults
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setConfigValue(lastSavedValue)
                const nextDrafts: Record<string, string> = {}
                Object.keys(lastSavedValue).forEach((key) => {
                  const type = normalizeSchemaType(schemaProps[key])
                  if (type === 'object' || type === 'array') {
                    nextDrafts[key] = JSON.stringify(
                      lastSavedValue[key],
                      null,
                      2,
                    )
                  }
                })
                setDrafts(nextDrafts)
                setErrors({})
              }}
              disabled={!hasChanges}
            >
              Revert
            </Button>
            {hasChanges && (
              <Badge variant="outline" className="text-[10px]">
                Unsaved
              </Badge>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function LotusConfigsTab({
  configCapabilities,
}: {
  configCapabilities: LotusCapabilityLike[]
}) {
  return (
    <Card className="border-muted/60 flex h-full min-h-0 flex-col bg-transparent gap-3">
      <CardHeader>
        <CardTitle className="text-sm">Configuration Editor</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full rounded-md border">
          {configCapabilities.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              No configuration capabilities found.
            </div>
          ) : (
            <Accordion type="multiple" className="p-2">
              {configCapabilities.map((cap) => (
                <ConfigAccordionItem
                  key={cap.id}
                  cap={cap as LotusCapabilityLike}
                />
              ))}
            </Accordion>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
