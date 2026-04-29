import { useEffect, useState } from 'react'

/** Reactive media-query hook. Returns true when the query matches. */
export function useMediaQuery(query: string): boolean {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  const [matches, setMatches] = useState(get)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler() /* sync once on mount in case SSR start state was wrong */
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** True when viewport ≥ 1024px (laptop/desktop). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
