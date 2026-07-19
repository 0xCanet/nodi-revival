import {
  manifestApiVersion,
  type AppManifest,
  type AppPermission,
  type Architecture,
  type GovernanceStatus,
  type ManifestValidationIssue,
  type ManifestValidationResult,
} from './types.js'

const architectures = new Set<Architecture>(['amd64', 'arm64'])
const permissions = new Set<AppPermission>([
  'bitcoin.rpc.read',
  'bitcoin.rpc.write',
  'hardware.gpio',
  'hardware.temperature.read',
  'network.inbound',
  'network.outbound',
  'storage.persistent',
])
const governanceStatuses = new Set<GovernanceStatus>([
  'approved',
  'candidate',
  'core',
  'rejected',
])
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function rejectUnknownFields(
  object: Record<string, unknown>,
  allowed: string[],
  path: string,
  issues: ManifestValidationIssue[],
): void {
  const allowedSet = new Set(allowed)
  Object.keys(object).forEach((key) => {
    if (!allowedSet.has(key)) issues.push({ path: `${path}.${key}`, message: 'is not a supported field' })
  })
}

function stringField(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ManifestValidationIssue[],
): string | undefined {
  const value = object[key]
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({ path: `${path}.${key}`, message: 'must be a non-empty string' })
    return undefined
  }
  return value.trim()
}

function objectField(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ManifestValidationIssue[],
): Record<string, unknown> | undefined {
  const value = object[key]
  if (!isRecord(value)) {
    issues.push({ path: `${path}.${key}`, message: 'must be an object' })
    return undefined
  }
  return value
}

function positiveNumberField(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ManifestValidationIssue[],
): number | undefined {
  const value = object[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    issues.push({ path: `${path}.${key}`, message: 'must be a positive number' })
    return undefined
  }
  return value
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateManifest(input: unknown): ManifestValidationResult {
  const issues: ManifestValidationIssue[] = []
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: '$', message: 'must be an object' }] }
  }
  rejectUnknownFields(input, ['apiVersion', 'kind', 'metadata', 'spec', 'governance'], '$', issues)

  if (input.apiVersion !== manifestApiVersion) {
    issues.push({ path: '$.apiVersion', message: `must equal ${manifestApiVersion}` })
  }
  if (input.kind !== 'App') {
    issues.push({ path: '$.kind', message: 'must equal App' })
  }

  const metadata = objectField(input, 'metadata', '$', issues)
  if (metadata) {
    rejectUnknownFields(metadata, ['id', 'name', 'version', 'summary', 'description', 'author', 'license', 'repository', 'homepage'], '$.metadata', issues)
    const id = stringField(metadata, 'id', '$.metadata', issues)
    if (id && !idPattern.test(id)) {
      issues.push({ path: '$.metadata.id', message: 'must use lowercase kebab-case' })
    }
    stringField(metadata, 'name', '$.metadata', issues)
    const version = stringField(metadata, 'version', '$.metadata', issues)
    if (version && !semverPattern.test(version)) {
      issues.push({ path: '$.metadata.version', message: 'must be semantic version x.y.z' })
    }
    stringField(metadata, 'summary', '$.metadata', issues)
    stringField(metadata, 'description', '$.metadata', issues)
    stringField(metadata, 'license', '$.metadata', issues)
    const repository = stringField(metadata, 'repository', '$.metadata', issues)
    if (repository && !validHttpUrl(repository)) {
      issues.push({ path: '$.metadata.repository', message: 'must be an http(s) URL' })
    }
    if (metadata.homepage !== undefined) {
      const homepage = stringField(metadata, 'homepage', '$.metadata', issues)
      if (homepage && !validHttpUrl(homepage)) {
        issues.push({ path: '$.metadata.homepage', message: 'must be an http(s) URL' })
      }
    }
    const author = objectField(metadata, 'author', '$.metadata', issues)
    if (author) {
      rejectUnknownFields(author, ['name', 'url'], '$.metadata.author', issues)
      stringField(author, 'name', '$.metadata.author', issues)
      if (author.url !== undefined) {
        const authorUrl = stringField(author, 'url', '$.metadata.author', issues)
        if (authorUrl && !validHttpUrl(authorUrl)) {
          issues.push({ path: '$.metadata.author.url', message: 'must be an http(s) URL' })
        }
      }
    }
  }

  const spec = objectField(input, 'spec', '$', issues)
  if (spec) {
    rejectUnknownFields(spec, ['architectures', 'runtime', 'permissions', 'resources', 'ui', 'healthcheck'], '$.spec', issues)
    if (!Array.isArray(spec.architectures) || spec.architectures.length === 0) {
      issues.push({ path: '$.spec.architectures', message: 'must contain at least one architecture' })
    } else {
      spec.architectures.forEach((architecture, index) => {
        if (typeof architecture !== 'string' || !architectures.has(architecture as Architecture)) {
          issues.push({ path: `$.spec.architectures[${index}]`, message: 'must be arm64 or amd64' })
        }
      })
      if (new Set(spec.architectures).size !== spec.architectures.length) {
        issues.push({ path: '$.spec.architectures', message: 'must not contain duplicates' })
      }
    }

    if (!Array.isArray(spec.permissions)) {
      issues.push({ path: '$.spec.permissions', message: 'must be an array' })
    } else {
      spec.permissions.forEach((permission, index) => {
        if (typeof permission !== 'string' || !permissions.has(permission as AppPermission)) {
          issues.push({ path: `$.spec.permissions[${index}]`, message: 'is not a supported permission' })
        }
      })
      if (new Set(spec.permissions).size !== spec.permissions.length) {
        issues.push({ path: '$.spec.permissions', message: 'must not contain duplicates' })
      }
    }

    const runtime = objectField(spec, 'runtime', '$.spec', issues)
    if (runtime) {
      rejectUnknownFields(runtime, ['type', 'composeFile', 'source'], '$.spec.runtime', issues)
      if (runtime.type !== 'compose') {
        issues.push({ path: '$.spec.runtime.type', message: 'must equal compose' })
      }
      const composeFile = stringField(runtime, 'composeFile', '$.spec.runtime', issues)
      if (composeFile && (composeFile.startsWith('/') || composeFile.includes('..'))) {
        issues.push({ path: '$.spec.runtime.composeFile', message: 'must be a safe relative path' })
      }
      const source = objectField(runtime, 'source', '$.spec.runtime', issues)
      if (source) {
        rejectUnknownFields(source, ['type', 'url', 'ref'], '$.spec.runtime.source', issues)
        if (source.type !== 'git') {
          issues.push({ path: '$.spec.runtime.source.type', message: 'must equal git' })
        }
        const sourceUrl = stringField(source, 'url', '$.spec.runtime.source', issues)
        if (sourceUrl && !validHttpUrl(sourceUrl)) {
          issues.push({ path: '$.spec.runtime.source.url', message: 'must be an http(s) URL' })
        }
        const ref = stringField(source, 'ref', '$.spec.runtime.source', issues)
        if (ref && ['main', 'master', 'latest'].includes(ref)) {
          issues.push({ path: '$.spec.runtime.source.ref', message: 'must pin a tag or immutable commit, not a moving ref' })
        }
      }
    }

    const resources = objectField(spec, 'resources', '$.spec', issues)
    if (resources) {
      rejectUnknownFields(resources, ['cpu', 'memoryMb', 'storageMb'], '$.spec.resources', issues)
      positiveNumberField(resources, 'cpu', '$.spec.resources', issues)
      positiveNumberField(resources, 'memoryMb', '$.spec.resources', issues)
      positiveNumberField(resources, 'storageMb', '$.spec.resources', issues)
    }

    const healthcheck = objectField(spec, 'healthcheck', '$.spec', issues)
    if (healthcheck) {
      rejectUnknownFields(healthcheck, ['type', 'target', 'intervalSeconds'], '$.spec.healthcheck', issues)
      if (healthcheck.type !== 'http' && healthcheck.type !== 'command') {
        issues.push({ path: '$.spec.healthcheck.type', message: 'must equal http or command' })
      }
      stringField(healthcheck, 'target', '$.spec.healthcheck', issues)
      positiveNumberField(healthcheck, 'intervalSeconds', '$.spec.healthcheck', issues)
    }

    if (spec.ui !== undefined) {
      const ui = objectField(spec, 'ui', '$.spec', issues)
      if (ui) {
        rejectUnknownFields(ui, ['route', 'screenSummary'], '$.spec.ui', issues)
        const route = stringField(ui, 'route', '$.spec.ui', issues)
        if (route && !route.startsWith('/')) {
          issues.push({ path: '$.spec.ui.route', message: 'must start with /' })
        }
        if (ui.screenSummary !== undefined && typeof ui.screenSummary !== 'boolean') {
          issues.push({ path: '$.spec.ui.screenSummary', message: 'must be a boolean' })
        }
      }
    }
  }

  const governance = objectField(input, 'governance', '$', issues)
  if (governance) {
    rejectUnknownFields(governance, ['status', 'proposalUrl'], '$.governance', issues)
    if (
      typeof governance.status !== 'string' ||
      !governanceStatuses.has(governance.status as GovernanceStatus)
    ) {
      issues.push({ path: '$.governance.status', message: 'must be core, candidate, approved or rejected' })
    }
    if (governance.proposalUrl !== undefined) {
      const proposalUrl = stringField(governance, 'proposalUrl', '$.governance', issues)
      if (proposalUrl && !validHttpUrl(proposalUrl)) {
        issues.push({ path: '$.governance.proposalUrl', message: 'must be an http(s) URL' })
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }
  return { ok: true, issues, manifest: input as unknown as AppManifest }
}

export function assertManifest(input: unknown): AppManifest {
  const result = validateManifest(input)
  if (!result.ok || !result.manifest) {
    const details = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')
    throw new Error(`Invalid NOD-I app manifest:\n${details}`)
  }
  return result.manifest
}
