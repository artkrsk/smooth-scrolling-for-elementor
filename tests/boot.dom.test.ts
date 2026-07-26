// @vitest-environment happy-dom

import type { IGateGlobal, ISmoothScrolling } from '@ts/interfaces'
import type { TOptions } from '@ts/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * boot.ts is a side-effect-on-import module (the WordPress plugin entry), so
 * every test resets the module registry and re-imports fresh. Runs against
 * the REAL controller/Lenis (happy-dom provides the ResizeObserver Lenis
 * needs), matching Phase 1's controller.dom.test.ts approach — the point is
 * to prove the wiring, not just that boot.ts calls mocked stand-ins.
 */

const options = (over: Partial<TOptions> = {}): TOptions => ({
  enabled: true,
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
  delete window.artsSmoothScrolling
  delete window.artsSmoothScrollingOptions
  delete window.artsSmoothScrollingBoot
  if (!document.body) {
    document.documentElement.appendChild(document.createElement('body'))
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('self-created ready (no gate present)', () => {
  it('installs the discovery global and boots immediately when document.body exists', async () => {
    window.artsSmoothScrollingOptions = options({ enabled: false })

    await loadBoot()

    const global = window.artsSmoothScrolling
    expect(global).toBeDefined()
    expect(global?.get()).not.toBeNull()
    expect(global?.version).toBe('0.0.0-test')
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
      __resolveReady: resolve
    }
    window.artsSmoothScrolling = gate
    window.artsSmoothScrollingOptions = options({ enabled: false })

    await loadBoot()

    const finalGlobal = window.artsSmoothScrolling
    expect(finalGlobal?.ready).toBe(gateReady)
    expect('__resolveReady' in (finalGlobal as object)).toBe(false)
    await expect(gateReady).resolves.toBe(finalGlobal?.get())
  })
})

describe('boot timing', () => {
  it('boots immediately when document.body exists', async () => {
    window.artsSmoothScrollingOptions = options({ enabled: false })

    await loadBoot()

    expect(window.artsSmoothScrolling?.get()).not.toBeNull()
  })

  it('defers to DOMContentLoaded when document.body is absent', async () => {
    const body = document.body
    body.remove()
    expect(document.body).toBeNull()
    window.artsSmoothScrollingOptions = options({ enabled: false })

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
    window.artsSmoothScrollingOptions = options({ enabled: true, matchMedia: '' })

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

describe('kit-change bridge', () => {
  const dispatchKitChange = (settings?: Record<string, unknown>) => {
    window.dispatchEvent(
      new CustomEvent('arts-smooth-scrolling:kit-change', { detail: settings ? { settings } : {} })
    )
  }

  it('reinitializes the controller with mapped options on a kit-change event', async () => {
    window.artsSmoothScrollingOptions = options({ enabled: true, matchMedia: '' })
    await loadBoot()

    const before = window.artsSmoothScrolling?.lenis
    expect(before).not.toBeNull()

    dispatchKitChange({ arts_smooth_scrolling_enabled: 'yes' })

    const after = window.artsSmoothScrolling?.lenis
    expect(after).not.toBeNull()
    expect(after).not.toBe(before)
  })

  it('guards against a missing detail.settings — no reinit occurs', async () => {
    window.artsSmoothScrollingOptions = options({ enabled: true, matchMedia: '' })
    await loadBoot()

    const before = window.artsSmoothScrolling?.lenis

    expect(() => dispatchKitChange(undefined)).not.toThrow()

    expect(window.artsSmoothScrolling?.lenis).toBe(before)
  })

  it('is a safe no-op when the controller has not booted yet', async () => {
    document.body.remove()
    window.artsSmoothScrollingOptions = options({ enabled: true, matchMedia: '' })

    await loadBoot()
    expect(window.artsSmoothScrolling?.get()).toBeNull()

    expect(() => dispatchKitChange({ arts_smooth_scrolling_enabled: 'yes' })).not.toThrow()

    document.documentElement.appendChild(document.createElement('body'))
    document.dispatchEvent(new Event('DOMContentLoaded'))
  })
})
