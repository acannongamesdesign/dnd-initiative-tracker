import { useMemo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Combatant, Condition } from '../models'
import { createId } from '../utils/id'

type CombatantRowProps = {
  combatant: Combatant
  combatants: Combatant[]
  isCurrent: boolean
  isOnDeck: boolean
  round: number
  onUpdate: (combatant: Combatant) => void
  onRemove: () => void
  onApplyHp: (value: string) => void
  onAddCondition: (condition: Condition) => void
  onRemoveCondition: (id: string) => void
  onBreakConcentration: () => void
}

export const CombatantRow = ({
  combatant,
  combatants,
  isCurrent,
  isOnDeck,
  round,
  onUpdate,
  onRemove,
  onApplyHp,
  onAddCondition,
  onRemoveCondition,
  onBreakConcentration,
}: CombatantRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: combatant.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [hpInput, setHpInput] = useState('')
  const [conditionName, setConditionName] = useState('')
  const [durationType, setDurationType] = useState<'start' | 'end' | 'rounds' | 'concentration'>(
    'end',
  )
  const [durationRounds, setDurationRounds] = useState(1)
  const [sourceId, setSourceId] = useState<string>('')

  const label = useMemo(() => {
    if (isCurrent) return 'Current'
    if (isOnDeck) return 'On Deck'
    return ''
  }, [isCurrent, isOnDeck])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-4 shadow-sm ${
        isCurrent
          ? 'border-amber-400/80 bg-amber-500/15'
          : 'border-stone-500/20 bg-stone-950/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="rounded-md border border-stone-400/40 px-2 py-1 text-xs text-stone-200"
          >
            Drag
          </button>
          <div>
            <input
              value={combatant.name}
              onChange={(event) => onUpdate({ ...combatant, name: event.target.value })}
              className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
            />
            <div className="mt-1 flex items-center gap-2 text-xs text-stone-400">
              <span>{combatant.kind.toUpperCase()}</span>
              {label && <span className="rounded-full bg-amber-400/20 px-2 py-0.5">{label}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-300">
          <label className="text-xs uppercase tracking-wide text-stone-400">
            Init
            <input
              type="number"
              value={combatant.initiative}
              onChange={(event) =>
                onUpdate({ ...combatant, initiative: Number(event.target.value) })
              }
              className="mt-1 w-20 rounded-md border border-stone-400/30 bg-stone-950/40 px-2 py-1 text-sm text-stone-100"
            />
          </label>
          <label className="text-xs uppercase tracking-wide text-stone-400">
            Temp
            <input
              type="number"
              value={combatant.hp.temp}
              onChange={(event) =>
                onUpdate({
                  ...combatant,
                  hp: { ...combatant.hp, temp: Number(event.target.value) },
                })
              }
              className="mt-1 w-20 rounded-md border border-stone-400/30 bg-stone-950/40 px-2 py-1 text-sm text-stone-100"
            />
          </label>
          <div className="text-sm text-stone-200">
            HP {combatant.hp.current}/{combatant.hp.max}
          </div>
          <input
            value={hpInput}
            onChange={(event) => setHpInput(event.target.value)}
            placeholder="-7 / +5 / =12"
            className="w-28 rounded-md border border-stone-400/30 bg-stone-950/40 px-2 py-1 text-xs text-stone-100"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onApplyHp(hpInput)
                setHpInput('')
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              onApplyHp(hpInput)
              setHpInput('')
            }}
            className="rounded-md border border-stone-400/40 px-3 py-1 text-xs text-stone-200"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-300">Conditions</h4>
          <div className="mt-2 space-y-2">
            {combatant.conditions.map((condition) => (
              <div
                key={condition.id}
                className="flex items-center justify-between rounded-lg border border-stone-400/20 bg-stone-900/40 px-3 py-2 text-xs text-stone-200"
              >
                <div>
                  <div className="font-semibold">{condition.name}</div>
                  <div className="text-[11px] text-stone-400">
                    {condition.duration.type === 'rounds' &&
                      `${condition.duration.remainingRounds} rounds`}
                    {condition.duration.type === 'startOfNextTurn' && 'until start of next turn'}
                    {condition.duration.type === 'endOfNextTurn' && 'until end of next turn'}
                    {condition.duration.type === 'concentration' && 'concentration'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCondition(condition.id)}
                  className="rounded-md border border-stone-400/40 px-2 py-1 text-[11px]"
                >
                  Remove
                </button>
              </div>
            ))}
            {combatant.conditions.length === 0 && (
              <p className="text-xs text-stone-500">No conditions.</p>
            )}
          </div>
          <div className="mt-3 grid gap-2 rounded-lg border border-stone-500/20 bg-stone-950/40 p-3 text-xs text-stone-300">
            <input
              value={conditionName}
              onChange={(event) => setConditionName(event.target.value)}
              placeholder="Condition name"
              className="rounded-md border border-stone-400/30 bg-stone-950/40 px-2 py-1 text-xs text-stone-100"
            />
            <div className="grid gap-2 md:grid-cols-3">
              <select
                value={durationType}
                onChange={(event) =>
                  setDurationType(event.target.value as typeof durationType)
                }
                className="rounded-md border border-stone-400/30 bg-stone-950/40 px-2 py-1 text-xs text-stone-100"
              >
                <option value="start">Until start of source next turn</option>
                <option value="end">Until end of target next turn</option>
                <option value="rounds">X rounds</option>
                <option value="concentration">Concentration</option>
              </select>
              {durationType === 'rounds' && (
                <input
                  type="number"
                  min={1}
                  value={durationRounds}
                  onChange={(event) => setDurationRounds(Number(event.target.value))}
                  className="rounded-md border border-stone-400/30 bg-stone-950/40 px-2 py-1 text-xs text-stone-100"
                />
              )}
              <select
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
                className="rounded-md border border-stone-400/30 bg-stone-950/40 px-2 py-1 text-xs text-stone-100"
              >
                <option value="">Source (optional)</option>
                {combatants.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!conditionName.trim()) return
                const condition: Condition = {
                  id: createId(),
                  name: conditionName.trim(),
                  sourceId: sourceId || undefined,
                  duration:
                    durationType === 'start'
                      ? { type: 'startOfNextTurn', anchorId: sourceId || combatant.id, remainingTurns: 1 }
                      : durationType === 'end'
                        ? { type: 'endOfNextTurn', anchorId: combatant.id, remainingTurns: 1 }
                        : durationType === 'rounds'
                          ? { type: 'rounds', remainingRounds: Math.max(1, durationRounds) }
                          : { type: 'concentration', sourceId: sourceId || combatant.id },
                  appliedRound: round,
                }
                onAddCondition(condition)
                setConditionName('')
              }}
              className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-stone-900"
            >
              Add Condition
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-xs uppercase tracking-wide text-stone-400">
            Notes
            <textarea
              value={combatant.notes ?? ''}
              onChange={(event) => onUpdate({ ...combatant, notes: event.target.value })}
              className="mt-2 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              rows={3}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onBreakConcentration}
              className="rounded-md border border-stone-400/40 px-3 py-1 text-xs text-stone-200"
            >
              {combatant.isConcentrating ? 'Break Concentration' : 'Start Concentration'}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md border border-rose-500/60 px-3 py-1 text-xs text-rose-200"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
