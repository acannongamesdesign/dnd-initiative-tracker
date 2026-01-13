import type { CombatState, Combatant, Encounter, Monster } from '../models'
import { createId } from './id'
import { abilityMod } from './rules'

export const createCombatState = (name: string): CombatState => ({
  id: createId(),
  name,
  combatants: [],
  order: [],
  currentIndex: 0,
  round: 1,
  updatedAt: Date.now(),
})

export const createCombatFromEncounter = (
  encounter: Encounter,
  monsters: Monster[],
): CombatState => {
  const combatants: Combatant[] = []
  const monsterMap = new Map(monsters.map((monster) => [monster.id, monster]))

  for (const entry of encounter.combatants) {
    const quantity = Math.max(1, entry.quantity)
    for (let i = 0; i < quantity; i += 1) {
      const suffix = quantity > 1 ? ` ${i + 1}` : ''
      const monster = entry.monsterId ? monsterMap.get(entry.monsterId) : undefined
      const dex = monster ? monster.abilities.dex : undefined
      combatants.push({
        id: createId(),
        name: `${entry.name}${suffix}`,
        kind: entry.kind,
        monsterId: entry.monsterId,
        initiative: entry.initiative ?? 10,
        dex,
        hp: {
          current: entry.hpMax ?? monster?.defense.hp ?? 10,
          max: entry.hpMax ?? monster?.defense.hp ?? 10,
          temp: 0,
        },
        conditions: [],
        notes: entry.notes,
        isConcentrating: false,
        updatedAt: Date.now(),
      })
    }
  }

  const order = combatants
    .slice()
    .sort((a, b) => b.initiative - a.initiative)
    .map((combatant) => combatant.id)

  return {
    id: createId(),
    name: encounter.name,
    encounterId: encounter.id,
    combatants,
    order,
    currentIndex: 0,
    round: 1,
    updatedAt: Date.now(),
  }
}

export const rollInitiative = (combatants: Combatant[]) =>
  combatants.map((combatant) => {
    const mod = combatant.dex !== undefined ? abilityMod(combatant.dex) : 0
    return {
      ...combatant,
      initiative: Math.floor(Math.random() * 20) + 1 + mod,
      updatedAt: Date.now(),
    }
  })

export const normalizeOrder = (combatants: Combatant[], order: string[]) => {
  const ids = new Set(combatants.map((combatant) => combatant.id))
  const pruned = order.filter((id) => ids.has(id))
  const missing = combatants.filter((combatant) => !pruned.includes(combatant.id))
  return [...pruned, ...missing.map((combatant) => combatant.id)]
}

export const cloneCombatState = (state: CombatState) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(state)
  }
  return JSON.parse(JSON.stringify(state)) as CombatState
}
