import { useEffect, useState } from 'react'
import type { CatalogPayload, StatusPayload } from '../types'

type Page = 'bitcoin' | 'miner' | 'store'

export function ScreenView({ catalog, status }: { catalog: CatalogPayload; status: StatusPayload }) {
  const pages: Page[] = ['bitcoin', 'miner', 'store']
  const [pageIndex, setPageIndex] = useState(0)
  const page = pages[pageIndex] ?? 'bitcoin'

  useEffect(() => {
    const timer = window.setInterval(() => setPageIndex((current) => (current + 1) % pages.length), 8000)
    return () => window.clearInterval(timer)
  }, [pages.length])

  const candidates = catalog.apps.filter((app) => app.manifest.governance.status === 'candidate' && app.tally.decision === 'pending').length
  return (
    <main className="device-screen" onClick={() => setPageIndex((current) => (current + 1) % pages.length)}>
      <header><strong>NOD-I</strong><span>{new Date(status.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></header>
      {page === 'bitcoin' ? (
        <section><small>BITCOIN // {status.bitcoin.status.toUpperCase()}</small><strong className="screen-primary">{status.bitcoin.progress.toFixed(2)}%</strong><div className="screen-progress"><span style={{ width: `${status.bitcoin.progress}%` }} /></div><footer><span>{status.bitcoin.peers} PEERS</span><span>{status.bitcoin.blocks.toLocaleString('fr-FR')} BLKS</span></footer></section>
      ) : null}
      {page === 'miner' ? (
        <section><small>LOTTERY // {status.miner.status.toUpperCase()}</small><strong className="screen-primary">{status.miner.hashRateKh.toFixed(1)}<em>KH/s</em></strong><div className="screen-columns"><span>SHARES <b>{status.miner.acceptedShares}</b></span><span>TEMP <b>{status.miner.temperatureC ?? '—'}°</b></span></div><footer><span>{status.miner.threads} THREAD(S)</span><span>OPT-IN</span></footer></section>
      ) : null}
      {page === 'store' ? (
        <section><small>COMMUNITY // STORE</small><strong className="screen-primary">{String(candidates).padStart(2, '0')}<em>À VOTER</em></strong><div className="screen-columns"><span>CORE <b>{catalog.apps.filter((app) => app.manifest.governance.status === 'core').length}</b></span><span>APPROUVÉES <b>{catalog.apps.filter((app) => app.tally.decision === 'approved').length}</b></span></div><footer><span>SDK V1</span><span>OPEN SOURCE</span></footer></section>
      ) : null}
      <nav aria-label="Pages écran">{pages.map((item, index) => <span key={item} className={pageIndex === index ? 'is-active' : ''} />)}</nav>
    </main>
  )
}
