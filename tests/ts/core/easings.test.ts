import { expoInOut, expoOut, linear, resolveEasing } from '@ts/core/easings'
import { describe, expect, it } from 'vitest'

/**
 * Exact math ported from v1's Easing.ts, plus the name -> function lookup
 * that lets an unknown easing name fall back to Lenis's own default instead
 * of throwing.
 */

describe('linear', () => {
  it('returns t unchanged', () => {
    expect(linear(0)).toBe(0)
    expect(linear(0.25)).toBe(0.25)
    expect(linear(1)).toBe(1)
  })
})

describe('expoOut', () => {
  /** The 1.001 offset in the formula is deliberate (avoids a visible jump at
      the start), so t=0 lands at 0.001, not exactly 0. */
  it('starts near 0 and ends at 1', () => {
    expect(expoOut(0)).toBeCloseTo(0.001, 5)
    expect(expoOut(1)).toBe(1)
  })

  it('matches the exact v1/Lenis-default formula at the midpoint', () => {
    expect(expoOut(0.5)).toBeCloseTo(Math.min(1, 1.001 - 2 ** (-10 * 0.5)), 10)
  })

  it('never exceeds 1', () => {
    expect(expoOut(0.999)).toBeLessThanOrEqual(1)
  })
})

describe('expoInOut', () => {
  it('has exact boundary values at t=0 and t=1', () => {
    expect(expoInOut(0)).toBe(0)
    expect(expoInOut(1)).toBe(1)
  })

  it('is symmetric around the midpoint', () => {
    expect(expoInOut(0.5)).toBeCloseTo(0.5, 10)
  })

  it('uses the in-half formula below 0.5 and the out-half above it', () => {
    expect(expoInOut(0.25)).toBeCloseTo(0.5 * 2 ** (20 * 0.25 - 10), 10)
    expect(expoInOut(0.75)).toBeCloseTo(0.5 * (2 - 2 ** (-20 * 0.75 + 10)), 10)
  })
})

describe('resolveEasing', () => {
  it('resolves the three known names', () => {
    expect(resolveEasing('linear')).toBe(linear)
    expect(resolveEasing('expo.out')).toBe(expoOut)
    expect(resolveEasing('expo.inOut')).toBe(expoInOut)
  })

  it('returns undefined for an unknown name, so the caller can drop the key', () => {
    expect(resolveEasing('ease-in-out-quad')).toBeUndefined()
    expect(resolveEasing('')).toBeUndefined()
  })
})
