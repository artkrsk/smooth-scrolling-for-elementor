import type { TPartialOptions } from '../types/TPartialOptions'

export interface ISmoothScrollingAppArgs {
  options?: TPartialOptions
  /** The deferred loader's lifetime; an aborted owner cannot initialize. */
  signal?: AbortSignal
}
