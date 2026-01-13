import { useState } from 'react'
import { db } from '../db/db'
import { exportSchema } from '../models'

export const SettingsPage = () => {
  const [status, setStatus] = useState<string>('')

  const handleExport = async () => {
    const exportData = {
      monsters: await db.monsters.toArray(),
      encounters: await db.encounters.toArray(),
      combatStates: await db.combatStates.toArray(),
      settings: await db.settings.toArray(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `dnd-tracker-export-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus('Exported data file.')
  }

  const handleImport = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(text)
    } catch {
      setStatus('Import failed: invalid JSON.')
      return
    }
    const parsed = exportSchema.safeParse(parsedJson)
    if (!parsed.success) {
      setStatus('Import failed: invalid data.')
      return
    }
    await db.transaction('rw', db.monsters, db.encounters, db.combatStates, db.settings, async () => {
      await db.monsters.clear()
      await db.encounters.clear()
      await db.combatStates.clear()
      await db.settings.clear()
      await db.monsters.bulkAdd(parsed.data.monsters)
      await db.encounters.bulkAdd(parsed.data.encounters)
      await db.combatStates.bulkAdd(parsed.data.combatStates)
      await db.settings.bulkAdd(parsed.data.settings)
    })
    setStatus('Import complete. Data replaced from file.')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-6">
        <h2 className="text-lg font-semibold text-stone-100">Settings &amp; Data</h2>
        <p className="mt-2 text-sm text-stone-400">
          Export a backup or import a saved file. Import replaces local data.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-900"
          >
            Export JSON
          </button>
          <label className="flex items-center gap-2 rounded-md border border-stone-400/40 px-4 py-2 text-sm text-stone-200">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => handleImport(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {status && <p className="mt-3 text-xs text-stone-400">{status}</p>}
      </div>

      <div className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6 text-sm text-stone-300">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-200">
          Extending the App
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-4">
          <li>Add new condition templates in `src/components/CombatantRow.tsx` duration menu.</li>
          <li>Expand monster fields in `src/models/schemas.ts` and update `MonstersPage`.</li>
          <li>Encounter composition is stored in `src/models/schemas.ts` and `src/pages/EncountersPage.tsx`.</li>
        </ul>
      </div>
    </div>
  )
}
