import React, { useMemo, useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import { Button } from '@embeddr/react-ui/components/ui'
import {
  Eye,
  EyeOff,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@embeddr/react-ui/components/ui'
import { usePluginStore } from '@/plugins/store'
import { Switch } from '@embeddr/react-ui/components/ui'
import { Label } from '@embeddr/react-ui/components/ui'
import { DEFAULT_WIDGETS } from '@/lib/commandBar/defaultWidgets'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface WidgetItem {
  id: string
  label: string
  defaultSection: 'left' | 'center' | 'right'
  defaultOrder: number
  scope?: 'zen' | 'global'
}

const buildPluginWidgetId = (pluginId: string, def: any) => {
  const base = def?.id || def?.exportName || def?.label || 'widget'
  return `plugin:${pluginId}/${base}`
}

export function VisualCommandBarEditor() {
  const {
    widgetConfig,
    updateWidgetConfig,
    commandBarShowDividers,
    setCommandBarShowDividers,
    commandBarCompact,
    setCommandBarCompact,
  } = useSettingsStore(
    useShallow((s) => ({
      widgetConfig: s.widgetConfig,
      updateWidgetConfig: s.updateWidgetConfig,
      commandBarShowDividers: s.commandBarShowDividers,
      setCommandBarShowDividers: s.setCommandBarShowDividers,
      commandBarCompact: s.commandBarCompact,
      setCommandBarCompact: s.setCommandBarCompact,
    })),
  )

  const { plugins, activePlugins } = usePluginStore(
    useShallow((s) => ({ plugins: s.plugins, activePlugins: s.activePlugins })),
  )
  const getComponents = usePluginStore((s) => s.getComponents)
  const [pinnedPanels] = useLocalStorage<string[]>('zen-pinned-panels', [])

  const pluginWidgets = useMemo(() => {
    const out: WidgetItem[] = []
    activePlugins.forEach((pluginId) => {
      const plugin = plugins[pluginId]
      if (!plugin?.components) return
      plugin.components.forEach((comp: any) => {
        if (comp.location !== 'command-bar-widget') return
        const id = buildPluginWidgetId(pluginId, comp)
        const label = comp.label || comp.name || comp.exportName || id
        const slot = comp.props?.slot || 'right'
        const order = comp.props?.order ?? 80
        out.push({
          id,
          label: `${label} (${pluginId})`,
          defaultSection: slot,
          defaultOrder: order,
        })
      })
    })
    return out
  }, [activePlugins, plugins])

  const pinnedPanelWidgets = useMemo(() => {
    if (!pinnedPanels.length) return []
    const overlays = getComponents('zen-overlay').filter(
      ({ def }) => !def.options?.spawnOnly,
    )
    const map = new Map(
      overlays.map(({ pluginId, def }) => [
        `${pluginId}-${def.id}`,
        { pluginId, def },
      ]),
    )
    return pinnedPanels
      .map((id, index) => {
        const entry = map.get(id)
        if (!entry) {
          return {
            id: `pinned-panel:${id}`,
            label: `Pinned Panel (${id})`,
            defaultSection: 'left' as const,
            defaultOrder: 100 + index,
            scope: 'zen' as const,
          }
        }
        const { pluginId, def } = entry
        const label = def.label || def.name || def.id || id
        return {
          id: `pinned-panel:${id}`,
          label: `${label} (Pinned)`,
          defaultSection: 'left' as const,
          defaultOrder: 100 + index,
          scope: 'zen' as const,
        }
      })
      .filter(Boolean) as WidgetItem[]
  }, [getComponents, pinnedPanels])

  const [draggedId, setDraggedId] = useState<string | null>(null)

  // Merge config with defaults to get current state for all widgets
  const currentWidgets = useMemo(() => {
    const base: WidgetItem[] = [
      ...DEFAULT_WIDGETS.map((w) => ({
        id: w.id,
        label: w.label,
        defaultSection: w.defaultSection,
        defaultOrder: w.defaultOrder,
        scope: w.scope,
      })),
      ...pluginWidgets,
      ...pinnedPanelWidgets,
    ]
    const seen = new Set<string>()
    const merged = base.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })

    return merged
      .map((w) => {
        const cfg = widgetConfig[w.id]
        return {
          ...w,
          section: cfg?.section ?? w.defaultSection,
          order: cfg?.order ?? w.defaultOrder,
          visible: cfg?.visible ?? true,
        }
      })
      .sort((a, b) => {
        // Sort by section first: left, center, right
        const sectionScore = (s: string) =>
          s === 'left' ? 0 : s === 'center' ? 1 : 2
        const scoreA = sectionScore(a.section)
        const scoreB = sectionScore(b.section)
        if (scoreA !== scoreB) return scoreA - scoreB
        return a.order - b.order
      })
  }, [pluginWidgets, pinnedPanelWidgets, widgetConfig])

  // Group into sections for the visualizer
  const leftWidgets = currentWidgets.filter((w) => w.section === 'left')
  const centerWidgets = currentWidgets.filter((w) => w.section === 'center')
  const rightWidgets = currentWidgets.filter((w) => w.section === 'right')

  const toggleVisibility = (id: string, currentVisible: boolean) => {
    updateWidgetConfig(id, { visible: !currentVisible })
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    // e.dataTransfer.setDragImage(e.target as Element, 0, 0)
  }

  const handleDragOver = (
    e: React.DragEvent,
    _targetSection: 'left' | 'center' | 'right',
    _targetOrder?: number,
  ) => {
    e.preventDefault()
    // In a real drag sort, we'd calculate generic index swaps.
    // Simplifying: Use buttons for refined movements if drag is too complex to implement 100% cleanly in one shot.
    // For now, let's just use buttons for moving left/right across sections/order to be safe and accessible,
    // but the user asked for drag.
  }

  const handleDrop = (
    e: React.DragEvent,
    targetSection: 'left' | 'center' | 'right',
  ) => {
    e.preventDefault()
    if (!draggedId) return

    // Move to end of target section
    const widgetsInTarget = currentWidgets.filter(
      (w) => w.section === targetSection,
    )
    const maxOrder =
      widgetsInTarget.length > 0
        ? Math.max(...widgetsInTarget.map((w) => w.order))
        : 0

    updateWidgetConfig(draggedId, {
      section: targetSection,
      order: maxOrder + 10,
    })
    setDraggedId(null)
  }

  const moveToSection = (id: string, section: 'left' | 'center' | 'right') => {
    // Find max order in that section
    const widgetsInTarget = currentWidgets.filter((w) => w.section === section)
    const maxOrder =
      widgetsInTarget.length > 0
        ? Math.max(...widgetsInTarget.map((w) => w.order))
        : 0
    updateWidgetConfig(id, { section, order: maxOrder + 10 })
  }

  const moveOrder = (id: string, d: number) => {
    // Find current widget
    const w = currentWidgets.find((x) => x.id === id)
    if (!w) return

    // Find neighbors in same section
    const inSection = currentWidgets.filter((x) => x.section === w.section)
    const idx = inSection.findIndex((x) => x.id === id)
    if (idx === -1) return

    const swapWith = inSection[idx + d]
    if (!swapWith) return

    // Swap orders
    const myOrder = w.order
    const theirOrder = swapWith.order

    // If orders are identical, nudge them apart
    if (myOrder === theirOrder) {
      updateWidgetConfig(id, { order: myOrder + (d > 0 ? 1 : -1) })
    } else {
      updateWidgetConfig(id, { order: theirOrder })
      updateWidgetConfig(swapWith.id, { order: myOrder })
    }
  }

  const resetWidget = (id: string) => {
    const w = currentWidgets.find((x) => x.id === id)
    if (!w) return
    updateWidgetConfig(id, {
      section: w.defaultSection,
      order: w.defaultOrder,
      visible: true,
    })
  }

  const resetAll = () => {
    currentWidgets.forEach((w) => {
      updateWidgetConfig(w.id, {
        section: w.defaultSection,
        order: w.defaultOrder,
        visible: true,
      })
    })
  }

  const WidgetPill = ({ w }: { w: (typeof currentWidgets)[0] }) => (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md border bg-card text-[11px] select-none hover:border-primary/50 transition-colors group',
        !w.visible && 'opacity-50 border-dashed',
      )}
      title={`${w.label} • ${w.section} • ${w.order}`}
    >
      <div
        className="cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(e) => handleDragStart(e, w.id)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/60" />
      </div>

      <span className="font-medium truncate max-w-[140px]">{w.label}</span>

      {w.scope === 'zen' && (
        <Badge variant="secondary" className="text-[9px] px-1 py-0">
          Zen
        </Badge>
      )}

      {(w.section !== w.defaultSection ||
        w.order !== w.defaultOrder ||
        w.visible !== true) && (
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          Custom
        </Badge>
      )}

      <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          title="Reset to default"
          onClick={() => resetWidget(w.id)}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          onClick={() => toggleVisibility(w.id, w.visible)}
        >
          {w.visible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          disabled={leftWidgets.indexOf(w) === 0 && w.section === 'left'}
          onClick={() => {
            const idx = leftWidgets.indexOf(w)
            if (w.section === 'left') {
              if (idx > 0) moveOrder(w.id, -1)
            } else if (w.section === 'center') {
              const cIdx = centerWidgets.indexOf(w)
              if (cIdx === 0) moveToSection(w.id, 'left')
              else moveOrder(w.id, -1)
            } else {
              const rIdx = rightWidgets.indexOf(w)
              if (rIdx === 0) moveToSection(w.id, 'center')
              else moveOrder(w.id, -1)
            }
          }}
        >
          <ArrowLeft className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          disabled={
            rightWidgets.indexOf(w) === rightWidgets.length - 1 &&
            w.section === 'right'
          }
          onClick={() => {
            if (w.section === 'left') {
              const idx = leftWidgets.indexOf(w)
              if (idx === leftWidgets.length - 1) moveToSection(w.id, 'center')
              else moveOrder(w.id, 1)
            } else if (w.section === 'center') {
              const idx = centerWidgets.indexOf(w)
              if (idx === centerWidgets.length - 1) moveToSection(w.id, 'right')
              else moveOrder(w.id, 1)
            } else {
              moveOrder(w.id, 1)
            }
          }}
        >
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )

  const SectionZone = ({
    title,
    widgets,
    section,
  }: {
    title: string
    widgets: typeof currentWidgets
    section: 'left' | 'center' | 'right'
  }) => (
    <div
      className="flex-1 min-h-20 border border-dashed rounded-lg p-2 flex flex-col gap-2 transition-colors hover:bg-muted/10"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, section)}
    >
      <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 text-center select-none">
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {widgets.map((w) => (
          <WidgetPill key={w.id} w={w} />
        ))}
        {widgets.length === 0 && (
          <span className="text-[11px] text-muted-foreground/40 text-center w-full py-3">
            Drag here
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 border rounded-md p-3 bg-background/50">
      <div className="flex items-center justify-between gap-4 px-1 pb-3 border-b">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Switch
              id="show-dividers"
              checked={commandBarShowDividers}
              onCheckedChange={(val) => setCommandBarShowDividers(val)}
            />
            <Label htmlFor="show-dividers" className="text-xs">
              Show Dividers
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="compact-mode"
              checked={commandBarCompact}
              onCheckedChange={(val) => setCommandBarCompact(val)}
            />
            <Label htmlFor="compact-mode" className="text-xs">
              Compact Mode
            </Label>
          </div>
        </div>

        <Button size="sm" variant="outline" onClick={resetAll}>
          Reset all
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SectionZone title="Left" widgets={leftWidgets} section="left" />
        <SectionZone title="Center" widgets={centerWidgets} section="center" />
        <SectionZone title="Right" widgets={rightWidgets} section="right" />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-center">
        Drag using the grip handle. Hover to show controls.
      </p>
    </div>
  )
}
