import { useEffect, useState } from 'react'
import type { SystemStatus } from '@/lib/api'
import { getSystemStatus } from '@/lib/api'

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    getSystemStatus()
      .then(setStatus)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { status, loading, error }
}
