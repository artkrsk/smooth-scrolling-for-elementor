export interface IRafDriver {
  /** Detaches from whichever frame source is driving `lenis.raf()` at that
      moment — the GSAP ticker callback removed, or the internal rAF loop
      (running until GSAP appears) cancelled. */
  stop(): void
}
