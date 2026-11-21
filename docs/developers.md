# Developer Reference

The public integration contract for themes, plugins and anyone driving the scroll programmatically. It is deliberately small — one discovery global, three PHP filters, and a handful of CSS classes. The plugin's Elementor control machinery (the Site Settings tab) is internal and may change freely; integrate against what's on this page, not against control IDs.

## Discovery

The gate installs `window.artsSmoothScrolling` at parse time on every request where the engine can run:

```ts
interface IArtsSmoothScrollingGlobal {
  /** Resolves once the engine has actually started. */
  ready: Promise<ISmoothScrolling>
  get(): ISmoothScrolling | null
  /** Shortcut for `get()?.lenis`. */
  readonly lenis: Lenis | null
  version: string
  load(): Promise<typeof Lenis>
}
```

Two consumer patterns:

```ts
// Fire-and-forget — right when "not running yet" is a normal outcome.
window.artsSmoothScrolling?.get()?.lenis?.scrollTo('#pricing')

// Await — right when a script needs the running instance and can wait for it.
const controller = await window.artsSmoothScrolling?.ready
```

`ready` resolves once the engine bundle has booted and the controller exists — not once smoothing has actually started. The controller may be idle (touch, or a `matchMedia` query that doesn't match), so `ready` resolving only tells you the controller is there; `.lenis` is what tells you smoothing is actually running. And on a touch device with the default disable-touch setting, the gate still runs and installs the global, but `ready` stays pending forever because the engine bundle never loads at all. On a request the `arts_smooth_scrolling/enabled` filter turns off, the gate itself never prints — `window.artsSmoothScrolling` doesn't exist at all, so an unguarded `.ready` access throws. Always reach it through optional chaining, as above. `get()` and the `lenis` getter are the synchronous escape hatch for code that has to handle "not running" as a normal case rather than waiting on a promise that may never settle.

## Using the bundled Lenis for your own container

`load()` ensures the engine bundle is present and resolves with the bundled Lenis class, for a container that wants its own instance — a horizontal rail, an infinite list, a scrollable panel:

```js
const Lenis = await window.artsSmoothScrolling?.load()
const rail = new Lenis({ wrapper: el, content: inner, orientation: 'horizontal', autoRaf: true })
```

Guard the call with `?.`, same as `ready` — the global doesn't exist at all when the plugin is disabled via the `arts_smooth_scrolling/enabled` filter. `load()` never enables page-level smooth scrolling: the page controller has its own `matchMedia` gate and stays exactly as it is regardless of when or how often you call `load()`, so it's safe to call from anywhere, including a touch device where the page controller stays idle. It's memoized — concurrent callers share one promise and one injection — and rejects if the boot descriptor is absent or either asset fails to load.

You drive the instance you get back yourself, with `autoRaf: true` or your own ticker calling `lenis.raf(time)`. The page engine changes no global GSAP setting, so a container driven off GSAP's ticker gets GSAP's defaults; if you do that, pass it the frame clock (`document.timeline.currentTime`) rather than the ticker's `time * 1000`, for the reason given under GSAP integration below.

## Server-side filters

`arts_smooth_scrolling/options` filters the payload printed inline before the gate script, in the exact shape the engine consumes:

```php
add_filter( 'arts_smooth_scrolling/options', function ( $options ) {
	// $options = [
	//   'matchMedia'     => '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', // '' = always on
	//   'reducedMotion'  => true,
	//   'prefersGSAPRaf' => true,
	//   'lenisOptions'   => [
	//     'duration' => 1.2,
	//     'easing'   => 'expo.out',
	//     'anchors'  => [
	//       'offset' => 0, 'immediate' => false, 'lock' => false,
	//       'force' => true, 'easing' => 'expo.inOut', 'duration' => 0.96,
	//     ],
	//   ],
	// ];
	return $options;
} );
```

`arts_smooth_scrolling/enabled` is the kill switch:

```php
add_filter( 'arts_smooth_scrolling/enabled', fn( $on ) => $on && ! is_checkout() );
```

Evaluated once per request, before output. A disabled request prints no gate and no globals, and `<html>` still gets `no-smooth-scroll` (via `language_attributes`), so the class contract stays total — to your CSS, a filtered request is a touch device. The Elementor editor preview ignores the filter and always runs, so a live edit in Site Settings has something to react to.

`arts/reduced_motion/enabled` (default `true`) decides whether a visitor whose system asks for reduced motion gets native scrolling. While it is on, every comma-separated branch of the `matchMedia` query gets ` and (prefers-reduced-motion: no-preference)` appended (an empty query becomes that condition alone), so the engine is never downloaded for such a visitor, and smoothing stops and starts with the system setting, without a reload. Returning `false` prints the bare query and also turns off Lenis's own reduced-motion handling, so smoothing stays on for everyone:

```php
add_filter( 'arts/reduced_motion/enabled', '__return_false' );
```

The filter name is shared with other Arts plugins and themes, so one callback forces full motion across all of them. It runs before `arts_smooth_scrolling/options`, and the payload carries the verdict as `reducedMotion`; a `matchMedia` you set in that filter replaces the composed query.

## Runtime API

`window.artsSmoothScrolling.get()` returns the controller:

```ts
interface ISmoothScrolling {
  init(): void
  destroy(): void
  reinit(options: TOptions): void
  readonly lenis: Lenis | null
}
```

`init`/`destroy` are idempotent — a second call while already in that state is a no-op. `reinit` tears down and boots fresh with a new options object; it's what the Elementor editor's live-preview bridge calls on every kit-setting change, and nothing else in the plugin calls it.

`lenis` is the live [Lenis](https://github.com/darkroomengineering/lenis) instance while the engine is running, `null` while it's disabled, torn down, or idling on an unmatched `matchMedia` query:

```ts
const controller = await window.artsSmoothScrolling.ready
controller.lenis?.on('scroll', ({ scroll, progress }) => {
  /* ... */
})
```

## Integrating with a theme

A theme that locks the page (a preloader, a modal) or swaps pages over AJAX has to drive Lenis itself. Four things to know first.

**Read the instance on every call.** `lenis` is `null` until the engine has booted, never boots on a touch device with the default setting, and is replaced by a new instance whenever the `matchMedia` query flips or the controller is torn down and started again. A reference you kept from an earlier call may be destroyed. Go through `window.artsSmoothScrolling?.get()?.lenis` each time, and treat `null` as "nothing to do".

**Pausing scrolling.** The plugin doesn't pass Lenis `autoToggle`, so Lenis never looks at `overflow` after it is created: hiding `<html>` overflow for a preloader or a modal lock doesn't stop it. Stop and start it yourself:

```js
window.artsSmoothScrolling?.get()?.lenis?.stop()
// ... later
window.artsSmoothScrolling?.get()?.lenis?.start()
```

A new instance starts running, so if the engine can boot while your lock is held, re-apply the stop once it does:

```js
window.artsSmoothScrolling?.ready.then((controller) => {
  if (isLocked) {
    controller.lenis?.stop()
  }
})
```

That covers a late boot. A `matchMedia` flip during the lock creates another instance, so a long lock that has to survive it should check again on the way out.

**AJAX transitions.** Stop Lenis when the visit starts. When the new page is in place, put the scroll position back with `scrollTo(0, { immediate: true, force: true })`, then `start()`, then `resize()`:

```js
const lenis = window.artsSmoothScrolling?.get()?.lenis
lenis?.scrollTo(0, { immediate: true, force: true })
lenis?.start()
lenis?.resize()
```

`scrollTo` returns without doing anything while Lenis is stopped unless it gets `force: true`. `resize()` re-measures the page, because Lenis clamps every scroll to the range it measured last, and the new page is a different height. `start()` after `stop()` resumes from wherever the window is; `stop()` doesn't move it. If a visit is aborted, `start()` again. ArtsAJAXNavigator's smooth scrolling plugin follows the same shape (`stop()` at the visit's start, `start()` then `resize()` once the page is interactive), but the navigator writes the landing scroll position itself instead of going through Lenis.

**Teardown.** `window.artsSmoothScrolling.destroy()` disposes the plugin for the rest of the page visit: it destroys the controller and removes the global, and nothing brings it back. The per-page pair is the controller's own `get()?.destroy()` and `get()?.init()`; `init()` after `destroy()` builds a fresh Lenis, so anything you attached to the old `lenis` (an `on('scroll')` listener, for one) has to be attached again.

## CSS

Exactly one of `has-smooth-scroll` / `no-smooth-scroll` is always present on `<html>`: set pre-paint from the `matchMedia` prediction, corrected by the engine if reality differs, flipped to `no-` on asset failure, and printed server-side when the request is disabled via the PHP filter. `has-smooth-anchors` is added once the engine is running, alongside `has-smooth-scroll` — anchors have no independent toggle in this plugin. Key any fallback styling off these three classes; a touch device, a filtered request and a broken deploy all land in the same, handled state.

Beyond that, the plugin ships Lenis's own stylesheet as-is (`lenis-*` classes on the scrolling elements) — see [Lenis's docs](https://github.com/darkroomengineering/lenis) for what those do.

## GSAP integration

If `window.gsap` is present (and the PHP-controlled `prefersGSAPRaf` stays at its default `true`), the engine drives Lenis off GSAP's own ticker instead of running its own `requestAnimationFrame` loop — added via `gsap.ticker.add(fn, false, true)`, whose third argument prioritizes it ahead of GSAP's own tween renders so Lenis's scroll position is current before any ScrollTrigger-bound tween reads it. GSAP doesn't have to be there first: the engine is loaded asynchronously and GSAP is usually deferred, so until `window.gsap` exists the engine runs its own loop and hands over on the first frame it appears. The ticker is used for ordering only — Lenis is advanced on the document's frame clock (`document.timeline.currentTime`), not on the ticker's `time`, which is `Date.now()`-based and would turn its millisecond rounding into uneven scroll steps. For the same reason the engine does not call `gsap.ticker.lagSmoothing(0)`: GSAP's lag smoothing stays at its default, and no global GSAP setting is changed.

If `window.ScrollTrigger` is present, its cached scroll position is refreshed (`ScrollTrigger.update()`) on every Lenis `scroll` event, so pinned/scrubbed animations stay in sync without any setup on your end.

## Anchor semantics

Same-page `#anchor` links scroll through Lenis, matched the way Lenis's own anchor handling matches them (host + pathname, a real hash) — but the plugin owns the listener, and a click some other script already called `preventDefault()` on is left alone, so a tab, menu or popup that takes its link over isn't overridden. Bare `#`, `/#` and `./#` — forms Lenis's own handler ignores because they carry no real hash — scroll to the top: `/#` and `./#` only when they resolve to the current page's exact host and pathname. There's no trailing-slash normalization, so a link like `/#pricing` on a page at `/blog/` navigates to the homepage and scrolls there, the same as it would without this plugin. `#top` is not special-cased here; Lenis itself already treats it as scroll-to-0 when no `id="top"` element exists.

Links into [Arts Horizontal Scroll](https://wordpress.org/plugins/horizontal-scroll-for-elementor/) panels are the one exception: every panel shares the pinned section's vertical position, so the plugin asks `window.artsHorizontalScroll.getScrollTop()` (`window.ARTS_HS` on Horizontal Scroll 1.4.x) where the panel lands, takes the click (`preventDefault()`, `history.pushState()`) and scrolls there through Lenis — also mid-scroll, when a native scroll would be overwritten by the running animation.

## Wheel events other scripts consumed

A wheel event some other script already called `preventDefault()` on does not scroll the page: an embed that takes the wheel for itself (a Google Map zooming on ⌘/Ctrl + scroll, a 3D viewer, a custom slider) keeps it, as it would without smooth scrolling. Lenis on its own ignores `defaultPrevented` and would scroll the page underneath. A wheel nobody prevented, including a plain scroll over a map in cooperative mode, still scrolls the page smoothly. Touch input is unaffected.

## Elementor control IDs are internal, not the contract

Site Settings → Smooth Scrolling is a thin UI over `arts_smooth_scrolling/options`. Its control IDs, defaults and grouping may change between versions without notice — build against the filter payload and the runtime API above, not against `arts_smooth_scrolling_duration` and friends.

## What stays out

No per-element opt-out attributes, no JS API for changing duration or easing at runtime (use the `arts_smooth_scrolling/options` filter, which is re-evaluated on every request), no ready-state CustomEvent — `ready` and `get()` already cover both the "wait for it" and "check right now" cases.

## TypeScript package entries

Themes integrating with the installed WordPress plugin use `@arts/smooth-scrolling/contract` for public
types and passive values. This entry does not import the engine, initialize browser globals,
load assets, install listeners, or depend on producer build defines. Keep the existing optional
browser discovery checks: updating these compile-time imports does not require a newer installed
WordPress plugin.

The root exports `createSmoothScrolling` and `createSmoothScrollingApp`. Imports and app construction
are passive; `app.init()` publishes `window.artsSmoothScrolling` and initializes the controller when
the document body exists. `app.destroy()` permanently disposes that owner, including pending startup.
WordPress's separate boot adapter owns the Elementor kit and legacy anchor listeners.

`pnpm build:library` produces ESM and CSS in `dist/esm`, declarations in `dist/types`, and does not
write WordPress assets or mirror paths. Default imports use those outputs. Bundlers and TypeScript
can select the `arts-source` condition for editable source. `/styles.scss` exposes the source
stylesheet (add the consumer's `node_modules` to Sass `loadPaths` for Lenis); `/styles.css` is compiled
CSS. Existing `/package.json`, `/src/ts/*`, and `/src/styles/*` paths remain available.

```ts
import { createSmoothScrollingApp } from '@arts/smooth-scrolling'
import '@arts/smooth-scrolling/styles.css'

const app = createSmoothScrollingApp({
  options: { matchMedia: '(hover: hover)', prefersGSAPRaf: true, lenisOptions: {} }
})
app.init()
// Dispose the owner at application teardown.
app.destroy()
```

For deferred loading, use the engine-free gate and a stylesheet URL supplied by the host bundler:

```ts
import { createSmoothScrollingGate } from '@arts/smooth-scrolling/gate'

const options = { matchMedia: '(hover: hover)', prefersGSAPRaf: true, lenisOptions: {} }
const gate = createSmoothScrollingGate({
  options,
  css: '/assets/smooth-scrolling.css',
  load: async (signal) => {
    const { createSmoothScrollingApp } = await import('@arts/smooth-scrolling')
    createSmoothScrollingApp({ options, signal }).init()
  }
})
gate.init()
// Also disposes a loaded app and prevents a delayed import from starting it.
gate.destroy()
```

The gate waits for CSS before calling `load`. Pass its captured signal through the asynchronous
bootstrap; reading a replacement global after the import would claim the wrong lifetime. The
WordPress adapter instead supplies a classic `js` URL and binds its original signal to the script.
Eligibility, ready semantics, and the `load()` Lenis constructor API match the WordPress provider.
Pending `load()` calls reject on disposal; `ready` stays pending if no controller was created.

`pnpm exec vitest run tests/ts/packageEntries.test.ts` checks isolated consumers with
`skipLibCheck: false`, inspects bundled contract graphs, and invokes the public root factory
without building or synchronizing WordPress assets.

The contract preserves Lenis's full instance and constructor types, including
`IArtsSmoothScrollingGlobal.load(): Promise<typeof Lenis>`. Lenis is a declared runtime dependency
and stays external in the ESM build, so hosts use one constructor. WordPress bundles its own copy
as before. The runtime version comes from `composer.json`; no consumer version define is needed.
