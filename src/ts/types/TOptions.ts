import type { TLenisOptions } from './TLenisOptions'

/** PHP `Options::build()` output = boot input = `createSmoothScrolling()`'s
    parameter. `mapKitSettings()` produces the same shape for the editor's
    live-preview path. */
export type TOptions = {
  /** '' = always on. */
  matchMedia: string
  /** Honour the visitor's reduced-motion setting: `matchMedia` then also requires full motion,
      so smoothing stops while the system asks for less. False forces full motion; absent
      means honoured. */
  reducedMotion?: boolean
  prefersGSAPRaf: boolean
  lenisOptions: TLenisOptions
}
