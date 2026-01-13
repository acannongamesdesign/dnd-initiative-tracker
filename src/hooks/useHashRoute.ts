import { useEffect, useState } from 'react'

export type AppRoute = 'combat' | 'monsters' | 'encounters' | 'settings'

const parseRoute = () => {
  const raw = window.location.hash.replace('#/', '')
  if (raw === 'monsters' || raw === 'encounters' || raw === 'settings' || raw === 'combat') {
    return raw
  }
  return 'combat'
}

export const useHashRoute = () => {
  const [route, setRoute] = useState<AppRoute>(parseRoute())

  useEffect(() => {
    const handler = () => setRoute(parseRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  return route
}
