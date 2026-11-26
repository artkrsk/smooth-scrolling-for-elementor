import type { TPartialOptions } from '../types/TPartialOptions'

export interface ISmoothScrollingGateArgs {
  options?: TPartialOptions
  css?: string
  /** Classic WordPress bootstrap URL; use load for an ESM bootstrap. */
  js?: string
  /** Called after CSS loads; pass this signal to the app after importing it. */
  load?: (signal: AbortSignal) => Promise<void>
  editor?: boolean
}
