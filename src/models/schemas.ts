import { z } from 'zod'
import { abilityKeys, skillList } from './constants'

export const abilityKeySchema = z.enum(abilityKeys)
export type AbilityKey = z.infer<typeof abilityKeySchema>

export const skillKeySchema = z.enum(skillList.map((skill) => skill.key) as [string, ...string[]])
export type SkillKey = z.infer<typeof skillKeySchema>

export const traitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
})

export const abilityScoresSchema = z.object({
  str: z.number().int(),
  dex: z.number().int(),
  con: z.number().int(),
  int: z.number().int(),
  wis: z.number().int(),
  cha: z.number().int(),
})

export const monsterSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.string(),
  type: z.string(),
  alignment: z.string(),
  tags: z.array(z.string()),
  cr: z.number(),
  proficiencyBonusOverride: z.number().nullable().optional(),
  abilities: abilityScoresSchema,
  saves: z.object({
    proficient: z.array(abilityKeySchema),
    expertise: z.array(abilityKeySchema),
  }),
  skills: z.object({
    proficient: z.array(skillKeySchema),
    expertise: z.array(skillKeySchema),
  }),
  defense: z.object({
    ac: z.number().int(),
    hp: z.number().int(),
    speeds: z.object({
      walk: z.number().int(),
      fly: z.number().int().optional(),
      swim: z.number().int().optional(),
      climb: z.number().int().optional(),
      burrow: z.number().int().optional(),
    }),
    resistances: z.string().optional(),
    vulnerabilities: z.string().optional(),
    immunities: z.string().optional(),
  }),
  traits: z.array(traitSchema),
  actions: z.array(traitSchema),
  reactions: z.array(traitSchema),
  legendary: z.array(traitSchema),
  notes: z.string().optional(),
  updatedAt: z.number(),
})

export const encounterEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['pc', 'npc', 'monster']),
  monsterId: z.string().optional(),
  quantity: z.number().int().min(1),
  hpMax: z.number().int().optional(),
  initiative: z.number().int().optional(),
  notes: z.string().optional(),
})

export const encounterSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  combatants: z.array(encounterEntrySchema),
  updatedAt: z.number(),
})

export const conditionDurationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('startOfNextTurn'),
    anchorId: z.string(),
    remainingTurns: z.number().int(),
  }),
  z.object({
    type: z.literal('endOfNextTurn'),
    anchorId: z.string(),
    remainingTurns: z.number().int(),
  }),
  z.object({
    type: z.literal('rounds'),
    remainingRounds: z.number().int(),
  }),
  z.object({
    type: z.literal('concentration'),
    sourceId: z.string(),
  }),
])

export const conditionSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceId: z.string().optional(),
  duration: conditionDurationSchema,
  appliedRound: z.number().int(),
  notes: z.string().optional(),
})

export const combatantSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['pc', 'npc', 'monster']),
  monsterId: z.string().optional(),
  initiative: z.number().int(),
  dex: z.number().int().optional(),
  hp: z.object({
    current: z.number().int(),
    max: z.number().int(),
    temp: z.number().int(),
  }),
  conditions: z.array(conditionSchema),
  notes: z.string().optional(),
  isConcentrating: z.boolean(),
  updatedAt: z.number(),
})

export const combatStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  encounterId: z.string().optional(),
  combatants: z.array(combatantSchema),
  order: z.array(z.string()),
  currentIndex: z.number().int(),
  round: z.number().int(),
  updatedAt: z.number(),
})

export const settingsSchema = z.object({
  id: z.literal('app'),
  lastEncounterId: z.string().optional(),
})

export const exportSchema = z.object({
  monsters: z.array(monsterSchema),
  encounters: z.array(encounterSchema),
  combatStates: z.array(combatStateSchema),
  settings: z.array(settingsSchema),
})

export type Monster = z.infer<typeof monsterSchema>
export type EncounterEntry = z.infer<typeof encounterEntrySchema>
export type Encounter = z.infer<typeof encounterSchema>
export type Condition = z.infer<typeof conditionSchema>
export type Combatant = z.infer<typeof combatantSchema>
export type CombatState = z.infer<typeof combatStateSchema>
export type Settings = z.infer<typeof settingsSchema>
export type ExportData = z.infer<typeof exportSchema>
