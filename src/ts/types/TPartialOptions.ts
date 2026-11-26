import type { TAnchorsOptions } from './TAnchorsOptions'
import type { TLenisOptions } from './TLenisOptions'
import type { TOptions } from './TOptions'

/** What a host without WordPress behind it may pass: every key optional at every depth. Omitted
    keys take the values PHP `Options::build()` prints (see core/options.ts). */
export type TPartialOptions = Partial<Omit<TOptions, 'lenisOptions'>> & {
  lenisOptions?: Partial<Omit<TLenisOptions, 'anchors'>> & { anchors?: Partial<TAnchorsOptions> }
}
