// @vitest-environment happy-dom

import { createRafDriver } from '@ts/core/rafDriver'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeLenis } from '../support'

/**
 * Two frame sources, chosen at creation time: GSAP's ticker when present and
 * allowed, otherwise an internal rAF loop. Both must feed `lenis.raf()`
 * milliseconds — the ticker gives seconds, the internal loop already gives ms.
 */

type FakeTicker = {
  add: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  lagSmoothing: ReturnType<typeof vi.fn>
}

const fakeGsap = (): FakeTicker => ({
  add: vi.fn(),
  remove: vi.fn(),
  lagSmoothing: vi.fn()
})

const fakeRaf = () => {
  let nextHandle = 1
  const pending = new Map<number, FrameRequestCallback>()
  const cancelled: number[] = []

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const handle = nextHandle++
    pending.set(handle, cb)
    return handle
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    cancelled.push(handle)
    pending.delete(handle)
  })

  return {
    get armed() {
      return pending.size
    },
    cancelled,
    frame(now: number) {
      const due = [...pending.values()]
      pending.clear()
      for (const cb of due) {
        cb(now)
      }
    }
  }
}

let raf: ReturnType<typeof fakeRaf>

beforeEach(() => {
  raf = fakeRaf()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GSAP ticker branch', () => {
  it('adds a prioritized ticker callback and enables lagSmoothing(0) once', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    const lenis = createFakeLenis()

    createRafDriver(lenis as never, true)

    expect(gsap.add).toHaveBeenCalledOnce()
    expect(gsap.add.mock.calls[0]?.[1]).toBe(false)
    expect(gsap.add.mock.calls[0]?.[2]).toBe(true)
    expect(gsap.lagSmoothing).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('converts the ticker seconds into milliseconds for lenis.raf', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    const lenis = createFakeLenis()

    createRafDriver(lenis as never, true)
    const update = gsap.add.mock.calls[0]?.[0] as (t: number) => void
    update(1.5)

    expect(lenis.raf).toHaveBeenCalledExactlyOnceWith(1500)
  })

  it('removes the exact callback reference it added, on stop', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    const lenis = createFakeLenis()

    const driver = createRafDriver(lenis as never, true)
    const added = gsap.add.mock.calls[0]?.[0]
    driver.stop()

    expect(gsap.remove).toHaveBeenCalledExactlyOnceWith(added)
  })

  it('does not touch requestAnimationFrame when the ticker is used', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    const lenis = createFakeLenis()

    createRafDriver(lenis as never, true)

    expect(raf.armed).toBe(0)
  })
})

describe('internal rAF branch', () => {
  it('is used when prefersGSAPRaf is false, even with gsap present', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    const lenis = createFakeLenis()

    createRafDriver(lenis as never, false)

    expect(gsap.add).not.toHaveBeenCalled()
    expect(raf.armed).toBe(1)
  })

  it('is used when window.gsap is absent', () => {
    const lenis = createFakeLenis()

    createRafDriver(lenis as never, true)

    expect(raf.armed).toBe(1)
  })

  it('passes the rAF timestamp straight through, unmodified', () => {
    const lenis = createFakeLenis()
    createRafDriver(lenis as never, true)

    raf.frame(1234)

    expect(lenis.raf).toHaveBeenCalledExactlyOnceWith(1234)
  })

  it('keeps looping frame after frame', () => {
    const lenis = createFakeLenis()
    createRafDriver(lenis as never, true)

    raf.frame(16)
    raf.frame(32)

    expect(lenis.raf).toHaveBeenNthCalledWith(1, 16)
    expect(lenis.raf).toHaveBeenNthCalledWith(2, 32)
  })

  it('cancels the pending frame on stop', () => {
    const lenis = createFakeLenis()
    const driver = createRafDriver(lenis as never, true)

    driver.stop()

    expect(raf.cancelled).toHaveLength(1)
    expect(raf.armed).toBe(0)
  })
})
