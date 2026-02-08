import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { embeddrApi } from '@/lib/api/client'
import { BACKEND_URL } from '@/lib/api/config'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@embeddr/react-ui/components/table'
import { Button } from '@embeddr/react-ui/components/button'
import { Checkbox } from '@embeddr/react-ui/components/checkbox'
import {
  Trash2,
  Folder,
  File,
  RefreshCw,
  Home,
  ChevronRight,
  ArrowUp,
  Move,
  ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { type Artifact } from '@/lib/api/types'
import { Badge } from '@embeddr/react-ui/components/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@embeddr/react-ui/components/card'
import { useImageDialog } from '@embeddr/react-ui'

interface PathItem {
  id: string
  name: string
}

export const ArtifactFileManager = () => {
  const useImage = useImageDialog()
  const queryClient = useQueryClient()
  const [path, setPath] = useState<PathItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const currentParentId = path.length > 0 ? path[path.length - 1].id : undefined

  // Reset pagination when folder changes
  React.useEffect(() => {
    setPage(0)
    setSelectedIds(new Set())
  }, [currentParentId])

  // Fetch items
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['artifacts', 'manager', currentParentId, page, pageSize],
    queryFn: () =>
      embeddrApi.artifacts.list({
        limit: pageSize,
        offset: page * pageSize,
        collection_id: currentParentId,
        recursive: false,
        sort: 'new',
      }),
  })

  const artifacts = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  // Bulk Operation Mutation
  const bulkMutation = useMutation({
    mutationFn: async (vars: {
      operation: 'move' | 'delete'
      ids: string[]
      payload?: any
    }) => {
      const res = await fetch(`${BACKEND_URL}/artifacts/bulk_operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: vars.operation,
          artifact_ids: vars.ids,
          payload: vars.payload || {},
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Bulk operation failed')
      }
      return res.json()
    },
    onSuccess: (data, vars) => {
      toast.success(
        vars.operation === 'delete'
          ? `Deleted ${data.count} items`
          : 'Items moved successfully',
      )
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['artifacts'] })
      refetch()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  // Delete single (legacy wrapper)
  const handleDeleteSingle = (id: string) => {
    if (confirm('Delete this artifact?')) {
      bulkMutation.mutate({ operation: 'delete', ids: [id] })
    }
  }

  // Delete selected
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return
    if (confirm(`Delete ${selectedIds.size} items?`)) {
      bulkMutation.mutate({
        operation: 'delete',
        ids: Array.from(selectedIds),
      })
    }
  }

  // Navigation handlers
  const handleEnterFolder = (art: Artifact) => {
    if (art.type_name.startsWith('collection')) {
      setPath([
        ...path,
        {
          id: art.id,
          name:
            art.metadata_json?.name ||
            art.metadata_json?.filename ||
            'Untitled Collection',
        },
      ])
      setSelectedIds(new Set()) // Clear selection on navigate
    }
  }

  const handleNavigateUp = () => {
    if (path.length > 0) {
      setPath(path.slice(0, -1))
      setSelectedIds(new Set())
    }
  }

  const handleBreadcrumbClick = (index: number) => {
    setPath(path.slice(0, index + 1))
    setSelectedIds(new Set())
  }

  const handleHomeClick = () => {
    setPath([])
    setSelectedIds(new Set())
  }

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === artifacts.length && artifacts.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(artifacts.map((a) => a.id)))
    }
  }

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, art: Artifact) => {
    let idsToDrag = [art.id]
    if (selectedIds.has(art.id)) {
      idsToDrag = Array.from(selectedIds)
    }

    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ ids: idsToDrag }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Allow drop
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string | 'root') => {
    e.preventDefault()
    e.stopPropagation() // Prevent bubbling
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      const ids = data.ids as string[]

      if (!ids || ids.length === 0) return

      // Don't drop into self or if target is in selection
      if (ids.includes(targetId)) return

      bulkMutation.mutate({
        operation: 'move',
        ids: ids,
        payload: { target_id: targetId },
      })
    } catch (err) {
      console.error('Drop error', err)
    }
  }

  return (
    <Card className="w-full h-full flex flex-col border-none shadow-none">
      <CardHeader className="flex flex-col py-4 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Artifact Manager</CardTitle>
            <Badge variant="outline" className="ml-2">
              {artifacts.length} items
            </Badge>
            {selectedIds.size > 0 && (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                {selectedIds.size} selected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Breadcrumb Navigation - Droppable */}
        <div className="flex items-center text-sm bg-muted/30 p-2 rounded-md border text-muted-foreground flex-wrap">
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'root')}
            className={`flex items-center ${path.length > 0 ? 'droppable-target' : ''}`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 hover:text-foreground hover:bg-muted/50"
              onClick={handleHomeClick}
            >
              <Home className="w-3 h-3 mr-1" />
              Root
            </Button>
          </div>

          {path.map((item, idx) => {
            // Logic: Items can be dropped onto any parent folder in the breadcrumb
            const isLast = idx === path.length - 1
            return (
              <React.Fragment key={item.id}>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <div
                  onDragOver={!isLast ? handleDragOver : undefined}
                  onDrop={!isLast ? (e) => handleDrop(e, item.id) : undefined}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 px-2 font-medium hover:text-foreground hover:bg-muted/50 ${!isLast ? 'border-dashed border-transparent hover:border-muted-foreground/30' : ''}`}
                    onClick={() => handleBreadcrumbClick(idx)}
                  >
                    {item.name}
                  </Button>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    artifacts.length > 0 &&
                    selectedIds.size === artifacts.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12.5"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Up Directory Row - Droppable if internal nav */}
            {path.length > 0 && (
              <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={handleNavigateUp}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  // Navigate up = drop to parent ID (or root)
                  const parentId =
                    path.length > 1 ? path[path.length - 2].id : 'root'
                  handleDrop(e, parentId)
                }}
              >
                <TableCell></TableCell>
                <TableCell>
                  <ArrowUp className="w-4 h-4 text-muted-foreground" />
                </TableCell>
                <TableCell
                  colSpan={4}
                  className="font-medium text-muted-foreground"
                >
                  ..
                </TableCell>
              </TableRow>
            )}

            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center h-24 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : artifacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center h-24 text-muted-foreground"
                >
                  No artifacts found in this location.
                </TableCell>
              </TableRow>
            ) : (
              artifacts.map((art) => {
                const isFolder = art.type_name.startsWith('collection')
                const isSelected = selectedIds.has(art.id)

                return (
                  <TableRow
                    key={art.id}
                    className={`
                        ${isFolder ? 'cursor-pointer hover:bg-muted/30' : ''}
                        ${isSelected ? 'bg-muted/40' : ''}
                    `}
                    onClick={(e) => {
                      // If holding Shift/Ctrl, toggle selection
                      // Else if folder, enter
                      if (e.ctrlKey || e.metaKey || !isFolder) {
                        toggleSelection(art.id)
                      } else {
                        handleEnterFolder(art)
                      }
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, art)}
                    onDragOver={isFolder ? handleDragOver : undefined}
                    onDrop={isFolder ? (e) => handleDrop(e, art.id) : undefined}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(art.id)}
                      />
                    </TableCell>
                    <TableCell
                      onClick={(e) => {
                        if (isFolder) {
                          e.stopPropagation()
                          handleEnterFolder(art)
                        }
                      }}
                    >
                      {isFolder ? (
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Folder
                            className={`w-5 h-5 text-blue-500 fill-blue-500/20 ${isFolder ? 'drop-target-icon' : ''}`}
                          />
                        </div>
                      ) : art.type_name === 'image' ||
                        art.base_type_name === 'image' ? (
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden relative border group cursor-zoom-in">
                          <img
                            src={`${BACKEND_URL}/artifacts/${art.id}/preview`}
                            alt="preview"
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            loading="lazy"
                            onClick={(e) => {
                              e.stopPropagation()

                              // Create gallery context from visible images
                              const galleryImages = artifacts
                                .filter(
                                  (a) =>
                                    a.type_name === 'image' ||
                                    a.base_type_name === 'image',
                                )
                                .map((a) => ({
                                  src: `${BACKEND_URL}/artifacts/${a.id}/content`,
                                  thumbnail: `${BACKEND_URL}/artifacts/${a.id}/content?preview=true`,
                                  title:
                                    a.metadata_json?.name ||
                                    a.metadata_json?.filename ||
                                    'Untitled',
                                  description: a.metadata_json?.description,
                                  metadata: a.metadata_json,
                                  media_type: 'image' as const,
                                }))

                              const startIdx = galleryImages.findIndex((img) =>
                                img.src.includes(art.id),
                              )

                              useImage.openImage(
                                `${BACKEND_URL}/artifacts/${art.id}/content`,
                                {
                                  id: `folder-${currentParentId || 'root'}`,
                                  name: currentParentId
                                    ? 'Folder View'
                                    : 'All Artifacts',
                                  images: galleryImages,
                                  totalImages: totalItems, // Approximation (includes non-images)
                                  fetchMore: async (
                                    dir: 'next' | 'prev',
                                    // @ts-ignore - offset unused
                                    offset: number,
                                  ) => {
                                    if (dir === 'next') {
                                      const nextPage = page + 1
                                      if (nextPage >= totalPages) return

                                      try {
                                        const res =
                                          await queryClient.fetchQuery({
                                            queryKey: [
                                              'artifacts',
                                              'manager',
                                              currentParentId,
                                              nextPage,
                                              pageSize,
                                            ],
                                            queryFn: () =>
                                              embeddrApi.artifacts.list({
                                                limit: pageSize,
                                                offset: nextPage * pageSize,
                                                collection_id: currentParentId,
                                                recursive: false,
                                                sort: 'new',
                                              }),
                                          })

                                        // Append new images to gallery
                                        const newImages = res.items
                                          .filter(
                                            (a) =>
                                              a.type_name === 'image' ||
                                              a.base_type_name === 'image',
                                          )
                                          .map((a) => ({
                                            src: `${BACKEND_URL}/artifacts/${a.id}/content`,
                                            thumbnail: `${BACKEND_URL}/artifacts/${a.id}/content?preview=true`,
                                            title:
                                              a.metadata_json?.name ||
                                              a.metadata_json?.filename ||
                                              'Untitled',
                                            description:
                                              a.metadata_json?.description,
                                            metadata: a.metadata_json,
                                            media_type: 'image' as const,
                                          }))

                                        if (newImages.length > 0) {
                                          useImage.setGalleryImages(
                                            newImages,
                                            false,
                                          )
                                        }

                                        // Sync page state in background
                                        setPage(nextPage)
                                      } catch (err) {
                                        console.error(
                                          'Failed to fetch next page for gallery',
                                          err,
                                        )
                                      }
                                    }
                                  },
                                },
                                startIdx !== -1 ? startIdx : 0,
                              )
                            }}
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display =
                                'none'
                              ;(
                                e.target as HTMLImageElement
                              ).parentElement!.innerText = 'Error'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center">
                          <File className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span
                          className="font-medium truncate max-w-75"
                          title={art.id}
                        >
                          {art.metadata_json?.name ||
                            art.metadata_json?.filename ||
                            'Untitled'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {art.id.slice(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {art.type_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(art.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-destructive"
                          onClick={() => handleDeleteSingle(art.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-2 border-t text-sm">
        <div className="text-muted-foreground flex items-center gap-2">
          <span>
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : `Total: ${totalItems}`}
          </span>
          <span className="text-xs opacity-50">|</span>
          <select
            className="bg-transparent border rounded p-1"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={500}>500 / page</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-mono text-xs">
            Page {page + 1} / {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
