import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useWindowStore } from '@/store/windowStore'
import { useTilingStore } from '@/store/tilingStore'
import { Button } from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@embeddr/react-ui/ui'
import {
  Check,
  Copy,
  LayoutDashboard,
  Lock,
  Pencil,
  Plus,
  Save,
  Trash2,
  Unlock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'list' | 'create' | 'rename'

export function WorkspaceWidget() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('list')
  const [inputValue, setInputValue] = useState('')
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    activeWorkspaceId,
    isLocked,
    toggleLocked,
    listWorkspaces,
    createWorkspace,
    saveActiveWorkspace,
    setActiveWorkspace,
    renameWorkspace,
    cloneWorkspace,
    deleteWorkspace,
  } = useWorkspaceStore()

  const workspaces = listWorkspaces()
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  // Dirty detection: subscribe to windowStore and tilingStore changes
  const savedAtRef = useRef(0)

  useEffect(() => {
    if (activeWorkspace) {
      savedAtRef.current = activeWorkspace.updatedAt
      setIsDirty(false)
    }
  }, [activeWorkspace?.updatedAt, activeWorkspaceId])

  useEffect(() => {
    const unsub1 = useWindowStore.subscribe(() => {
      if (savedAtRef.current > 0) setIsDirty(true)
    })
    const unsub2 = useTilingStore.subscribe(() => {
      if (savedAtRef.current > 0) setIsDirty(true)
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  const handleSave = useCallback(() => {
    saveActiveWorkspace()
    setIsDirty(false)
  }, [saveActiveWorkspace])

  const handleCreate = useCallback(() => {
    const name = inputValue.trim()
    if (!name) return
    createWorkspace(name, { fromCurrent: true })
    setInputValue('')
    setView('list')
  }, [inputValue, createWorkspace])

  const handleRename = useCallback(() => {
    const name = inputValue.trim()
    if (!name || !renameTargetId) return
    renameWorkspace(renameTargetId, name)
    setInputValue('')
    setRenameTargetId(null)
    setView('list')
  }, [inputValue, renameTargetId, renameWorkspace])

  const handleSwitch = useCallback(
    (id: string) => {
      if (id === activeWorkspaceId) return
      setActiveWorkspace(id)
      setIsDirty(false)
      setOpen(false)
    },
    [activeWorkspaceId, setActiveWorkspace],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (workspaces.length <= 1) return
      deleteWorkspace(id)
    },
    [deleteWorkspace, workspaces.length],
  )

  // Focus input when switching to create/rename view
  useEffect(() => {
    if ((view === 'create' || view === 'rename') && open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [view, open])

  // Reset view when popover closes
  useEffect(() => {
    if (!open) {
      setView('list')
      setInputValue('')
      setRenameTargetId(null)
    }
  }, [open])

  return (
    <div className="flex items-center gap-0.5">
      {/* Lock toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 text-muted-foreground transition-colors',
          isLocked && 'text-amber-500',
        )}
        onClick={toggleLocked}
        title={isLocked ? 'Unlock workspace' : 'Lock workspace'}
      >
        {isLocked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Unlock className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Workspace popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-2 gap-1.5 text-muted-foreground text-xs font-normal transition-colors',
              open && 'text-foreground bg-accent',
            )}
            title="Workspaces"
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-24">
              {activeWorkspace?.name ?? 'No workspace'}
            </span>
            {isDirty && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"
                title="Unsaved changes"
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-2"
          align="end"
          side="top"
          sideOffset={8}
        >
          {view === 'list' && (
            <>
              <div className="text-[10px] font-medium text-muted-foreground px-2 py-1 mb-1 border-b border-border/50 uppercase tracking-wider flex items-center justify-between">
                <span>Workspaces</span>
                <span className="bg-muted px-1.5 rounded-sm text-foreground">
                  {workspaces.length}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId
                  return (
                    <div
                      key={ws.id}
                      className={cn(
                        'flex items-center gap-1 group rounded-sm',
                        isActive && 'bg-accent',
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'flex-1 justify-start h-7 text-xs font-normal gap-2 min-w-0',
                          isActive && 'text-foreground',
                        )}
                        onClick={() => handleSwitch(ws.id)}
                      >
                        {isActive ? (
                          <Check className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <div className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">{ws.name}</span>
                        {ws.isTemplate && (
                          <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">
                            tpl
                          </span>
                        )}
                      </Button>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          title="Rename"
                          onClick={() => {
                            setRenameTargetId(ws.id)
                            setInputValue(ws.name)
                            setView('rename')
                          }}
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          title="Duplicate"
                          onClick={() => cloneWorkspace(ws.id)}
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                        {workspaces.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => handleDelete(ws.id)}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="h-px bg-border/60 my-1" />

              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs font-normal gap-2"
                  onClick={() => {
                    setInputValue('')
                    setView('create')
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Save current as...
                </Button>
                {activeWorkspaceId && isDirty && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-xs font-normal gap-2 text-amber-600 dark:text-amber-400"
                    onClick={() => {
                      handleSave()
                      setOpen(false)
                    }}
                  >
                    <Save className="h-3 w-3" />
                    Save "{activeWorkspace?.name}"
                  </Button>
                )}
              </div>
            </>
          )}

          {(view === 'create' || view === 'rename') && (
            <div className="flex flex-col gap-2 p-1">
              <div className="text-xs font-medium">
                {view === 'create'
                  ? 'Save current layout as'
                  : 'Rename workspace'}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  view === 'create' ? handleCreate() : handleRename()
                }}
              >
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Workspace name..."
                  className="h-7 text-xs"
                  autoFocus
                />
                <div className="flex gap-1 mt-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    disabled={!inputValue.trim()}
                  >
                    {view === 'create' ? 'Save' : 'Rename'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setView('list')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Quick save button */}
      {activeWorkspaceId && isDirty && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-amber-500"
          onClick={handleSave}
          title={`Save "${activeWorkspace?.name}"`}
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
