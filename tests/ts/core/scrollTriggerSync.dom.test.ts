// @vitest-environment happy-dom

import { syncScrollTrigger } from '@ts/core/scrollTriggerSync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeLenis } from '../support'

/**
 * ScrollTrigger's cached scroll position has to follow Lenis on every scroll
 * frame. Optional-chained per event so it costs nothing when ScrollTrigger is
 * absent, and tolerates it loading after the engine (unlike v1, which never
 * retried once).
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('when ScrollTrigger is present', () => {
  it('calls update() on every lenis scroll event', () => {
    const scrollTrigger = { update: vi.fn() }
    vi.stubGlobal('ScrollTrigger', scrollTrigger)
    const lenis = createFakeLenis()

    syncScrollTrigger(lenis as never)
    lenis.emit('scroll', lenis)
    lenis.emit('scroll', lenis)

    expect(scrollTrigger.update).toHaveBeenCalledTimes(2)
  })
})

describe('when ScrollTrigger is absent', () => {
  it('does not throw', () => {
    const lenis = createFakeLenis()

    syncScrollTrigger(lenis as never)

    expect(() => lenis.emit('scroll', lenis)).not.toThrow()
  })
})

describe('when ScrollTrigger loads after the engine', () => {
  it('picks it up on the next scroll event — no retry logic needed', () => {
    const lenis = createFakeLenis()
    syncScrollTrigger(lenis as never)

    const scrollTrigger = { update: vi.fn() }
    vi.stubGlobal('ScrollTrigger', scrollTrigger)
    lenis.emit('scroll', lenis)

    expect(scrollTrigger.update).toHaveBeenCalledOnce()
  })
})

describe('unsubscribe', () => {
  it('returns the unsubscribe function lenis.on gave it', () => {
    const lenis = createFakeLenis()

    const unsync = syncScrollTrigger(lenis as never)
    unsync()

    const scrollTrigger = { update: vi.fn() }
    vi.stubGlobal('ScrollTrigger', scrollTrigger)
    lenis.emit('scroll', lenis)

    expect(scrollTrigger.update).not.toHaveBeenCalled()
  })
})
