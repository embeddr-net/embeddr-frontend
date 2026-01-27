import React from 'react'
import { ConfigEditor } from './ConfigEditor'
import type { ConfigUI, JsonSchema } from './schema'

type ConfigObjectEditorProps = {
  value: Record<string, any>
  schema: JsonSchema
  ui?: ConfigUI
  onChange: (value: Record<string, any>) => void
}

export function ConfigObjectEditor({
  value,
  schema,
  ui,
  onChange,
}: ConfigObjectEditorProps) {
  const handleValueChange = (key: string, next: any) => {
    onChange({ ...value, [key]: next })
  }

  const handleDraftChange = (_key: string, _next: string) => {
    // Draft handling is managed by the parent if needed.
  }

  return (
    <ConfigEditor
      value={value}
      schema={schema}
      ui={ui || {}}
      drafts={{}}
      errors={{}}
      onValueChange={handleValueChange}
      onDraftChange={handleDraftChange}
    />
  )
}
