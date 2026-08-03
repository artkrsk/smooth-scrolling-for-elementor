// @vitest-environment happy-dom

import type { TGateBoot, TOptions } from '@ts/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeMedia } from './support'

/**
 * gate.ts is a side-effect-on-import module (the inline wp_head script), so
 * every test resets the module registry and re-imports fresh — the only way
 * to exercise a different window-global starting state per test.
 */

const GATE_JS_ID = 'smooth-scrolling-for-elementor-js'

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

const boot = (over: Partial<TGateBoot> = {}): TGateBoot => ({
  js: 'https://example.test/smooth-scrolling-for-elementor.js',
  editor: false,
  ...over
})

const loadGate = async () => {
  vi.resetModules()
  await import('@ts/gate')
}

const hasActiveClass = () => document.documentElement.classList.contains('has-smooth-scroll')
const hasInactiveClass = () => document.documentElement.classList.contains('no-smooth-scroll')

// happy-dom's Window type doesn't declare this environment-only API.
type WindowWithHappyDOM = typeof window & {
  happyDOM: {
    settings: { disableJavaScriptFileLoading: boolean; handleDisabledFileLoadingAsSuccess: boolean }
  }
}

beforeEach(() => {
  document.documentElement.className = ''
  document.head.innerHTML = ''
  delete window.artsSmoothScrolling
  delete window.artsSmoothScrollingOptions
  delete window.artsSmoothScrollingBoot
  // happy-dom attempts a real fetch for any injected <script src>, which
  // fails in this sandboxed environment and fires 'error' on every test —
  // not just the one that means to exercise the onerror path. Make script
  // "loading" a synthetic no-op success instead.
  const settings = (window as WindowWithHappyDOM).happyDOM.settings
  settings.disableJavaScriptFileLoading = true
  settings.handleDisabledFileLoadingAsSuccess = true
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('idempotency', () => {
  it('does nothing when window.artsSmoothScrolling is already set', async () => {
    const sentinel = { ready: Promise.resolve(), get: () => null, lenis: null, version: 'sentinel' }
    // biome-ignore lint/suspicious/noExplicitAny: deliberately mismatched shape to prove gate never touches it
    window.artsSmoothScrolling = sentinel as any
    window.artsSmoothScrollingOptions = options()
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(window.artsSmoothScrolling).toBe(sentinel)
    expect(document.documentElement.className).toBe('')
    expect(document.getElementById(GATE_JS_ID)).toBeNull()
  })
})

describe('placeholder global', () => {
  it('installs ready/get/lenis/version/__resolveReady', async () => {
    await loadGate()

    const global = window.artsSmoothScrolling
    expect(global).toBeDefined()
    expect(global?.get()).toBeNull()
    expect(global?.lenis).toBeNull()
    expect(global?.version).toBe('0.0.0-test')
    expect(global?.ready).toBeInstanceOf(Promise)
    // biome-ignore lint/suspicious/noExplicitAny: reaching for the gate-only field
    expect(typeof (global as any).__resolveReady).toBe('function')
  })

  it('resolves the ready promise via __resolveReady, the way boot.ts claims it', async () => {
    await loadGate()

    // biome-ignore lint/suspicious/noExplicitAny: reaching for the gate-only field
    const gate = window.artsSmoothScrolling as any
    const controller = { init() {}, destroy() {}, reinit() {}, lenis: null }
    gate.__resolveReady(controller)

    await expect(gate.ready).resolves.toBe(controller)
  })
})

describe('fail-safe: missing options or boot', () => {
  it('predicts inactive without throwing when options is missing', async () => {
    window.artsSmoothScrollingBoot = boot()

    await expect(loadGate()).resolves.not.toThrow()

    expect(hasInactiveClass()).toBe(true)
    expect(hasActiveClass()).toBe(false)
    expect(window.artsSmoothScrolling).toBeDefined()
    expect(document.getElementById(GATE_JS_ID)).toBeNull()
  })

  it('predicts inactive without throwing when boot is missing', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })

    await expect(loadGate()).resolves.not.toThrow()

    expect(hasInactiveClass()).toBe(true)
    expect(hasActiveClass()).toBe(false)
    expect(document.getElementById(GATE_JS_ID)).toBeNull()
  })

  it('predicts inactive without throwing when both are missing', async () => {
    await expect(loadGate()).resolves.not.toThrow()

    expect(hasInactiveClass()).toBe(true)
    expect(window.artsSmoothScrolling).toBeDefined()
  })
})

describe('class prediction', () => {
  it('predicts active when matchMedia is empty', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(hasActiveClass()).toBe(true)
    expect(hasInactiveClass()).toBe(false)
  })

  it('predicts active when the query already matches', async () => {
    fakeMedia(true)
    window.artsSmoothScrollingOptions = options({ matchMedia: '(hover: hover)' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(hasActiveClass()).toBe(true)
  })

  it('predicts inactive when the query does not match yet', async () => {
    fakeMedia(false)
    window.artsSmoothScrollingOptions = options({ matchMedia: '(hover: hover)' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(hasInactiveClass()).toBe(true)
    expect(hasActiveClass()).toBe(false)
  })
})

describe('injection', () => {
  it('injects immediately when boot.editor is true, even if the query does not match', async () => {
    fakeMedia(false)
    window.artsSmoothScrollingOptions = options({ matchMedia: '(hover: hover)' })
    window.artsSmoothScrollingBoot = boot({ editor: true })

    await loadGate()

    const script = document.getElementById(GATE_JS_ID) as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script?.src).toBe('https://example.test/smooth-scrolling-for-elementor.js')
  })

  it('injects immediately when matchMedia is empty', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(document.getElementById(GATE_JS_ID)).not.toBeNull()
  })

  it('injects immediately when the query already matches', async () => {
    fakeMedia(true)
    window.artsSmoothScrollingOptions = options({ matchMedia: '(hover: hover)' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(document.getElementById(GATE_JS_ID)).not.toBeNull()
  })

  it('does not inject immediately when the query does not match and it is not editor', async () => {
    fakeMedia(false)
    window.artsSmoothScrollingOptions = options({ matchMedia: '(hover: hover)' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(document.getElementById(GATE_JS_ID)).toBeNull()
  })

  it('injects and predicts active on the first matching change, then disarms the listener', async () => {
    const media = fakeMedia(false)
    window.artsSmoothScrollingOptions = options({ matchMedia: '(hover: hover)' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()
    expect(document.getElementById(GATE_JS_ID)).toBeNull()

    media.flip()

    expect(document.getElementById(GATE_JS_ID)).not.toBeNull()
    expect(hasActiveClass()).toBe(true)

    // Listener must be disarmed: a further flip (back to no-match) must not
    // undo the prediction — there is no second listener left to react to it.
    media.flip()
    expect(hasActiveClass()).toBe(true)
  })

  it('updates the prediction without injecting on a non-matching change while armed', async () => {
    const media = fakeMedia(false)
    window.artsSmoothScrollingOptions = options({ matchMedia: '(hover: hover)' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    media.set(false)

    expect(document.getElementById(GATE_JS_ID)).toBeNull()
    expect(hasInactiveClass()).toBe(true)

    // The listener must still be armed — a later real match still injects.
    media.flip()
    expect(document.getElementById(GATE_JS_ID)).not.toBeNull()
  })

  it('does not inject a duplicate script when one already exists (secondary guard)', async () => {
    const existing = document.createElement('script')
    existing.id = GATE_JS_ID
    document.head.appendChild(existing)

    window.artsSmoothScrollingOptions = options({ matchMedia: '' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()

    expect(document.querySelectorAll(`#${GATE_JS_ID}`).length).toBe(1)
    expect(document.getElementById(GATE_JS_ID)).toBe(existing)
  })

  it('predicts inactive when the injected script fails to load', async () => {
    window.artsSmoothScrollingOptions = options({ matchMedia: '' })
    window.artsSmoothScrollingBoot = boot()

    await loadGate()
    expect(hasActiveClass()).toBe(true)

    const script = document.getElementById(GATE_JS_ID) as HTMLScriptElement
    script.onerror?.(new Event('error'))

    expect(hasInactiveClass()).toBe(true)
    expect(hasActiveClass()).toBe(false)
  })
})
