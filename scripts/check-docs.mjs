import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const required = [
  'README.md', 'CONTRIBUTING.md', 'AGENTS.md', 'llms.txt',
  'docs/ARCHITECTURE.md', 'docs/UX.md', 'docs/SDK.md',
  'docs/GOVERNANCE.md', 'docs/SECURITY.md', 'docs/HARDWARE_SCREEN.md',
  'docs/HARDWARE_NODI_V1.md', 'docs/RUNBOOK.md',
]
const errors = []

for (const file of required) {
  try {
    await access(resolve(root, file))
  } catch {
    errors.push(`missing required document: ${file}`)
  }
}

for (const file of required.filter((name) => name.endsWith('.md') || name === 'llms.txt')) {
  let body
  try {
    body = await readFile(resolve(root, file), 'utf8')
  } catch {
    continue
  }
  const links = [...body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1])
  for (const link of links) {
    if (/^(?:https?:|mailto:)/.test(link) || link.startsWith('#')) continue
    const [path] = link.split('#')
    if (!path) continue
    try {
      await access(resolve(root, dirname(file), decodeURIComponent(path)))
    } catch {
      errors.push(`${file}: broken local link ${link}`)
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Documentation OK (${required.length} required files)`)
