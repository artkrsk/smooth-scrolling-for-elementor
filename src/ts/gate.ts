import { createSmoothScrollingGate } from './createSmoothScrollingGate'

/** WordPress can print the same inline gate more than once. */
if (!window.artsSmoothScrolling) {
  const gate = createSmoothScrollingGate({
    ...(window.artsSmoothScrollingOptions ? { options: window.artsSmoothScrollingOptions } : {}),
    ...window.artsSmoothScrollingBoot
  })
  gate.init()
}
