export const manifestApiVersion = 'nodi.community/v1' as const

export type Architecture = 'arm64' | 'amd64'

export type AppPermission =
  | 'bitcoin.rpc.read'
  | 'bitcoin.rpc.write'
  | 'hardware.gpio'
  | 'hardware.temperature.read'
  | 'network.inbound'
  | 'network.outbound'
  | 'storage.persistent'

export type GovernanceStatus = 'approved' | 'candidate' | 'core' | 'rejected'

export interface AppManifest {
  apiVersion: typeof manifestApiVersion
  kind: 'App'
  metadata: {
    id: string
    name: string
    version: string
    summary: string
    description: string
    author: {
      name: string
      url?: string
    }
    license: string
    repository: string
    homepage?: string
  }
  spec: {
    architectures: Architecture[]
    runtime: {
      type: 'compose'
      composeFile: string
      source: {
        type: 'git'
        url: string
        ref: string
      }
    }
    permissions: AppPermission[]
    resources: {
      cpu: number
      memoryMb: number
      storageMb: number
    }
    ui?: {
      route: string
      screenSummary?: boolean
    }
    healthcheck: {
      type: 'command' | 'http'
      target: string
      intervalSeconds: number
    }
  }
  governance: {
    status: GovernanceStatus
    proposalUrl?: string
  }
}

export type VoteChoice = 'approve' | 'reject'

export interface ManifestValidationIssue {
  path: string
  message: string
}

export interface ManifestValidationResult {
  ok: boolean
  issues: ManifestValidationIssue[]
  manifest?: AppManifest
}
