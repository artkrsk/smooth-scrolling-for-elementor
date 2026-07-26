// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * suppressElementorAnchors() unbinds Elementor's classic anchor animator so
 * it doesn't double-fire against Lenis on the same click. `hasRun` is a
 * module-level once-per-page guard, so — like boot.ts/gate.ts, the other
 * side-effect-guarded modules in this codebase — every test resets the
 * module registry and re-imports fresh.
 */

const SELECTOR = 'a[href*="#"]:not([href="#"])'

const loadCompat = async () => {
  vi.resetModules()
  const mod = await import('@ts/core/elementorCompat')
  return mod.suppressElementorAnchors
}

const fakeAnchorsModule = () => ({
  getSettings: vi.fn((key: string) => (key === 'selectors.links' ? SELECTOR : '')),
  handleAnchorLinks: () => {}
})

const fakeElementorFrontend = (anchors: ReturnType<typeof fakeAnchorsModule> | undefined) => ({
  utils: { anchors },
  elements: { $document: { off: vi.fn(), on: vi.fn() } }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('when elementorFrontend.utils.anchors is present', () => {
  it('unbinds by the exact selector and handler references', async () => {
    const anchors = fakeAnchorsModule()
    const elementorFrontend = fakeElementorFrontend(anchors)
    vi.stubGlobal('elementorFrontend', elementorFrontend)

    const suppressElementorAnchors = await loadCompat()
    suppressElementorAnchors()

    expect(anchors.getSettings).toHaveBeenCalledWith('selectors.links')
    expect(elementorFrontend.elements.$document.off).toHaveBeenCalledExactlyOnceWith(
      'click',
      SELECTOR,
      anchors.handleAnchorLinks
    )
  })
})

describe('when elementorFrontend is not ready yet', () => {
  it('defers via jQuery(window).on and unbinds once the event fires', async () => {
    let deferredHandler: (() => void) | undefined
    const jQueryObject = {
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'elementor/frontend/init') {
          deferredHandler = handler
        }
      })
    }
    const jQuery = vi.fn(() => jQueryObject)
    vi.stubGlobal('jQuery', jQuery)

    const suppressElementorAnchors = await loadCompat()
    suppressElementorAnchors()

    expect(jQuery).toHaveBeenCalledExactlyOnceWith(window)
    expect(jQueryObject.on).toHaveBeenCalledExactlyOnceWith(
      'elementor/frontend/init',
      expect.any(Function)
    )

    const anchors = fakeAnchorsModule()
    const elementorFrontend = fakeElementorFrontend(anchors)
    vi.stubGlobal('elementorFrontend', elementorFrontend)
    deferredHandler?.()

    expect(elementorFrontend.elements.$document.off).toHaveBeenCalledExactlyOnceWith(
      'click',
      SELECTOR,
      anchors.handleAnchorLinks
    )
  })
})

describe('clean no-op', () => {
  it('does nothing when jQuery is absent (and elementorFrontend is absent)', async () => {
    const suppressElementorAnchors = await loadCompat()

    expect(() => suppressElementorAnchors()).not.toThrow()
  })

  it('does nothing when elementorFrontend is absent and never arrives', async () => {
    const jQueryObject = { on: vi.fn() }
    const jQuery = vi.fn(() => jQueryObject)
    vi.stubGlobal('jQuery', jQuery)

    const suppressElementorAnchors = await loadCompat()

    expect(() => suppressElementorAnchors()).not.toThrow()
    expect(jQueryObject.on).toHaveBeenCalledExactlyOnceWith(
      'elementor/frontend/init',
      expect.any(Function)
    )
  })
})

describe('when elementorFrontend exists but utils.anchors is not populated yet', () => {
  it('arms the deferred jQuery listener instead of latching a permanent miss, then unbinds once anchors appear', async () => {
    // Covers the race between elementorFrontend being assigned (frontend.js
    // parse) and utils.anchors being populated (its own ready-init) — the
    // immediate unbind must not be the only attempt, or a run() landing in
    // that window would permanently miss the unbind for the whole page.
    const elementorFrontend = fakeElementorFrontend(undefined)
    vi.stubGlobal('elementorFrontend', elementorFrontend)

    let deferredHandler: (() => void) | undefined
    const jQueryObject = {
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'elementor/frontend/init') {
          deferredHandler = handler
        }
      })
    }
    const jQuery = vi.fn(() => jQueryObject)
    vi.stubGlobal('jQuery', jQuery)

    const suppressElementorAnchors = await loadCompat()
    suppressElementorAnchors()

    expect(elementorFrontend.elements.$document.off).not.toHaveBeenCalled()
    expect(jQueryObject.on).toHaveBeenCalledExactlyOnceWith(
      'elementor/frontend/init',
      expect.any(Function)
    )

    const anchors = fakeAnchorsModule()
    elementorFrontend.utils.anchors = anchors
    deferredHandler?.()

    expect(elementorFrontend.elements.$document.off).toHaveBeenCalledExactlyOnceWith(
      'click',
      SELECTOR,
      anchors.handleAnchorLinks
    )
  })
})

describe('once-per-page guard', () => {
  it('unbinds only once across repeated calls (simulating repeated run() cycles)', async () => {
    const anchors = fakeAnchorsModule()
    const elementorFrontend = fakeElementorFrontend(anchors)
    vi.stubGlobal('elementorFrontend', elementorFrontend)

    const suppressElementorAnchors = await loadCompat()
    suppressElementorAnchors()
    suppressElementorAnchors()
    suppressElementorAnchors()

    expect(elementorFrontend.elements.$document.off).toHaveBeenCalledOnce()
  })

  it('registers the deferred jQuery listener only once across repeated calls', async () => {
    const jQueryObject = { on: vi.fn() }
    const jQuery = vi.fn(() => jQueryObject)
    vi.stubGlobal('jQuery', jQuery)

    const suppressElementorAnchors = await loadCompat()
    suppressElementorAnchors()
    suppressElementorAnchors()

    expect(jQuery).toHaveBeenCalledOnce()
  })
})
