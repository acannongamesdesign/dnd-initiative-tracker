import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'
import type { Monster } from '../models'
import { createId } from '../utils/id'

type TraitListEditorProps = {
  control: Control<Monster>
  register: UseFormRegister<Monster>
  name: 'traits' | 'actions' | 'reactions' | 'legendary'
  label: string
}

export const TraitListEditor = ({ control, register, name, label }: TraitListEditorProps) => {
  const { fields, append, remove } = useFieldArray({ control, name })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-200">{label}</h4>
        <button
          type="button"
          onClick={() => append({ id: createId(), name: '', description: '' })}
          className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-stone-900"
        >
          Add {label}
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-stone-500/20 bg-stone-950/40 p-3">
            <div className="flex items-start gap-3">
              <input
                {...register(`${name}.${index}.name`)}
                placeholder="Name"
                className="w-1/3 rounded-md border border-stone-300/20 bg-stone-900/40 px-3 py-2 text-sm text-stone-100"
              />
              <textarea
                {...register(`${name}.${index}.description`)}
                placeholder="Description"
                rows={2}
                className="flex-1 rounded-md border border-stone-300/20 bg-stone-900/40 px-3 py-2 text-sm text-stone-100"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-md border border-stone-400/40 px-2 py-2 text-xs text-stone-200"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-xs text-stone-400">No entries yet. Add one to keep details handy.</p>
        )}
      </div>
    </div>
  )
}
