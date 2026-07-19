import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { CatalogPayload, StatusPayload } from '../types'

export function useNodiData() {
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([api.status(), api.apps()])
    const statusResult = results[0]
    const catalogResult = results[1]
    if (statusResult.status === 'fulfilled') setStatus(statusResult.value)
    if (catalogResult.status === 'fulfilled') setCatalog(catalogResult.value)
    const failure = results.find((result) => result.status === 'rejected')
    setError(failure?.status === 'rejected' ? String(failure.reason) : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return { catalog, error, loading, refresh, setCatalog, status }
}
