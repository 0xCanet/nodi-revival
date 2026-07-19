import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { CatalogStore } from './catalog-store.js'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

test('seeds reviewed manifests when no state exists', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'nodi-store-test-'))
  try {
    const store = await CatalogStore.create({
      statePath: resolve(directory, 'store.json'),
      seedDirectories: [resolve(repositoryRoot, 'catalog'), resolve(repositoryRoot, 'examples')],
      quorum: 5,
      approvalPercent: 66,
    })
    assert.deepEqual(
      store.list().map((app) => app.manifest.metadata.id),
      ['bitcoin-node', 'lottery-miner', 'hello-nodi'],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('fails closed instead of overwriting corrupted governance state', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'nodi-store-test-'))
  const statePath = resolve(directory, 'store.json')
  try {
    await writeFile(statePath, '{not-json', 'utf8')
    await assert.rejects(() => CatalogStore.create({
      statePath,
      seedDirectories: [resolve(repositoryRoot, 'catalog')],
      quorum: 5,
      approvalPercent: 66,
    }))
    assert.equal(await readFile(statePath, 'utf8'), '{not-json')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
