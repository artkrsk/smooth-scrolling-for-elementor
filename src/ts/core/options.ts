import type { TOptions, TPartialOptions } from '../types'

export const DEFAULT_DURATION = 1.2
export const DEFAULT_EASING = 'expo.out'
export const DEFAULT_DISABLE_TOUCH = '(hover: hover) and (pointer: fine)'
const REDUCED_MOTION_CONDITION = '(prefers-reduced-motion: no-preference)'

/** Mirrors PHP Options::match_media()'s composition — every branch of the query also requires
    full motion; an empty query becomes the condition alone. */
export const withReducedMotion = (query: string): string => {
  if (query.trim() === '') {
    return REDUCED_MOTION_CONDITION
  }
  return query
    .split(',')
    .map((branch) => `${branch.trim()} and ${REDUCED_MOTION_CONDITION}`)
    .join(', ')
}

/** The query a host that passes none gets: what WordPress prints for an untouched Kit. */
export const defaultMatchMedia = (reducedMotion = true): string =>
  reducedMotion ? withReducedMotion(DEFAULT_DISABLE_TOUCH) : DEFAULT_DISABLE_TOUCH

/**
 * Fills whatever a host left out with the values PHP Options::build() prints for an untouched
 * Kit, deriving the anchors block from the resolved duration and easing. Given keys win,
 * `matchMedia: ''` (always on) included. Held against PHP by tests/ts/optionsParity.test.ts.
 */
export function resolveOptions(options: TPartialOptions = {}): TOptions {
  const {
    duration = DEFAULT_DURATION,
    easing = DEFAULT_EASING,
    anchors
  } = options.lenisOptions ?? {}
  const { reducedMotion = true } = options

  return {
    matchMedia: options.matchMedia ?? defaultMatchMedia(reducedMotion),
    reducedMotion,
    prefersGSAPRaf: options.prefersGSAPRaf ?? true,
    lenisOptions: {
      duration,
      easing,
      anchors: {
        offset: 0,
        immediate: false,
        lock: false,
        force: true,
        easing: easing === DEFAULT_EASING ? 'expo.inOut' : easing,
        duration: duration * 0.8,
        ...anchors
      }
    }
  }
}
