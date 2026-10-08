// @vitest-environment happy-dom

import { createSmoothScrollingApp } from '@ts/createSmoothScrollingApp'
import type { IGateGlobal, ISmoothScrolling } from '@ts/interfaces'
import type { ISmoothScrollingApp } from '@ts/interfaces/ISmoothScrollingApp'
import type { TOptions } from '@ts/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import metadata from '../../composer.json'

/**
 * boot.ts is a side-effect-on-import module (the WordPress plugin entry), so
 * every test resets the module registry and re-imports fresh. Runs against
 * the REAL controller/Lenis (happy-dom provides the ResizeObserver Lenis
 * needs), matching controller.dom.test.ts's approach — the point is to
 * prove the wiring, not just that boot.ts calls mocked stand-ins.
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

const loadBoot = async () => {
  vi.resetModules()
  await import('@ts/boot')
}

beforeEach(() => {
  document.documentElement.className = ''
  document.head.innerHTML = ''
  delete window.artsSmoothScrolling
  delete window.artsSmoothScrollingOptions
  delete window.artsSmoothScrollingBoot
  if (!document.body) {
    document.documentElement.appendChild(document.createElement('body'))
  }
})

afterEach(() => {
  ;(window.artsSmoothScrolling as ISmoothScrollingApp | undefined)?.destroy?.()
  vi.unstubAllGlobals()
})

describe('self-created ready (no gate present)', () => {
  it('installs the discovery global and boots immediately when document.body exists', async () => {
    window.artsSmoothScrollingOptions = options()

    await loadBoot()

    const global = window.artsSmoothScrolling
    expect(global).toBeDefined()
    expect(global?.get()).not.toBeNull()
    expect(global?.version).toBe(metadata.version)
    expect('__resolveReady' in (global as object)).toBe(false)
    await expect(global?.ready).resolves.toBe(global?.get())
  })
})

describe('claiming the gate resolver', () => {
  it('reuses gate.ready and resolves it via __resolveReady, leaving no __resolveReady on the final global', async () => {
    let resolve!: (controller: ISmoothScrolling) => void
    const gateReady = new Promise<ISmoothScrolling>((r) => {
      resolve = r
    })
    const gate: IGateGlobal = {
      ready: gateReady,
      get: () => null,
      get lenis() {
        return null
      },
      version: '0.0.0-test',
      load: () => Promise.reject(new Error('not implemented')),
      __resolveReady: resolve,
      __resolveLoad: () => {}
    }
    window.artsSmoothScrolling = gate
    window.artsSmoothScrollingOptions = options()

    await loadBoot()

    const finalGlobal = window.artsSmoothScrolling
    expect(finalGlobal?.ready).toBe(gateReady)
    expect('__resolveReady' in (finalGlobal as object)).toBe(false)
    await expect(gateReady).resolves.toBe(finalGlobal?.get())
  })
})

describe('boot timing', () => {
  it('boots immediately when document.body exists', async () => {
    window.artsSmoothScrollingOptions = options()

    await loadBoot()

    expect(window.artsSmoothScrolling?.get()).not.toBeNull()
  })

  it('defers to DOMContentLoaded when document.body is absent', async () => {
    const body = document.body
    body.remove()
    expect(document.body).toBeNull()
    window.artsSmoothScrollingOptions = options()

    await loadBoot()
    expect(window.artsSmoothScrolling?.get()).toBeNull()

    document.documentElement.appendChild(body)
    document.dispatchEvent(new Event('DOMContentLoaded'))

    expect(window.artsSmoothScrolling?.get()).not.toBeNull()
  })
})

describe('missing options — no-op boot', () => {
  it('installs the global but never creates a controller', async () => {
    await loadBoot()

    expect(window.artsSmoothScrolling?.get()).toBeNull()
    expect(window.artsSmoothScrolling?.lenis).toBeNull()
  })
})

describe('idempotency guard (final global already present)', () => {
  it('does not replace the global or create a second controller when boot.ts runs again', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })

    await loadBoot()
    const firstGlobal = window.artsSmoothScrolling
    const firstController = firstGlobal?.get()
    expect(firstController).not.toBeNull()
    expect('__resolveReady' in (firstGlobal as object)).toBe(false)

    await loadBoot()

    expect(window.artsSmoothScrolling).toBe(firstGlobal)
    expect(window.artsSmoothScrolling?.get()).toBe(firstController)
  })
})

describe('load()', () => {
  it("resolves with the engine's Lenis class from the final global", async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })

    await loadBoot()

    const LenisClass = await window.artsSmoothScrolling?.load()
    expect(window.artsSmoothScrolling?.lenis).toBeInstanceOf(LenisClass)
  })

  it('settles a load() promise obtained from the gate before boot ran', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })
    window.artsSmoothScrollingBoot = {
      js: 'https://example.test/smooth-scrolling-for-elementor.js',
      css: 'https://example.test/smooth-scrolling-for-elementor.css',
      editor: false
    }

    vi.resetModules()
    await import('@ts/gate')
    const gate = window.artsSmoothScrolling as IGateGlobal
    const loadPromise = gate.load()

    await loadBoot()

    const LenisClass = await loadPromise
    expect(window.artsSmoothScrolling?.lenis).toBeInstanceOf(LenisClass)
  })
})

describe('kit-change bridge', () => {
  const dispatchKitChange = (settings?: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent('arts-smooth-scrolling:kit-change', { detail: settings ? { settings } : {} })
    )
  }

  it('reinitializes the controller with mapped options on a kit-change event', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })
    await loadBoot()

    const before = window.artsSmoothScrolling?.lenis
    expect(before).not.toBeNull()

    dispatchKitChange({ arts_smooth_scrolling_duration: { size: 2, unit: 'seconds' } })

    const after = window.artsSmoothScrolling?.lenis
    expect(after).not.toBeNull()
    expect(after).not.toBe(before)
  })

  it('guards against a missing detail.settings — no reinit occurs', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })
    await loadBoot()

    const before = window.artsSmoothScrolling?.lenis

    expect(() => dispatchKitChange(undefined)).not.toThrow()

    expect(window.artsSmoothScrolling?.lenis).toBe(before)
  })

  it('is a safe no-op when the controller has not booted yet', async () => {
    document.body.remove()
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })

    await loadBoot()
    expect(window.artsSmoothScrolling?.get()).toBeNull()

    expect(() =>
      dispatchKitChange({ arts_smooth_scrolling_duration: { size: 2, unit: 'seconds' } })
    ).not.toThrow()

    document.documentElement.appendChild(document.createElement('body'))
    document.dispatchEvent(new Event('DOMContentLoaded'))
  })
})

describe('explicit library lifecycle', () => {
  it('does not publish or run until init, then initializes only once', () => {
    const app = createSmoothScrollingApp({ options: options() })
    expect(window.artsSmoothScrolling).toBeUndefined()
    expect(app.get()).toBeNull()
    app.init()
    const first = app.lenis
    app.init()
    expect(app.lenis).toBe(first)
    app.destroy()
    app.init()
    expect(app.get()).toBeNull()
    expect(window.artsSmoothScrolling).toBeUndefined()
  })

  it('cannot revive after disposal while waiting for DOMContentLoaded', () => {
    const body = document.body
    body.remove()
    const app = createSmoothScrollingApp({ options: options() })
    app.init()
    app.destroy()
    document.documentElement.appendChild(body)
    document.dispatchEvent(new Event('DOMContentLoaded'))
    expect(app.get()).toBeNull()
    expect(window.artsSmoothScrolling).toBeUndefined()
  })

  it('does not disturb the current owner when a retired bootstrap arrives', () => {
    const lifetime = new AbortController()
    lifetime.abort()
    const current = createSmoothScrollingApp({ options: options() })
    current.init()
    const late = createSmoothScrollingApp({ options: options(), signal: lifetime.signal })
    late.init()
    late.destroy()
    expect(window.artsSmoothScrolling).toBe(current)
    expect(current.lenis).not.toBeNull()
  })

  it('replaces the previous app and stale destroy cannot clear the new app', () => {
    const first = createSmoothScrollingApp({ options: options() })
    first.init()
    const second = createSmoothScrollingApp({ options: options() })
    second.init()
    expect(first.signal.aborted).toBe(true)
    expect(first.lenis).toBeNull()
    first.destroy()
    expect(window.artsSmoothScrolling).toBe(second)
    expect(second.lenis).not.toBeNull()
  })

  it('keeps the newest app when prior disposal reenters initialization', () => {
    const first = createSmoothScrollingApp({ options: options() })
    const second = createSmoothScrollingApp({ options: options() })
    const newest = createSmoothScrollingApp({ options: options() })
    first.init()
    first.signal.addEventListener('abort', () => newest.init(), { once: true })
    second.init()
    expect(window.artsSmoothScrolling).toBe(newest)
    expect(second.signal.aborted).toBe(true)
    expect(newest.lenis).not.toBeNull()
    expect(document.documentElement.classList.contains('has-smooth-scroll')).toBe(true)
  })

  it('removes the WordPress kit bridge when its app is disposed', async () => {
    window.artsSmoothScrollingOptions = options()
    await loadBoot()
    const app = window.artsSmoothScrolling as ISmoothScrollingApp
    const controller = app.get()
    const reinit = vi.spyOn(controller as ISmoothScrolling, 'reinit')
    app.destroy()
    window.dispatchEvent(
      new CustomEvent('arts-smooth-scrolling:kit-change', {
        detail: { settings: { arts_smooth_scrolling_duration: { size: 2 } } }
      })
    )
    expect(reinit).not.toHaveBeenCalled()
  })
})
