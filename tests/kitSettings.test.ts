import { mapKitSettings } from '@ts/kitSettings'
import { describe, expect, it } from 'vitest'

/**
 * What the editor bridge forwards is Elementor's raw control values — sliders
 * as `{ size, unit }`, switchers as 'yes' | '', and the disable-touch switcher
 * as a return_value trick where the value IS the media query string. This
 * mapping is where that raw vocabulary meets TOptions, and it re-derives the
 * whole `anchors` block on every call (the live-preview gap v1 had).
 */

describe('enabled switcher', () => {
  it("is on for the literal 'yes', off for present-but-off ''", () => {
    expect(mapKitSettings({ arts_smooth_scrolling_enabled: 'yes' }).enabled).toBe(true)
    expect(mapKitSettings({ arts_smooth_scrolling_enabled: '' }).enabled).toBe(false)
  })

  it('defaults to on when the key was never saved — matches Options::is_kit_enabled()', () => {
    expect(mapKitSettings({}).enabled).toBe(true)
  })

  it('is not fooled by truthy non-yes values', () => {
    expect(mapKitSettings({ arts_smooth_scrolling_enabled: true }).enabled).toBe(false)
    expect(mapKitSettings({ arts_smooth_scrolling_enabled: 1 }).enabled).toBe(false)
  })
})

describe('disable-touch return_value trick', () => {
  it('uses the raw string value as the matchMedia query', () => {
    const query = '(hover: hover) and (pointer: fine)'
    expect(mapKitSettings({ arts_smooth_scrolling_disable_touch: query }).matchMedia).toBe(query)
  })

  it('falls back to empty (always on) when present but off', () => {
    expect(mapKitSettings({ arts_smooth_scrolling_disable_touch: '' }).matchMedia).toBe('')
  })

  it('defaults to the hover/pointer query when the key was never saved — matches Options::match_media()', () => {
    expect(mapKitSettings({}).matchMedia).toBe('(hover: hover) and (pointer: fine)')
  })
})

describe('duration slider', () => {
  it('unwraps the { size, unit } shape', () => {
    expect(
      mapKitSettings({ arts_smooth_scrolling_duration: { size: 2, unit: 's' } }).lenisOptions
        .duration
    ).toBe(2)
  })

  it('accepts a bare number', () => {
    expect(mapKitSettings({ arts_smooth_scrolling_duration: 2 }).lenisOptions.duration).toBe(2)
  })

  it('falls back for a non-finite bare number', () => {
    expect(
      mapKitSettings({ arts_smooth_scrolling_duration: Number.NaN }).lenisOptions.duration
    ).toBe(1.2)
  })

  it('falls back to 1.2 when unusable, never reading it as 0', () => {
    expect(mapKitSettings({}).lenisOptions.duration).toBe(1.2)
    expect(
      mapKitSettings({ arts_smooth_scrolling_duration: { size: '', unit: 's' } }).lenisOptions
        .duration
    ).toBe(1.2)
    expect(
      mapKitSettings({ arts_smooth_scrolling_duration: { size: '  ', unit: 's' } }).lenisOptions
        .duration
    ).toBe(1.2)
    expect(mapKitSettings({ arts_smooth_scrolling_duration: null }).lenisOptions.duration).toBe(1.2)
  })

  it('still honours a deliberate zero', () => {
    expect(
      mapKitSettings({ arts_smooth_scrolling_duration: { size: 0, unit: 's' } }).lenisOptions
        .duration
    ).toBe(0)
  })

  it('reads a numeric string from the size field', () => {
    expect(
      mapKitSettings({ arts_smooth_scrolling_duration: { size: '0.35', unit: 's' } }).lenisOptions
        .duration
    ).toBe(0.35)
  })

  it('falls back for a non-numeric string', () => {
    expect(
      mapKitSettings({ arts_smooth_scrolling_duration: { size: 'nonsense', unit: 's' } })
        .lenisOptions.duration
    ).toBe(1.2)
  })
})

describe('easing select', () => {
  it('reads the raw string value', () => {
    expect(mapKitSettings({ arts_smooth_scrolling_easing: 'linear' }).lenisOptions.easing).toBe(
      'linear'
    )
  })

  it("falls back to 'expo.out' when missing or blank", () => {
    expect(mapKitSettings({}).lenisOptions.easing).toBe('expo.out')
    expect(mapKitSettings({ arts_smooth_scrolling_easing: '' }).lenisOptions.easing).toBe(
      'expo.out'
    )
  })
})

describe('anchors derivation', () => {
  it('swaps expo.out for expo.inOut and scales duration by 0.8', () => {
    const anchors = mapKitSettings({
      arts_smooth_scrolling_duration: 2,
      arts_smooth_scrolling_easing: 'expo.out'
    }).lenisOptions.anchors

    expect(anchors).toEqual({
      offset: 0,
      immediate: false,
      lock: false,
      force: true,
      easing: 'expo.inOut',
      duration: 1.6
    })
  })

  it('keeps a non-expo.out easing as-is for anchors too', () => {
    const anchors = mapKitSettings({
      arts_smooth_scrolling_duration: 1,
      arts_smooth_scrolling_easing: 'linear'
    }).lenisOptions.anchors

    expect(anchors.easing).toBe('linear')
    expect(anchors.duration).toBe(0.8)
  })

  it('re-derives from scratch on every call, using the latest duration/easing', () => {
    const first = mapKitSettings({ arts_smooth_scrolling_duration: 1 }).lenisOptions.anchors
    const second = mapKitSettings({ arts_smooth_scrolling_duration: 4 }).lenisOptions.anchors

    expect(first.duration).toBe(0.8)
    expect(second.duration).toBe(3.2)
  })
})

describe('prefersGSAPRaf', () => {
  it('is always true — no kit control exists for it', () => {
    expect(mapKitSettings({}).prefersGSAPRaf).toBe(true)
  })
})
