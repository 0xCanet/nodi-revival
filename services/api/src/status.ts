import { readFile, statfs } from 'node:fs/promises'
import { arch, freemem, hostname, loadavg, totalmem, uptime } from 'node:os'
import type { BitcoinStatus, DeviceStatus, MinerStatus } from './model.js'

function demoEnabled(): boolean {
  return process.env.NODI_DEMO === 'true'
}

async function bitcoinRpc<T>(method: string): Promise<T> {
  const url = process.env.BITCOIN_RPC_URL ?? 'http://127.0.0.1:8332'
  const user = process.env.BITCOIN_RPC_USER ?? 'nodi'
  const password = process.env.BITCOIN_RPC_PASSWORD ?? ''
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1800)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params: [] }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`RPC HTTP ${response.status}`)
    const payload = await response.json() as { error?: { message?: string }; result?: T }
    if (payload.error) throw new Error(payload.error.message ?? 'Bitcoin RPC error')
    if (payload.result === undefined) throw new Error('Bitcoin RPC returned no result')
    return payload.result
  } finally {
    clearTimeout(timeout)
  }
}

export async function getBitcoinStatus(): Promise<BitcoinStatus> {
  try {
    const [chain, network] = await Promise.all([
      bitcoinRpc<{
        chain: string
        blocks: number
        headers: number
        verificationprogress: number
        pruned: boolean
        size_on_disk: number
      }>('getblockchaininfo'),
      bitcoinRpc<{ connections: number; version: number }>('getnetworkinfo'),
    ])
    const progress = Math.max(0, Math.min(100, chain.verificationprogress * 100))
    return {
      status: progress >= 99.99 && chain.blocks >= chain.headers ? 'online' : 'syncing',
      chain: chain.chain,
      blocks: chain.blocks,
      headers: chain.headers,
      progress,
      peers: network.connections,
      version: network.version,
      pruned: chain.pruned,
      sizeOnDisk: chain.size_on_disk,
    }
  } catch (error) {
    if (demoEnabled()) {
      return {
        status: 'syncing', chain: 'main', blocks: 901842, headers: 902114,
        progress: 97.42, peers: 12, version: 310000, pruned: true, sizeOnDisk: 188_743_680_000,
      }
    }
    return {
      status: 'offline', chain: 'unknown', blocks: 0, headers: 0, progress: 0,
      peers: 0, version: null, pruned: false, sizeOnDisk: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function parseMinerLog(log: string): { acceptedShares: number; hashRateKh: number } {
  const rates = [...log.matchAll(/(?:thread\s+\d+:\s+)?([0-9]+(?:\.[0-9]+)?)\s+khash\/s/gi)]
  const latestByThread = new Map<string, number>()
  rates.slice(-64).forEach((match, index) => {
    const line = match[0]
    const thread = line.match(/thread\s+(\d+)/i)?.[1] ?? String(index)
    latestByThread.set(thread, Number(match[1] ?? 0))
  })
  const shareMatches = [...log.matchAll(/accepted[^0-9]*(\d+)(?:\/(\d+))?/gi)]
  const lastShare = shareMatches.at(-1)
  return {
    acceptedShares: Number(lastShare?.[1] ?? 0),
    hashRateKh: Math.round([...latestByThread.values()].reduce((sum, rate) => sum + rate, 0) * 100) / 100,
  }
}

export async function getMinerStatus(): Promise<MinerStatus> {
  const statePath = process.env.MINER_STATE_PATH ?? './data/miner/state.json'
  const logPath = process.env.MINER_LOG_PATH ?? './data/miner/miner.log'
  try {
    const [stateText, log] = await Promise.all([
      readFile(statePath, 'utf8'),
      readFile(logPath, 'utf8').catch(() => ''),
    ])
    const state = JSON.parse(stateText) as Partial<MinerStatus>
    const parsed = parseMinerLog(log.slice(-128_000))
    return {
      status: state.status ?? 'offline',
      enabled: state.enabled ?? false,
      pool: state.pool ?? '',
      worker: state.worker ?? '',
      threads: state.threads ?? 0,
      hashRateKh: parsed.hashRateKh,
      acceptedShares: parsed.acceptedShares,
      bestDifficulty: state.bestDifficulty ?? 0,
      temperatureC: state.temperatureC ?? null,
      updatedAt: state.updatedAt ?? null,
      message: state.message ?? 'No miner state available',
    }
  } catch (error) {
    if (demoEnabled()) {
      return {
        status: 'disabled', enabled: false, pool: 'public-pool.io:21496', worker: 'nodi',
        threads: 1, hashRateKh: 0, acceptedShares: 0, bestDifficulty: 0,
        temperatureC: 51.8, updatedAt: new Date().toISOString(),
        message: 'Configuration requise avant le premier démarrage',
      }
    }
    if (process.env.MINER_ENABLED !== 'true') {
      return {
        status: 'disabled', enabled: false, pool: '', worker: '', threads: 0,
        hashRateKh: 0, acceptedShares: 0, bestDifficulty: 0, temperatureC: null,
        updatedAt: null, message: 'Mineur désactivé par défaut',
      }
    }
    return {
      status: 'offline', enabled: false, pool: '', worker: '', threads: 0,
      hashRateKh: 0, acceptedShares: 0, bestDifficulty: 0, temperatureC: null,
      updatedAt: null, message: error instanceof Error ? error.message : String(error),
    }
  }
}

async function readTemperature(): Promise<number | null> {
  const path = process.env.HOST_THERMAL_PATH ?? '/sys/class/thermal/thermal_zone0/temp'
  try {
    const raw = Number((await readFile(path, 'utf8')).trim())
    return Number.isFinite(raw) ? Math.round((raw > 1000 ? raw / 1000 : raw) * 10) / 10 : null
  } catch {
    return demoEnabled() ? 51.8 : null
  }
}

export async function getDeviceStatus(): Promise<DeviceStatus> {
  const dataPath = process.env.NODI_DATA_PATH ?? '/data'
  const memoryTotal = totalmem()
  let dataFreeBytes: number | null = null
  try {
    const stats = await statfs(dataPath)
    dataFreeBytes = stats.bavail * stats.bsize
  } catch {
    dataFreeBytes = null
  }
  return {
    hostname: hostname(),
    architecture: arch(),
    uptimeSeconds: Math.round(uptime()),
    loadAverage: loadavg().map((value) => Math.round(value * 100) / 100),
    memoryUsedPercent: Math.round((1 - freemem() / memoryTotal) * 1000) / 10,
    temperatureC: await readTemperature(),
    dataFreeBytes,
  }
}
