/** Derived, not user-editable — see mapKitSettings()/PHP Options::build() for
    the duration x0.8 and expo.out -> expo.inOut easing-swap rules. Passed
    straight through to Lenis's native `anchors` constructor option. */
export type TAnchorsOptions = {
  offset: number
  immediate: boolean
  lock: boolean
  force: boolean
  easing: string
  duration: number
}
