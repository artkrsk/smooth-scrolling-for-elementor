import type Lenis from 'lenis'
import type { ScrollToOptions } from 'lenis'

const isCurrentDocument = (url: URL): boolean =>
  url.host === window.location.host && url.pathname === window.location.pathname

/**
 * Delegated click listener covering only the empty-hash anchor forms Lenis's
 * native `anchors` handler ignores (it requires a truthy hash): bare `#`
 * always scrolls to top; `/#` and `./#` do so only when they resolve to the
 * current page (otherwise the browser navigates away natively). No
 * `preventDefault` (v1 parity). `#top` is deliberately NOT handled here —
 * Lenis's own `scrollTo` already special-cases `#top` to 0 when no
 * `id="top"` element exists.
 */
export function createTopAnchors(lenis: Lenis, anchorsOptions: ScrollToOptions): () => void {
  const onClick = (event: MouseEvent) => {
    const anchor = event
      .composedPath()
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && !!node.href)
    if (!anchor) {
      return
    }

    const href = anchor.getAttribute('href')
    if (href === '#') {
      lenis.scrollTo(0, anchorsOptions)
      return
    }
    if ((href === '/#' || href === './#') && isCurrentDocument(new URL(anchor.href))) {
      lenis.scrollTo(0, anchorsOptions)
    }
  }

  window.addEventListener('click', onClick)
  return () => window.removeEventListener('click', onClick)
}
