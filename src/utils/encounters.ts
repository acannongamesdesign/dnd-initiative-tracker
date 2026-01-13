import type { Encounter, EncounterEntry } from '../models'
import { createId } from './id'

export const createEmptyEncounter = (name = 'New Encounter'): Encounter => ({
  id: createId(),
  name,
  notes: '',
  combatants: [],
  updatedAt: Date.now(),
})

export const createEncounterEntry = (name: string): EncounterEntry => ({
  id: createId(),
  name,
  kind: 'monster',
  quantity: 1,
})
