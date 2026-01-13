import { useMemo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Combatant, Condition, Monster } from '../models'
import { createId } from '../utils/id'
import { rollExpression, formatRollSummary } from '../utils/dice'

type CombatantRowProps = {
  combatant: Combatant
  monster?: Monster
  combatants: Combatant[]
  isCurrent: boolean
  isOnDeck: boolean
  round: number
  onUpdate: (combatant: Combatant) => void
  onUpdateDisplay: (display: Partial<NonNullable<Combatant['display']>>) => void
  onRemove: () => void
  onApplyHp: (value: string) => void
  onAddCondition: (condition: Condition) => void
  onRemoveCondition: (id: string) => void
  onBreakConcentration: () => void
  onLogRoll?: (entry: string) => void
}

export const CombatantRow = ({
  combatant,
  monster,
  combatants,
  isCurrent,
  isOnDeck,
  round,
  onUpdate,
  onUpdateDisplay,
  onRemove,
  onApplyHp,
  onAddCondition,
  onRemoveCondition,
  onBreakConcentration,
  onLogRoll,
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

  const display = combatant.display ?? {
    showTraits: false,
    showActions: true,
    showReactions: false,
    showLegendary: true,
    showLair: true,
    showNotes: true,
  }

  const rollAction = (label: string, attackBonus?: number, damageDice?: string) => {
    if (attackBonus !== undefined) {
      const bonus = attackBonus >= 0 ? `+${attackBonus}` : `${attackBonus}`
      const attack = rollExpression(`1d20${bonus}`)
      if (attack) {
        onLogRoll?.(formatRollSummary(`${combatant.name} ${label} to hit`, `1d20${bonus}`, attack))
      }
    }
    if (damageDice) {
      const damage = rollExpression(damageDice)
      if (damage) {
        onLogRoll?.(formatRollSummary(`${combatant.name} ${label} damage`, damageDice, damage))
      }
    }
  }

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
          {monster && (
            <div className="rounded-lg border border-stone-500/20 bg-stone-950/40 p-3 text-xs text-stone-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold uppercase tracking-wide text-stone-400">Visible Info</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'showTraits', label: 'Traits' },
                    { key: 'showActions', label: 'Actions' },
                    { key: 'showReactions', label: 'Reactions' },
                    { key: 'showLegendary', label: 'Legendary' },
                    { key: 'showLair', label: 'Lair' },
                    { key: 'showNotes', label: 'Notes' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={display[item.key as keyof typeof display]}
                        onChange={() =>
                          onUpdateDisplay({
                            [item.key]: !display[item.key as keyof typeof display],
                          })
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {monster && display.showTraits && (monster.traits?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-stone-500/20 bg-stone-950/40 p-3 text-xs text-stone-200">
              <div className="text-[11px] uppercase tracking-wide text-stone-400">Traits</div>
              <div className="mt-2 space-y-2">
                {monster.traits.map((trait) => (
                  <div key={trait.id}>
                    <div className="font-semibold">{trait.name}</div>
                    <div className="text-stone-400">{trait.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster && display.showActions && (monster.actions?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-stone-500/20 bg-stone-950/40 p-3 text-xs text-stone-200">
              <div className="text-[11px] uppercase tracking-wide text-stone-400">Actions</div>
              <div className="mt-2 space-y-2">
                {monster.actions.map((action) => (
                  <div key={action.id} className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{action.name}</div>
                      <div className="text-stone-400">{action.description}</div>
                      {(action.attackBonus !== undefined || action.damageDice) && (
                        <div className="mt-1 text-[11px] text-stone-500">
                          {action.attackBonus !== undefined && `+${action.attackBonus} to hit `}
                          {action.damageDice && `Damage ${action.damageDice}`}
                        </div>
                      )}
                    </div>
                    {(action.attackBonus !== undefined || action.damageDice) && (
                      <button
                        type="button"
                        onClick={() => rollAction(action.name, action.attackBonus, action.damageDice)}
                        className="rounded-md border border-amber-400/40 px-2 py-1 text-[11px] text-amber-200"
                      >
                        Roll
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster && display.showReactions && (monster.reactions?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-stone-500/20 bg-stone-950/40 p-3 text-xs text-stone-200">
              <div className="text-[11px] uppercase tracking-wide text-stone-400">Reactions</div>
              <div className="mt-2 space-y-2">
                {monster.reactions.map((reaction) => (
                  <div key={reaction.id} className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{reaction.name}</div>
                      <div className="text-stone-400">{reaction.description}</div>
                      {(reaction.attackBonus !== undefined || reaction.damageDice) && (
                        <div className="mt-1 text-[11px] text-stone-500">
                          {reaction.attackBonus !== undefined && `+${reaction.attackBonus} to hit `}
                          {reaction.damageDice && `Damage ${reaction.damageDice}`}
                        </div>
                      )}
                    </div>
                    {(reaction.attackBonus !== undefined || reaction.damageDice) && (
                      <button
                        type="button"
                        onClick={() =>
                          rollAction(reaction.name, reaction.attackBonus, reaction.damageDice)
                        }
                        className="rounded-md border border-amber-400/40 px-2 py-1 text-[11px] text-amber-200"
                      >
                        Roll
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster && display.showLegendary && (monster.legendary?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-stone-500/20 bg-stone-950/40 p-3 text-xs text-stone-200">
              <div className="text-[11px] uppercase tracking-wide text-stone-400">Legendary</div>
              <div className="mt-2 space-y-2">
                {monster.legendary.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-stone-400">{item.description}</div>
                      {(item.attackBonus !== undefined || item.damageDice) && (
                        <div className="mt-1 text-[11px] text-stone-500">
                          {item.attackBonus !== undefined && `+${item.attackBonus} to hit `}
                          {item.damageDice && `Damage ${item.damageDice}`}
                        </div>
                      )}
                    </div>
                    {(item.attackBonus !== undefined || item.damageDice) && (
                      <button
                        type="button"
                        onClick={() => rollAction(item.name, item.attackBonus, item.damageDice)}
                        className="rounded-md border border-amber-400/40 px-2 py-1 text-[11px] text-amber-200"
                      >
                        Roll
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {monster && display.showLair && (monster.lairActions?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-stone-200">
              <div className="text-[11px] uppercase tracking-wide text-amber-200">Lair Actions</div>
              <div className="mt-2 space-y-2">
                {monster.lairActions.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-amber-100/80">{item.description}</div>
                      {(item.attackBonus !== undefined || item.damageDice) && (
                        <div className="mt-1 text-[11px] text-amber-100/60">
                          {item.attackBonus !== undefined && `+${item.attackBonus} to hit `}
                          {item.damageDice && `Damage ${item.damageDice}`}
                        </div>
                      )}
                    </div>
                    {(item.attackBonus !== undefined || item.damageDice) && (
                      <button
                        type="button"
                        onClick={() => rollAction(item.name, item.attackBonus, item.damageDice)}
                        className="rounded-md border border-amber-400/50 px-2 py-1 text-[11px] text-amber-200"
                      >
                        Roll
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {display.showNotes && (
            <label className="text-xs uppercase tracking-wide text-stone-400">
              Notes
              <textarea
                value={combatant.notes ?? ''}
                onChange={(event) => onUpdate({ ...combatant, notes: event.target.value })}
                className="mt-2 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                rows={3}
              />
            </label>
          )}
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
