import type { TLenisOptions } from './TLenisOptions'

/** PHP `Options::build()` output = boot input = `createSmoothScrolling()`'s
    parameter. `mapKitSettings()` produces the same shape for the editor's
    live-preview path. */
export type TOptions = {
  /** '' = always on. */
  matchMedia: string
  prefersGSAPRaf: boolean
  lenisOptions: TLenisOptions
}
