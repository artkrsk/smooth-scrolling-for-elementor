// @vitest-environment happy-dom

import { applyDomState } from '@ts/core/domState'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * v1 semantics: active -> has-smooth-scroll / inactive -> no-smooth-scroll
 * (mutually exclusive), has-smooth-anchors only while active. Anchors are
 * always derived alongside the engine in this plugin (no independent
 * toggle), so a single "active" flag decides both classes.
 */

afterEach(() => {
  document.documentElement.className = ''
})

describe('active', () => {
  it('adds has-smooth-scroll and has-smooth-anchors, removes no-smooth-scroll', () => {
    applyDomState(true)

    const classes = document.documentElement.classList
    expect(classes.contains('has-smooth-scroll')).toBe(true)
    expect(classes.contains('has-smooth-anchors')).toBe(true)
    expect(classes.contains('no-smooth-scroll')).toBe(false)
  })
})

describe('inactive', () => {
  it('adds no-smooth-scroll, removes has-smooth-scroll and has-smooth-anchors', () => {
    applyDomState(true)

    applyDomState(false)

    const classes = document.documentElement.classList
    expect(classes.contains('no-smooth-scroll')).toBe(true)
    expect(classes.contains('has-smooth-scroll')).toBe(false)
    expect(classes.contains('has-smooth-anchors')).toBe(false)
  })
})

describe('idempotency', () => {
  it('applying the same state twice does not duplicate classes', () => {
    applyDomState(true)
    applyDomState(true)

    expect(document.documentElement.className.split(' ').filter(Boolean)).toEqual([
      'has-smooth-scroll',
      'has-smooth-anchors'
    ])
  })
})
