import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { db } from '../db/db'
import { useTable } from '../hooks/useTable'
import type { CombatState, Combatant, Condition } from '../models'
import { createId } from '../utils/id'
import { advanceTurn, removeConditionsBySource } from '../utils/conditions'
import { applyHpInput } from '../utils/hp'
import { cloneCombatState, createCombatFromEncounter, normalizeOrder, rollInitiative } from '../utils/combat'
import { CombatantRow } from '../components/CombatantRow'
import { rollExpression, formatRollSummary } from '../utils/dice'

type QuickAdd = {
  monsterId: string
  count: number
  name: string
  kind: Combatant['kind']
}

const createEmptyCombatant = (name: string, kind: Combatant['kind']): Combatant => ({
  id: createId(),
  name,
  kind,
  initiative: 10,
  hp: { current: 10, max: 10, temp: 0 },
  display: {
    showTraits: false,
    showActions: true,
    showReactions: false,
    showLegendary: true,
    showLair: true,
    showNotes: true,
  },
  conditions: [],
  notes: '',
  isConcentrating: false,
  updatedAt: Date.now(),
})

export const CombatPage = () => {
  const { data: monsters } = useTable(() => db.monsters.orderBy('name').toArray(), [])
  const { data: encounters } = useTable(() => db.encounters.orderBy('name').toArray(), [])
  const { data: combatStates } = useTable(() => db.combatStates.orderBy('updatedAt').reverse().toArray(), [])

  const [combat, setCombat] = useState<CombatState | null>(null)
  const [history, setHistory] = useState<CombatState[]>([])
  const [selectedEncounterId, setSelectedEncounterId] = useState('')
  const [selectedStateId, setSelectedStateId] = useState('')
  const [quickAdd, setQuickAdd] = useState<QuickAdd>({
    monsterId: '',
    count: 1,
    name: '',
    kind: 'npc',
  })
  const [rollInput, setRollInput] = useState('1d20+5')
  const [rollLog, setRollLog] = useState<string[]>([])
  const [rollOpen, setRollOpen] = useState(true)
  const [rollAutoOpen, setRollAutoOpen] = useState(true)

  const monsterMap = useMemo(
    () => new Map(monsters?.map((monster) => [monster.id, monster]) ?? []),
    [monsters],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const currentCombatant = useMemo(() => {
    if (!combat || combat.order.length === 0) return null
    const id = combat.order[combat.currentIndex]
    return combat.combatants.find((item) => item.id === id) ?? null
  }, [combat])

  const onDeck = useMemo(() => {
    if (!combat || combat.order.length < 2) return null
    const nextId = combat.order[(combat.currentIndex + 1) % combat.order.length]
    return combat.combatants.find((item) => item.id === nextId) ?? null
  }, [combat])

  useEffect(() => {
    if (!combat) return
    const timer = window.setTimeout(async () => {
      await db.combatStates.put({ ...combat, updatedAt: Date.now() })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [combat])

  useEffect(() => {
    if (!combatStates || combatStates.length === 0 || combat) return
    setCombat(combatStates[0])
    setSelectedStateId(combatStates[0].id)
  }, [combatStates, combat])

  useEffect(() => {
    return () => {
      if (combat) {
        void db.combatStates.put({ ...combat, updatedAt: Date.now() })
      }
    }
  }, [combat])

  const applyAction = (updater: (state: CombatState) => CombatState) => {
    setCombat((prev) => {
      if (!prev) return prev
      const snapshot = cloneCombatState(prev)
      setHistory((items) => [...items, snapshot].slice(-30))
      return updater(prev)
    })
  }

  const updateCombatant = (id: string, updater: (combatant: Combatant) => Combatant) => {
    setCombat((state) => {
      if (!state) return state
      return {
        ...state,
        combatants: state.combatants.map((item) => (item.id === id ? updater(item) : item)),
        updatedAt: Date.now(),
      }
    })
  }

  const removeCombatant = (id: string) => {
    applyAction((state) => {
      const removed = state.combatants.find((item) => item.id === id)
      let combatants = removeConditionsBySource(
        state.combatants.filter((item) => item.id !== id),
        id,
      )
      if (removed?.kind === 'monster' && removed.monsterId) {
        const stillHasMonster = combatants.some(
          (item) => item.kind === 'monster' && item.monsterId === removed.monsterId,
        )
        if (!stillHasMonster) {
          combatants = combatants.filter(
            (item) => !(item.kind === 'lair' && item.monsterId === removed.monsterId),
          )
        }
      }
      const order = normalizeOrder(combatants, state.order)
      const currentId = state.order[state.currentIndex]
      const nextIndex = Math.max(0, order.indexOf(currentId))
      return {
        ...state,
        combatants,
        order,
        currentIndex: nextIndex === -1 ? 0 : nextIndex,
        updatedAt: Date.now(),
      }
    })
  }

  const handleStartEncounter = async () => {
    const encounter = encounters?.find((item) => item.id === selectedEncounterId)
    if (!encounter || !monsters) return
    const state = createCombatFromEncounter(encounter, monsters)
    setCombat(state)
    setSelectedStateId(state.id)
    setHistory([])
    await db.combatStates.put(state)
  }

  const handleLoadState = () => {
    const state = combatStates?.find((item) => item.id === selectedStateId)
    if (!state) return
    setCombat(state)
    setHistory([])
  }

  const handleUndo = () => {
    setHistory((items) => {
      const next = items.slice(0, -1)
      const previous = items[items.length - 1]
      if (previous) setCombat(previous)
      return next
    })
  }

  const handleAddMonster = () => {
    if (!combat || !monsters || !quickAdd.monsterId) return
    const monster = monsters.find((item) => item.id === quickAdd.monsterId)
    if (!monster) return
    const count = Math.max(1, quickAdd.count)
    applyAction((state) => {
      const additions = Array.from({ length: count }).map((_, index) => ({
        id: createId(),
        name: `${monster.name}${count > 1 ? ` ${index + 1}` : ''}`,
        kind: 'monster' as const,
        monsterId: monster.id,
        initiative: 10,
        dex: monster.abilities.dex,
        hp: { current: monster.defense.hp, max: monster.defense.hp, temp: 0 },
        display: {
          showTraits: false,
          showActions: true,
          showReactions: false,
          showLegendary: true,
          showLair: true,
          showNotes: true,
        },
        conditions: [],
        notes: '',
        isConcentrating: false,
        updatedAt: Date.now(),
      }))
      const combatants = [...state.combatants, ...additions]
      const order = normalizeOrder(combatants, state.order.concat(additions.map((item) => item.id)))

      if (monster.lairActions?.length) {
        const hasLair = combatants.some(
          (item) => item.kind === 'lair' && item.monsterId === monster.id,
        )
        if (!hasLair) {
          const lairCombatant: Combatant = {
            id: createId(),
            name: monster.lairName?.trim() || `${monster.name} Lair`,
            kind: 'lair',
            monsterId: monster.id,
            initiative: 20,
            hp: { current: 0, max: 0, temp: 0 },
            display: {
              showTraits: false,
              showActions: false,
              showReactions: false,
              showLegendary: false,
              showLair: true,
              showNotes: true,
            },
            conditions: [],
            notes: '',
            isConcentrating: false,
            updatedAt: Date.now(),
          }
          combatants.push(lairCombatant)
          order.push(lairCombatant.id)
        }
      }

      return { ...state, combatants, order, updatedAt: Date.now() }
    })
  }

  const handleAddCustom = () => {
    if (!combat) return
    applyAction((state) => {
      const name = quickAdd.name || 'New Combatant'
      const combatant = createEmptyCombatant(name, quickAdd.kind)
      const combatants = [...state.combatants, combatant]
      const order = normalizeOrder(combatants, state.order.concat(combatant.id))
      return { ...state, combatants, order, updatedAt: Date.now() }
    })
  }

  const handleSortByInitiative = () => {
    if (!combat) return
    applyAction((state) => {
      const sorted = state.combatants
        .slice()
        .sort((a, b) => b.initiative - a.initiative)
        .map((item) => item.id)
      return { ...state, order: sorted, currentIndex: 0, updatedAt: Date.now() }
    })
  }

  const pushRollLog = (entry: string) => {
    setRollLog((items) => [entry, ...items].slice(0, 12))
    if (rollAutoOpen) {
      setRollOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-200">
            Combat Setup
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedEncounterId}
              onChange={(event) => setSelectedEncounterId(event.target.value)}
              className="rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
            >
              <option value="">Start from encounter</option>
              {encounters?.map((encounter) => (
                <option key={encounter.id} value={encounter.id}>
                  {encounter.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleStartEncounter}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-900"
            >
              Start Combat
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedStateId}
              onChange={(event) => setSelectedStateId(event.target.value)}
              className="rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
            >
              <option value="">Load combat state</option>
              {combatStates?.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLoadState}
              className="rounded-md border border-stone-400/40 px-4 py-2 text-sm text-stone-200"
            >
              Load
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-200">
            Turn Control
          </h2>
          <div className="mt-4 grid gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-200">
              <div className="rounded-lg border border-stone-500/20 bg-stone-900/40 px-3 py-2">
                Round {combat?.round ?? 1}
              </div>
              <div>
                Current: <span className="font-semibold">{currentCombatant?.name ?? '—'}</span>
              </div>
              <div>
                On Deck: <span className="font-semibold">{onDeck?.name ?? '—'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!combat}
                onClick={() =>
                  combat &&
                  applyAction((state) => {
                    const result = advanceTurn(state)
                    return { ...result.state, updatedAt: Date.now() }
                  })
                }
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-900 disabled:opacity-40"
              >
                Next Turn
              </button>
              <button
                type="button"
                disabled={history.length === 0}
                onClick={handleUndo}
                className="rounded-md border border-stone-400/40 px-4 py-2 text-sm text-stone-200 disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                disabled={!combat}
                onClick={() =>
                  combat &&
                  applyAction((state) => {
                    const rolled = rollInitiative(state.combatants)
                    const order = rolled
                      .slice()
                      .sort((a, b) => b.initiative - a.initiative)
                      .map((item) => item.id)
                    return { ...state, combatants: rolled, order, currentIndex: 0 }
                  })
                }
                className="rounded-md border border-stone-400/40 px-4 py-2 text-sm text-stone-200 disabled:opacity-40"
              >
                Roll Initiative
              </button>
              <button
                type="button"
                disabled={!combat}
                onClick={handleSortByInitiative}
                className="rounded-md border border-stone-400/40 px-4 py-2 text-sm text-stone-200 disabled:opacity-40"
              >
                Sort by Initiative
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-200">Quick Add</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.5fr_0.5fr_auto]">
          <select
            value={quickAdd.monsterId}
            onChange={(event) => setQuickAdd({ ...quickAdd, monsterId: event.target.value })}
            className="rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
          >
            <option value="">Select monster</option>
            {monsters?.map((monster) => (
              <option key={monster.id} value={monster.id}>
                {monster.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={quickAdd.count}
            onChange={(event) =>
              setQuickAdd({ ...quickAdd, count: Math.max(1, Number(event.target.value)) })
            }
            className="rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
          />
          <button
            type="button"
            onClick={handleAddMonster}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-900"
          >
            Add Monster
          </button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.6fr_auto]">
          <input
            value={quickAdd.name}
            onChange={(event) => setQuickAdd({ ...quickAdd, name: event.target.value })}
            placeholder="Custom name"
            className="rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
          />
          <select
            value={quickAdd.kind}
            onChange={(event) =>
              setQuickAdd({ ...quickAdd, kind: event.target.value as Combatant['kind'] })
            }
            className="rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
          >
            <option value="npc">NPC</option>
            <option value="pc">PC</option>
          </select>
          <button
            type="button"
            onClick={handleAddCustom}
            className="rounded-md border border-stone-400/40 px-3 py-2 text-sm text-stone-200"
          >
            Add Custom
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {combat ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!combat || !over || active.id === over.id) return
              const oldIndex = combat.order.indexOf(active.id as string)
              const newIndex = combat.order.indexOf(over.id as string)
              if (oldIndex === -1 || newIndex === -1) return
              applyAction((state) => {
                const order = arrayMove(state.order, oldIndex, newIndex)
                const currentId = state.order[state.currentIndex]
                return {
                  ...state,
                  order,
                  currentIndex: order.indexOf(currentId),
                  updatedAt: Date.now(),
                }
              })
            }}
          >
            <SortableContext items={combat.order} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {combat.order.map((id, index) => {
                  const combatant = combat.combatants.find((item) => item.id === id)
                  if (!combatant) return null
                  const monster = combatant.monsterId ? monsterMap.get(combatant.monsterId) : undefined
                  const isCurrent = index === combat.currentIndex
                  const isOnDeck = index === (combat.currentIndex + 1) % combat.order.length
                  return (
                    <CombatantRow
                      key={combatant.id}
                      combatant={combatant}
                      monster={monster}
                      combatants={combat.combatants}
                      isCurrent={isCurrent}
                      isOnDeck={isOnDeck}
                      round={combat.round}
                      onLogRoll={pushRollLog}
                      onUpdateDisplay={(display) =>
                        updateCombatant(combatant.id, (item) => ({
                          ...item,
                          display: {
                            showTraits: false,
                            showActions: true,
                            showReactions: false,
                            showLegendary: true,
                            showLair: true,
                            showNotes: true,
                            ...item.display,
                            ...display,
                          },
                          updatedAt: Date.now(),
                        }))
                      }
                      onUpdate={(updated) => updateCombatant(combatant.id, () => updated)}
                      onRemove={() => removeCombatant(combatant.id)}
                      onApplyHp={(value) =>
                        applyAction((state) => ({
                          ...state,
                          combatants: state.combatants.map((item) =>
                            item.id === combatant.id
                              ? { ...item, hp: applyHpInput(item.hp, value), updatedAt: Date.now() }
                              : item,
                          ),
                          updatedAt: Date.now(),
                        }))
                      }
                      onAddCondition={(condition: Condition) =>
                        applyAction((state) => {
                          const combatants = state.combatants.map((item) => {
                            if (item.id === combatant.id) {
                              return { ...item, conditions: [...item.conditions, condition] }
                            }
                            if (
                              condition.duration.type === 'concentration' &&
                              condition.duration.sourceId === item.id
                            ) {
                              return { ...item, isConcentrating: true }
                            }
                            return item
                          })
                          return { ...state, combatants, updatedAt: Date.now() }
                        })
                      }
                      onRemoveCondition={(conditionId) =>
                        applyAction((state) => ({
                          ...state,
                          combatants: state.combatants.map((item) =>
                            item.id === combatant.id
                              ? {
                                  ...item,
                                  conditions: item.conditions.filter(
                                    (condition) => condition.id !== conditionId,
                                  ),
                                }
                              : item,
                          ),
                          updatedAt: Date.now(),
                        }))
                      }
                      onBreakConcentration={() =>
                        applyAction((state) => {
                          const toggled = state.combatants.map((item) =>
                            item.id === combatant.id
                              ? { ...item, isConcentrating: !item.isConcentrating }
                              : item,
                          )
                          const cleaned = toggled.find((item) => item.id === combatant.id)?.isConcentrating
                            ? toggled
                            : removeConditionsBySource(toggled, combatant.id)
                          return { ...state, combatants: cleaned, updatedAt: Date.now() }
                        })
                      }
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6 text-sm text-stone-300">
            Start or load a combat to begin tracking turns.
          </div>
        )}
      </div>

      <div
        className={`fixed bottom-6 right-6 z-50 max-w-[90vw] rounded-2xl border border-stone-500/30 bg-stone-950/90 shadow-xl backdrop-blur ${
          rollOpen ? 'w-[320px] p-4' : 'w-auto p-2'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRollOpen((open) => !open)}
            className="rounded-md border border-stone-400/40 px-2 py-1 text-[11px] text-stone-200"
          >
            {rollOpen ? 'Hide Dice' : 'Show Dice'}
          </button>
          {rollOpen && (
            <button
              type="button"
              onClick={() => setRollLog([])}
              className="rounded-md border border-stone-400/40 px-2 py-1 text-[11px] text-stone-200"
            >
              Clear
            </button>
          )}
        </div>
        {rollOpen && (
          <>
            <label className="mt-2 flex items-center gap-2 text-[11px] text-stone-300">
              <input
                type="checkbox"
                checked={rollAutoOpen}
                onChange={(event) => setRollAutoOpen(event.target.checked)}
              />
              Auto-open on roll
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={rollInput}
                onChange={(event) => setRollInput(event.target.value)}
                placeholder="e.g. 2d6+3"
                className="w-32 flex-1 rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-xs text-stone-100"
              />
              <button
                type="button"
                onClick={() => {
                  const result = rollExpression(rollInput)
                  if (result) {
                    pushRollLog(formatRollSummary('Roll', rollInput, result))
                  }
                }}
                className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-stone-900"
              >
                Roll
              </button>
            </div>
            {rollLog.length > 0 ? (
              <div className="mt-3 max-h-60 space-y-2 overflow-y-auto text-[11px] text-stone-300">
                {rollLog.map((entry, index) => (
                  <div key={`${entry}-${index}`} className="rounded-md bg-stone-900/40 px-3 py-2">
                    {entry}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-stone-500">Enter a dice expression to roll.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
