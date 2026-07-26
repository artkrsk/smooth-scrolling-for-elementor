// @vitest-environment happy-dom

import { createTopAnchors } from '@ts/core/topAnchors'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createFakeLenis } from '../support'

/**
 * Covers only the empty-hash anchor forms Lenis's native `anchors` handler
 * ignores (it requires a truthy hash): bare `#` always scrolls to top; `/#`
 * and `./#` do so only when they resolve to the current page — otherwise the
 * browser is left to navigate natively. `#top` is deliberately NOT handled
 * here (Lenis's own scrollTo already special-cases it).
 */

const anchorsOptions = { offset: 0, immediate: false, lock: false, force: true }

const click = (el: Element) => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

let lenis: ReturnType<typeof createFakeLenis>
let remove: () => void

beforeEach(() => {
  document.body.innerHTML = ''
  window.location.href = 'https://example.com/blog/post-1/'
  lenis = createFakeLenis()
})

afterEach(() => {
  remove?.()
})

describe('bare #', () => {
  it('always scrolls to top, regardless of current path', () => {
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '#')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(0, anchorsOptions)
  })
})

describe('/# and ./#', () => {
  it('scrolls to top when the resolved URL matches the current page', () => {
    window.location.href = 'https://example.com/'
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '/#')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(0, anchorsOptions)
  })

  it('does nothing (lets the browser navigate) when the path differs', () => {
    // Currently on /blog/post-1/ — "/#" resolves to the site root, a
    // different page, so this must NOT trigger a same-page scroll.
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '/#')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })

  it('resolves "./#" relative to the current directory', () => {
    window.location.href = 'https://example.com/blog/post-1/'
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', './#')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(0, anchorsOptions)
  })
})

describe('forms this listener does not own', () => {
  it('ignores #top — Lenis native scrollTo already special-cases it', () => {
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '#top')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })

  it('ignores a plain content hash — Lenis native anchors owns that', () => {
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '#section')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })

  it('ignores clicks on non-anchor elements', () => {
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const div = document.createElement('div')
    document.body.appendChild(div)

    click(div)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })
})

describe('no preventDefault', () => {
  it('leaves the click event free for the browser to also handle', () => {
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '#')
    document.body.appendChild(a)
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })

    a.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})

describe('teardown', () => {
  it('removes the delegated listener', () => {
    remove = createTopAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '#')
    document.body.appendChild(a)

    remove()
    click(a)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })
})
