import type { AppManifest } from '@nodi/sdk'
import type { CatalogApp, CatalogPayload, StatusPayload } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
  return payload
}

export const api = {
  status: () => request<StatusPayload>('/api/status'),
  apps: () => request<CatalogPayload>('/api/apps'),
  vote: (appId: string, voterId: string, choice: 'approve' | 'reject') =>
    request<CatalogApp>(`/api/apps/${appId}/votes`, {
      method: 'POST', body: JSON.stringify({ voterId, choice }),
    }),
  requestInstall: (appId: string, operatorId: string) =>
    request<CatalogApp>(`/api/apps/${appId}/install-requests`, {
      method: 'POST', body: JSON.stringify({ operatorId }),
    }),
  propose: (manifest: AppManifest | unknown, proposerId: string) =>
    request<CatalogApp>('/api/proposals', {
      method: 'POST', body: JSON.stringify({ manifest, proposerId }),
    }),
}
