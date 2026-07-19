import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { CatalogStore } from './catalog-store.js'
import { getBitcoinStatus, getDeviceStatus, getMinerStatus } from './status.js'

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(here, '../../..')
const port = Number(process.env.PORT ?? 8787)
const quorum = Math.max(1, Number(process.env.STORE_QUORUM ?? 5))
const approvalPercent = Math.max(1, Math.min(100, Number(process.env.STORE_APPROVAL_PERCENT ?? 66)))

const store = await CatalogStore.create({
  statePath: process.env.STORE_DATA_PATH ?? resolve(repositoryRoot, 'data/store/store.json'),
  seedDirectories: (process.env.CATALOG_DIRS ?? `${resolve(repositoryRoot, 'catalog')},${resolve(repositoryRoot, 'examples')}`)
    .split(',').map((path) => path.trim()).filter(Boolean),
  quorum,
  approvalPercent,
})

function json(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  })
  response.end(payload)
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 1_000_000) throw new Error('request body exceeds 1 MB')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function errorStatus(message: string): number {
  if (message.includes('not found')) return 404
  if (message.includes('not approved') || message.includes('only candidate')) return 409
  return 400
}

async function aggregateStatus() {
  const [bitcoin, miner, device] = await Promise.all([
    getBitcoinStatus(), getMinerStatus(), getDeviceStatus(),
  ])
  const apps = store.list()
  const attention: Array<{ level: 'error' | 'info' | 'warning'; code: string; message: string }> = []
  if (bitcoin.status === 'offline') attention.push({ level: 'error', code: 'bitcoin.offline', message: 'Bitcoin RPC est hors ligne' })
  if (bitcoin.status === 'syncing') attention.push({ level: 'info', code: 'bitcoin.syncing', message: `Bitcoin synchronise ${bitcoin.progress.toFixed(2)}%` })
  if (miner.status === 'thermal-stop') attention.push({ level: 'error', code: 'miner.thermal', message: 'Le mineur a été arrêté par la limite thermique' })
  if (miner.status === 'blocked') attention.push({ level: 'warning', code: 'miner.blocked', message: 'Le mineur attend une configuration valide' })
  if (device.temperatureC !== null && device.temperatureC >= Number(process.env.MINER_MAX_TEMP_C ?? 75)) {
    attention.push({ level: 'error', code: 'device.temperature', message: `Température élevée: ${device.temperatureC}°C` })
  }
  const candidates = apps.filter((app) => app.manifest.governance.status === 'candidate' && app.tally.decision === 'pending').length
  if (candidates > 0) attention.push({ level: 'info', code: 'store.votes', message: `${candidates} app(s) attendent le vote` })

  return { generatedAt: new Date().toISOString(), bitcoin, miner, device, attention }
}

const server = createServer(async (request, response) => {
  const method = request.method ?? 'GET'
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  try {
    if (method === 'GET' && url.pathname === '/api/health') {
      json(response, 200, { ok: true, service: 'nodi-api', version: '0.1.0' })
      return
    }
    if (method === 'GET' && url.pathname === '/api/status') {
      json(response, 200, await aggregateStatus())
      return
    }
    if (method === 'GET' && url.pathname === '/api/screen') {
      const status = await aggregateStatus()
      const apps = store.list()
      json(response, 200, {
        generatedAt: status.generatedAt,
        bitcoin: status.bitcoin,
        miner: status.miner,
        device: status.device,
        store: {
          core: apps.filter((app) => app.manifest.governance.status === 'core').length,
          approved: apps.filter((app) => app.manifest.governance.status === 'approved' || app.tally.decision === 'approved').length,
          candidates: apps.filter((app) => app.manifest.governance.status === 'candidate' && app.tally.decision === 'pending').length,
        },
        attention: status.attention[0] ?? null,
      })
      return
    }
    if (method === 'GET' && url.pathname === '/api/apps') {
      json(response, 200, { apps: store.list(), governance: { quorum, approvalPercent } })
      return
    }
    if (method === 'GET' && url.pathname === '/api/audit') {
      json(response, 200, { events: store.audit(Number(url.searchParams.get('limit') ?? 100)) })
      return
    }

    const appMatch = url.pathname.match(/^\/api\/apps\/([a-z0-9-]+)$/)
    if (method === 'GET' && appMatch?.[1]) {
      const app = store.get(appMatch[1])
      json(response, app ? 200 : 404, app ?? { error: 'app not found' })
      return
    }

    const voteMatch = url.pathname.match(/^\/api\/apps\/([a-z0-9-]+)\/votes$/)
    if (method === 'POST' && voteMatch?.[1]) {
      const body = await readJson(request) as { choice?: unknown; voterId?: unknown }
      json(response, 200, await store.vote(voteMatch[1], body.voterId, body.choice))
      return
    }

    const installMatch = url.pathname.match(/^\/api\/apps\/([a-z0-9-]+)\/install-requests$/)
    if (method === 'POST' && installMatch?.[1]) {
      const body = await readJson(request) as { operatorId?: unknown }
      json(response, 202, await store.requestInstall(installMatch[1], body.operatorId))
      return
    }

    if (method === 'POST' && url.pathname === '/api/proposals') {
      const body = await readJson(request) as { manifest?: unknown; proposerId?: unknown }
      json(response, 201, await store.propose(body.manifest, body.proposerId))
      return
    }

    json(response, 404, { error: 'route not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    json(response, errorStatus(message), { error: message })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`NOD-I API listening on http://0.0.0.0:${port}`)
})

function shutdown(signal: string): void {
  console.log(`Received ${signal}; stopping API`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
