type HpState = {
  current: number
  max: number
  temp: number
}

export const applyHpInput = (hp: HpState, input: string) => {
  const trimmed = input.trim()
  if (!trimmed) return hp

  if (trimmed.startsWith('=')) {
    const value = Number(trimmed.slice(1))
    if (!Number.isNaN(value)) {
      return { ...hp, current: clampHp(value, hp.max) }
    }
  }

  const delta = Number(trimmed)
  if (!Number.isNaN(delta)) {
    return { ...hp, current: clampHp(hp.current + delta, hp.max) }
  }

  return hp
}

const clampHp = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)))
