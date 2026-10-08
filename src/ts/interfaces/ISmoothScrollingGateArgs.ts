import type { TOptions } from '../types/TOptions'

export interface ISmoothScrollingGateArgs {
  options?: TOptions
  css?: string
  /** Classic WordPress bootstrap URL; use load for an ESM bootstrap. */
  js?: string
  /** Called after CSS loads; pass this signal to the app after importing it. */
  load?: (signal: AbortSignal) => Promise<void>
  editor?: boolean
}
