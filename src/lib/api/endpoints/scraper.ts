import { BACKEND_V2_URL } from '../config'

export interface SpiderArgument {
  name: string
  label?: string
  description?: string
  type?: 'string' | 'boolean' | 'int' | 'select'
  default?: any
  options?: Array<{ label: string; value: any }>
}

export interface SpiderMetadata {
  description?: string
  arguments?: SpiderArgument[]
}

export interface SpiderDefinition {
  name: string
  default_args?: Record<string, string>
  metadata?: SpiderMetadata
}

export interface CrawlRequest {
  args: Record<string, string>
  inputs?: Record<string, string>
}

export interface CrawlResponse {
  message: string
  pid: number
  spider: string
  log_file: string
}

const PLUGIN_BASE = `${BACKEND_V2_URL}/plugins/embeddr-scraper`

export const scraperApi = {
  getSpiders: async (): Promise<SpiderDefinition[]> => {
    // Use Plugin Proxy for listing spiders
    const r = await fetch(`${PLUGIN_BASE}/spiders`)
    if (!r.ok) throw new Error('Failed to fetch spiders via Proxy')
    const data = await r.json()
    // Support both old array of strings and new array of objects format
    if (Array.isArray(data.spiders) && typeof data.spiders[0] === 'string') {
      return data.spiders.map((s: string) => ({ name: s }))
    }
    // New metadata format returns { spiders: [{name: ...}] }
    return data.spiders
  },

  // Calling runSpider directly is deprecated in favor of Spine execution,
  // but we keep it type-compatible if needed, or throw error.
  // The UI should use POST /executions
  runSpider: async (
    _spiderName: string,
    _args: Record<string, string> = {},
  ): Promise<CrawlResponse> => {
    throw new Error('Direct Scraper access is deprecated. Use Execution Spine.')
  },

  getLog: async (filename: string): Promise<string> => {
    const r = await fetch(`${PLUGIN_BASE}/logs/${filename}`)
    if (!r.ok) throw new Error('Log file not found')
    return r.text()
  },
}
