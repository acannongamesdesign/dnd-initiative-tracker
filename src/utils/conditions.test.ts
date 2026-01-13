import { describe, expect, it } from 'vitest'
import { advanceTurn } from './conditions'
import type { CombatState } from '../models'

const baseState = (): CombatState => ({
  id: 'combat-1',
  name: 'Test Combat',
  combatants: [
    {
      id: 'a',
      name: 'A',
      kind: 'pc',
      initiative: 15,
      hp: { current: 10, max: 10, temp: 0 },
      conditions: [],
      isConcentrating: false,
      updatedAt: Date.now(),
    },
    {
      id: 'b',
      name: 'B',
      kind: 'npc',
      initiative: 12,
      hp: { current: 10, max: 10, temp: 0 },
      conditions: [],
      isConcentrating: false,
      updatedAt: Date.now(),
    },
  ],
  order: ['a', 'b'],
  currentIndex: 0,
  round: 1,
  updatedAt: Date.now(),
})

describe('conditions expiry', () => {
  it('expires at start of next turn boundary', () => {
    const state = baseState()
    state.combatants[1].conditions.push({
      id: 'c1',
      name: 'Start Next Turn',
      duration: { type: 'startOfNextTurn', anchorId: 'a', remainingTurns: 1 },
      appliedRound: 1,
    })
    const firstAdvance = advanceTurn(state).state
    expect(firstAdvance.combatants[1].conditions).toHaveLength(1)
    const secondAdvance = advanceTurn(firstAdvance).state
    expect(secondAdvance.combatants[1].conditions).toHaveLength(0)
  })

  it('expires at end of target next turn boundary', () => {
    const state = baseState()
    state.combatants[1].conditions.push({
      id: 'c2',
      name: 'End Next Turn',
      duration: { type: 'endOfNextTurn', anchorId: 'b', remainingTurns: 1 },
      appliedRound: 1,
    })
    const firstAdvance = advanceTurn(state).state
    expect(firstAdvance.combatants[1].conditions).toHaveLength(1)
    const secondAdvance = advanceTurn(firstAdvance).state
    expect(secondAdvance.combatants[1].conditions).toHaveLength(0)
  })

  it('expires after round countdown', () => {
    const state = baseState()
    state.combatants[0].conditions.push({
      id: 'c3',
      name: 'Round Timer',
      duration: { type: 'rounds', remainingRounds: 1 },
      appliedRound: 1,
    })
    const firstAdvance = advanceTurn(state).state
    const secondAdvance = advanceTurn(firstAdvance).state
    expect(secondAdvance.round).toBe(2)
    expect(secondAdvance.combatants[0].conditions).toHaveLength(0)
  })
})
