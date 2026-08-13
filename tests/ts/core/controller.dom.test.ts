// @vitest-environment happy-dom

import { createSmoothScrolling } from '@ts/core/controller'
import type { ISmoothScrolling } from '@ts/interfaces'
import type { TOptions } from '@ts/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeMedia } from '../support'

/**
 * The composition root, exercised end to end against the REAL Lenis (happy-dom
 * provides the ResizeObserver it needs) — this is the one suite that proves
 * the modules wire together, not just that each one works in isolation.
 * matchMedia is faked per test that needs a controllable query; tests that
 * use matchMedia: '' need no stub at all.
 */

const options = (over: Partial<TOptions> = {}): TOptions => ({
  matchMedia: '',
  prefersGSAPRaf: true,
  lenisOptions: {
    duration: 1.2,
    easing: 'expo.out',
    anchors: {
      offset: 0,
      immediate: false,
      lock: false,
      force: true,
      easing: 'expo.inOut',
      duration: 0.96
    }
  },
  ...over
})

let engine: ISmoothScrolling | null = null

afterEach(() => {
  engine?.destroy()
  engine = null
  document.documentElement.className = ''
  vi.unstubAllGlobals()
})

describe('matchMedia empty string — always on', () => {
  it('runs immediately on init', () => {
    engine = createSmoothScrolling(options({ matchMedia: '' }))

    engine.init()

    expect(engine.lenis).not.toBeNull()
    expect(document.documentElement.classList.contains('has-smooth-scroll')).toBe(true)
  })
})

describe('matchMedia gate', () => {
  it('runs immediately when the query already matches', () => {
    fakeMedia(true)
    engine = createSmoothScrolling(options({ matchMedia: '(hover: hover)' }))

    engine.init()

    expect(engine.lenis).not.toBeNull()
  })

  it('stays idle (disabled DOM state) when the query does not match yet', () => {
    fakeMedia(false)
    engine = createSmoothScrolling(options({ matchMedia: '(hover: hover)' }))

    engine.init()

    expect(engine.lenis).toBeNull()
    expect(document.documentElement.classList.contains('no-smooth-scroll')).toBe(true)
  })

  it('creates the engine when the query starts matching', () => {
    const media = fakeMedia(false)
    engine = createSmoothScrolling(options({ matchMedia: '(hover: hover)' }))
    engine.init()

    media.flip()

    expect(engine.lenis).not.toBeNull()
    expect(document.documentElement.classList.contains('has-smooth-scroll')).toBe(true)
  })

  it('tears down the engine when the query stops matching (hybrid devices)', () => {
    const media = fakeMedia(true)
    engine = createSmoothScrolling(options({ matchMedia: '(hover: hover)' }))
    engine.init()
    expect(engine.lenis).not.toBeNull()

    media.flip()

    expect(engine.lenis).toBeNull()
    expect(document.documentElement.classList.contains('no-smooth-scroll')).toBe(true)
  })
})

describe('init reentrancy', () => {
  it('is idempotent — a second init() does not recreate the engine', () => {
    engine = createSmoothScrolling(options({ matchMedia: '' }))
    engine.init()
    const first = engine.lenis

    engine.init()

    expect(engine.lenis).toBe(first)
  })
})

describe('destroy', () => {
  it('tears everything down and restores the disabled DOM state', () => {
    engine = createSmoothScrolling(options({ matchMedia: '' }))
    engine.init()

    engine.destroy()

    expect(engine.lenis).toBeNull()
    expect(document.documentElement.classList.contains('no-smooth-scroll')).toBe(true)
    expect(document.documentElement.classList.contains('has-smooth-scroll')).toBe(false)
  })

  it('is idempotent — a second destroy() does not throw', () => {
    engine = createSmoothScrolling(options({ matchMedia: '' }))
    engine.init()
    engine.destroy()

    expect(() => engine?.destroy()).not.toThrow()
  })

  it('removes the matchMedia listener — a flip afterwards has no effect', () => {
    const media = fakeMedia(false)
    engine = createSmoothScrolling(options({ matchMedia: '(hover: hover)' }))
    engine.init()

    engine.destroy()
    media.flip()

    expect(engine.lenis).toBeNull()
  })

  it('is a safe no-op before init() was ever called', () => {
    engine = createSmoothScrolling(options())

    expect(() => engine?.destroy()).not.toThrow()
  })
})

describe('reinit', () => {
  it("tears down the running engine when the next reinit's query no longer matches", () => {
    fakeMedia(true)
    engine = createSmoothScrolling(options({ matchMedia: '(hover: hover)' }))
    engine.init()
    expect(engine.lenis).not.toBeNull()

    fakeMedia(false)
    engine.reinit(options({ matchMedia: '(hover: hover)' }))

    expect(engine.lenis).toBeNull()
    expect(document.documentElement.classList.contains('no-smooth-scroll')).toBe(true)
  })

  it('picks up a changed matchMedia query on the next reinit', () => {
    fakeMedia(false)
    engine = createSmoothScrolling(options({ matchMedia: '(hover: hover)' }))
    engine.init()
    expect(engine.lenis).toBeNull()

    engine.reinit(options({ matchMedia: '' }))

    expect(engine.lenis).not.toBeNull()
  })
})
