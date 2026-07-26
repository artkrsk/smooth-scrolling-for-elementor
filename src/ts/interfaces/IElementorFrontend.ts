import type { IElementorAnchorsModule } from './IElementorAnchorsModule'
import type { IJQueryObject } from './IJQueryObject'

/** Minimal shape of `window.elementorFrontend` — only what
    elementorCompat.ts reads to unbind Elementor's classic anchor animator. */
export interface IElementorFrontend {
  utils?: {
    anchors?: IElementorAnchorsModule
  }
  elements?: {
    $document?: IJQueryObject
  }
}
