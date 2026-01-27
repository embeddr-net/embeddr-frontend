// src/features/lotus/types.ts
export type LotusItemKind = 'panel' | 'action' | 'nav' | 'artifact' | string

export interface LotusResultItem {
  id: string
  kind: LotusItemKind
  title: string
  description?: string
  subtitle?: string
  score?: number
  source?: 'local' | 'server'
  data?: Record<string, any>
}
