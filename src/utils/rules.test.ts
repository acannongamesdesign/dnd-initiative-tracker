import { describe, expect, it } from 'vitest'
import { abilityMod, proficiencyBonusFromCr } from './rules'

describe('rules helpers', () => {
  it('calculates ability modifiers', () => {
    expect(abilityMod(10)).toBe(0)
    expect(abilityMod(8)).toBe(-1)
    expect(abilityMod(18)).toBe(4)
  })

  it('calculates proficiency bonus from CR', () => {
    expect(proficiencyBonusFromCr(1)).toBe(2)
    expect(proficiencyBonusFromCr(5)).toBe(3)
    expect(proficiencyBonusFromCr(9)).toBe(4)
    expect(proficiencyBonusFromCr(13)).toBe(5)
    expect(proficiencyBonusFromCr(17)).toBe(6)
  })
})
