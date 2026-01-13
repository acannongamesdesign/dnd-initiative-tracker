import { useEffect, useState } from 'react'
import { db } from '../db/db'

export const useTable = <T,>(query: () => Promise<T>, deps: unknown[] = []) => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const result = await query()
        if (active) setData(result)
      } catch (err) {
        if (active) setError(err as Error)
      }
    }
    run()
    const handler = () => {
      run()
    }
    db.on('changes', handler)
    return () => {
      active = false
      db.on('changes').unsubscribe(handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error }
}
