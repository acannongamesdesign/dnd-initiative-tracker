import { db } from './db'
import { seedEncounters, seedMonsters } from '../data/seed'

export const ensureSeedData = async () => {
  const monsterCount = await db.monsters.count()
  if (monsterCount === 0) {
    await db.monsters.bulkAdd(seedMonsters)
  }

  const encounterCount = await db.encounters.count()
  if (encounterCount === 0) {
    await db.encounters.bulkAdd(seedEncounters)
  }
}
