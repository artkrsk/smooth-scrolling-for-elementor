import type { TEasingFunction } from '../types'

export const linear: TEasingFunction = (t) => t

export const expoOut: TEasingFunction = (t) => Math.min(1, 1.001 - 2 ** (-10 * t))

export const expoInOut: TEasingFunction = (t) => {
  if (t === 0) {
    return 0
  }
  if (t === 1) {
    return 1
  }
  return t < 0.5 ? 0.5 * 2 ** (20 * t - 10) : 0.5 * (2 - 2 ** (-20 * t + 10))
}

const EASINGS: Record<string, TEasingFunction> = {
  linear,
  'expo.out': expoOut,
  'expo.inOut': expoInOut
}

/** Unknown names resolve to undefined so the caller can drop the key and let
    Lenis fall back to its own internal default (v1 behavior). */
export function resolveEasing(name: string): TEasingFunction | undefined {
  return EASINGS[name]
}
