// @vitest-environment happy-dom

import { createRafDriver } from '@ts/core/rafDriver'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeLenis } from '../support'

/**
 * One clock, two frame sources. `lenis.raf()` always receives the document's
 * frame timestamp (`document.timeline.currentTime`), never GSAP's Date.now-
 * based ticker seconds. The driver starts on its own rAF loop and hands over
 * to GSAP's ticker on the first frame `window.gsap` exists, so load order
 * between the async engine and a deferred GSAP stops mattering.
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

type TickerCallback = (time: number, deltaTime: number, frame: number) => void

const addedCallback = (gsap: FakeTicker) => gsap.add.mock.calls[0]?.[0] as TickerCallback

/** happy-dom exposes `document.timeline` as a prototype getter; an own property
    shadows it and `Reflect.deleteProperty` in afterEach restores it. */
const stubFrameClock = (currentTime: number | null) => {
  Object.defineProperty(document, 'timeline', { configurable: true, value: { currentTime } })
}

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
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'timeline')
})

describe('GSAP present at creation', () => {
  it('adds one prioritized ticker callback and never requests a frame', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })

    createRafDriver(createFakeLenis() as never, true)

    expect(gsap.add).toHaveBeenCalledOnce()
    expect(gsap.add.mock.calls[0]?.[1]).toBe(false)
    expect(gsap.add.mock.calls[0]?.[2]).toBe(true)
    expect(raf.armed).toBe(0)
  })

  it('feeds lenis.raf the document frame clock, not the ticker seconds', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    stubFrameClock(1500)
    const lenis = createFakeLenis()

    createRafDriver(lenis as never, true)
    addedCallback(gsap)(2, 16, 1)

    expect(lenis.raf).toHaveBeenCalledExactlyOnceWith(1500)
  })

  it('falls back to performance.now() while the frame clock is null', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    stubFrameClock(null)
    vi.spyOn(performance, 'now').mockReturnValue(777)
    const lenis = createFakeLenis()

    createRafDriver(lenis as never, true)
    addedCallback(gsap)(2, 16, 1)

    expect(lenis.raf).toHaveBeenCalledExactlyOnceWith(777)
  })

  it('leaves GSAP lag smoothing alone', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })

    createRafDriver(createFakeLenis() as never, true)

    expect(gsap.lagSmoothing).not.toHaveBeenCalled()
  })

  it('removes the exact callback reference it added, on stop', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })

    const driver = createRafDriver(createFakeLenis() as never, true)
    driver.stop()

    expect(gsap.remove).toHaveBeenCalledExactlyOnceWith(addedCallback(gsap))
    expect(raf.cancelled).toHaveLength(0)
  })
})

describe('GSAP absent at creation', () => {
  it('runs its own rAF loop and feeds it the document frame clock', () => {
    stubFrameClock(1234)
    const lenis = createFakeLenis()
    createRafDriver(lenis as never, true)

    raf.frame(99)

    expect(lenis.raf).toHaveBeenCalledExactlyOnceWith(1234)
  })

  it('keeps looping frame after frame', () => {
    const lenis = createFakeLenis()
    createRafDriver(lenis as never, true)

    stubFrameClock(16)
    raf.frame(0)
    stubFrameClock(32)
    raf.frame(0)

    expect(lenis.raf).toHaveBeenNthCalledWith(1, 16)
    expect(lenis.raf).toHaveBeenNthCalledWith(2, 32)
    expect(raf.armed).toBe(1)
  })

  it('cancels the pending frame on stop', () => {
    const driver = createRafDriver(createFakeLenis() as never, true)

    driver.stop()

    expect(raf.cancelled).toHaveLength(1)
    expect(raf.armed).toBe(0)
  })

  it('hands over to the GSAP ticker on the first frame window.gsap exists', () => {
    stubFrameClock(16)
    const lenis = createFakeLenis()
    createRafDriver(lenis as never, true)
    raf.frame(0)
    expect(lenis.raf).toHaveBeenCalledTimes(1)

    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    raf.frame(0)

    expect(gsap.add).toHaveBeenCalledOnce()
    expect(gsap.add.mock.calls[0]?.[1]).toBe(false)
    expect(gsap.add.mock.calls[0]?.[2]).toBe(true)
    // The handover frame leaves the advance to the ticker and arms no new frame.
    expect(lenis.raf).toHaveBeenCalledTimes(1)
    expect(raf.armed).toBe(0)

    stubFrameClock(48)
    addedCallback(gsap)(3, 16, 2)
    expect(lenis.raf).toHaveBeenLastCalledWith(48)
  })

  it('stops a handed-over driver through the ticker, not cancelAnimationFrame', () => {
    const driver = createRafDriver(createFakeLenis() as never, true)
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })
    raf.frame(0)

    driver.stop()

    expect(gsap.remove).toHaveBeenCalledExactlyOnceWith(addedCallback(gsap))
    expect(raf.cancelled).toHaveLength(0)
  })
})

describe('prefersGSAPRaf: false', () => {
  it('keeps its own loop even when gsap is present or appears later', () => {
    const gsap = fakeGsap()
    vi.stubGlobal('gsap', { ticker: gsap })

    createRafDriver(createFakeLenis() as never, false)
    raf.frame(0)

    expect(gsap.add).not.toHaveBeenCalled()
    expect(raf.armed).toBe(1)
  })
})
