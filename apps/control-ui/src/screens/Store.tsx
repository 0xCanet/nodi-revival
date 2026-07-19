import { useMemo, useState } from 'react'
import { api } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import type { CatalogApp, CatalogPayload } from '../types'

function getIdentity(key: string): string {
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const value = crypto.randomUUID()
  window.localStorage.setItem(key, value)
  return value
}

function statusTone(app: CatalogApp): 'danger' | 'healthy' | 'muted' | 'pending' {
  if (app.installState === 'installed' || app.tally.decision === 'approved') return 'healthy'
  if (app.tally.decision === 'rejected') return 'danger'
  if (app.manifest.governance.status === 'candidate') return 'pending'
  return 'muted'
}

function statusLabel(app: CatalogApp): string {
  if (app.installState === 'installed') return 'installée'
  if (app.tally.decision === 'approved') return 'approuvée'
  if (app.tally.decision === 'rejected') return 'rejetée'
  return app.manifest.governance.status
}

export function Store({ catalog, onRefresh }: { catalog: CatalogPayload; onRefresh: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(catalog.apps[0]?.manifest.metadata.id ?? '')
  const [filter, setFilter] = useState<'all' | 'candidate' | 'installed'>('all')
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const visible = useMemo(() => catalog.apps.filter((app) => {
    if (filter === 'candidate') return app.manifest.governance.status === 'candidate' && app.tally.decision === 'pending'
    if (filter === 'installed') return app.installState === 'installed'
    return true
  }), [catalog.apps, filter])
  const selected = visible.find((app) => app.manifest.metadata.id === selectedId) ?? visible[0]

  async function action(label: string, callback: () => Promise<unknown>) {
    setPending(label)
    setMessage(null)
    try {
      await callback()
      await onRefresh()
      setMessage('Action enregistrée dans le journal local.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setPending(null)
    }
  }

  return (
    <main className="store-layout">
      <section className="catalog-pane panel" aria-labelledby="catalog-title">
        <div className="panel__heading">
          <div><span className="section-index">STORE / PUBLIC</span><h1 id="catalog-title">Apps vérifiables</h1></div>
          <span className="rail-count">{String(visible.length).padStart(2, '0')}</span>
        </div>
        <div className="filter-row" aria-label="Filtrer les applications">
          {(['all', 'candidate', 'installed'] as const).map((value) => (
            <button key={value} type="button" className={filter === value ? 'filter is-active' : 'filter'} onClick={() => setFilter(value)}>
              {value === 'all' ? 'TOUTES' : value === 'candidate' ? 'À VOTER' : 'INSTALLÉES'}
            </button>
          ))}
        </div>
        <div className="catalog-list">
          {visible.map((app, index) => (
            <button
              type="button"
              key={app.manifest.metadata.id}
              className={selected?.manifest.metadata.id === app.manifest.metadata.id ? 'catalog-row is-selected' : 'catalog-row'}
              onClick={() => setSelectedId(app.manifest.metadata.id)}
            >
              <span className="catalog-row__index">{String(index + 1).padStart(2, '0')}</span>
              <span className="catalog-row__body">
                <strong>{app.manifest.metadata.name}</strong>
                <small>{app.manifest.metadata.summary}</small>
              </span>
              <StatusBadge label={statusLabel(app)} tone={statusTone(app)} />
            </button>
          ))}
          {visible.length === 0 ? <div className="empty-state"><strong>AUCUNE APP</strong><span>Changez le filtre ou proposez un manifeste avec le SDK.</span></div> : null}
        </div>
      </section>

      {selected ? (
        <section className="app-inspector panel" aria-labelledby="app-title">
          <div className="inspector-header">
            <span className="section-index">{selected.manifest.metadata.id}@{selected.manifest.metadata.version}</span>
            <h2 id="app-title">{selected.manifest.metadata.name}</h2>
            <p>{selected.manifest.metadata.description}</p>
          </div>

          <dl className="spec-grid">
            <div><dt>LICENCE</dt><dd>{selected.manifest.metadata.license}</dd></div>
            <div><dt>SOURCE</dt><dd><a href={selected.manifest.metadata.repository} target="_blank" rel="noreferrer">inspecter ↗</a></dd></div>
            <div><dt>ARCH.</dt><dd>{selected.manifest.spec.architectures.join(' / ')}</dd></div>
            <div><dt>CPU / RAM</dt><dd>{selected.manifest.spec.resources.cpu} / {selected.manifest.spec.resources.memoryMb} MB</dd></div>
          </dl>

          <div className="permissions">
            <span className="section-index">PERMISSIONS DÉCLARÉES</span>
            <ul>{selected.manifest.spec.permissions.map((permission) => <li key={permission}>{permission}</li>)}</ul>
          </div>

          {selected.manifest.governance.status === 'candidate' ? (
            <div className="vote-block">
              <div className="vote-summary">
                <strong>{selected.tally.approvalPercent}%</strong>
                <span>{selected.tally.approvals} oui / {selected.tally.rejections} non</span>
              </div>
              <div className="progress-track"><span style={{ width: `${Math.min(100, selected.tally.approvalPercent)}%` }} /></div>
              <p>Quorum {selected.tally.total}/{selected.tally.quorum} · seuil {selected.tally.requiredApprovalPercent}%</p>
              <div className="action-row">
                <button type="button" className="button button--primary" disabled={pending !== null} onClick={() => void action('vote', () => api.vote(selected.manifest.metadata.id, getIdentity('nodi-voter-id'), 'approve'))}>VOTER OUI</button>
                <button type="button" className="button" disabled={pending !== null} onClick={() => void action('vote', () => api.vote(selected.manifest.metadata.id, getIdentity('nodi-voter-id'), 'reject'))}>VOTER NON</button>
              </div>
            </div>
          ) : null}

          <div className="install-block">
            <button
              type="button"
              className="button button--primary"
              disabled={pending !== null || selected.installState === 'installed' || (selected.manifest.governance.status === 'candidate' && selected.tally.decision !== 'approved')}
              onClick={() => void action('install', () => api.requestInstall(selected.manifest.metadata.id, getIdentity('nodi-operator-id')))}
            >
              {selected.installState === 'installed' ? 'DÉJÀ INSTALLÉE' : selected.installState === 'requested' ? 'REVUE DEMANDÉE' : 'DEMANDER L’INSTALLATION'}
            </button>
            <p>L’API enregistre la demande. Elle n’exécute jamais un Compose communautaire à distance.</p>
          </div>
          {message ? <p className="action-message" role="status">{message}</p> : null}
        </section>
      ) : null}
    </main>
  )
}
