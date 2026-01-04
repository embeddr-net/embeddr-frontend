import React from 'react'
import { Input } from '@embeddr/react-ui/components/input'
import { Textarea } from '@embeddr/react-ui/components/textarea'

export function ZenInput({
  input,
  value: initialValue,
  onChange,
}: {
  input: any
  value: any
  onChange: (val: any) => void
}) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  // Debounce the onChange callback
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value, onChange, initialValue])

  const isString =
    input.type === 'STRING' ||
    input.type === 'text' ||
    typeof value === 'string'
  const isNumber =
    input.type === 'INT' || input.type === 'FLOAT' || typeof value === 'number'

  // Prefer Textarea for strings in Zen mode for better visibility
  if (isString && !isNumber) {
    return (
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[80px] bg-background/50 resize-y"
        placeholder={`Enter ${input.label}...`}
      />
    )
  }

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="bg-background/50"
      placeholder={`Enter ${input.label}...`}
      type={isNumber ? 'number' : 'text'}
    />
  )
}
