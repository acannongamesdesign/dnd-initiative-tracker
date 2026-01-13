import { useEffect } from 'react'
import { ensureSeedData } from './db/seed'
import { useHashRoute } from './hooks/useHashRoute'
import { CombatPage } from './pages/CombatPage'
import { EncountersPage } from './pages/EncountersPage'
import { MonstersPage } from './pages/MonstersPage'
import { SettingsPage } from './pages/SettingsPage'

const navItems = [
  { route: 'combat', label: 'Combat' },
  { route: 'monsters', label: 'Monsters' },
  { route: 'encounters', label: 'Encounters' },
  { route: 'settings', label: 'Settings' },
] as const

function App() {
  const route = useHashRoute()

  useEffect(() => {
    ensureSeedData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-stone-100">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Dungeon Master</p>
            <h1 className="text-2xl font-semibold text-stone-100">Initiative Atelier</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {navItems.map((item) => (
              <a
                key={item.route}
                href={`#/${item.route}`}
                className={`rounded-full px-4 py-2 ${
                  route === item.route
                    ? 'bg-amber-500 text-stone-900'
                    : 'bg-stone-900/50 text-stone-200 hover:bg-stone-900/80'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <main className="mt-10">
          {route === 'combat' && <CombatPage />}
          {route === 'monsters' && <MonstersPage />}
          {route === 'encounters' && <EncountersPage />}
          {route === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  )
}

export default App
