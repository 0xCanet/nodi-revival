import type { AppManifest, VoteChoice } from '@nodi/sdk'

export interface VoteRecord {
  voterHash: string
  choice: VoteChoice
  updatedAt: string
}

export type InstallState = 'installed' | 'not-installed' | 'requested'

export interface CatalogRecord {
  manifest: AppManifest
  votes: VoteRecord[]
  installState: InstallState
  submittedAt: string
}

export interface AuditEvent {
  id: string
  type: 'install.requested' | 'proposal.created' | 'vote.recorded'
  appId: string
  actorHash: string
  createdAt: string
  details: Record<string, boolean | number | string>
}

export interface StoreState {
  schemaVersion: 1
  apps: CatalogRecord[]
  audit: AuditEvent[]
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

export interface BitcoinStatus {
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

export interface MinerStatus {
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

export interface DeviceStatus {
  hostname: string
  architecture: string
  uptimeSeconds: number
  loadAverage: number[]
  memoryUsedPercent: number
  temperatureC: number | null
  dataFreeBytes: number | null
}
