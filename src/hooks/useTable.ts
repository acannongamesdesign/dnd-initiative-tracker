import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

export const useTable = <T,>(query: () => Promise<T>, deps: unknown[] = []) => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const observable = liveQuery(query)
    const subscription = observable.subscribe({
      next: (result) => setData(result),
      error: (err) => setError(err as Error),
    })
    return () => {
      subscription.unsubscribe()
    }
  }, deps)

  return { data, error }
}
