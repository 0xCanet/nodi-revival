import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { assertManifest, type AppManifest, type VoteChoice } from '@nodi/sdk'
import { tallyVotes } from './governance.js'
import type { AuditEvent, CatalogRecord, StoreState } from './model.js'

interface CatalogStoreOptions {
  statePath: string
  seedDirectories: string[]
  quorum: number
  approvalPercent: number
}

function actorHash(identifier: string): string {
  return createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex')
}

function assertActor(identifier: unknown): string {
  if (typeof identifier !== 'string' || !/^[a-zA-Z0-9:@._-]{3,128}$/.test(identifier)) {
    throw new Error('voterId must contain 3-128 safe identifier characters')
  }
  return actorHash(identifier)
}

async function findManifestFiles(directory: string): Promise<string[]> {
  const results: string[] = []
  async function visit(current: string): Promise<void> {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await visit(path)
      if (entry.isFile() && entry.name === 'app.nodi.json') results.push(path)
    }
  }
  await visit(directory)
  return results.sort()
}

async function seedState(directories: string[]): Promise<StoreState> {
  const files = (await Promise.all(directories.map(findManifestFiles))).flat()
  const manifests: AppManifest[] = []
  for (const file of files) {
    manifests.push(assertManifest(JSON.parse(await readFile(file, 'utf8'))))
  }
  const unique = new Map(manifests.map((manifest) => [manifest.metadata.id, manifest]))
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    apps: [...unique.values()].map((manifest) => ({
      manifest,
      votes: [],
      installState: manifest.governance.status === 'core' ? 'installed' : 'not-installed',
      submittedAt: now,
    })),
    audit: [],
  }
}

export class CatalogStore {
  private state: StoreState
  private writeQueue: Promise<void> = Promise.resolve()

  private constructor(
    private readonly options: CatalogStoreOptions,
    state: StoreState,
  ) {
    this.state = state
  }

  static async create(options: CatalogStoreOptions): Promise<CatalogStore> {
    let state: StoreState
    try {
      state = JSON.parse(await readFile(options.statePath, 'utf8')) as StoreState
      if (state.schemaVersion !== 1 || !Array.isArray(state.apps) || !Array.isArray(state.audit)) {
        throw new Error('unsupported store state')
      }
      state.apps.forEach((record) => assertManifest(record.manifest))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      state = await seedState(options.seedDirectories)
      await mkdir(dirname(options.statePath), { recursive: true })
      await writeFile(options.statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
    }
    return new CatalogStore(options, state)
  }

  list(): Array<CatalogRecord & { tally: ReturnType<typeof tallyVotes> }> {
    return this.state.apps.map((record) => ({
      ...structuredClone(record),
      tally: tallyVotes(record.votes, this.options.quorum, this.options.approvalPercent),
    }))
  }

  get(appId: string): (CatalogRecord & { tally: ReturnType<typeof tallyVotes> }) | undefined {
    return this.list().find((record) => record.manifest.metadata.id === appId)
  }

  audit(limit = 100): AuditEvent[] {
    return structuredClone(this.state.audit.slice(-Math.max(1, Math.min(limit, 500))).reverse())
  }

  async vote(appId: string, voterId: unknown, choice: unknown) {
    if (choice !== 'approve' && choice !== 'reject') throw new Error('choice must be approve or reject')
    const record = this.state.apps.find((app) => app.manifest.metadata.id === appId)
    if (!record) throw new Error('app not found')
    if (record.manifest.governance.status !== 'candidate') throw new Error('only candidate apps accept votes')

    const hash = assertActor(voterId)
    const now = new Date().toISOString()
    const existing = record.votes.find((vote) => vote.voterHash === hash)
    if (existing) {
      existing.choice = choice as VoteChoice
      existing.updatedAt = now
    } else {
      record.votes.push({ voterHash: hash, choice: choice as VoteChoice, updatedAt: now })
    }
    this.appendAudit('vote.recorded', appId, hash, { choice: choice as VoteChoice })
    await this.persist()
    return this.get(appId)
  }

  async propose(input: unknown, proposerId: unknown) {
    const manifest = assertManifest(input)
    if (this.state.apps.some((app) => app.manifest.metadata.id === manifest.metadata.id)) {
      throw new Error('an app with this id already exists')
    }
    const hash = assertActor(proposerId)
    const candidate: AppManifest = {
      ...manifest,
      governance: { ...manifest.governance, status: 'candidate' },
    }
    const submittedAt = new Date().toISOString()
    this.state.apps.push({ manifest: candidate, votes: [], installState: 'not-installed', submittedAt })
    this.appendAudit('proposal.created', candidate.metadata.id, hash, {
      version: candidate.metadata.version,
      repository: candidate.metadata.repository,
    })
    await this.persist()
    return this.get(candidate.metadata.id)
  }

  async requestInstall(appId: string, operatorId: unknown) {
    const record = this.state.apps.find((app) => app.manifest.metadata.id === appId)
    if (!record) throw new Error('app not found')
    const tally = tallyVotes(record.votes, this.options.quorum, this.options.approvalPercent)
    const eligible = record.manifest.governance.status === 'core' ||
      record.manifest.governance.status === 'approved' || tally.decision === 'approved'
    if (!eligible) throw new Error('app is not approved for installation')

    const hash = assertActor(operatorId)
    record.installState = 'requested'
    this.appendAudit('install.requested', appId, hash, {
      version: record.manifest.metadata.version,
      note: 'MVP records the request; a maintainer must review and package the app.',
    })
    await this.persist()
    return this.get(appId)
  }

  private appendAudit(
    type: AuditEvent['type'],
    appId: string,
    hash: string,
    details: AuditEvent['details'],
  ): void {
    this.state.audit.push({ id: randomUUID(), type, appId, actorHash: hash, createdAt: new Date().toISOString(), details })
    if (this.state.audit.length > 2000) this.state.audit = this.state.audit.slice(-2000)
  }

  private async persist(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const temporary = `${this.options.statePath}.${process.pid}.tmp`
      await mkdir(dirname(this.options.statePath), { recursive: true })
      await writeFile(temporary, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600 })
      await rename(temporary, this.options.statePath)
    })
    await this.writeQueue
  }
}
