import { skillList } from '../models'
import type { AbilityKey, SkillKey } from '../models'

export const abilityMod = (score: number) => Math.floor((score - 10) / 2)

export const proficiencyBonusFromCr = (cr: number) => {
  if (cr >= 29) return 9
  if (cr >= 25) return 8
  if (cr >= 21) return 7
  if (cr >= 17) return 6
  if (cr >= 13) return 5
  if (cr >= 9) return 4
  if (cr >= 5) return 3
  return 2
}

export const formatSigned = (value: number) => (value >= 0 ? `+${value}` : `${value}`)

export const skillAbilityMap = new Map<SkillKey, AbilityKey>(
  skillList.map((skill) => [skill.key, skill.ability as AbilityKey]),
)

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
