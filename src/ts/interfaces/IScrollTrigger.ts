/** Minimal shape of GSAP's ScrollTrigger — only what scrollTriggerSync.ts
    calls. Never a dependency of this package; types the runtime-detected
    `window.ScrollTrigger` global. */
export interface IScrollTrigger {
  update(): void
}
