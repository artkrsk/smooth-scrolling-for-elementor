import type Lenis from 'lenis'
import type { IRafDriver, ISmoothScrolling } from '../interfaces'
import type { TOptions } from '../types'
import { applyDomState } from './domState'
import { suppressElementorAnchors } from './elementorCompat'
import { createLenis, resolveAnchorsOptions } from './lenisFactory'
import { createRafDriver } from './rafDriver'
import { syncScrollTrigger } from './scrollTriggerSync'
import { createTopAnchors } from './topAnchors'

/**
 * Owns the engine lifecycle: creates/destroys Lenis (plus its driver, sync,
 * and anchor listener) as `enabled` and the `matchMedia` query dictate.
 * `lifecycle` doubles as the synchronous reentrancy guard — `init()`/
 * `destroy()` while already initialized/torn down are no-ops rather than
 * queued (no v1 async queue).
 */
export function createSmoothScrolling(options: TOptions): ISmoothScrolling {
  let currentOptions = options
  let lifecycle: AbortController | null = null
  let lenis: Lenis | null = null
  let driver: IRafDriver | null = null
  let unsyncScrollTrigger: (() => void) | null = null
  let removeTopAnchors: (() => void) | null = null

  const run = () => {
    lenis = createLenis(currentOptions)
    driver = createRafDriver(lenis, currentOptions.prefersGSAPRaf)
    unsyncScrollTrigger = syncScrollTrigger(lenis)
    removeTopAnchors = createTopAnchors(
      lenis,
      resolveAnchorsOptions(currentOptions.lenisOptions.anchors)
    )
    suppressElementorAnchors()
    applyDomState(true)
  }

  const teardown = () => {
    removeTopAnchors?.()
    removeTopAnchors = null
    unsyncScrollTrigger?.()
    unsyncScrollTrigger = null
    driver?.stop()
    driver = null
    lenis?.destroy()
    lenis = null
    applyDomState(false)
  }

  const api: ISmoothScrolling = {
    init() {
      if (lifecycle) {
        return
      }
      lifecycle = new AbortController()

      if (!currentOptions.enabled) {
        applyDomState(false)
        return
      }

      if (currentOptions.matchMedia === '') {
        run()
        return
      }

      const mql = window.matchMedia(currentOptions.matchMedia)
      mql.addEventListener(
        'change',
        (event) => {
          if (event.matches) {
            run()
          } else {
            teardown()
          }
        },
        { signal: lifecycle.signal }
      )

      if (mql.matches) {
        run()
      } else {
        applyDomState(false)
      }
    },

    destroy() {
      if (!lifecycle) {
        return
      }
      lifecycle.abort()
      lifecycle = null
      teardown()
    },

    reinit(nextOptions) {
      api.destroy()
      currentOptions = nextOptions
      api.init()
    },

    get lenis() {
      return lenis
    }
  }

  return api
}
