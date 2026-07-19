import assert from 'node:assert/strict'
import test from 'node:test'
import { validateManifest } from './validate.js'

const validManifest = {
  apiVersion: 'nodi.community/v1',
  kind: 'App',
  metadata: {
    id: 'hello-nodi',
    name: 'Hello NOD-I',
    version: '0.1.0',
    summary: 'Small SDK example',
    description: 'A deterministic example app used to test the SDK.',
    author: { name: 'NOD-I Revival', url: 'https://github.com/0xCanet/nodi-revival' },
    license: 'MIT',
    repository: 'https://github.com/0xCanet/nodi-revival',
  },
  spec: {
    architectures: ['arm64', 'amd64'],
    runtime: {
      type: 'compose',
      composeFile: 'compose.yaml',
      source: {
        type: 'git',
        url: 'https://github.com/0xCanet/nodi-revival',
        ref: 'v0.1.0',
      },
    },
    permissions: ['network.inbound'],
    resources: { cpu: 0.25, memoryMb: 64, storageMb: 16 },
    ui: { route: '/apps/hello-nodi', screenSummary: false },
    healthcheck: { type: 'http', target: '/health', intervalSeconds: 30 },
  },
  governance: { status: 'candidate' },
}

test('accepts a pinned, explicit manifest', () => {
  const result = validateManifest(validManifest)
  assert.equal(result.ok, true)
  assert.equal(result.manifest?.metadata.id, 'hello-nodi')
})

test('rejects moving source refs and unsafe compose paths', () => {
  const input = structuredClone(validManifest)
  input.spec.runtime.source.ref = 'main'
  input.spec.runtime.composeFile = '../compose.yaml'
  const result = validateManifest(input)
  assert.equal(result.ok, false)
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    ['$.spec.runtime.composeFile', '$.spec.runtime.source.ref'],
  )
})

test('rejects undeclared permissions and duplicate permissions', () => {
  const input = structuredClone(validManifest)
  input.spec.permissions = ['network.inbound', 'network.inbound', 'docker.socket']
  const result = validateManifest(input)
  assert.equal(result.ok, false)
  assert.equal(result.issues.some((issue) => issue.path === '$.spec.permissions[2]'), true)
  assert.equal(result.issues.some((issue) => issue.path === '$.spec.permissions'), true)
})

test('rejects unknown fields and duplicate architectures like the JSON Schema', () => {
  const input = structuredClone(validManifest)
  input.spec.architectures = ['arm64', 'arm64']
  ;(input.metadata as Record<string, unknown>).opaqueInstaller = true
  const result = validateManifest(input)
  assert.equal(result.ok, false)
  assert.equal(result.issues.some((issue) => issue.path === '$.metadata.opaqueInstaller'), true)
  assert.equal(result.issues.some((issue) => issue.path === '$.spec.architectures'), true)
})
