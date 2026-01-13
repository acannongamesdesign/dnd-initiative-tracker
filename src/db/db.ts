import Dexie, { Table } from 'dexie'
import type { CombatState, Encounter, Monster, Settings } from '../models'

class AppDB extends Dexie {
  monsters!: Table<Monster, string>
  encounters!: Table<Encounter, string>
  combatStates!: Table<CombatState, string>
  settings!: Table<Settings, string>

  constructor() {
    super('dnd-initiative-tracker')
    this.version(1).stores({
      monsters: 'id, name, type, tags',
      encounters: 'id, name',
      combatStates: 'id, name, encounterId, updatedAt',
      settings: 'id',
    })
  }
}

export const db = new AppDB()
