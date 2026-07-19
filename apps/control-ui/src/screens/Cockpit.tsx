import { Metric } from '../components/Metric'
import { StatusBadge } from '../components/StatusBadge'
import type { StatusPayload } from '../types'

function bytes(value: number | null): string {
  if (value === null) return 'n/a'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = value
  let index = 0
  while (current >= 1000 && index < units.length - 1) {
    current /= 1000
    index += 1
  }
  return `${current.toFixed(index >= 3 ? 1 : 0)} ${units[index]}`
}

function duration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return days > 0 ? `${days}j ${hours}h` : `${hours}h`
}

export function Cockpit({ status }: { status: StatusPayload }) {
  const bitcoinTone = status.bitcoin.status === 'online' ? 'healthy' : status.bitcoin.status === 'syncing' ? 'pending' : 'danger'
  const minerTone = status.miner.status === 'running' ? 'healthy' : status.miner.status === 'thermal-stop' ? 'danger' : 'muted'

  return (
    <main className="cockpit" aria-label="État du boîtier">
      <section className="node-console panel" aria-labelledby="bitcoin-title">
        <div className="panel__heading">
          <div>
            <span className="section-index">01 / BITCOIN</span>
            <h1 id="bitcoin-title">Validation locale</h1>
          </div>
          <StatusBadge label={status.bitcoin.status} tone={bitcoinTone} />
        </div>

        <div className="sync-readout">
          <strong>{status.bitcoin.progress.toFixed(2)}%</strong>
          <span>{status.bitcoin.blocks.toLocaleString('fr-FR')} / {status.bitcoin.headers.toLocaleString('fr-FR')} blocs</span>
        </div>
        <div className="progress-track" aria-label={`Synchronisation ${status.bitcoin.progress.toFixed(2)}%`}>
          <span style={{ width: `${status.bitcoin.progress}%` }} />
        </div>

        <div className="metric-grid metric-grid--bitcoin">
          <Metric label="PAIR(S)" value={String(status.bitcoin.peers)} />
          <Metric label="CHAÎNE" value={status.bitcoin.chain} />
          <Metric label="DISQUE" value={bytes(status.bitcoin.sizeOnDisk)} detail={status.bitcoin.pruned ? 'pruned' : 'archive'} />
          <Metric label="CORE" value={status.bitcoin.version ? String(status.bitcoin.version) : 'n/a'} />
        </div>
        {status.bitcoin.error ? <p className="inline-error">RPC: {status.bitcoin.error}</p> : null}
      </section>

      <aside className="attention-rail panel" aria-labelledby="attention-title">
        <div className="panel__heading panel__heading--compact">
          <span className="section-index" id="attention-title">PRIORITÉ</span>
          <span className="rail-count">{String(status.attention.length).padStart(2, '0')}</span>
        </div>
        {status.attention.length === 0 ? (
          <div className="empty-state"><strong>TOUT EST STABLE</strong><span>Aucune action requise.</span></div>
        ) : (
          <ol className="attention-list">
            {status.attention.map((item) => (
              <li key={item.code} className={`attention attention--${item.level}`}>
                <span>{item.level === 'error' ? '!' : item.level === 'warning' ? '~' : 'i'}</span>
                <p>{item.message}</p>
              </li>
            ))}
          </ol>
        )}
      </aside>

      <section className="miner-panel panel" aria-labelledby="miner-title">
        <div className="panel__heading panel__heading--compact">
          <div><span className="section-index">02 / LOTTERY</span><h2 id="miner-title">Mineur SHA-256d</h2></div>
          <StatusBadge label={status.miner.status} tone={minerTone} />
        </div>
        <div className="metric-grid">
          <Metric label="HASHRATE" value={`${status.miner.hashRateKh.toFixed(2)} KH/s`} accent={status.miner.status === 'running'} />
          <Metric label="SHARES" value={String(status.miner.acceptedShares)} />
          <Metric label="THREADS" value={String(status.miner.threads)} />
          <Metric label="TEMP." value={status.miner.temperatureC === null ? 'n/a' : `${status.miner.temperatureC}°C`} />
        </div>
        <p className="panel-note">{status.miner.message}</p>
      </section>

      <section className="device-panel panel" aria-labelledby="device-title">
        <div className="panel__heading panel__heading--compact">
          <div><span className="section-index">03 / DEVICE</span><h2 id="device-title">{status.device.hostname}</h2></div>
          <StatusBadge label={status.device.architecture} tone="muted" />
        </div>
        <div className="metric-grid">
          <Metric label="UPTIME" value={duration(status.device.uptimeSeconds)} />
          <Metric label="RAM" value={`${status.device.memoryUsedPercent}%`} />
          <Metric label="TEMP." value={status.device.temperatureC === null ? 'n/a' : `${status.device.temperatureC}°C`} />
          <Metric label="LIBRE" value={bytes(status.device.dataFreeBytes)} />
        </div>
      </section>
    </main>
  )
}
