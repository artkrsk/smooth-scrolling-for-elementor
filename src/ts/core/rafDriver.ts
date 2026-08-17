import type Lenis from 'lenis'
import type { IGsap, IRafDriver } from '../interfaces'

/**
 * Drives `lenis.raf(ms)` every frame. Prefers GSAP's ticker (prioritized,
 * ahead of GSAP's own tween render queue) when present and allowed;
 * otherwise runs an internal rAF loop.
 */
export function createRafDriver(lenis: Lenis, prefersGSAPRaf: boolean): IRafDriver {
  // Runtime-detected, never bundled: read via a local cast so this module
  // type-checks standalone for consumers who compile our source directly.
  const foreignWindow = window as Window & { gsap?: IGsap }
  const gsap = prefersGSAPRaf ? foreignWindow.gsap : undefined

  if (gsap) {
    const update = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(update, false, true)
    // Page-wide and one-way: there is a single GSAP ticker, so this disables
    // frame-drop catch-up for every animation on the page, and stop() does not
    // restore it. Only an explicit lagSmoothing(500, 33) does — calling it with
    // no arguments disables it again. Documented for integrators in
    // docs/developers.md.
    gsap.ticker.lagSmoothing(0)

    return {
      stop() {
        gsap.ticker.remove(update)
      }
    }
  }

  let frameId = 0
  const loop = (time: number) => {
    lenis.raf(time)
    frameId = requestAnimationFrame(loop)
  }
  frameId = requestAnimationFrame(loop)

  return {
    stop() {
      cancelAnimationFrame(frameId)
    }
  }
}
