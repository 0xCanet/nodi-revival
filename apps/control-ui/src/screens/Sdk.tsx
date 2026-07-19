import { useState } from 'react'
import { api } from '../api'

const exampleManifest = `{
  "apiVersion": "nodi.community/v1",
  "kind": "App",
  "metadata": {
    "id": "mon-app",
    "name": "Mon App",
    "version": "0.1.0",
    "summary": "Une app communautaire minimale",
    "description": "Décrit clairement son usage avant toute exécution.",
    "author": { "name": "Votre pseudo" },
    "license": "MIT",
    "repository": "https://github.com/votre-compte/mon-app"
  },
  "spec": {
    "architectures": ["arm64", "amd64"],
    "runtime": {
      "type": "compose",
      "composeFile": "compose.yaml",
      "source": {
        "type": "git",
        "url": "https://github.com/votre-compte/mon-app",
        "ref": "v0.1.0"
      }
    },
    "permissions": ["network.inbound"],
    "resources": { "cpu": 0.25, "memoryMb": 64, "storageMb": 16 },
    "healthcheck": { "type": "http", "target": "/health", "intervalSeconds": 30 }
  },
  "governance": { "status": "candidate" }
}`

export function Sdk({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [manifest, setManifest] = useState(exampleManifest)
  const [identity, setIdentity] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function propose() {
    setPending(true)
    setResult(null)
    try {
      const parsed = JSON.parse(manifest) as unknown
      const app = await api.propose(parsed, identity)
      setResult(`Proposition créée: ${app.manifest.metadata.id}`)
      await onRefresh()
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="sdk-layout">
      <section className="sdk-guide panel">
        <span className="section-index">SDK / V1</span>
        <h1>Créer une app lisible avant de l’exécuter.</h1>
        <ol className="command-steps">
          <li><span>01</span><div><strong>Copier l’exemple</strong><code>cp -R examples/hello-nodi mon-app</code></div></li>
          <li><span>02</span><div><strong>Déclarer le contrat</strong><code>mon-app/app.nodi.json</code></div></li>
          <li><span>03</span><div><strong>Valider localement</strong><code>npx nodi-app validate mon-app/app.nodi.json</code></div></li>
          <li><span>04</span><div><strong>Proposer au vote</strong><code>source + version + permissions</code></div></li>
        </ol>
        <p className="panel-note">Le schéma est dans <code>packages/sdk/schema/app-manifest.schema.json</code>. Une source mouvante comme <code>main</code> est refusée.</p>
      </section>

      <section className="proposal-panel panel">
        <div className="panel__heading panel__heading--compact"><div><span className="section-index">PROPOSITION</span><h2>Soumettre un manifeste</h2></div></div>
        <label className="field">
          <span>IDENTIFIANT COMMUNAUTAIRE</span>
          <input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="github:mon-pseudo" />
        </label>
        <label className="field field--grow">
          <span>APP.NODI.JSON</span>
          <textarea value={manifest} onChange={(event) => setManifest(event.target.value)} spellCheck={false} />
        </label>
        <button type="button" className="button button--primary" disabled={pending || identity.length < 3} onClick={() => void propose()}>
          {pending ? 'VALIDATION…' : 'VALIDER ET PROPOSER'}
        </button>
        {result ? <pre className="validation-output" role="status">{result}</pre> : null}
      </section>
    </main>
  )
}
