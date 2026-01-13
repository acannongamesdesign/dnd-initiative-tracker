import { useMemo, useState } from 'react'

type TagInputProps = {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export const TagInput = ({ value, onChange, placeholder }: TagInputProps) => {
  const [draft, setDraft] = useState('')

  const tags = useMemo(() => value.filter((tag) => tag.trim().length > 0), [value])

  const addTag = () => {
    const next = draft
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    if (next.length === 0) return
    onChange([...new Set([...tags, ...next])])
    setDraft('')
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="rounded-full border border-stone-400/40 px-2 py-1 text-xs uppercase tracking-wide text-stone-200/90"
          onClick={() => onChange(tags.filter((item) => item !== tag))}
        >
          {tag}
        </button>
      ))}
      <div className="flex min-w-[200px] flex-1 items-center gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder ?? 'tags, separated by commas'}
          className="w-full rounded-md border border-stone-300/20 bg-stone-950/40 px-3 py-2 text-sm text-stone-100"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addTag()
            }
          }}
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-stone-900"
        >
          Add
        </button>
      </div>
    </div>
  )
}
