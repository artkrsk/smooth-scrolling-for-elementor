export interface IRafDriver {
  /** Detaches from whichever frame source is driving `lenis.raf()` — the GSAP
      ticker callback removed, or the internal rAF loop cancelled. */
  stop(): void
}
