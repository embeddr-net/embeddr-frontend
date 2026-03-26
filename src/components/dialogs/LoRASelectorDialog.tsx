import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@embeddr/react-ui/ui'
import { Input } from '@embeddr/react-ui/ui'
import { ScrollArea } from '@embeddr/react-ui/ui'
import { Button } from '@embeddr/react-ui/ui'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileBox,
  Search,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoRASelectorDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (lora: string) => void
  loras: string[]
}

type FolderNode = {
  name: string
  path: string
  children: Record<string, FolderNode>
  files: string[]
}

export function LoRASelectorDialog({
  isOpen,
  onClose,
  onSelect,
  loras,
}: LoRASelectorDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['root']),
  )

  // Build file tree
  const tree = useMemo(() => {
    const root: FolderNode = {
      name: 'All LoRAs',
      path: '',
      children: {},
      files: [],
    }

    loras.forEach((fullPath) => {
      // Normalize path separators
      const parts = fullPath.split(/[/\\]/)
      const filename = parts.pop()!

      // If it's just a file at root
      if (parts.length === 0) {
        root.files.push(fullPath)
        return
      }

      let current = root
      let currentPath = ''

      parts.forEach((part) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            children: {},
            files: [],
          }
        }
        current = current.children[part]
      })

      current.files.push(fullPath)
    })

    return root
  }, [loras])

  // Filter logic
  const filteredFiles = useMemo(() => {
    if (!search) {
      // If no search, return files in selected folder
      if (selectedFolder === '') return tree.files

      // Traverse to selected folder
      const parts = selectedFolder.split('/')
      let current = tree
      for (const part of parts) {
        if (current.children[part]) {
          current = current.children[part]
        } else {
          return []
        }
      }
      return current.files
    }

    // If searching, return all matching files flat
    return loras.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
  }, [search, selectedFolder, tree, loras])

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFolder = (node: FolderNode, level = 0) => {
    const isExpanded = expandedFolders.has(node.path || 'root')
    const isSelected = selectedFolder === node.path
    const hasChildren = Object.keys(node.children).length > 0

    if (!hasChildren && node.files.length === 0) return null

    return (
      <div key={node.path || 'root'}>
        <div
          className={cn(
            'flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-muted/50 rounded-sm text-sm select-none',
            isSelected && 'bg-muted text-primary font-medium',
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            setSelectedFolder(node.path)
            if (hasChildren) {
              // Auto expand if selecting
              const newExpanded = new Set(expandedFolders)
              newExpanded.add(node.path || 'root')
              setExpandedFolders(newExpanded)
            }
          }}
        >
          {hasChildren ? (
            <div
              className="p-0.5 hover:bg-background rounded"
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(node.path || 'root')
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ) : (
            <div className="w-4" />
          )}
          <Folder
            className={cn(
              'h-4 w-4',
              isSelected ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span className="truncate">{node.name}</span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {Object.values(node.children)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Select LoRA</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search LoRAs..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Folder Tree */}
          {!search && (
            <div className="w-64 border-r bg-muted/10 flex flex-col">
              <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Folders
              </div>
              <ScrollArea className="flex-1">
                <div className="pb-2">{renderFolder(tree)}</div>
              </ScrollArea>
            </div>
          )}

          {/* Main Content - Grid */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="p-2 border-b text-xs text-muted-foreground flex justify-between">
              <span>
                {search
                  ? 'Search Results'
                  : selectedFolder
                    ? selectedFolder
                    : 'All LoRAs'}
              </span>
              <span>{filteredFiles.length} items</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              {filteredFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Database className="h-8 w-8 opacity-20" />
                  <p>No LoRAs found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredFiles.map((file) => {
                    const fileName = file.split(/[/\\]/).pop()
                    const folder =
                      file.includes('/') || file.includes('\\')
                        ? file.split(/[/\\]/).slice(0, -1).join('/')
                        : ''

                    return (
                      <div
                        key={file}
                        className="group relative flex flex-col gap-2 p-3 border rounded-lg hover:border-primary hover:bg-muted/10 cursor-pointer transition-all"
                        onClick={() => {
                          onSelect(file)
                          onClose()
                        }}
                      >
                        <div className="aspect-[2/3] bg-muted rounded-md flex items-center justify-center overflow-hidden relative">
                          {/* Placeholder for thumbnail */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-xs text-white font-medium">
                              Select
                            </span>
                          </div>
                          <FileBox className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-0.5">
                          <div
                            className="text-sm font-medium leading-tight line-clamp-2 break-all"
                            title={fileName}
                          >
                            {fileName}
                          </div>
                          {folder && (
                            <div
                              className="text-[10px] text-muted-foreground truncate"
                              title={folder}
                            >
                              {folder}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
