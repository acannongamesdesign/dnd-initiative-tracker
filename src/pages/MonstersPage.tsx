import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { db } from '../db/db'
import { useTable } from '../hooks/useTable'
import { TagInput } from '../components/TagInput'
import { TraitListEditor } from '../components/TraitListEditor'
import {
  abilityKeys,
  skillList,
  type AbilityKey,
  type Monster,
  monsterSchema,
} from '../models'
import { abilityMod, formatSigned, proficiencyBonusFromCr, skillAbilityMap } from '../utils/rules'
import { applyTemplate, createEmptyMonster, monsterTemplates } from '../utils/monsters'
import { createId } from '../utils/id'

const templateNames = Object.keys(monsterTemplates)

const toggleArrayValue = <T,>(items: T[], value: T) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value]

export const MonstersPage = () => {
  const { data: monsters } = useTable(() => db.monsters.orderBy('name').toArray(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const filteredMonsters = useMemo(() => {
    if (!monsters) return []
    const needle = search.trim().toLowerCase()
    const tagNeedle = tagFilter.trim().toLowerCase()
    return monsters.filter((monster) => {
      const matchesSearch =
        !needle ||
        monster.name.toLowerCase().includes(needle) ||
        monster.type.toLowerCase().includes(needle)
      const matchesTag =
        !tagNeedle || monster.tags.some((tag) => tag.toLowerCase().includes(tagNeedle))
      return matchesSearch && matchesTag
    })
  }, [monsters, search, tagFilter])

  const selectedMonster = useMemo(
    () => monsters?.find((monster) => monster.id === selectedId),
    [monsters, selectedId],
  )

  const form = useForm<Monster>({
    defaultValues: selectedMonster ?? createEmptyMonster(),
  })
  const { register, reset, watch, setValue, control } = form
  const watched = watch()

  useEffect(() => {
    if (!monsters || monsters.length === 0) return
    if (!selectedId) {
      setSelectedId(monsters[0].id)
    }
  }, [monsters, selectedId])

  useEffect(() => {
    if (selectedMonster) {
      reset({
        ...selectedMonster,
        lairName: selectedMonster.lairName ?? '',
        lairActions: selectedMonster.lairActions ?? [],
      })
    }
  }, [reset, selectedMonster])

  useEffect(() => {
    if (!watched?.id) return
    const timer = window.setTimeout(async () => {
      const payload = {
        ...watched,
        proficiencyBonusOverride:
          typeof watched.proficiencyBonusOverride === 'number' &&
          Number.isFinite(watched.proficiencyBonusOverride)
            ? watched.proficiencyBonusOverride
            : null,
        updatedAt: Date.now(),
      }
      const parsed = monsterSchema.safeParse(payload)
      if (parsed.success) {
        await db.monsters.put(parsed.data)
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [watched])

  const profBonus =
    watched?.proficiencyBonusOverride ?? proficiencyBonusFromCr(watched?.cr ?? 1)

  const saveBonus = (ability: AbilityKey) => {
    const base = abilityMod(watched?.abilities?.[ability] ?? 10)
    const prof =
      (watched?.saves?.proficient?.includes(ability) ? profBonus : 0) +
      (watched?.saves?.expertise?.includes(ability) ? profBonus : 0)
    return base + prof
  }

  const skillBonus = (skillKey: (typeof skillList)[number]['key']) => {
    const ability = skillAbilityMap.get(skillKey) ?? 'int'
    const base = abilityMod(watched?.abilities?.[ability] ?? 10)
    const prof =
      (watched?.skills?.proficient?.includes(skillKey) ? profBonus : 0) +
      (watched?.skills?.expertise?.includes(skillKey) ? profBonus : 0)
    return base + prof
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-200">Monsters</h2>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                const monster = createEmptyMonster('New Monster')
                await db.monsters.add(monster)
                setSelectedId(monster.id)
              }}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-900"
            >
              New Monster
            </button>
            {selectedMonster && (
              <button
                type="button"
                onClick={async () => {
                  const duplicate = {
                    ...selectedMonster,
                    id: createId(),
                    name: `${selectedMonster.name} Copy`,
                    updatedAt: Date.now(),
                  }
                  await db.monsters.add(duplicate)
                  setSelectedId(duplicate.id)
                }}
                className="rounded-md border border-stone-400/40 px-3 py-2 text-sm text-stone-200"
              >
                Duplicate
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or type"
              className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-xs text-stone-100"
            />
            <input
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="Filter tag"
              className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-xs text-stone-100"
            />
            {filteredMonsters.map((monster) => (
              <button
                key={monster.id}
                type="button"
                onClick={() => setSelectedId(monster.id)}
                className={`w-full rounded-md px-3 py-2 text-left ${
                  selectedId === monster.id
                    ? 'bg-amber-500 text-stone-900'
                    : 'bg-stone-900/40 text-stone-200 hover:bg-stone-900/70'
                }`}
              >
                <div className="font-semibold">{monster.name}</div>
                <div className="text-xs text-stone-400">{monster.type}</div>
              </button>
            ))}
            {filteredMonsters.length === 0 && (
              <p className="text-xs text-stone-400">No monsters yet. Create one to start.</p>
            )}
          </div>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="rounded-2xl border border-stone-500/20 bg-stone-950/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Monster Builder</h2>
              <p className="text-sm text-stone-400">Autosaves as you type.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-300">
              <span className="text-xs uppercase tracking-wide text-stone-400">Template</span>
              <select
                className="rounded-md border border-stone-400/40 bg-stone-900/60 px-3 py-2 text-sm"
                defaultValue=""
                onChange={async (event) => {
                  if (!watched?.id) return
                  const updated = applyTemplate(watched, event.target.value)
                  reset(updated)
                }}
              >
                <option value="" disabled>
                  Apply template
                </option>
                {templateNames.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <details open className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-200">
            Basics
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-stone-300">
              Name
              <input
                {...register('name')}
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="text-sm text-stone-300">
              Size
              <input
                {...register('size')}
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="text-sm text-stone-300">
              Type
              <input
                {...register('type')}
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="text-sm text-stone-300">
              Alignment
              <input
                {...register('alignment')}
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="text-sm text-stone-300">
              Challenge Rating
                <input
                  type="number"
                  step="0.25"
                  {...register('cr', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                  className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                />
            </label>
            <label className="text-sm text-stone-300">
              Proficiency Bonus
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  placeholder={`${profBonus}`}
                  {...register('proficiencyBonusOverride', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                  className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                />
                <span className="text-xs text-stone-400">Default {profBonus}</span>
              </div>
            </label>
            <div className="md:col-span-2 text-sm text-stone-300">
              Tags
              <div className="mt-2">
                <TagInput
                  value={watched.tags ?? []}
                  onChange={(tags) => setValue('tags', tags)}
                />
              </div>
            </div>
          </div>
        </details>

        <details open className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-200">
            Defense
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm text-stone-300">
              AC
                <input
                  type="number"
                  {...register('defense.ac', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                  className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                />
            </label>
            <label className="text-sm text-stone-300">
              HP
                <input
                  type="number"
                  {...register('defense.hp', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                  className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                />
            </label>
            <label className="text-sm text-stone-300">
              Walk Speed
                <input
                  type="number"
                  {...register('defense.speeds.walk', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? 0 : Number(value)),
                  })}
                  className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                />
            </label>
            {(['fly', 'swim', 'climb', 'burrow'] as const).map((speed) => (
              <label key={speed} className="text-sm text-stone-300">
                {speed.toUpperCase()}
                <input
                  type="number"
                  {...register(`defense.speeds.${speed}`, {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                  className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                />
              </label>
            ))}
            <label className="text-sm text-stone-300 md:col-span-3">
              Resistances
              <input
                {...register('defense.resistances')}
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="text-sm text-stone-300 md:col-span-3">
              Vulnerabilities
              <input
                {...register('defense.vulnerabilities')}
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <label className="text-sm text-stone-300 md:col-span-3">
              Immunities
              <input
                {...register('defense.immunities')}
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
          </div>
        </details>

        <details open className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-200">
            Abilities
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {abilityKeys.map((ability) => (
              <label key={ability} className="text-sm text-stone-300">
                {ability.toUpperCase()}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    {...register(`abilities.${ability}`, {
                      valueAsNumber: true,
                      setValueAs: (value) => (value === '' ? 10 : Number(value)),
                    })}
                    className="w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
                  />
                  <span className="text-xs text-stone-400">
                    {formatSigned(abilityMod(watched?.abilities?.[ability] ?? 10))}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </details>

        <details className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-200">
            Saves &amp; Skills
          </summary>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-stone-200">Saving Throws</h4>
              <div className="mt-3 space-y-2">
                {abilityKeys.map((ability) => (
                  <label key={ability} className="flex items-center justify-between text-sm text-stone-300">
                    <span>{ability.toUpperCase()}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-stone-400">{formatSigned(saveBonus(ability))}</span>
                      <label className="flex items-center gap-1 text-xs text-stone-400">
                        <input
                          type="checkbox"
                          checked={watched?.saves?.proficient?.includes(ability) ?? false}
                          onChange={() =>
                            setValue(
                              'saves.proficient',
                              toggleArrayValue(watched.saves.proficient, ability as AbilityKey),
                            )
                          }
                        />
                        Prof
                      </label>
                      <label className="flex items-center gap-1 text-xs text-stone-400">
                        <input
                          type="checkbox"
                          checked={watched?.saves?.expertise?.includes(ability) ?? false}
                          onChange={() =>
                            setValue(
                              'saves.expertise',
                              toggleArrayValue(watched.saves.expertise, ability as AbilityKey),
                            )
                          }
                        />
                        Exp
                      </label>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-200">Skills</h4>
              <div className="mt-3 grid gap-2">
                {skillList.map((skill) => (
                  <label key={skill.key} className="flex items-center justify-between text-sm text-stone-300">
                    <span>{skill.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-stone-400">{formatSigned(skillBonus(skill.key))}</span>
                      <label className="flex items-center gap-1 text-xs text-stone-400">
                        <input
                          type="checkbox"
                          checked={watched?.skills?.proficient?.includes(skill.key) ?? false}
                          onChange={() =>
                            setValue(
                              'skills.proficient',
                              toggleArrayValue(watched.skills.proficient, skill.key),
                            )
                          }
                        />
                        Prof
                      </label>
                      <label className="flex items-center gap-1 text-xs text-stone-400">
                        <input
                          type="checkbox"
                          checked={watched?.skills?.expertise?.includes(skill.key) ?? false}
                          onChange={() =>
                            setValue(
                              'skills.expertise',
                              toggleArrayValue(watched.skills.expertise, skill.key),
                            )
                          }
                        />
                        Exp
                      </label>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </details>

        <details className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-200">
            Traits &amp; Actions
          </summary>
          <div className="mt-4 space-y-6">
            <TraitListEditor control={control} register={register} name="traits" label="Traits" />
            <TraitListEditor control={control} register={register} name="actions" label="Actions" />
            <TraitListEditor control={control} register={register} name="reactions" label="Reactions" />
            <TraitListEditor control={control} register={register} name="legendary" label="Legendary" />
          </div>
        </details>

        <details className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-200">
            Lair
          </summary>
          <div className="mt-4 space-y-4">
            <label className="text-sm text-stone-300">
              Lair Name
              <input
                {...register('lairName')}
                placeholder="Ancient shrine, bandit keep, etc."
                className="mt-1 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
              />
            </label>
            <TraitListEditor control={control} register={register} name="lairActions" label="Lair Actions" />
          </div>
        </details>

        <details className="rounded-2xl border border-stone-500/20 bg-stone-950/40 p-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-200">
            Notes
          </summary>
          <textarea
            {...register('notes')}
            rows={4}
            className="mt-3 w-full rounded-md border border-stone-400/30 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
          />
        </details>
      </section>
    </div>
  )
}
