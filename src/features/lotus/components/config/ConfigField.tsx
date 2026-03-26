import React from 'react'
import { Input } from '@embeddr/react-ui/ui'
import { Textarea } from '@embeddr/react-ui/ui'
import { Switch } from '@embeddr/react-ui/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/ui'
import { normalizeSchemaType } from './schema'
import { ConfigArrayEditor } from './ConfigArrayEditor'
import { ConfigObjectEditor } from './ConfigObjectEditor'

type ConfigFieldProps = {
  name: string
  schemaProp?: any
  widget?: string
  options?: Array<{ label: string; value: string }> | string[]
  arrayEditor?: {
    defaultKeyField?: string
    keyFields?: string[]
    label?: string
    primary?: {
      label?: string
      fields: Record<string, string>
    }
  }
  value: any
  draft?: string
  error?: string
  rootValue?: Record<string, any>
  onRootValueChange?: (key: string, value: any) => void
  onValueChange: (value: any) => void
  onDraftChange?: (value: string) => void
}

function normalizeOptions(
  options?: Array<{ label: string; value: string }> | string[],
) {
  if (!options) return null
  if (Array.isArray(options) && options.length > 0) {
    if (typeof options[0] === 'string') {
      return (options as string[]).map((opt) => ({
        label: opt,
        value: opt,
      }))
    }
    return options as Array<{ label: string; value: string }>
  }
  return null
}

export function ConfigField({
  schemaProp,
  widget,
  options,
  arrayEditor,
  value,
  draft,
  error,
  rootValue,
  onRootValueChange,
  onValueChange,
  onDraftChange,
}: ConfigFieldProps) {
  const type = normalizeSchemaType(schemaProp)
  const enumOptions = schemaProp?.enum
  const selectOptions =
    normalizeOptions(options) ?? normalizeOptions(enumOptions)

  if (widget === 'checkbox' || type === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        onCheckedChange={(next) => onValueChange(next)}
      />
    )
  }

  if (widget === 'select' || selectOptions) {
    return (
      <Select value={value ?? ''} onValueChange={(next) => onValueChange(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          {(selectOptions || []).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (widget === 'json') {
    return (
      <div className="flex flex-col gap-1">
        <Textarea
          value={draft ?? ''}
          onChange={(event) => onDraftChange?.(event.target.value)}
          className="min-h-28 font-mono text-[11px]"
        />
        {error && <span className="text-[10px] text-red-500">{error}</span>}
      </div>
    )
  }

  if (type === 'object') {
    return (
      <ConfigObjectEditor
        value={(value as Record<string, any>) || {}}
        schema={schemaProp || {}}
        onChange={onValueChange}
      />
    )
  }

  if (type === 'array') {
    return (
      <ConfigArrayEditor
        items={Array.isArray(value) ? value : []}
        itemSchema={schemaProp?.items || {}}
        arrayEditor={arrayEditor}
        rootValue={rootValue}
        onRootValueChange={onRootValueChange}
        onChange={onValueChange}
      />
    )
  }

  if (type === 'number') {
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          onValueChange(next === '' ? null : Number(next))
        }}
      />
    )
  }

  if (widget === 'text-multi') {
    return (
      <Textarea
        value={value ?? ''}
        onChange={(event) => onValueChange(event.target.value)}
        className="min-h-20 text-[11px]"
      />
    )
  }

  return (
    <Input
      value={value ?? ''}
      onChange={(event) => onValueChange(event.target.value)}
    />
  )
}
