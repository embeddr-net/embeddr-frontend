import React, { useMemo } from 'react'
import { ConfigField } from './ConfigField'
import { type ConfigUI, type JsonSchema, normalizeSchemaType } from './schema'

type ConfigEditorProps = {
  value: Record<string, any>
  schema: JsonSchema
  ui: ConfigUI
  drafts: Record<string, string>
  errors: Record<string, string>
  onValueChange: (key: string, value: any) => void
  onDraftChange: (key: string, value: string) => void
}

function buildDraftValue(value: any, schemaProp: any, draft?: string) {
  if (draft !== undefined) return draft
  const type = normalizeSchemaType(schemaProp)
  if (type === 'object' || type === 'array') {
    const fallback = type === 'array' ? [] : {}
    return JSON.stringify(value ?? fallback, null, 2)
  }
  return ''
}

export function ConfigEditor({
  value,
  schema,
  ui,
  drafts,
  errors,
  onValueChange,
  onDraftChange,
}: ConfigEditorProps) {
  const schemaProps = schema?.properties || {}
  const orderedKeys = useMemo(() => {
    const keys = ui.order?.length ? ui.order : Object.keys(schemaProps)
    const baseKeys = keys.length ? keys : Object.keys(value)
    const arrayEditors = ui.arrayEditors || {}
    const hiddenKeys = new Set<string>()

    Object.values(arrayEditors).forEach((editor) => {
      if (editor?.defaultKeyField) {
        hiddenKeys.add(editor.defaultKeyField)
      }
      if (editor?.primary?.fields) {
        Object.values(editor.primary.fields).forEach((rootField) => {
          if (rootField) hiddenKeys.add(rootField)
        })
      }
    })

    return baseKeys.filter((key) => !hiddenKeys.has(key))
  }, [ui.order, ui.arrayEditors, schemaProps, value])

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {orderedKeys.map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <span className="text-[11px] text-muted-foreground">
            {schemaProps[key]?.title || key}
          </span>
          <ConfigField
            name={key}
            schemaProp={schemaProps[key]}
            widget={ui.widgets?.[key]}
            options={ui.options?.[key]}
            arrayEditor={ui.arrayEditors?.[key]}
            value={value[key]}
            draft={buildDraftValue(value[key], schemaProps[key], drafts[key])}
            error={errors[key]}
            rootValue={value}
            onRootValueChange={onValueChange}
            onValueChange={(next) => onValueChange(key, next)}
            onDraftChange={(next) => onDraftChange(key, next)}
          />
        </div>
      ))}
    </div>
  )
}
