import type { ScrollToOptions } from 'lenis'
import Lenis from 'lenis'
import type { TAnchorsOptions, TOptions } from '../types'
import { resolveEasing } from './easings'

/** Resolves a derived anchors block into the `scrollTo()` options
    anchors.ts passes to Lenis. An unresolved easing name omits the key so
    Lenis falls back to the main resolved easing. */
export function resolveAnchorsOptions(anchors: TAnchorsOptions): ScrollToOptions {
  const easing = resolveEasing(anchors.easing)
  return {
    offset: anchors.offset,
    immediate: anchors.immediate,
    lock: anchors.lock,
    force: anchors.force,
    duration: anchors.duration,
    ...(easing ? { easing } : {})
  }
}

/** Merges the fixed base options (never exposed to PHP) under the
    PHP-derived `lenisOptions`, resolves easing names, and constructs the
    Lenis instance. */
export function createLenis(options: TOptions): Lenis {
  const { duration, easing } = options.lenisOptions
  const easingFn = resolveEasing(easing)

  return new Lenis({
    autoRaf: false,
    stopInertiaOnNavigate: true,
    prevent: (node) => node.closest('.dialog-prevent-scroll') !== null,
    // A wheel an embed consumed (a map's modifier-zoom, a 3D viewer) is prevented before it bubbles
    // to Lenis's window listener, which stops native scrolling but not Lenis's own scrollTo
    virtualScroll: ({ event }) => !(event.type === 'wheel' && event.defaultPrevented),
    duration,
    ...(easingFn ? { easing: easingFn } : {}),
    // anchors.ts owns anchor clicks — Lenis's own listener ignores defaultPrevented
    anchors: false
  })
}
