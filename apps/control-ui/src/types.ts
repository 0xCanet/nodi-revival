import type { AppManifest } from '@nodi/sdk'

export interface AttentionItem {
  level: 'error' | 'info' | 'warning'
  code: string
  message: string
}

export interface StatusPayload {
  generatedAt: string
  bitcoin: {
    status: 'offline' | 'online' | 'syncing'
    chain: string
    blocks: number
    headers: number
    progress: number
    peers: number
    version: number | null
    pruned: boolean
    sizeOnDisk: number
    error?: string
  }
  miner: {
    status: 'blocked' | 'disabled' | 'offline' | 'running' | 'stopped' | 'thermal-stop'
    enabled: boolean
    pool: string
    worker: string
    threads: number
    hashRateKh: number
    acceptedShares: number
    bestDifficulty: number
    temperatureC: number | null
    updatedAt: string | null
    message: string
  }
  device: {
    hostname: string
    architecture: string
    uptimeSeconds: number
    loadAverage: number[]
    memoryUsedPercent: number
    temperatureC: number | null
    dataFreeBytes: number | null
  }
  attention: AttentionItem[]
}

export interface VoteTally {
  approvals: number
  rejections: number
  total: number
  quorum: number
  approvalPercent: number
  requiredApprovalPercent: number
  remainingForQuorum: number
  decision: 'approved' | 'pending' | 'rejected'
}

export interface CatalogApp {
  manifest: AppManifest
  votes: Array<{ voterHash: string; choice: 'approve' | 'reject'; updatedAt: string }>
  installState: 'installed' | 'not-installed' | 'requested'
  submittedAt: string
  tally: VoteTally
}

export interface CatalogPayload {
  apps: CatalogApp[]
  governance: { quorum: number; approvalPercent: number }
}
