// @vitest-environment happy-dom

import { createAnchors } from '@ts/core/anchors'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createFakeLenis } from '../support'

/**
 * Same-page content hashes go to `scrollTo` decoded, as Lenis's native
 * handler did. The empty-hash forms: bare `#` always scrolls to top; `/#` and
 * `./#` do so only when they resolve to the current page — otherwise the
 * browser is left to navigate natively. A click some other script already
 * prevented is never touched.
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
    remove = createAnchors(lenis as never, anchorsOptions)
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
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '/#')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(0, anchorsOptions)
  })

  it('does nothing (lets the browser navigate) when the path differs', () => {
    // Currently on /blog/post-1/ — "/#" resolves to the site root, a
    // different page, so this must NOT trigger a same-page scroll.
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '/#')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })

  it('resolves "./#" relative to the current directory', () => {
    window.location.href = 'https://example.com/blog/post-1/'
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', './#')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(0, anchorsOptions)
  })
})

describe('same-page content hashes', () => {
  it('scrolls to the decoded hash, including #top', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '#caf%C3%A9')
    const top = document.createElement('a')
    top.setAttribute('href', '#top')
    document.body.append(a, top)

    click(a)
    click(top)

    expect(lenis.scrollTo).toHaveBeenNthCalledWith(1, '#café', anchorsOptions)
    expect(lenis.scrollTo).toHaveBeenNthCalledWith(2, '#top', anchorsOptions)
  })

  it('matches an absolute URL pointing at the current page', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', 'https://example.com/blog/post-1/#section')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith('#section', anchorsOptions)
  })

  it('ignores a hash on another page — the browser navigates', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '/about/#team')
    document.body.appendChild(a)

    click(a)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })
})

describe('a click another script already prevented', () => {
  it.each(['#section', '#'])('is left alone (%s)', (href) => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', href)
    document.body.appendChild(a)
    a.addEventListener('click', (event) => event.preventDefault())

    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })
})

describe('links into Arts Horizontal Scroll panels', () => {
  const foreign = window as Window & {
    ARTS_HS?: { getScrollTop?: (target: Element) => number | null }
    elementorFrontend?: { isEditMode?: () => boolean }
  }

  /** A panel target HS places at scrollY 1234, and a link to it. */
  const panelLink = (href = '#panel') => {
    const panel = document.createElement('div')
    panel.id = 'panel'
    const a = document.createElement('a')
    a.setAttribute('href', href)
    document.body.append(panel, a)
    foreign.ARTS_HS = { getScrollTop: (target) => (target === panel ? 1234 : null) }
    return a
  }

  const cancelableClick = (el: Element, init: MouseEventInit = {}) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init })
    el.dispatchEvent(event)
    return event
  }

  afterEach(() => {
    delete foreign.ARTS_HS
    delete foreign.elementorFrontend
  })

  it('lands the panel through Lenis and takes the click over', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = panelLink()

    const event = cancelableClick(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith(1234, anchorsOptions)
    expect(event.defaultPrevented).toBe(true)
    expect(window.location.hash).toBe('#panel')
  })

  it('takes it before a document capture listener sees it', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = panelLink()
    let seenPrevented: boolean | undefined
    const probe = (event: Event) => {
      seenPrevented = event.defaultPrevented
    }
    document.addEventListener('click', probe, { capture: true })

    cancelableClick(a)
    document.removeEventListener('click', probe, { capture: true })

    expect(seenPrevented).toBe(true)
  })

  it('leaves a target HS cannot place to the regular path', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    panelLink()
    const other = document.createElement('a')
    other.setAttribute('href', '#elsewhere')
    document.body.appendChild(other)

    const event = cancelableClick(other)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith('#elsewhere', anchorsOptions)
    expect(event.defaultPrevented).toBe(false)
  })

  it('uses the regular path when HS is not on the page', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = panelLink()
    delete foreign.ARTS_HS

    cancelableClick(a)

    expect(lenis.scrollTo).toHaveBeenCalledExactlyOnceWith('#panel', anchorsOptions)
  })

  it('stays out of the Elementor editor preview', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = panelLink()
    foreign.elementorFrontend = { isEditMode: () => true }

    const event = cancelableClick(a)

    expect(event.defaultPrevented).toBe(false)
    expect(lenis.scrollTo).not.toHaveBeenCalledWith(1234, anchorsOptions)
  })

  it('leaves modified clicks and other windows to the browser', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = panelLink()
    const blank = panelLink()
    blank.target = '_blank'

    expect(cancelableClick(a, { metaKey: true }).defaultPrevented).toBe(false)
    expect(cancelableClick(blank).defaultPrevented).toBe(false)
    expect(lenis.scrollTo).not.toHaveBeenCalledWith(1234, anchorsOptions)
  })
})

describe('non-anchor clicks', () => {
  it('ignores clicks on non-anchor elements', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
    const div = document.createElement('div')
    document.body.appendChild(div)

    click(div)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })
})

describe('no preventDefault', () => {
  it('leaves the click event free for the browser to also handle', () => {
    remove = createAnchors(lenis as never, anchorsOptions)
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
    remove = createAnchors(lenis as never, anchorsOptions)
    const a = document.createElement('a')
    a.setAttribute('href', '#')
    document.body.appendChild(a)

    remove()
    click(a)

    expect(lenis.scrollTo).not.toHaveBeenCalled()
  })
})
