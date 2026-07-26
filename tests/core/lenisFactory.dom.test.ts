// @vitest-environment happy-dom

import { createLenis, resolveAnchorsOptions } from '@ts/core/lenisFactory'
import type { TAnchorsOptions, TOptions } from '@ts/types'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * `new Lenis()` needs a live DOM (it reads dimensions and attaches
 * listeners), so this is the one factory test that must run against the
 * real package rather than a fake — happy-dom provides the ResizeObserver
 * Lenis's Dimensions class needs.
 */

const baseOptions = (over: Partial<TOptions['lenisOptions']> = {}): TOptions => ({
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
    },
    ...over
  }
})

let lenis: ReturnType<typeof createLenis> | null = null

afterEach(() => {
  lenis?.destroy()
  lenis = null
})

describe('createLenis', () => {
  it('carries the fixed base options never exposed to PHP', () => {
    lenis = createLenis(baseOptions())

    expect(lenis.options.autoRaf).toBe(false)
    expect(lenis.options.stopInertiaOnNavigate).toBe(true)
  })

  it('scopes the prevent callback to .dialog-prevent-scroll ancestors', () => {
    lenis = createLenis(baseOptions())
    const inside = document.createElement('div')
    inside.className = 'dialog-prevent-scroll'
    const child = document.createElement('span')
    inside.appendChild(child)
    document.body.appendChild(inside)
    const outside = document.createElement('div')
    document.body.appendChild(outside)

    expect(lenis.options.prevent?.(child)).toBe(true)
    expect(lenis.options.prevent?.(outside)).toBe(false)

    inside.remove()
    outside.remove()
  })

  it('passes the PHP-supplied duration through', () => {
    lenis = createLenis(baseOptions({ duration: 2.4 }))

    expect(lenis.options.duration).toBe(2.4)
  })

  it('resolves a known easing name to its function', () => {
    lenis = createLenis(baseOptions({ easing: 'linear' }))

    expect(lenis.options.easing?.(0.5)).toBe(0.5)
  })

  it('drops an unknown easing name and lets Lenis apply its own default', () => {
    lenis = createLenis(baseOptions({ easing: 'not-a-real-easing' }))

    expect(typeof lenis.options.easing).toBe('function')
  })

  it('passes the derived anchors block through to the native anchors option', () => {
    lenis = createLenis(baseOptions())

    expect(lenis.options.anchors).toMatchObject({
      offset: 0,
      immediate: false,
      lock: false,
      force: true
    })
  })
})

describe('resolveAnchorsOptions', () => {
  const anchors: TAnchorsOptions = {
    offset: 10,
    immediate: true,
    lock: true,
    force: true,
    easing: 'linear',
    duration: 0.8
  }

  it('passes offset/immediate/lock/force/duration straight through', () => {
    const resolved = resolveAnchorsOptions(anchors)

    expect(resolved.offset).toBe(10)
    expect(resolved.immediate).toBe(true)
    expect(resolved.lock).toBe(true)
    expect(resolved.force).toBe(true)
    expect(resolved.duration).toBe(0.8)
  })

  it('resolves a known easing name to a function', () => {
    const resolved = resolveAnchorsOptions(anchors)

    expect(resolved.easing?.(1)).toBe(1)
  })

  it('omits the easing key entirely for an unknown name', () => {
    const resolved = resolveAnchorsOptions({ ...anchors, easing: 'nonsense' })

    expect('easing' in resolved).toBe(false)
  })
})
