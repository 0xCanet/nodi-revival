import assert from 'node:assert/strict'
import test from 'node:test'
import { bitcoinRpcTimeoutMs, getMinerStatus } from './status.js'

test('uses a safe Bitcoin RPC timeout', () => {
  assert.equal(bitcoinRpcTimeoutMs(undefined), 15000)
  assert.equal(bitcoinRpcTimeoutMs('12000'), 12000)
  assert.equal(bitcoinRpcTimeoutMs('invalid'), 15000)
  assert.equal(bitcoinRpcTimeoutMs('500'), 15000)
})

test('reports an unconfigured opt-in miner as disabled', async () => {
  const previousEnabled = process.env.MINER_ENABLED
  const previousStatePath = process.env.MINER_STATE_PATH
  const previousLogPath = process.env.MINER_LOG_PATH

  process.env.MINER_ENABLED = 'false'
  process.env.MINER_STATE_PATH = '/tmp/nodi-test-missing-miner-state.json'
  process.env.MINER_LOG_PATH = '/tmp/nodi-test-missing-miner-log.txt'

  try {
    const status = await getMinerStatus()
    assert.equal(status.status, 'disabled')
    assert.equal(status.enabled, false)
    assert.equal(status.message, 'Mineur désactivé par défaut')
  } finally {
    if (previousEnabled === undefined) delete process.env.MINER_ENABLED
    else process.env.MINER_ENABLED = previousEnabled
    if (previousStatePath === undefined) delete process.env.MINER_STATE_PATH
    else process.env.MINER_STATE_PATH = previousStatePath
    if (previousLogPath === undefined) delete process.env.MINER_LOG_PATH
    else process.env.MINER_LOG_PATH = previousLogPath
  }
})
