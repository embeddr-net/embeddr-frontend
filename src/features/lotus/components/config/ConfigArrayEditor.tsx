import React from 'react'
import { Button } from '@embeddr/react-ui/components/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@embeddr/react-ui/components/accordion'
import { Input } from '@embeddr/react-ui/components/input'
import { Textarea } from '@embeddr/react-ui/components/textarea'
import { Switch } from '@embeddr/react-ui/components/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@embeddr/react-ui/components/select'
import { buildDefaultForSchema, normalizeSchemaType } from './schema'
import { ConfigObjectEditor } from './ConfigObjectEditor'

type ConfigArrayEditorProps = {
  items: any[]
  itemSchema: any
  arrayEditor?: {
    defaultKeyField?: string
    keyFields?: string[]
    label?: string
    primary?: {
      label?: string
      fields: Record<string, string>
    }
  }
  rootValue?: Record<string, any>
  onRootValueChange?: (key: string, value: any) => void
  onChange: (items: any[]) => void
}

function renderPrimitiveEditor(
  value: any,
  type: string,
  onChange: (next: any) => void,
  options?: Array<{ label: string; value: string }> | string[],
) {
  if (type === 'boolean') {
    return <Switch checked={Boolean(value)} onCheckedChange={onChange} />
  }

  if (type === 'number' || type === 'integer') {
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value
          onChange(next === '' ? null : Number(next))
        }}
      />
    )
  }

  const normalizedOptions = Array.isArray(options)
    ? options.map((opt) =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt,
      )
    : null

  if (normalizedOptions && normalizedOptions.length > 0) {
    return (
      <Select value={value ?? ''} onValueChange={(next) => onChange(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (type === 'string' && String(value || '').length > 60) {
    return (
      <Textarea
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 text-[11px]"
      />
    )
  }

  return (
    <Input
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function ConfigArrayEditor({
  items,
  itemSchema,
  arrayEditor,
  rootValue,
  onRootValueChange,
  onChange,
}: ConfigArrayEditorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const itemProps = itemSchema?.properties || {}
  const itemType =
    Object.keys(itemProps).length > 0
      ? 'object'
      : normalizeSchemaType(itemSchema)
  const defaultKeyField = arrayEditor?.defaultKeyField
  const keyFields = arrayEditor?.keyFields ?? [
    'label',
    'endpoint',
    'id',
    'name',
  ]
  const activeKey = defaultKeyField ? rootValue?.[defaultKeyField] : null
  const addItem = () => {
    const nextItem = buildDefaultForSchema(itemSchema)
    onChange([...(items || []), nextItem])
  }

  const removeItem = (index: number) => {
    const next = [...(items || [])]
    next.splice(index, 1)
    onChange(next)
  }

  const buildItemLabel = (item: Record<string, any>, index: number) => {
    if (keyFields.length > 0) {
      const parts = keyFields
        .map((fieldKey) => item?.[fieldKey])
        .filter(Boolean)
      if (parts.length > 0) return parts.join(' • ')
    }

    return `Item ${index + 1}`
  }

  const rowKeyFor = (row: Record<string, any>) => {
    for (const fieldKey of keyFields) {
      const value = String(row?.[fieldKey] ?? '').trim()
      if (value) return value
    }
    return ''
  }

  const isDefault = (rowKey: string) =>
    Boolean(defaultKeyField && rowKey && rowKey === activeKey)

  const setDefault = (rowKey: string) => {
    if (!defaultKeyField) return
    onRootValueChange?.(defaultKeyField, rowKey || null)
  }

  React.useEffect(() => {
    if (!items || items.length === 0) {
      setSelectedIndex(0)
      return
    }
    if (selectedIndex > items.length - 1) {
      setSelectedIndex(items.length - 1)
    }
  }, [items, selectedIndex])

  if (itemType === 'object') {
    const primaryFields = arrayEditor?.primary?.fields

    return (
      <div className="flex flex-col gap-2">
        {primaryFields && (
          <div className="rounded border border-muted/60 bg-muted/20 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                {arrayEditor?.primary?.label ?? 'Primary'}
              </div>
              {defaultKeyField && (
                <Button
                  type="button"
                  variant={
                    isDefault(
                      rowKeyFor(
                        Object.fromEntries(
                          Object.entries(primaryFields).map(
                            ([itemField, rootField]) => [
                              itemField,
                              rootValue?.[rootField],
                            ],
                          ),
                        ),
                      ),
                    )
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => {
                    const pseudoRow = Object.fromEntries(
                      Object.entries(primaryFields).map(
                        ([itemField, rootField]) => [
                          itemField,
                          rootValue?.[rootField],
                        ],
                      ),
                    )
                    const rowKey = rowKeyFor(pseudoRow)
                    if (!rowKey) return
                    setDefault(isDefault(rowKey) ? '' : rowKey)
                  }}
                >
                  {isDefault(
                    rowKeyFor(
                      Object.fromEntries(
                        Object.entries(primaryFields).map(
                          ([itemField, rootField]) => [
                            itemField,
                            rootValue?.[rootField],
                          ],
                        ),
                      ),
                    ),
                  )
                    ? 'Default'
                    : 'Make Default'}
                </Button>
              )}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {Object.entries(primaryFields).map(([itemField, rootField]) => {
                const schemaProp = itemProps[itemField]
                const fieldType = normalizeSchemaType(schemaProp)
                const fieldValue = rootValue?.[rootField]
                const label = schemaProp?.title || itemField

                return (
                  <div key={itemField} className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {label}
                    </span>
                    {fieldType === 'object' || fieldType === 'array' ? (
                      <Textarea
                        value={JSON.stringify(fieldValue ?? {}, null, 2)}
                        onChange={(event) => {
                          let nextValue: any = event.target.value
                          try {
                            nextValue = JSON.parse(event.target.value)
                          } catch {
                            nextValue = event.target.value
                          }
                          onRootValueChange?.(rootField, nextValue)
                        }}
                        className="min-h-20 text-[11px] font-mono"
                      />
                    ) : (
                      renderPrimitiveEditor(fieldValue, fieldType, (next) => {
                        onRootValueChange?.(rootField, next)
                      })
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div className="rounded border border-muted/60 bg-muted/20 p-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <Select
                value={String(selectedIndex)}
                onValueChange={(next) => setSelectedIndex(Number(next))}
              >
                <SelectTrigger className="h-8 w-full min-w-0 max-w-full">
                  <SelectValue placeholder="Select entry" />
                </SelectTrigger>
                <SelectContent>
                  {(items || []).map((item, index) => (
                    <SelectItem key={`item-${index}`} value={String(index)}>
                      {buildItemLabel(item || {}, index)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {defaultKeyField && items?.[selectedIndex] && (
                <Button
                  type="button"
                  variant={
                    isDefault(rowKeyFor(items[selectedIndex] || {}))
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => {
                    const rowKey = rowKeyFor(items[selectedIndex] || {})
                    if (!rowKey) return
                    setDefault(isDefault(rowKey) ? '' : rowKey)
                  }}
                >
                  {isDefault(rowKeyFor(items[selectedIndex] || {}))
                    ? 'Default'
                    : 'Make Default'}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(selectedIndex)}
                disabled={!items || items.length === 0}
              >
                Remove
              </Button>
            </div>
          </div>

          {items && items.length > 0 ? (
            <div className="mt-3">
              <ConfigObjectEditor
                value={items[selectedIndex] || {}}
                schema={itemSchema}
                onChange={(next) => {
                  const nextItems = [...(items || [])]
                  nextItems[selectedIndex] = next
                  onChange(nextItems)
                }}
              />
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-muted-foreground">
              No items yet.
            </div>
          )}
        </div>
        <Button variant="secondary" onClick={addItem}>
          Add Item
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded border border-muted/60 bg-muted/20 p-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <Select
              value={String(selectedIndex)}
              onValueChange={(next) => setSelectedIndex(Number(next))}
            >
              <SelectTrigger className="h-8 w-full min-w-0 max-w-full">
                <SelectValue placeholder="Select entry" />
              </SelectTrigger>
              <SelectContent>
                {(items || []).map((item, index) => (
                  <SelectItem key={`item-${index}`} value={String(index)}>
                    {buildItemLabel(
                      item && typeof item === 'object' && !Array.isArray(item)
                        ? (item as Record<string, any>)
                        : { value: item },
                      index,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(selectedIndex)}
              disabled={!items || items.length === 0}
            >
              Remove
            </Button>
          </div>
        </div>
        {items && items.length > 0 ? (
          <div className="mt-2">
            {items[selectedIndex] &&
            typeof items[selectedIndex] === 'object' &&
            !Array.isArray(items[selectedIndex]) ? (
              <ConfigObjectEditor
                value={items[selectedIndex]}
                schema={itemSchema}
                onChange={(next) => {
                  const nextItems = [...(items || [])]
                  nextItems[selectedIndex] = next
                  onChange(nextItems)
                }}
              />
            ) : (
              renderPrimitiveEditor(items[selectedIndex], itemType, (next) => {
                const nextItems = [...(items || [])]
                nextItems[selectedIndex] = next
                onChange(nextItems)
              })
            )}
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-muted-foreground">
            No items yet.
          </div>
        )}
      </div>
      <Button variant="secondary" onClick={addItem}>
        Add Item
      </Button>
    </div>
  )
}
