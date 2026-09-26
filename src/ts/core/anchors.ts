import type Lenis from 'lenis'
import type { ScrollToOptions } from 'lenis'

/** Foreign globals read here, typed at the read site (see global.d.ts).
    `ARTS_HS.getScrollTop` is Arts Horizontal Scroll's public answer to "which
    document scrollY puts this target's panel on stage" — null outside a
    measured, horizontally scrubbing section. */
type TForeignWindow = Window & {
  ARTS_HS?: { getScrollTop?: (target: Element) => number | null }
  elementorFrontend?: { isEditMode?: () => boolean }
}

const isCurrentDocument = (url: URL): boolean =>
  url.host === window.location.host && url.pathname === window.location.pathname

const findAnchor = (event: MouseEvent): HTMLAnchorElement | undefined =>
  event
    .composedPath()
    .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && !!node.href)

// getElementById, not querySelector: an Elementor CSS ID is only trimmed, so
// "#123" or "#a.b" are valid targets but invalid selectors.
const resolveHashTarget = (hash: string): HTMLElement | null => {
  if (hash.length < 2) {
    return null
  }
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)))
  } catch {
    return null
  }
}

/**
 * Delegated anchor-click listener, owned here rather than by Lenis's native
 * `anchors` option: Lenis's listener ignores `defaultPrevented`, so it
 * overrode any script that had already taken an anchor click over — tabs
 * cancelling their `href`, a menu scrolling after it closes. A prevented
 * click is left alone.
 *
 * Same-page content hashes mirror Lenis's own match (host + pathname, truthy
 * hash) and hand the decoded hash to `scrollTo`, which also special-cases
 * `#top`. The empty-hash forms Lenis never handled: bare `#` always scrolls
 * to top; `/#` and `./#` do so only when they resolve to the current page
 * (otherwise the browser navigates away natively). No `preventDefault`
 * (Lenis and v1 parity).
 *
 * Links into Arts Horizontal Scroll panels are taken earlier, in capture:
 * every panel shares the pinned section's vertical position, so only that
 * plugin knows where one lands, and its own capture listener lands it with a
 * native smooth scroll — which a running Lenis animation (wheel inertia,
 * another scrollTo) overwrites on its next frame, so the click looked
 * ignored. Its eligibility rules are mirrored, and it stands down on the
 * prevented click.
 */
export function createAnchors(lenis: Lenis, anchorsOptions: ScrollToOptions): () => void {
  const onPanelClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    const foreign = window as TForeignWindow
    // Arts Horizontal Scroll keeps canvas scrolling out of the editor preview.
    if (foreign.elementorFrontend?.isEditMode?.()) {
      return
    }
    const anchor = findAnchor(event)
    if (!anchor || anchor.target !== '') {
      return
    }
    const url = new URL(anchor.href)
    if (!isCurrentDocument(url) || url.search !== window.location.search) {
      return
    }
    const target = resolveHashTarget(url.hash)
    const top = target ? foreign.ARTS_HS?.getScrollTop?.(target) : null
    if (typeof top !== 'number') {
      return
    }
    event.preventDefault()
    // pushState, not location.hash: a hash assignment starts a native
    // fragment scroll toward the section top.
    history.pushState(null, '', url.hash)
    lenis.scrollTo(top, anchorsOptions)
  }

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) {
      return
    }

    const anchor = findAnchor(event)
    if (!anchor) {
      return
    }

    const href = anchor.getAttribute('href')
    if (href === '#') {
      lenis.scrollTo(0, anchorsOptions)
      return
    }

    const url = new URL(anchor.href)
    if (!isCurrentDocument(url)) {
      return
    }
    if (href === '/#' || href === './#') {
      lenis.scrollTo(0, anchorsOptions)
      return
    }
    if (url.hash) {
      lenis.scrollTo(decodeURIComponent(url.hash), anchorsOptions)
    }
  }

  window.addEventListener('click', onPanelClick, { capture: true })
  window.addEventListener('click', onClick)
  return () => {
    window.removeEventListener('click', onPanelClick, { capture: true })
    window.removeEventListener('click', onClick)
  }
}
