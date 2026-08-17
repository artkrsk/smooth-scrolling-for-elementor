import type { IElementorFrontend, IJQueryStatic } from '../interfaces'

/** Guards suppressElementorAnchors() so its detect+unbind path runs once per
    page load — repeated controller run() cycles (media flips, editor
    reinits) must not re-execute the unbind or stack a second deferred
    listener. */
let hasRun = false

/** Unbinds Elementor's classic anchor animator by the exact selector and
    handler reference it bound with. Returns whether the unbind actually
    happened — false (never throws) on any shape that doesn't match, which
    covers every Elementor new enough to have dropped the module as well as
    the window between `elementorFrontend` existing and `utils.anchors` being
    populated. */
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
 * Elementor's classic JS anchor animator binds its own document-level click
 * delegate and animates `scrollTop` with jQuery — it fires before Lenis's
 * window-bubble listener and doesn't stop propagation, so both animations run
 * on the same click. No server-side setting or filter disables it, so this
 * unbinds it by reference instead.
 *
 * A legacy path by now: Elementor dropped `utils.anchors` between 3.25.9 and
 * 3.28.3 for `utils.anchor_scroll_margin`, which only sets `scroll-margin-top`
 * and binds no click handler at all — and even 3.25.9 kept the module behind
 * the immutable, always-on `e_css_smooth_scroll` experiment, so it was already
 * unreachable there. This is a no-op on any current Elementor; it stays for
 * installs old enough to still construct the module.
 *
 * One-way: once unbound, non-Lenis states (touch devices post-media-flip,
 * disabled) degrade to native hash jumps, still smoothed by Elementor's own
 * `scroll-behavior: smooth` CSS.
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
