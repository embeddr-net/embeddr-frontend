import React from 'react'
import {
  checkHotkey,
  formatForDisplay,
  type Hotkey,
} from '@tanstack/react-hotkeys'
import { Button } from '@embeddr/react-ui/ui'
import { Badge } from '@embeddr/react-ui/ui'
import { toast } from 'sonner'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  getDefaultHotkeyBinding,
  getEffectiveHotkeyBinding,
  HOTKEY_OVERRIDES_STORAGE_KEY,
  listHotkeyBindings,
  type HotkeyActionId,
  type HotkeyOverrides,
} from '@/lib/hotkeys/registry'

const isModifierOnly = (key: string) => {
  return key === 'Meta' || key === 'Control' || key === 'Alt' || key === 'Shift'
}

const normalizeKey = (event: React.KeyboardEvent) => {
  const key = event.key
  if (key === ' ') return 'Space'
  if (key === 'Esc') return 'Escape'
  if (key.length === 1) {
    if (/^[a-z]$/i.test(key)) return key.toUpperCase()
    return key
  }
  return key
}

const toHotkeyFromKeyboardEvent = (event: React.KeyboardEvent): Hotkey | null => {
  const key = normalizeKey(event)
  if (isModifierOnly(key)) return null

  const modifiers: Array<string> = []
  const hasSinglePrimary = (event.metaKey || event.ctrlKey) && !(event.metaKey && event.ctrlKey)

  if (hasSinglePrimary) {
    modifiers.push('Mod')
  } else {
    if (event.ctrlKey) modifiers.push('Control')
    if (event.metaKey) modifiers.push('Meta')
  }

  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')

  const hotkey = [...modifiers, key].join('+') as Hotkey
  if (!checkHotkey(hotkey)) return null

  return hotkey
}

export function HotkeysSettings() {
  const [recordingActionId, setRecordingActionId] = React.useState<HotkeyActionId | null>(
    null,
  )
  const [hotkeyOverrides, setHotkeyOverrides] = useLocalStorage<HotkeyOverrides>(
    HOTKEY_OVERRIDES_STORAGE_KEY,
    {},
  )

  const bindings = React.useMemo(() => listHotkeyBindings(), [])

  const resolveCombo = React.useCallback(
    (actionId: HotkeyActionId) => getEffectiveHotkeyBinding(actionId, hotkeyOverrides),
    [hotkeyOverrides],
  )

  const setBinding = React.useCallback(
    (actionId: HotkeyActionId, hotkey: Hotkey) => {
      const conflict = bindings.find(
        (binding) =>
          binding.id !== actionId &&
          resolveCombo(binding.id).toLowerCase() === hotkey.toLowerCase(),
      )

      if (conflict) {
        toast.error(`Conflicts with ${conflict.description}`)
        return false
      }

      const defaultHotkey = getDefaultHotkeyBinding(actionId)
      setHotkeyOverrides((prev) => {
        if (hotkey.toLowerCase() === defaultHotkey.toLowerCase()) {
          const { [actionId]: _ignored, ...rest } = prev
          return rest
        }
        return {
          ...prev,
          [actionId]: hotkey,
        }
      })
      return true
    },
    [bindings, resolveCombo, setHotkeyOverrides],
  )

  const resetAll = React.useCallback(() => {
    setHotkeyOverrides({})
    setRecordingActionId(null)
  }, [setHotkeyOverrides])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Keybinds
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            Experimental
          </Badge>
          <Button variant="outline" size="sm" onClick={resetAll}>
            Reset all
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Click Rebind, then press a new shortcut. Press Escape to cancel recording.
      </p>

      <div className="space-y-2">
        {bindings.map((binding) => {
          const combo = resolveCombo(binding.id)
          const isOverride = combo !== getDefaultHotkeyBinding(binding.id)
          const isRecording = recordingActionId === binding.id

          return (
            <div
              key={binding.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{binding.description}</div>
                <div className="text-xs text-muted-foreground truncate">{binding.id}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={isOverride ? 'default' : 'outline'}>
                  {formatForDisplay(combo)}
                </Badge>
                {isOverride ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const defaultHotkey = getDefaultHotkeyBinding(binding.id)
                      setBinding(binding.id, defaultHotkey)
                    }}
                  >
                    Reset
                  </Button>
                ) : null}
                <Button
                  variant={isRecording ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setRecordingActionId(isRecording ? null : binding.id)
                  }}
                  onKeyDown={(event) => {
                    if (!isRecording) return
                    event.preventDefault()
                    event.stopPropagation()

                    if (event.key === 'Escape') {
                      setRecordingActionId(null)
                      return
                    }

                    const next = toHotkeyFromKeyboardEvent(event)
                    if (!next) {
                      toast.error('Invalid shortcut')
                      return
                    }

                    const didSet = setBinding(binding.id, next)
                    if (didSet) {
                      setRecordingActionId(null)
                      toast.success(`Set ${binding.description} to ${formatForDisplay(next)}`)
                    }
                  }}
                >
                  {isRecording ? 'Press keys…' : 'Rebind'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
