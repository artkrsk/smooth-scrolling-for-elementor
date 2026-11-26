import {
  DEFAULT_DISABLE_TOUCH,
  DEFAULT_DURATION,
  DEFAULT_EASING,
  resolveOptions,
  withReducedMotion
} from './core/options'
import type { TKitSettings, TOptions } from './types'

/** Mirrors PHP Options::match_media() — an absent key falls back to the
    default query; a present value (including '') maps as-is. */
const matchMediaOf = (value: unknown): string => {
  if (value === undefined) {
    return DEFAULT_DISABLE_TOUCH
  }
  return typeof value === 'string' ? value : ''
}

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
 * `reducedMotion` is the verdict PHP printed: the editor never sees the
 * `arts/reduced_motion/enabled` filter itself.
 */
export function mapKitSettings(settings: TKitSettings, reducedMotion = true): TOptions {
  const duration = sizeOf(settings.arts_smooth_scrolling_duration, DEFAULT_DURATION)
  const easing = stringOf(settings.arts_smooth_scrolling_easing, DEFAULT_EASING)
  const query = matchMediaOf(settings.arts_smooth_scrolling_disable_touch)

  return resolveOptions({
    matchMedia: reducedMotion ? withReducedMotion(query) : query,
    reducedMotion,
    lenisOptions: { duration, easing }
  })
}
