import type { IElementorFrontend, IJQueryStatic } from '../interfaces'

/** Guards suppressElementorAnchors() so its detect+unbind path runs once per
    page load — repeated controller run() cycles (media flips, editor
    reinits) must not re-execute the unbind or stack a second deferred
    listener. */
let hasRun = false

/** Unbinds Elementor's classic anchor animator by the exact selector and
    handler reference it bound with. Returns whether the unbind actually
    happened — false (never throws) on any shape that doesn't match,
    including current Elementor trunk (no module at all) and the window
    between `elementorFrontend` existing and `utils.anchors` being populated. */
const unbindAnchors = (elementorFrontend: IElementorFrontend): boolean => {
  const anchors = elementorFrontend.utils?.anchors
  const $document = elementorFrontend.elements?.$document
  if (!$document || !anchors?.getSettings || !anchors.handleAnchorLinks) {
    return false
  }

  $document.off('click', anchors.getSettings('selectors.links'), anchors.handleAnchorLinks)
  return true
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

  // Runtime-detected, never bundled: read via a local cast so this module
  // type-checks standalone for consumers who compile our source directly.
  const foreignWindow = window as Window & {
    elementorFrontend?: IElementorFrontend
    jQuery?: IJQueryStatic
  }

  const elementorFrontend = foreignWindow.elementorFrontend
  if (elementorFrontend && unbindAnchors(elementorFrontend)) {
    return
  }

  const jQuery = foreignWindow.jQuery
  if (!jQuery) {
    return
  }

  jQuery(window).on('elementor/frontend/init', () => {
    const frontend = foreignWindow.elementorFrontend
    if (frontend) {
      unbindAnchors(frontend)
    }
  })
}
