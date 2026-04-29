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

/** True when the page is running as an installed PWA on iOS, where Safari
 *  hijacks OAuth redirects and the in-app Google sign-in flow gets stuck.
 *  We use this in the login screen to swap the Google button for Safari
 *  instructions instead of leading the user into the broken flow. */
export function useIsIosPwa(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return isIos && isStandalone
}
