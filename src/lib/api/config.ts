const RAW_URL =
  import.meta.env.VITE_EMBEDDR_BACKEND_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:8003'

// Normalize URL: remove trailing slash
let cleanUrl = RAW_URL.replace(/\/$/, '')

// Strip API suffixes if they exist in the env var to get the true base
// Handles: /api/v1, /api/v2, /api
if (cleanUrl.endsWith('/api/v1')) {
  cleanUrl = cleanUrl.slice(0, -7)
} else if (cleanUrl.endsWith('/api/v2')) {
  cleanUrl = cleanUrl.slice(0, -7)
} else if (cleanUrl.endsWith('/api')) {
  cleanUrl = cleanUrl.slice(0, -4)
}

export const BASE_URL = cleanUrl
export const BACKEND_URL = `${BASE_URL}`

// Scraper Service URL
export const SCRAPER_URL =
  import.meta.env.VITE_EMBEDDR_SCRAPER_URL || 'http://localhost:8010'
export const BACKEND_V2_URL = `${BASE_URL}/api/v2`

console.log('[Config] API Configuration:', {
  RAW_URL,
  BASE_URL,
  BACKEND_URL,
  BACKEND_V2_URL,
})
