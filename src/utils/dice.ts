type RollResult = {
  total: number
  detail: string
  rolls: number[]
}

const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1

const parseTerm = (term: string) => {
  const trimmed = term.trim()
  if (!trimmed) return null
  const diceMatch = trimmed.match(/^(\d*)d(\d+)$/i)
  if (diceMatch) {
    const count = diceMatch[1] ? Number(diceMatch[1]) : 1
    const sides = Number(diceMatch[2])
    if (!Number.isFinite(count) || !Number.isFinite(sides) || count <= 0 || sides <= 0) return null
    return { type: 'dice' as const, count, sides }
  }
  const number = Number(trimmed)
  if (!Number.isFinite(number)) return null
  return { type: 'flat' as const, value: number }
}

export const rollExpression = (expression: string): RollResult | null => {
  const normalized = expression.replace(/\s+/g, '')
  if (!normalized) return null

  const tokens = normalized.replace(/-/g, '+-').split('+').filter(Boolean)
  let total = 0
  const parts: string[] = []
  const rolls: number[] = []

  for (const token of tokens) {
    const term = parseTerm(token.startsWith('+') ? token.slice(1) : token)
    if (!term) return null
    if (term.type === 'flat') {
      total += term.value
      parts.push(`${term.value >= 0 ? '+' : ''}${term.value}`)
      continue
    }
    const sign = token.startsWith('-') ? -1 : 1
    const diceRolls = Array.from({ length: term.count }).map(() => rollDie(term.sides))
    const subtotal = diceRolls.reduce((sum, value) => sum + value, 0) * sign
    total += subtotal
    rolls.push(...diceRolls.map((value) => value * sign))
    parts.push(`${sign === -1 ? '-' : ''}${term.count}d${term.sides}[${diceRolls.join(',')}]`)
  }

  return { total, detail: parts.join(' '), rolls }
}

export const formatRollSummary = (label: string, expression: string, result: RollResult) =>
  `${label} ${expression} = ${result.total} (${result.detail.trim()})`
