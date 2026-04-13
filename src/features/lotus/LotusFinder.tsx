// src/features/lotus/LotusFinder.tsx
import React from 'react'
import { Dialog, DialogContent } from '@embeddr/react-ui/ui'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { embeddrApi } from '@/lib/api/client'
import { usePluginStore } from '@/plugins/store'
import { useEmbeddrAPI } from '@/plugins/store'
import { useLotus } from '@/providers/LotusProvider'
import { useSettingsStore } from '@/store/settingsStore'
import type { LotusResultItem, FinderMode, FinderKind, LotusMessage } from './types'
import type { Artifact, PaginatedResponse } from '@/lib/api/types'
import { useArtifactTypeCounts } from '@/hooks/useArtifactTypeCounts'
import {
  parseFinderQuery as zenParseFinderQuery,
  norm as zenNorm,
  mergeDedup as zenMergeDedup,
} from '@embeddr/zen-shell'
import { LotusSearchBar } from './LotusSearchBar'
import { LotusPreviewPane } from './LotusPreviewPane'
import { LotusResultsList } from './LotusResultsList'
import { LotusChat } from './LotusChat'

type LotusQueryResponse = { query: string; results: LotusResultItem[] }

type SearchDefaults = {
  text_provider?: string
  similar_provider?: string
}

type FinderDefaults = {
  enable_search?: boolean
  shebangs?: Record<string, string | { provider: string; kind?: string }>
}

// Use shared utilities from zen-shell
const norm = zenNorm

// localScore imported from zen-shell via the import above
import { localScore } from '@embeddr/zen-shell'

// Use shared mergeDedup from zen-shell (works with LotusResultItem which is compatible with ZenFinderItem)
const mergeDedup = zenMergeDedup as (a: LotusResultItem[], b: LotusResultItem[]) => LotusResultItem[]

// Use shared parseFinderQuery from zen-shell
const parseFinderQuery = zenParseFinderQuery

interface LotusFinderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LotusFinder({ open, onOpenChange }: LotusFinderProps) {
  const navigate = useNavigate()
  const { setSettingsOpen } = useLotus()
  const setWidgetConfig = useSettingsStore((s) => s.setWidgetConfig)
  const api = useEmbeddrAPI()
  const plugins = usePluginStore((s) => s.plugins)
  const activePlugins = usePluginStore((s) => s.activePlugins)

  const apiRef = React.useRef(api)
  React.useEffect(() => {
    apiRef.current = api
  }, [api])

  const [query, setQuery] = React.useState('')
  const [items, setItems] = React.useState<LotusResultItem[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [defaults, setDefaults] = React.useState<SearchDefaults>({
    text_provider: 'search.text',
    similar_provider: 'search.similar',
  })
  const [finderDefaults, setFinderDefaults] = React.useState<FinderDefaults>({
    enable_search: true,
    shebangs: {
      stash: { provider: 'nynxz-stash.search' },
      s: { provider: 'nynxz-stash.search' },
      llm: { provider: 'embeddr-llm.search_artifacts' },
    },
  })
  const [resolvedResource, setResolvedResource] = React.useState<Record<
    string,
    any
  > | null>(null)

  // --- Mode system ---
  const [mode, setMode] = React.useState<FinderMode>(() => {
    try {
      const stored = window.localStorage.getItem('lotus-finder-mode')
      return stored === 'lotus' ? 'lotus' : 'search'
    } catch {
      return 'search'
    }
  })
  const [lotusAvailable, setLotusAvailable] = React.useState(false)
  const [messages, setMessages] = React.useState<LotusMessage[]>([])
  const [lotusLoading, setLotusLoading] = React.useState(false)

  // --- Type filter ---
  const [finderTypeName, setFinderTypeName] = React.useState<string | null>(null)
  const { typeTree } = useArtifactTypeCounts()

  // --- Kind filter ---
  const [hiddenKinds, setHiddenKinds] = React.useState<Set<FinderKind>>(() => {
    try {
      const stored = window.localStorage.getItem('lotus-finder-hidden-kinds')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  const toggleKind = React.useCallback((kind: FinderKind) => {
    setHiddenKinds(prev => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      try { window.localStorage.setItem('lotus-finder-hidden-kinds', JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const handleModeChange = React.useCallback((next: FinderMode) => {
    setMode(next)
    try { window.localStorage.setItem('lotus-finder-mode', next) } catch {}
  }, [])

  // Check if embeddr-lotus plugin is available
  React.useEffect(() => {
    if (!open) return
    let active = true
    const check = async () => {
      try {
        const res = await embeddrApi.lotus.list({ plugin: 'embeddr-lotus', limit: 1 })
        if (active) {
          const items = (res as any)?.items ?? []
          setLotusAvailable(items.length > 0)
        }
      } catch {
        if (active) setLotusAvailable(false)
      }
    }
    check()
    return () => { active = false }
  }, [open])

  // Lotus chat handler
  const sendLotusMessage = React.useCallback(async (message: string) => {
    if (!message.trim()) return
    const userMsg: LotusMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setQuery('')
    setLotusLoading(true)

    try {
      const res = await embeddrApi.lotus.invoke('embeddr-lotus.chat', {
        message: message.trim(),
        history: messages.map(m => ({ role: m.role, content: m.content })),
      })
      const data = res as any
      // The backend may return content at various paths depending on
      // whether it comes from the execution spine or direct invoke
      const content =
        data?.content ||
        data?.response ||
        data?.outputs?.content ||
        data?.outputs?.response ||
        data?.message ||
        data?.text ||
        (typeof data === 'string' ? data : JSON.stringify(data))

      // Suggestions can be strings or {label, action, capId} objects
      const rawSuggestions = data?.suggestions || data?.outputs?.suggestions || []
      const suggestions = rawSuggestions.map((s: any) =>
        typeof s === 'string' ? { label: s } : s,
      )

      const assistantMsg: LotusMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: Date.now(),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: LotusMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: err?.message?.includes('not found') || err?.message?.includes('404')
          ? 'Lotus chat is not configured yet. Install and configure the embeddr-lotus plugin to enable conversational mode.'
          : `Error: ${err?.message || 'Failed to reach Lotus'}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLotusLoading(false)
    }
  }, [])

  // Filter items by hidden kinds
  const filteredItems = React.useMemo(() => {
    if (!hiddenKinds.size) return items
    return items.filter((it) => !hiddenKinds.has(it.kind as FinderKind))
  }, [items, hiddenKinds])

  const inputRef = React.useRef<HTMLInputElement>(null)

  const rawSelectedIndex = React.useMemo(() => {
    if (!items.length) return -1
    if (!selectedId) return -1
    return items.findIndex((x) => x.id === selectedId)
  }, [items, selectedId])

  const selectedIndex = rawSelectedIndex === -1 ? 0 : rawSelectedIndex

  const selectedItem = React.useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId],
  )

  const resolvedSelectedItem = React.useMemo(() => {
    if (!selectedItem || selectedItem.kind !== 'resource' || !resolvedResource)
      return selectedItem
    return {
      ...selectedItem,
      title: resolvedResource.title || selectedItem.title,
      description: resolvedResource.description || selectedItem.description,
      data: {
        ...selectedItem.data,
        preview_url:
          resolvedResource.preview_url || selectedItem.data?.preview_url,
        resource: {
          ...(selectedItem.data?.resource || {}),
          ...resolvedResource,
        },
      },
    } satisfies LotusResultItem
  }, [selectedItem, resolvedResource])

  const parsedQuery = React.useMemo(() => parseFinderQuery(query), [query])

  const focusInput = React.useCallback(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    let alive = true
    const run = async () => {
      if (!selectedItem || selectedItem.kind !== 'resource') {
        if (alive) setResolvedResource(null)
        return
      }

      const resource = selectedItem.data?.resource || {}
      const url = resource?.content_url || resource?.url
      if (!url || !apiRef.current.resources?.resolve) {
        if (alive) setResolvedResource(null)
        return
      }

      try {
        const out = await apiRef.current.resources.resolve({
          url,
          hintType: resource?.type,
        })
        if (alive) setResolvedResource(out ?? null)
      } catch {
        if (alive) setResolvedResource(null)
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [selectedItem])

  // Build local commands (panels/actions) from active plugin defs
  const localItems = React.useMemo<LotusResultItem[]>(() => {
    const out: LotusResultItem[] = [
      {
        id: 'system:settings',
        kind: 'action',
        source: 'local',
        title: 'Open Settings',
        subtitle: 'System',
        description: 'Open the settings dialog (Ctrl+,)',
        data: { systemAction: 'open_settings' },
      },
      {
        id: 'system:layout_reset',
        kind: 'action',
        source: 'local',
        title: 'Reset Widget Layout',
        subtitle: 'System',
        description: 'Restores default command bar widgets',
        data: { systemAction: 'reset_layout' },
      },
    ]

    for (const pid of activePlugins) {
      const p = plugins[pid]
      if (!p) continue

      for (const c of p.components || []) {
        const componentDef = c as {
          id: string
          label?: string
          description?: string
          props?: Record<string, any>
        }
        const componentId = `${pid}-${componentDef.id}`
        out.push({
          id: `panel:${componentId}`,
          kind: 'panel',
          source: 'local',
          title: componentDef.label || componentDef.id,
          subtitle: `${p.name || pid} • panel`,
          description:
            componentDef.description ||
            `Open ${componentDef.label || componentDef.id}`,
          data: {
            pluginId: pid,
            componentId,
            props: componentDef.props || {},
            icon: (componentDef as any).icon,
          },
        })
      }

      for (const a of p.actions || []) {
        const actionDef = a as {
          id: string
          label?: string
          description?: string
          payload?: any
        }
        out.push({
          id: `action:${pid}:${actionDef.id}`,
          kind: 'action',
          source: 'local',
          title: actionDef.label || actionDef.id,
          subtitle: `${p.name || pid} • action`,
          description:
            actionDef.description || `Run ${actionDef.label || actionDef.id}`,
          data: {
            pluginId: pid,
            action: actionDef.id,
            payload: actionDef.payload,
            icon: (actionDef as any).icon,
          },
        })
      }
    }

    return out
  }, [plugins, activePlugins])

  // Local search (instant)
  const filteredLocal = React.useMemo(() => {
    const q = parsedQuery.text
    if (!norm(q))
      return localItems.slice(0, 40).map((x) => ({ ...x, score: 0 }))
    const scored = localItems
      .map((x) => ({ ...x, score: localScore(q, x.title, x.subtitle) }))
      .filter((x) => (x.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    return scored.slice(0, 40)
  }, [localItems, parsedQuery.text])

  const loadDefaults = React.useCallback(async () => {
    try {
      const out = await apiRef.current.lotus.invoke('embeddr-core.config.get', {
        plugin_name: 'embeddr-core',
        scope: 'global',
        scope_id: null,
        include_capability: false,
      })
      const val = out?.value
      if (val && Object.keys(val).length > 0) setDefaults(val)
    } catch {
      // Keep initial defaults — don't overwrite with empty object
    }
    try {
      const finderOut = await apiRef.current.lotus.invoke(
        'embeddr-core.config.get',
        {
          plugin_name: 'embeddr-core',
          config_id: 'embeddr-core.finder.config',
          scope: 'global',
          scope_id: null,
          include_capability: false,
        },
      )
      const val = finderOut?.value
      if (val && Object.keys(val).length > 0) {
        setFinderDefaults((prev) => ({ ...prev, ...val }))
      }
    } catch {
      // Keep initial defaults (with seeded shebangs)
    }
  }, [])

  const buildArtifactItems = React.useCallback(
    (
      artifacts: Array<any>,
      scores: Map<string, number>,
      source: 'local' | 'server' = 'server',
    ) => {
      return artifacts.map((artifact) => {
        const previewUrl = artifact?.id
          ? embeddrApi.artifacts.getPreviewUrl(String(artifact.id), 'thumbnail')
          : undefined
        const title =
          artifact?.metadata_json?.title ||
          artifact?.metadata_json?.name ||
          artifact?.uri ||
          artifact?.id
        const description =
          artifact?.metadata_json?.description || artifact?.uri
        return {
          id: artifact?.id,
          kind: 'artifact',
          source,
          title: title || artifact?.id,
          subtitle: artifact?.type_name || artifact?.base_type_name,
          description,
          score: scores.get(String(artifact?.id)),
          data: {
            artifact_id: artifact?.id,
            preview_url: previewUrl,
          },
        } satisfies LotusResultItem
      })
    },
    [],
  )

  const buildResourceItem = React.useCallback(
    (input: {
      id: string
      title: string
      subtitle?: string
      description?: string
      contentUrl?: string
      previewUrl?: string
      type?: string
      source?: 'local' | 'server'
    }) => {
      const contentUrl = input.contentUrl || input.previewUrl || ''
      return {
        id: input.id,
        kind: 'resource',
        source: input.source || 'server',
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        data: {
          resource: {
            id: input.id,
            type: input.type || 'web',
            content_url: contentUrl,
            preview_url: input.previewUrl || contentUrl,
            url: contentUrl,
            title: input.title,
          },
        },
      } satisfies LotusResultItem
    },
    [],
  )

  // Debounced server search — only in search mode
  React.useEffect(() => {
    if (!open) return
    if (mode === 'lotus') {
      // In lotus mode, show only local items (panels/nav/actions) — no server search
      setItems(filteredLocal)
      setSelectedId(filteredLocal[0]?.id ?? null)
      setLoading(false)
      return
    }

    const { text, shebang, tags } = parsedQuery
    let cancelled = false

    if (finderDefaults.enable_search === false && !shebang) {
      const merged = mergeDedup(filteredLocal, [])
      setItems(merged)
      setSelectedId(merged[0]?.id ?? null)
      return
    }

    if (!norm(text) && !shebang && tags.length === 0) {
      const merged = mergeDedup(filteredLocal, [])
      setItems(merged)
      setSelectedId(merged[0]?.id ?? null)
      return
    }

    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const tagValue = (keys: string[]) =>
          tags.find((t) => keys.includes(t.key))?.value

        const typeFilter = tagValue(['type', 'type_name']) || finderTypeName || undefined
        const typePrefix = tagValue(['type_prefix', 'prefix'])
        const idFilter = tagValue(['id', 'artifact'])

        const metaTokens = tags
          .filter(
            (t) =>
              ![
                'type',
                'type_name',
                'type_prefix',
                'prefix',
                'id',
                'artifact',
                'kind',
              ].includes(t.key),
          )
          .map((t) => (t.value ? `${t.key}:${t.value}` : t.key))

        const localItemsToUse = shebang ? [] : filteredLocal

        const enableSearch = finderDefaults.enable_search !== false
        const commandPromise =
          shebang || !norm(text) || !enableSearch
            ? Promise.resolve([] as LotusResultItem[])
            : apiRef.current.lotus
                .query(text, 30)
                .then((data: LotusQueryResponse) =>
                  (data.results || []).map((r) => ({
                    ...r,
                    source: 'server' as const,
                  })),
                )
                .catch(() => [])

        const providerPromise = (async () => {
          const providerKey = shebang?.split(/[:.]/)[0] || ''
          const configuredShebang = providerKey
            ? finderDefaults.shebangs?.[providerKey]
            : undefined
          const normalizedShebang = (() => {
            if (!configuredShebang) return null
            if (typeof configuredShebang === 'string') {
              return { provider: configuredShebang } as const
            }
            if (typeof configuredShebang === 'object') {
              const provider = String((configuredShebang as any).provider || '')
              if (!provider) return null
              return {
                provider,
                kind: (configuredShebang as any).kind,
              }
            }
            return null
          })()

          const shebangConfig = providerKey ? normalizedShebang : null

          const providerId =
            shebangConfig?.provider || defaults.text_provider || 'search.text'

          const isShebang = Boolean(shebangConfig)
          const enableSearch = finderDefaults.enable_search !== false
          if (!enableSearch && !isShebang) return [] as LotusResultItem[]
          if (!norm(text) && !isShebang && metaTokens.length === 0 && !idFilter)
            return [] as LotusResultItem[]

          if (idFilter) {
            const out = await apiRef.current.artifacts.list({
              ids: [idFilter],
              limit: 1,
            })
            const items = Array.isArray(out?.items) ? out.items : []
            const scores = new Map<string, number>()
            return buildArtifactItems(items, scores)
          }

          if (!norm(text)) return []

          const kindTag = tagValue(['kind', 'type'])
          const resolvedKind = (() => {
            const raw = (kindTag || shebangConfig?.kind || '').toLowerCase()
            if (!raw) return undefined
            if (raw === 'scene') return 'scenes'
            if (raw === 'image') return 'images'
            if (raw === 'performer') return 'performers'
            if (raw === 'gallery') return 'galleries'
            if (raw === 'studio') return 'studios'
            return raw
          })()

          const sortKey = tagValue(['sort', 'order'])
          const directionTag = tagValue(['dir', 'direction'])
          const sortDirection = directionTag
            ? directionTag.toUpperCase()
            : undefined

          const payloadExtras: Record<string, any> = {}
          const reservedKeys = new Set([
            'type',
            'type_name',
            'type_prefix',
            'prefix',
            'id',
            'artifact',
            'kind',
            'sort',
            'order',
            'dir',
            'direction',
          ])
          tags.forEach((t) => {
            if (reservedKeys.has(t.key)) return
            if (t.value !== undefined) payloadExtras[t.key] = t.value
            else payloadExtras[t.key] = true
          })

          const basePayload: Record<string, any> = {
            query: text,
            ...(resolvedKind ? { kind: resolvedKind } : {}),
            ...(sortKey ? { sort: sortKey } : {}),
            ...(sortDirection ? { direction: sortDirection } : {}),
            ...payloadExtras,
          }

          const out = await apiRef.current.lotus.invoke(providerId, {
            ...basePayload,
            limit: 30,
          })
          const items = Array.isArray(out?.items) ? out.items : []

          if (!items.length) return []

          const hasTitle = items.some((it: any) => Boolean(it?.title))
          if (!hasTitle && items[0]?.id) {
            const scores = new Map<string, number>(
              items.map((it: any) => [String(it.id), it.score ?? 0]),
            )
            const ids = items.map((it: any) => String(it.id))
            // Fetch each artifact individually — the list endpoint doesn't support ids filter
            const fetched = await Promise.all(
              ids.map((id: string) =>
                embeddrApi.artifacts.get(id).catch(() => null),
              ),
            )
            let artifacts = fetched.filter(Boolean)

            if (typeFilter) {
              artifacts = artifacts.filter(
                (a: any) => a?.type_name === typeFilter,
              )
            }
            if (typePrefix) {
              artifacts = artifacts.filter((a: any) =>
                String(a?.type_name || '').startsWith(typePrefix),
              )
            }

            return buildArtifactItems(artifacts, scores)
          }

          const resolverUrlForItem = (item: any) => {
            const candidate =
              item.arxiv_url ||
              item.pdf_url ||
              item.url ||
              item.content_url ||
              item.id

            if (candidate && typeof candidate === 'string') {
              if (candidate.startsWith('arxiv://')) return candidate
              const absMatch = candidate.match(/arxiv\.org\/abs\/([^?#]+)/i)
              if (absMatch?.[1]) return `arxiv://${absMatch[1]}`

              const pdfMatch = candidate.match(/arxiv\.org\/pdf\/([^?#]+)/i)
              if (pdfMatch?.[1]) {
                const id = pdfMatch[1].replace(/\.pdf$/i, '')
                return `arxiv://${id}`
              }
            }

            return undefined
          }

          return items.map((item: any) => {
            const subtitle =
              item.subtitle ||
              item.kind ||
              (item.authors ? `Authors: ${item.authors}` : undefined)

            const description =
              item.description || item.summary || item.details || item.date

            const resolverUrl = resolverUrlForItem(item)
            const url =
              resolverUrl ||
              item.url ||
              item.content_url ||
              item.pdf_url ||
              item.arxiv_url ||
              item.full_url ||
              item.regular_url
            const previewUrl =
              item.preview_url || item.thumbnail || item.thumb || item.cover
            const kindTypeMap: Record<string, string> = {
              scenes: 'video',
              images: 'image',
              performers: 'entity',
              galleries: 'collection',
              studios: 'entity',
            }
            const inferredType =
              item.type ||
              item.media_type ||
              kindTypeMap[item.kind] ||
              (resolverUrl ? 'document' : 'web')

            const allowedKinds = new Set([
              'resource',
              'artifact',
              'action',
              'feature',
              'panel',
              'nav',
            ])
            const normalizedKind = allowedKinds.has(item.kind)
              ? item.kind
              : 'resource'

            return {
              id: item.id || item.title,
              kind: normalizedKind,
              source: 'server' as const,
              title: item.title || item.id || 'Result',
              subtitle,
              description,
              score: item.score,
              data: {
                ...(item.data || {}),
                preview_url: previewUrl,
                resource:
                  item.resource ||
                  (url
                    ? {
                        url,
                        content_url: url,
                        preview_url: previewUrl,
                        type: inferredType,
                        title: item.title,
                        kind: item.kind,
                      }
                    : undefined),
              },
            }
          })
        })()

        const metadataPromise = (async () => {
          if (!enableSearch) return [] as LotusResultItem[]
          if (shebang || tags.length === 0) return [] as LotusResultItem[]
          const metaQuery = [text, ...metaTokens].join(' ').trim()
          if (!metaQuery) return []

          const out = (await embeddrApi.artifacts.search(
            metaQuery,
            20,
            0,
            typeFilter,
          )) as PaginatedResponse<Artifact>
          let artifacts = Array.isArray(out?.items) ? out.items : []

          if (typePrefix) {
            artifacts = artifacts.filter((a: any) =>
              String(a?.type_name || '').startsWith(typePrefix),
            )
          }

          const scores = new Map<string, number>()
          return buildArtifactItems(artifacts, scores)
        })()

        const [serverItems, providerItems, metaItems] = await Promise.all([
          commandPromise,
          providerPromise,
          metadataPromise,
        ])

        if (cancelled) return

        const merged = mergeDedup(
          mergeDedup(localItemsToUse, serverItems),
          mergeDedup(providerItems, metaItems),
        )
          .sort((a, b) => {
            const sa = (a.source === 'local' ? 1000 : 0) + (a.score ?? 0)
            const sb = (b.source === 'local' ? 1000 : 0) + (b.score ?? 0)
            return sb - sa
          })
          .slice(0, 60)

        setItems(merged)
        setSelectedId((cur) => cur ?? merged[0]?.id ?? null)
      } catch (e: any) {
        if (!cancelled) toast.error(`Search failed: ${e.message}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 140)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [
    parsedQuery,
    open,
    mode,
    filteredLocal,
    defaults.text_provider,
    finderTypeName,
    buildArtifactItems,
    buildResourceItem,
  ])

  // Reset on open + focus input
  React.useEffect(() => {
    if (!open) return
    setQuery('')
    loadDefaults()
    const merged = mergeDedup(filteredLocal, [])
    setItems(merged)
    setSelectedId(merged[0]?.id ?? null)

    // focus input AFTER dialog mounts
    const t = setTimeout(() => focusInput(), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadDefaults])

  const moveSelection = React.useCallback(
    (delta: number) => {
      if (!items.length) return
      const next = Math.max(
        0,
        Math.min(items.length - 1, selectedIndex + delta),
      )
      const it = items[next]
      if (it) setSelectedId(it.id)
    },
    [items, selectedIndex],
  )

  const dispatch = async (item: LotusResultItem) => {
    if (item.data?.systemAction === 'open_settings') {
      setSettingsOpen(true)
      onOpenChange(false)
      return
    }

    if (item.data?.systemAction === 'reset_layout') {
      setWidgetConfig({})
      toast.success('Layout reset to defaults')
      onOpenChange(false)
      return
    }

    if (item.kind === 'panel') {
      const componentId = item.data?.componentId as string | undefined
      const pluginId = item.data?.pluginId as string | undefined
      const props = item.data?.props || {}
      if (!componentId) return

      api.windows.spawn(componentId, item.title, {
        pluginId,
        ...props,
      })

      onOpenChange(false)
      return
    }

    if (item.kind === 'nav') {
      const route = item.data?.route as string | undefined
      if (route) {
        navigate({ to: route })
        onOpenChange(false)
        return
      }
      toast.info('No route found for this item.')
      return
    }

    if (
      item.source === 'server' &&
      (item.kind === 'action' || item.kind === 'feature')
    ) {
      try {
        const data = item.data ?? {}
        const pluginName = data.plugin_name || data.plugin
        const actionName = data.action_name || data.action
        if (!pluginName || !actionName) {
          toast.error('Capability missing plugin or action name.')
          return
        }
        data.plugin_name = pluginName
        data.action_name = actionName
        const out = (await embeddrApi.lotus.dispatch(
          item.id,
          item.kind as 'action',
          data,
        )) as any

        onOpenChange(false)
        if (out.navigate_to) navigate({ to: out.navigate_to })
        if (out.execution_id) {
          toast.success('Queued', {
            description: `Execution: ${out.execution_id}`,
          })
        }
        return
      } catch (e: any) {
        toast.error(`Dispatch failed: ${e.message}`)
        return
      }
    }

    if (item.kind === 'artifact') {
      const artifactId = item.data?.artifact_id || item.id
      if (!artifactId) return
      apiRef.current.windows.spawn(
        'embeddr-editor-types-artifact-detail',
        'Artifact Detail',
        { artifactId, defaultSize: { width: 500, height: 600 } },
      )
      onOpenChange(false)
      return
    }

    if (item.kind === 'resource') {
      const resource = item.data?.resource || {}
      const resolved = resolvedResource || {}
      const panelId =
        resolved?.panel_id ||
        resolved?.panelId ||
        resource?.panel_id ||
        resource?.panelId
      if (panelId) {
        apiRef.current.events?.emit?.('ui:open_panel', {
          panel_id: panelId,
          title: resolved?.title || resource?.title || item.title,
          props: resolved?.panel_props || resource?.panel_props || {},
        })
        onOpenChange(false)
        return
      }
      const url =
        resolved?.content_url || resource?.content_url || resource?.url
      const previewUrl = resolved?.preview_url || resource?.preview_url
      const title = resolved?.title || resource?.title || item.title
      const type = resolved?.type || resource?.type || 'web'
      if (!url) return toast.info('No resource URL available.')
      const frameId = `media-frame-${Date.now()}`
      apiRef.current.windows.open(
        frameId,
        title || 'Media Frame',
        'embeddr-core-media-frame',
        {
          panelId: frameId,
          initialItems: [
            {
              id: resource?.id || item.id,
              url,
              thumbUrl: previewUrl,
              type,
              title,
            },
          ],
          initialMode: 'replace',
          initialSelectIndex: 0,
        },
      )
      onOpenChange(false)
      return
    }

    if (item.kind === 'action' && item.source === 'local') {
      const pluginId = item.data?.pluginId as string | undefined
      const action = item.data?.action as string | undefined
      if (!pluginId || !action) return toast.error('Invalid action payload.')

      try {
        await api.client.plugins.call(pluginId, 'actions/run', 'POST', {
          action,
          inputs: {},
        })
        toast.success('Queued', { description: `${pluginId}:${action}` })
        onOpenChange(false)
      } catch (e: any) {
        toast.error(`Failed to run action: ${e.message}`)
      }
      return
    }

    toast.info('Not dispatchable yet.')
  }

  // ✅ Keyboard model:
  // - Input always keeps focus.
  // - ArrowDown moves selection into list (but focus stays on input).
  // - ArrowUp at index 0 does nothing special; still at top, you're effectively "back at input".
  // - Escape closes.
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!items.length) return
      // if nothing selected yet, pick first; else move down
      if (!selectedId || rawSelectedIndex === -1) setSelectedId(items[0].id)
      else moveSelection(+1)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!items.length) return
      // move up, but if you're already at 0, stay there (input still focused)
      if (selectedIndex <= 0 || rawSelectedIndex === -1) {
        setSelectedId(items[0]?.id ?? null)
        return
      }
      moveSelection(-1)
      return
    }

    if (e.key === 'Enter') {
      // let SearchBar call onSubmit; we just avoid double-run
      return
    }
  }

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    // Safety: if some child steals focus, still support Esc.
    if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={handleDialogKeyDown}
        className={cn(
          'max-w-4xl h-[60vh] p-0 gap-0 overflow-hidden flex! flex-col!',
          'bg-background/70 backdrop-blur-xl border border-border/60 shadow-2xl',
        )}
      >
        {/* Header */}
        <div className="p-3 border-b border-border/60">
          <LotusSearchBar
            value={query}
            onChange={setQuery}
            onSubmit={() => {
              if (mode === 'lotus') {
                sendLotusMessage(query)
              } else {
                resolvedSelectedItem && dispatch(resolvedSelectedItem)
              }
            }}
            loading={mode === 'lotus' ? lotusLoading : loading}
            autoFocus
            inputRef={inputRef}
            onKeyDown={handleInputKeyDown}
            mode={mode}
            onModeChange={handleModeChange}
            lotusAvailable={lotusAvailable}
            hiddenKinds={hiddenKinds}
            onToggleKind={toggleKind}
            typeTree={typeTree}
            selectedFinderType={finderTypeName}
            onSelectFinderType={setFinderTypeName}
            searchProvider={defaults.text_provider || 'search.text'}
          />
        </div>

        {/* Body */}
        {mode === 'lotus' ? (
          <LotusChat
            messages={messages}
            loading={lotusLoading}
            onSuggestionClick={(s) => {
              if (s.capId) {
                // Invoke a Lotus capability directly
                embeddrApi.lotus.invoke(s.capId, {})
                  .then((res: any) => {
                    const text = typeof res === 'string' ? res : JSON.stringify(res, null, 2)
                    setMessages(prev => [...prev, {
                      id: 'cap-' + Date.now(),
                      role: 'assistant',
                      content: text,
                      timestamp: Date.now(),
                    }])
                  })
                  .catch((e: any) => toast.error(e?.message || 'Failed'))
              } else if (s.action && s.action.startsWith('!')) {
                // Switch to search mode with the action as query
                handleModeChange('search')
                setQuery(s.action)
              } else if (s.action === 'settings') {
                // Open settings
                onOpenChange(false)
                setSettingsOpen(true)
              } else {
                // Treat as a follow-up chat message
                sendLotusMessage(s.label)
              }
            }}
          />
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-2">
            <div className="min-h-0 border-r border-border/60">
              <LotusResultsList
                items={filteredItems}
                selectedId={selectedId}
                onSelect={(it) => setSelectedId(it.id)}
                onConfirm={dispatch}
                onRequestFocusInput={focusInput}
                keyboard={false}
              />
            </div>
            <div className="min-h-0">
              <LotusPreviewPane
                item={resolvedSelectedItem}
                onRun={() =>
                  resolvedSelectedItem && dispatch(resolvedSelectedItem)
                }
              />
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-t border-border/60 text-[10px] text-muted-foreground/70 flex items-center justify-between">
          <span>
            {mode === 'lotus'
              ? 'Lotus mode \u2014 conversational intelligence'
              : 'Tip: !stash cats, !arxiv diffusion, !openverse mountains, !stocks AAPL'}
          </span>
          <span>
            {mode === 'lotus'
              ? messages.length + ' messages'
              : filteredItems.length + ' results'}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
