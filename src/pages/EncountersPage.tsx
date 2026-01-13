import { useEffect, useMemo, useState } from 'react'
import { db } from '../db/db'
import { useTable } from '../hooks/useTable'
import type { Encounter, EncounterEntry } from '../models'
import { createEmptyEncounter } from '../utils/encounters'
import { createId } from '../utils/id'

const entryDefaults = (): EncounterEntry => ({
  id: createId(),
  name: 'New Combatant',
  kind: 'monster',
  quantity: 1,
  hpMax: undefined,
  initiative: undefined,
  notes: '',
})

export const EncountersPage = () => {
  const { data: monsters } = useTable(() => db.monsters.orderBy('name').toArray(), [])
  const { data: encounters } = useTable(() => db.encounters.orderBy('name').toArray(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedEncounter = useMemo(
    () => encounters?.find((encounter) => encounter.id === selectedId),
    [encounters, selectedId],
  )
  const [draft, setDraft] = useState<Encounter | null>(null)

  useEffect(() => {
    if (!encounters || encounters.length === 0) return
    if (!selectedId) {
      setSelectedId(encounters[0].id)
    }
  }, [encounters, selectedId])

  useEffect(() => {
    if (selectedEncounter) {
      setDraft(selectedEncounter)
    }
  }, [selectedEncounter])

  useEffect(() => {
    if (!draft) return
    const timer = window.setTimeout(async () => {
      await db.encounters.put({ ...draft, updatedAt: Date.now() })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [draft])

  const updateEntry = (id: string, updater: (entry: EncounterEntry) => EncounterEntry) => {
    if (!draft) return
    setDraft({
      ...draft,
      combatants: draft.combatants.map((entry) => (entry.id === id ? updater(entry) : entry)),
    })
  }

  const removeEntry = (id: string) => {
    if (!draft) return
    setDraft({ ...draft, combatants: draft.combatants.filter((entry) => entry.id !== id) })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-200">Encounters</h2>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                const encounter = createEmptyEncounter('New Encounter')
                await db.encounters.add(encounter)
                setSelectedId(encounter.id)
              }}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-900"
            >
              New Encounter
            </button>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {encounters?.map((encounter) => (
              <button
                key={encounter.id}
                type="button"
                onClick={() => setSelectedId(encounter.id)}
                className={`w-full rounded-md px-3 py-2 text-left ${
                  selectedId === encounter.id
                    ? 'bg-amber-500 text-stone-900'
                    : 'bg-stone-900/40 text-stone-200 hover:bg-stone-900/70'
                }`}
              >
                <div className="font-semibold">{encounter.name}</div>
                <div className="text-xs text-stone-400">{encounter.combatants.length} entries</div>
              </button>
            ))}
            {encounters?.length === 0 && (
              <p className="text-xs text-stone-400">No encounters yet. Create one to start.</p>
            )}
          </div>
        </div>
      </aside>

      <section className="space-y-6">
        {draft ? (
          <>
            <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-6">
              <label className="text-sm text-stone-300">
                Encounter Name
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className="mt-2 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                />
              </label>
              <label className="mt-4 block text-sm text-stone-300">
                Notes
                <textarea
                  value={draft.notes ?? ''}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                  className="mt-2 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                  rows={3}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-200">
                  Encounter Roster
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, combatants: [...draft.combatants, entryDefaults()] })
                  }
                  className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-stone-900"
                >
                  Add Entry
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {draft.combatants.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid gap-3 rounded-xl border border-stone-500/20 bg-stone-950/40 p-4 md:grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr_auto]"
                  >
                    <div className="space-y-2">
                      <input
                        value={entry.name}
                        onChange={(event) =>
                          updateEntry(entry.id, (item) => ({ ...item, name: event.target.value }))
                        }
                        className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                      />
                      <select
                        value={entry.kind}
                        onChange={(event) =>
                          updateEntry(entry.id, (item) => ({
                            ...item,
                            kind: event.target.value as EncounterEntry['kind'],
                          }))
                        }
                        className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                      >
                        <option value="monster">Monster</option>
                        <option value="npc">NPC</option>
                        <option value="pc">PC</option>
                      </select>
                      {entry.kind === 'monster' && (
                        <select
                          value={entry.monsterId ?? ''}
                          onChange={(event) => {
                            const monsterId = event.target.value || undefined
                            const monster = monsters?.find((item) => item.id === monsterId)
                            updateEntry(entry.id, (item) => ({
                              ...item,
                              monsterId,
                              name: monster?.name ?? item.name,
                              hpMax: monster?.defense.hp ?? item.hpMax,
                            }))
                          }}
                          className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                        >
                          <option value="">Select monster</option>
                          {monsters?.map((monster) => (
                            <option key={monster.id} value={monster.id}>
                              {monster.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <label className="text-xs uppercase tracking-wide text-stone-400">
                      Quantity
                      <input
                        type="number"
                        min={1}
                        value={entry.quantity}
                        onChange={(event) =>
                          updateEntry(entry.id, (item) => ({
                            ...item,
                            quantity: Math.max(1, Number(event.target.value)),
                          }))
                        }
                        className="mt-2 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                      />
                    </label>
                    <label className="text-xs uppercase tracking-wide text-stone-400">
                      HP Max
                      <input
                        type="number"
                        value={entry.hpMax ?? ''}
                        onChange={(event) =>
                          updateEntry(entry.id, (item) => ({
                            ...item,
                            hpMax: event.target.value === '' ? undefined : Number(event.target.value),
                          }))
                        }
                        className="mt-2 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                      />
                    </label>
                    <label className="text-xs uppercase tracking-wide text-stone-400">
                      Initiative
                      <input
                        type="number"
                        value={entry.initiative ?? ''}
                        onChange={(event) =>
                          updateEntry(entry.id, (item) => ({
                            ...item,
                            initiative:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          }))
                        }
                        className="mt-2 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                      />
                    </label>
                    <div className="flex items-start justify-end">
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="rounded-md border border-stone-400/40 px-3 py-2 text-xs text-stone-200"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={entry.notes ?? ''}
                      onChange={(event) =>
                        updateEntry(entry.id, (item) => ({ ...item, notes: event.target.value }))
                      }
                      placeholder="Notes"
                      className="md:col-span-5 rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                      rows={2}
                    />
                  </div>
                ))}
                {draft.combatants.length === 0 && (
                  <p className="text-xs text-stone-400">Add combatants to build an encounter.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-6 text-sm text-stone-300">
            Select an encounter to start editing.
          </div>
        )}
      </section>
    </div>
  )
}
