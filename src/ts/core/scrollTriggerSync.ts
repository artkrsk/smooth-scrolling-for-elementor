import type Lenis from 'lenis'
import type { IScrollTrigger } from '../interfaces'

/** Keeps ScrollTrigger's cached scroll position in sync with Lenis on every
    scroll frame. Optional-chained per event: free when ScrollTrigger is
    absent, and tolerates it loading after the engine (unlike v1, which never
    retried). */
export function syncScrollTrigger(lenis: Lenis): () => void {
  // Runtime-detected, never bundled: read via a local cast so this module
  // type-checks standalone for consumers who compile our source directly.
  const foreignWindow = window as Window & { ScrollTrigger?: IScrollTrigger }
  return lenis.on('scroll', () => {
    foreignWindow.ScrollTrigger?.update()
  })
}
