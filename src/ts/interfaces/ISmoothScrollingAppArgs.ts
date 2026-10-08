import type { TOptions } from '../types/TOptions'

export interface ISmoothScrollingAppArgs {
  options?: TOptions
  /** The deferred loader's lifetime; an aborted owner cannot initialize. */
  signal?: AbortSignal
}
