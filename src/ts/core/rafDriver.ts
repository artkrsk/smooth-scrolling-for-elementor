import type Lenis from 'lenis'
import type { IGsap, IRafDriver } from '../interfaces'

/**
 * The current frame's timestamp on either drive path. GSAP's ticker `time` is
 * Date.now-based and jitters by a millisecond, which Lenis turns into uneven
 * scroll steps; the document timeline is the rAF clock itself. The fallback
 * shares its time origin (`currentTime` is null before the first frame),
 * unlike `time * 1000`, so no frame ever sees a delta across two clocks.
 */
const frameTime = (): number => {
  const now = document.timeline.currentTime
  return typeof now === 'number' ? now : performance.now()
}

/**
 * Drives `lenis.raf(ms)` every frame. GSAP's ticker is used for ordering only
 * (prioritized, ahead of GSAP's own tween render queue) when present and
 * allowed; the time always comes from the document's frame clock. GSAP
 * normally arrives deferred, after this async engine, so the driver runs its
 * own rAF loop until `window.gsap` exists and hands over on that frame.
 */
export function createRafDriver(lenis: Lenis, prefersGSAPRaf: boolean): IRafDriver {
  // Runtime-detected, never bundled: read via a local cast so this module
  // type-checks standalone for consumers who compile our source directly.
  const foreignWindow = window as Window & { gsap?: IGsap }
  const update = () => {
    lenis.raf(frameTime())
  }
  let ticker: IGsap['ticker'] | undefined
  let frameId = 0

  const adopt = (gsap: IGsap) => {
    ticker = gsap.ticker
    ticker.add(update, false, true)
  }
  // The handover frame leaves the advance to the ticker: Lenis is time-based,
  // so the next tick covers the gap, and the same clock on both paths keeps
  // the switch invisible to it.
  const loop = () => {
    const gsap = prefersGSAPRaf ? foreignWindow.gsap : undefined
    if (gsap) {
      adopt(gsap)
      return
    }
    update()
    frameId = requestAnimationFrame(loop)
  }

  if (prefersGSAPRaf && foreignWindow.gsap) {
    adopt(foreignWindow.gsap)
  } else {
    frameId = requestAnimationFrame(loop)
  }

  return {
    stop() {
      if (ticker) {
        ticker.remove(update)
      } else {
        cancelAnimationFrame(frameId)
      }
    }
  }
}
