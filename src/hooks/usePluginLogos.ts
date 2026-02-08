import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPluginLogos } from '@/lib/api/endpoints/plugins'
import { BACKEND_URL } from '@/lib/api/config'

const toAbsoluteLogoUrl = (url?: unknown) => {
  if (!url || typeof url !== 'string') return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${BACKEND_URL}${url}`
  return `${BACKEND_URL}/${url}`
}

export const usePluginLogos = () => {
  const query = useQuery({
    queryKey: ['plugins', 'logos'],
    queryFn: fetchPluginLogos,
    staleTime: 5 * 60 * 1000,
  })

  const logos = useMemo(() => {
    const data = query.data as
      | { logos?: Record<string, unknown> }
      | Record<string, unknown>
      | undefined
    const raw = data && 'logos' in data ? data.logos || {} : data || {}
    return Object.fromEntries(
      Object.entries(raw).map(([pluginId, url]) => [
        pluginId,
        toAbsoluteLogoUrl(url),
      ]),
    ) as Record<string, string | null>
  }, [query.data])

  return { ...query, logos }
}
