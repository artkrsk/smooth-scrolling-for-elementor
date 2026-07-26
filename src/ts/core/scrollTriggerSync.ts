import type Lenis from 'lenis'

/** Keeps ScrollTrigger's cached scroll position in sync with Lenis on every
    scroll frame. Optional-chained per event: free when ScrollTrigger is
    absent, and tolerates it loading after the engine (unlike v1, which never
    retried). */
export function syncScrollTrigger(lenis: Lenis): () => void {
  return lenis.on('scroll', () => {
    window.ScrollTrigger?.update()
  })
}
