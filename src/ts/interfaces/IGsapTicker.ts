/** Minimal shape of GSAP's ticker — only what rafDriver.ts calls. GSAP is
    never a dependency of this package; this types the runtime-detected
    `window.gsap` global. */
export interface IGsapTicker {
  add(
    callback: (time: number, deltaTime: number, frame: number) => void,
    useFrames?: boolean,
    prioritize?: boolean
  ): void
  remove(callback: (time: number, deltaTime: number, frame: number) => void): void
  lagSmoothing(threshold: number): void
}
