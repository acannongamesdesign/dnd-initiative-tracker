import type { CombatState, Combatant, Condition } from '../models'

const updateCombatants = (
  combatants: Combatant[],
  updater: (combatant: Combatant) => Combatant,
) => combatants.map((combatant) => updater(combatant))

const expireConditionsForBoundary = (
  combatants: Combatant[],
  boundary: 'start' | 'end',
  targetId: string,
) => {
  const expired: string[] = []
  const updated = updateCombatants(combatants, (combatant) => {
    const nextConditions: Condition[] = []
    for (const condition of combatant.conditions) {
      if (
        boundary === 'start' &&
        condition.duration.type === 'startOfNextTurn' &&
        condition.duration.anchorId === targetId
      ) {
        const remaining = condition.duration.remainingTurns - 1
        if (remaining <= 0) {
          expired.push(condition.id)
          continue
        }
        nextConditions.push({
          ...condition,
          duration: { ...condition.duration, remainingTurns: remaining },
        })
        continue
      }
      if (
        boundary === 'end' &&
        condition.duration.type === 'endOfNextTurn' &&
        condition.duration.anchorId === targetId
      ) {
        const remaining = condition.duration.remainingTurns - 1
        if (remaining <= 0) {
          expired.push(condition.id)
          continue
        }
        nextConditions.push({
          ...condition,
          duration: { ...condition.duration, remainingTurns: remaining },
        })
        continue
      }
      nextConditions.push(condition)
    }
    return { ...combatant, conditions: nextConditions }
  })

  return { combatants: updated, expired }
}

const expireRoundConditions = (combatants: Combatant[]) => {
  const expired: string[] = []
  const updated = updateCombatants(combatants, (combatant) => {
    const nextConditions: Condition[] = []
    for (const condition of combatant.conditions) {
      if (condition.duration.type === 'rounds') {
        const remaining = condition.duration.remainingRounds - 1
        if (remaining <= 0) {
          expired.push(condition.id)
          continue
        }
        nextConditions.push({
          ...condition,
          duration: { ...condition.duration, remainingRounds: remaining },
        })
        continue
      }
      nextConditions.push(condition)
    }
    return { ...combatant, conditions: nextConditions }
  })

  return { combatants: updated, expired }
}

export const advanceTurn = (state: CombatState) => {
  if (state.order.length === 0) {
    return { state, expired: [] as string[] }
  }

  const safeIndex = Math.min(state.currentIndex, state.order.length - 1)
  const currentId = state.order[safeIndex]
  const endBoundary = expireConditionsForBoundary(state.combatants, 'end', currentId)

  let nextIndex = safeIndex + 1
  let nextRound = state.round
  let combatants = endBoundary.combatants
  let expired = [...endBoundary.expired]

  if (nextIndex >= state.order.length) {
    nextIndex = 0
    nextRound += 1
    const roundTick = expireRoundConditions(combatants)
    combatants = roundTick.combatants
    expired = expired.concat(roundTick.expired)
  }

  const nextId = state.order[nextIndex]
  const startBoundary = expireConditionsForBoundary(combatants, 'start', nextId)
  combatants = startBoundary.combatants
  expired = expired.concat(startBoundary.expired)

  return {
    state: {
      ...state,
      combatants,
      currentIndex: nextIndex,
      round: nextRound,
      updatedAt: Date.now(),
    },
    expired,
  }
}

export const removeConditionsBySource = (combatants: Combatant[], sourceId: string) =>
  combatants.map((combatant) => ({
    ...combatant,
    conditions: combatant.conditions.filter((condition) => {
      if (condition.duration.type === 'concentration') {
        return condition.duration.sourceId !== sourceId
      }
      return true
    }),
  }))
