import type { Monster } from '../models'
import { createId } from './id'

export const createEmptyMonster = (name = 'New Monster'): Monster => ({
  id: createId(),
  name,
  size: 'Medium',
  type: 'Humanoid',
  alignment: 'Unaligned',
  tags: [],
  cr: 1,
  proficiencyBonusOverride: null,
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  saves: { proficient: [], expertise: [] },
  skills: { proficient: [], expertise: [] },
  defense: {
    ac: 12,
    hp: 10,
    speeds: { walk: 30 },
    resistances: '',
    vulnerabilities: '',
    immunities: '',
  },
  traits: [],
  actions: [],
  reactions: [],
  legendary: [],
  notes: '',
  updatedAt: Date.now(),
})

export const monsterTemplates: Record<string, Partial<Monster>> = {
  Humanoid: {
    size: 'Medium',
    type: 'Humanoid',
    tags: ['civilized'],
    abilities: { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
  },
  Beast: {
    size: 'Medium',
    type: 'Beast',
    tags: ['natural'],
    abilities: { str: 12, dex: 14, con: 12, int: 3, wis: 12, cha: 6 },
  },
  Spellcaster: {
    size: 'Medium',
    type: 'Humanoid',
    tags: ['spellcaster'],
    abilities: { str: 8, dex: 12, con: 10, int: 16, wis: 14, cha: 12 },
  },
  'Solo Boss': {
    size: 'Large',
    type: 'Humanoid',
    tags: ['boss'],
    abilities: { str: 18, dex: 14, con: 16, int: 12, wis: 12, cha: 16 },
    defense: { ac: 17, hp: 180, speeds: { walk: 30 } },
  },
  Swarm: {
    size: 'Medium',
    type: 'Swarm of Tiny beasts',
    tags: ['swarm'],
    abilities: { str: 10, dex: 14, con: 12, int: 3, wis: 10, cha: 6 },
  },
}

export const applyTemplate = (monster: Monster, templateName: string) => {
  const template = monsterTemplates[templateName]
  if (!template) return monster
  return {
    ...monster,
    ...template,
    abilities: template.abilities ?? monster.abilities,
    defense: template.defense ?? monster.defense,
    updatedAt: Date.now(),
  }
}
