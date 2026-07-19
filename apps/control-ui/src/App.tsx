import { useEffect, useState } from 'react'
import { useNodiData } from './hooks/useNodiData'
import { Cockpit } from './screens/Cockpit'
import { ScreenView } from './screens/ScreenView'
import { Sdk } from './screens/Sdk'
import { Store } from './screens/Store'

type Route = 'cockpit' | 'screen' | 'sdk' | 'store'

function routeFromLocation(): Route {
  if (window.location.pathname.startsWith('/store')) return 'store'
  if (window.location.pathname.startsWith('/sdk')) return 'sdk'
  if (window.location.pathname.startsWith('/screen')) return 'screen'
  return 'cockpit'
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromLocation)
  const { catalog, error, loading, refresh, status } = useNodiData()

  useEffect(() => {
    const update = () => setRoute(routeFromLocation())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  function navigate(next: Route) {
    const path = next === 'cockpit' ? '/' : `/${next}`
    window.history.pushState({}, '', path)
    setRoute(next)
  }

  if (loading && (!status || !catalog)) {
    return <main className="boot-state"><span>&gt; boot nodi-revival</span><strong>Lecture des services locaux…</strong><div className="boot-cursor" /></main>
  }

  if (!status || !catalog) {
    return <main className="boot-state boot-state--error"><span>&gt; api unavailable</span><strong>Le cockpit ne peut pas lire le boîtier.</strong><p>{error}</p><button className="button" type="button" onClick={() => void refresh()}>RÉESSAYER</button></main>
  }

  if (route === 'screen') return <ScreenView catalog={catalog} status={status} />

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="wordmark" onClick={() => navigate('cockpit')}><span>NOD-I</span><small>REVIVAL / MVP 0.1</small></button>
        <nav aria-label="Navigation principale">
          <button type="button" className={route === 'cockpit' ? 'is-active' : ''} onClick={() => navigate('cockpit')}>01 COCKPIT</button>
          <button type="button" className={route === 'store' ? 'is-active' : ''} onClick={() => navigate('store')}>02 STORE</button>
          <button type="button" className={route === 'sdk' ? 'is-active' : ''} onClick={() => navigate('sdk')}>03 SDK</button>
        </nav>
        <div className="live-state"><span className={error ? 'live-dot live-dot--warning' : 'live-dot'} />{error ? 'PARTIEL' : 'LOCAL / LIVE'}</div>
      </header>
      {error ? <div className="stale-banner" role="status">Certaines données sont indisponibles. Dernier état valide conservé. <button type="button" onClick={() => void refresh()}>Réessayer</button></div> : null}
      {route === 'cockpit' ? <Cockpit status={status} /> : null}
      {route === 'store' ? <Store catalog={catalog} onRefresh={refresh} /> : null}
      {route === 'sdk' ? <Sdk onRefresh={refresh} /> : null}
      <footer className="footer-line"><span>HOST={status.device.hostname}</span><span>UPDATED={new Date(status.generatedAt).toLocaleTimeString('fr-FR')}</span><a href="/screen">SCREEN_320×240 ↗</a></footer>
    </div>
  )
}
