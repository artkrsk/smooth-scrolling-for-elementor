/**
 * Inline pre-paint gate — printed into `wp_head` by PHP, never enqueued,
 * with the options global and boot descriptor printed just before it in the
 * same script tag so both are readable synchronously. Owns the parse-time
 * discovery global and the <html> class prediction, then injects the engine
 * bundle immediately (editor preview, unrestricted media, or an
 * already-matching media query) or on the first matching `matchMedia`
 * change otherwise. The engine corrects the prediction at real init
 * (domState).
 */

import type { IGateGlobal, ISmoothScrolling } from './interfaces'

// Idempotence: a second print (double-wp_head themes) or a replayed inline
// script (AJAX-transition eval paths) must not clobber the live global.
if (!window.artsSmoothScrolling) {
  let resolveReady: (controller: ISmoothScrolling) => void
  const ready = new Promise<ISmoothScrolling>((resolve) => {
    resolveReady = resolve
  })
  const gate: IGateGlobal = {
    ready,
    get: () => null,
    get lenis() {
      return null
    },
    version: __ARTS_SMOOTH_SCROLLING_VERSION__,
    __resolveReady: (controller) => resolveReady(controller)
  }
  window.artsSmoothScrolling = gate

  const html = document.documentElement
  const predict = (active: boolean) => {
    html.classList.toggle('has-smooth-scroll', active)
    html.classList.toggle('no-smooth-scroll', !active)
  }

  const options = window.artsSmoothScrollingOptions
  const boot = window.artsSmoothScrollingBoot

  // A partially stripped inline print (optimizer, filter) degrades to "no
  // smooth scroll" instead of throwing on undefined options/boot.
  if (!options || !boot) {
    predict(false)
  } else {
    const { matchMedia: query } = options
    const matchesNow = query === '' || window.matchMedia(query).matches
    predict(matchesNow)

    const inject = () => {
      if (document.getElementById('smooth-scrolling-for-elementor-js')) {
        return
      }
      const script = document.createElement('script')
      script.id = 'smooth-scrolling-for-elementor-js'
      script.src = boot.js
      script.onerror = () => predict(false)
      document.head.appendChild(script)
    }

    if (boot.editor || matchesNow) {
      inject()
    } else {
      // matchesNow is only false when query is non-empty, so this is real.
      const mql = window.matchMedia(query)
      const onChange = (event: MediaQueryListEvent) => {
        predict(event.matches)
        if (event.matches) {
          mql.removeEventListener('change', onChange)
          inject()
        }
      }
      mql.addEventListener('change', onChange)
    }
  }
}
