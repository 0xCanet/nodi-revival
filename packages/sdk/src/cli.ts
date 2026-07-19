#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { validateManifest } from './validate.js'

async function main(): Promise<void> {
  const [, , command, manifestPath] = process.argv
  if (command !== 'validate' || !manifestPath) {
    console.error('Usage: nodi-app validate <app.nodi.json>')
    process.exitCode = 2
    return
  }

  const absolutePath = resolve(process.cwd(), manifestPath)
  let input: unknown
  try {
    input = JSON.parse(await readFile(absolutePath, 'utf8'))
  } catch (error) {
    console.error(`Could not read ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
    return
  }

  const result = validateManifest(input)
  if (!result.ok) {
    console.error(`INVALID ${manifestPath}`)
    result.issues.forEach((issue) => console.error(`- ${issue.path}: ${issue.message}`))
    process.exitCode = 1
    return
  }

  console.log(`VALID ${result.manifest?.metadata.id}@${result.manifest?.metadata.version}`)
}

await main()
