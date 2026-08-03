# Developer Reference

The public integration contract for themes, plugins and anyone driving the scroll programmatically. It is deliberately small — one discovery global, two PHP filters, and a handful of CSS classes. The plugin's Elementor control machinery (the Site Settings tab) is internal and may change freely; integrate against what's on this page, not against control IDs.

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
}
```

Two consumer patterns:

```ts
// Fire-and-forget — right when "not running yet" is a normal outcome.
window.artsSmoothScrolling?.get()?.lenis?.scrollTo('#pricing')

// Await — right when a script needs the running instance and can wait for it.
const controller = await window.artsSmoothScrolling.ready
```

`ready` only resolves once the engine actually starts, so it never resolves on a touch device with the default disable-touch setting, or on a request the `arts_smooth_scrolling/enabled` filter turns off. `get()` and the `lenis` getter are the synchronous escape hatch for code that has to handle "not running" as a normal case rather than waiting on a promise that may never settle.

## Server-side filters

`arts_smooth_scrolling/options` filters the payload printed inline before the gate script, in the exact shape the engine consumes:

```php
add_filter( 'arts_smooth_scrolling/options', function ( $options ) {
	// $options = [
	//   'matchMedia'     => '(hover: hover) and (pointer: fine)', // '' = always on
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

## CSS

Exactly one of `has-smooth-scroll` / `no-smooth-scroll` is always present on `<html>`: set pre-paint from the `matchMedia` prediction, corrected by the engine if reality differs, flipped to `no-` on asset failure, and printed server-side when the request is disabled via the PHP filter. `has-smooth-anchors` tracks the same state — anchors have no independent toggle in this plugin. Key any fallback styling off these three classes; a touch device, a filtered request and a broken deploy all land in the same, handled state.

Beyond that, the plugin ships Lenis's own stylesheet as-is (`lenis-*` classes on the scrolling elements) — see [Lenis's docs](https://github.com/darkroomengineering/lenis) for what those do.

## GSAP integration

If `window.gsap` is present (and the PHP-controlled `prefersGSAPRaf` stays at its default `true`), the engine drives Lenis off GSAP's own ticker instead of running its own `requestAnimationFrame` loop — added via `gsap.ticker.add(fn, false, true)`, whose third argument prioritizes it ahead of GSAP's own tween renders so Lenis's scroll position is current before any ScrollTrigger-bound tween reads it. Adopting the ticker also calls `gsap.ticker.lagSmoothing(0)` once, the standard recipe for pairing GSAP with a smooth-scroll library. That call changes a global GSAP setting and is not reverted when the engine tears down.

If `window.ScrollTrigger` is present, its cached scroll position is refreshed (`ScrollTrigger.update()`) on every Lenis `scroll` event, so pinned/scrubbed animations stay in sync without any setup on your end.

## Anchor semantics

Same-page `#anchor` links go through Lenis's own anchor handling, matched natively. Bare `#`, `/#` and `./#` — forms Lenis's own handler ignores because they carry no real hash — are handled separately by the plugin: `/#` and `./#` only trigger a scroll when they resolve to the current page's exact host and pathname. There's no trailing-slash normalization, so a link like `/#pricing` on a page at `/blog/` navigates to the homepage and scrolls there, the same as it would without this plugin. `#top` is not special-cased here; Lenis itself already treats it as scroll-to-0 when no `id="top"` element exists.

## Elementor control IDs are internal, not the contract

Site Settings → Smooth Scrolling is a thin UI over `arts_smooth_scrolling/options`. Its control IDs, defaults and grouping may change between versions without notice — build against the filter payload and the runtime API above, not against `arts_smooth_scrolling_duration` and friends.

## What stays out

No per-element opt-out attributes, no JS API for changing duration or easing at runtime (use the `arts_smooth_scrolling/options` filter, which is re-evaluated on every request), no ready-state CustomEvent — `ready` and `get()` already cover both the "wait for it" and "check right now" cases.
