/**
 * Inline pre-paint gate — printed into `wp_head` by PHP, never enqueued,
 * with the options global and boot descriptor printed just before it in the
 * same script tag so both are readable synchronously. Owns the parse-time
 * discovery global and the <html> class prediction, then injects the
 * stylesheet followed by the engine bundle (editor preview, unrestricted
 * media, or an already-matching media query) or on the first matching
 * `matchMedia` change otherwise. The engine corrects the prediction at real
 * init (domState).
 */

import type Lenis from 'lenis'
import type { IGateGlobal, ISmoothScrolling } from './interfaces'

// Idempotence: a second print (double-wp_head themes) or a replayed inline
// script (AJAX-transition eval paths) must not clobber the live global.
if (!window.artsSmoothScrolling) {
  let resolveReady: (controller: ISmoothScrolling) => void
  const ready = new Promise<ISmoothScrolling>((resolve) => {
    resolveReady = resolve
  })

  // load() state: lenisClass is set once boot hands the class over, so a
  // consumer holding this gate object after boot replaces the global still
  // resolves instantly instead of re-injecting. loadPromise memoizes
  // concurrent callers onto one injection.
  let lenisClass: typeof Lenis | undefined
  let loadPromise: Promise<typeof Lenis> | undefined
  let settleLoad: (lenis: typeof Lenis) => void
  let failLoad: (error: Error) => void
  // Reassigned below once options/boot are known; stays the rejection when
  // the descriptor is absent (stripped inline print, plugin disabled).
  let loadImpl: () => Promise<typeof Lenis> = () =>
    Promise.reject(new Error('arts-smooth-scrolling: assets unavailable'))

  const gate: IGateGlobal = {
    ready,
    get: () => null,
    get lenis() {
      return null
    },
    version: __ARTS_SMOOTH_SCROLLING_VERSION__,
    load: () => loadImpl(),
    __resolveReady: (controller) => resolveReady(controller),
    __resolveLoad: (lenis) => {
      lenisClass = lenis
      settleLoad?.(lenis)
    }
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
      if (
        document.getElementById('smooth-scrolling-for-elementor-css') ||
        document.getElementById('smooth-scrolling-for-elementor-js')
      ) {
        return
      }
      const link = document.createElement('link')
      link.id = 'smooth-scrolling-for-elementor-css'
      link.rel = 'stylesheet'
      link.href = boot.css
      // Chained on purpose: Lenis can only add `.lenis` to <html> once its
      // required stylesheet is present, and a CSS 404 must stop the engine
      // from booting instead of running unstyled.
      link.onload = () => {
        // onload can fire more than once (a moved link re-fires it) — guard
        // against a second script tag.
        if (document.getElementById('smooth-scrolling-for-elementor-js')) {
          return
        }
        const script = document.createElement('script')
        script.id = 'smooth-scrolling-for-elementor-js'
        script.src = boot.js
        script.onerror = () => {
          predict(false)
          failLoad?.(new Error('arts-smooth-scrolling: failed to load engine script'))
        }
        document.head.appendChild(script)
      }
      link.onerror = () => {
        predict(false)
        failLoad?.(new Error('arts-smooth-scrolling: failed to load stylesheet'))
      }
      document.head.appendChild(link)
    }

    loadImpl = () => {
      if (lenisClass) {
        return Promise.resolve(lenisClass)
      }
      if (!loadPromise) {
        loadPromise = new Promise((resolve, reject) => {
          settleLoad = resolve
          failLoad = reject
        })
        inject()
      }
      return loadPromise
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
