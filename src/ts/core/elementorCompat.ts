import type { IElementorFrontend } from '../interfaces'

/** Guards suppressElementorAnchors() so its detect+unbind path runs once per
    page load — repeated controller run() cycles (media flips, editor
    reinits) must not re-execute the unbind or stack a second deferred
    listener. */
let hasRun = false

/** Unbinds Elementor's classic anchor animator by the exact selector and
    handler reference it bound with. No-op (never throws) on any shape that
    doesn't match — including current Elementor trunk, which no longer wires
    the module in at all. */
const unbindAnchors = (elementorFrontend: IElementorFrontend): void => {
  const anchors = elementorFrontend.utils?.anchors
  const $document = elementorFrontend.elements?.$document
  if (!$document || !anchors?.getSettings || !anchors.handleAnchorLinks) {
    return
  }

  $document.off('click', anchors.getSettings('selectors.links'), anchors.handleAnchorLinks)
}

/**
 * Elementor's classic JS anchor animator (on the Elementor versions that
 * still ship it) binds its own document-level click delegate and animates
 * `scrollTop` with jQuery — it fires before Lenis's window-bubble listener
 * and doesn't stop propagation, so both animations run on the same click. No
 * server-side setting or filter disables it, so this unbinds it by reference
 * instead. One-way: once unbound, non-Lenis states (touch devices
 * post-media-flip, disabled) degrade to native hash jumps, still smoothed by
 * Elementor's own `scroll-behavior: smooth` CSS.
 */
export function suppressElementorAnchors(): void {
  if (hasRun) {
    return
  }
  hasRun = true

  const elementorFrontend = window.elementorFrontend
  if (elementorFrontend) {
    unbindAnchors(elementorFrontend)
    return
  }

  const jQuery = window.jQuery
  if (!jQuery) {
    return
  }

  jQuery(window).on('elementor/frontend/init', () => {
    const frontend = window.elementorFrontend
    if (frontend) {
      unbindAnchors(frontend)
    }
  })
}
