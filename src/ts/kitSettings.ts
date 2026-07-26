import type { TKitSettings, TOptions } from './types'

const DEFAULT_DURATION = 1.2
const DEFAULT_EASING = 'expo.out'

const isOn = (value: unknown): boolean => value === 'yes'

/** Mirrors PHP `is_numeric()` as Options::build() uses it — a blank string is
    NOT numeric. A cleared Elementor slider sends `{ size: '' }`; reading that
    as 0 would freeze the duration at zero instead of falling back to the
    default. */
const numeric = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const sizeOf = (value: unknown, fallback: number): number => {
  if (typeof value === 'object' && value !== null && 'size' in value) {
    return numeric(value.size) ?? fallback
  }
  return numeric(value) ?? fallback
}

const stringOf = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() !== '' ? value : fallback

/**
 * Editor live-preview mapping: raw `arts_smooth_scrolling_*` kit settings (as
 * forwarded by the PHP-printed editor bridge) -> TOptions. Re-derives the
 * anchors block from scratch on every call so the live preview never serves
 * a stale anchors config — the gap v1 had with its shallow Object.assign.
 */
export function mapKitSettings(settings: TKitSettings): TOptions {
  const duration = sizeOf(settings.arts_smooth_scrolling_duration, DEFAULT_DURATION)
  const easing = stringOf(settings.arts_smooth_scrolling_easing, DEFAULT_EASING)
  const disableTouch = settings.arts_smooth_scrolling_disable_touch

  return {
    enabled: isOn(settings.arts_smooth_scrolling_enabled),
    matchMedia: typeof disableTouch === 'string' ? disableTouch : '',
    prefersGSAPRaf: true,
    lenisOptions: {
      duration,
      easing,
      anchors: {
        offset: 0,
        immediate: false,
        lock: false,
        force: true,
        easing: easing === 'expo.out' ? 'expo.inOut' : easing,
        duration: duration * 0.8
      }
    }
  }
}
