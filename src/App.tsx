import { useEffect, useState } from 'react'
import { Display } from './screens/Display'
import { Host } from './screens/Host'
import { Launch } from './screens/Launch'

type Route = 'launch' | 'host' | 'display'

function routeFromHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash === 'host') return 'host'
  if (hash === 'display') return 'display'
  return 'launch'
}

export function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route === 'display') return <Display />
  if (route === 'host') return <Host />
  return <Launch onOpenHost={() => (window.location.hash = '#/host')} />
}
