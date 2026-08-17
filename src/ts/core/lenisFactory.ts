import type { ScrollToOptions } from 'lenis'
import Lenis from 'lenis'
import type { TAnchorsOptions, TOptions } from '../types'
import { resolveEasing } from './easings'

/** Resolves a derived anchors block into the shape Lenis's `anchors`
    constructor option (and topAnchors.ts's `scrollTo()` calls) can use
    directly. An unresolved easing name omits the key so Lenis falls back to
    the main resolved easing. */
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
  const { duration, easing, anchors } = options.lenisOptions
  const easingFn = resolveEasing(easing)

  return new Lenis({
    autoRaf: false,
    stopInertiaOnNavigate: true,
    prevent: (node) => node.closest('.dialog-prevent-scroll') !== null,
    duration,
    ...(easingFn ? { easing: easingFn } : {}),
    anchors: resolveAnchorsOptions(anchors)
  })
}
