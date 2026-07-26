# Smooth Scrolling for Elementor — Design Spec

Date: 2026-07-27
Status: awaiting user approval

## Overview

A standalone, free WordPress plugin (slug `smooth-scrolling-for-elementor`) that replaces
native scrolling with Lenis-driven inertia scrolling on Elementor sites. Distributed via
public GitHub repo (`https://github.com/artkrsk/smooth-scrolling-for-elementor`) with a
wp.org-format `readme.txt`, same as `cursor-follower-for-elementor`.

This is a **full fresh rewrite** of both TypeScript and PHP following the conventions of
`/Users/art/Projects/Plugins/cursor-follower-for-elementor` (the newest-generation sibling).
The framework package `/Users/art/Projects/Framework/packages/ArtsSmoothScrolling` (v1) is
the **behavioral spec** — its observable behavior is ported, its code is not. v1 remains
untouched in the framework; nothing existing breaks.

## Decision log

| Decision | Choice |
|---|---|
| Port strategy | Full fresh rewrite of TS + PHP, cursor-follower conventions, v1 as behavioral spec |
| GSAP | Never bundled. Runtime detection of `window.gsap` / `window.ScrollTrigger`: GSAP-ticker rAF driving (prioritized) + ScrollTrigger sync when present; self-sufficient rAF loop otherwise |
| Feature scope | Parity with v1 |
| Docs site | None for now (VitePress scaffold can be copied later) |
| Loading strategy | matchMedia gate (adapted cursor-follower gate, minus intent-waiting) + inline CSS; no `wp_enqueue_script` |
| Runtime dependencies | Zero in both ecosystems. Lenis `^1.3` is a devDependency compiled into the bundle by esbuild |
| PHP tests | PHPStan only (cursor-follower pattern); no PHPUnit/wp-env harness |

## Feature set (v1 parity)

- One global Lenis instance per page. No support for multiple/nested scroll containers.
- Enable/disable toggle (Elementor Site Settings).
- Disable-on-touch via matchMedia gate, default query `(hover: hover) and (pointer: fine)`.
  Lenis is created/destroyed as the query starts/stops matching (hybrid devices included).
- Duration slider (0.1–4.0 s, default 1.2) and easing select (`expo.out` default, `linear`).
- Anchor-link smooth scrolling for same-page `#...`, `/#...`, `./#...` links with derived
  options: `duration = main × 0.8`; `easing = expo.inOut` when main easing is `expo.out`,
  otherwise same as main; `offset 0`, `immediate false`, `lock false`, `force true`.
- `<html>` state classes: `has-smooth-scroll` / `no-smooth-scroll` / `has-smooth-anchors`.
- Scroll prevention inside `.dialog-prevent-scroll` containers (Lenis `prevent` callback:
  `(node) => node.closest('.dialog-prevent-scroll') !== null`).
- Live editing in the Elementor editor: toggling enable and changing options reinitializes
  the engine in the preview without a reload; assets load in the preview even when disabled.
- ScrollTrigger sync and GSAP-ticker driving when GSAP is present on the page (see below).

Dropped from v1: the `GSAPLoader` boot (and with it v1's missing `arts/gsap-loader`
composer-dependency bug), the visible `prefersGSAPRaf` Elementor control (becomes a
JSON-only option), the `init` option (superseded by the gate — PHP simply doesn't print
the gate when the plugin is disabled on the front end), and the async operation queue
(lifecycle is synchronous; a reentrancy guard suffices).

## Naming

| Thing | Name |
|---|---|
| Slug / text domain | `smooth-scrolling-for-elementor` |
| PHP namespace | `Arts\SmoothScrolling` (PSR-4 from `src/php/`) |
| npm package | `@arts/smooth-scrolling` (private) |
| WP constants | `ARTS_SMOOTH_SCROLLING_PLUGIN_VERSION`, `ARTS_SMOOTH_SCROLLING_PLUGIN_FILE` |
| esbuild define | `__ARTS_SMOOTH_SCROLLING_VERSION__` (version from composer.json) |
| Options global | `window.artsSmoothScrollingOptions` |
| Boot descriptor global | `window.artsSmoothScrollingBoot` |
| Discovery global | `window.artsSmoothScrolling` (diverges from v1's `artsSmoothScrollingForElementor`; the standalone plugin owns the shorter name) |
| Editor bridge event | `arts-smooth-scrolling:kit-change` |
| Elementor tab ID | `arts-smooth-scrolling` |
| Kit control prefix | `arts_smooth_scrolling_*` (cursor-follower convention; no settings migration from v1 — v1 lives only inside the framework/theme context) |
| Options filter | `arts/smooth_scrolling/options` (v1's name, kept) |
| Initial version | 1.0.0 |

## Repo layout and tooling (copied from cursor-follower)

```
build/                  # entire pipeline copied verbatim: esbuild IIFE bundle, sass compile,
                        # composer.json-driven version/header stamping (meta.js), .env DEV_TARGET
                        # dev sync, release zip staging + assertRelease checks, changelog extract
project.config.js       # per-plugin: slug, entries (boot, gate, scss), paths, version constant
composer.json           # single source of version + plugin-header metadata; require-dev only
package.json            # same scripts/devDeps as cursor-follower + lenis ^1.3 (devDependency)
tsconfig.json           # strict; @engine and @ts/* aliases (@ts/* remains test-only)
biome.json / knip.json / .fallowrc.jsonc / lefthook.yml / vitest.config.ts / .gitignore
src/wordpress-plugin/   # smooth-scrolling-for-elementor.php (bootstrap), readme.txt (real content)
src/php/                # Plugin.php, Options.php, Elementor/SiteSettingsTab.php
src/php/libraries/smooth-scrolling-for-elementor/   # gitignored compiled JS output
src/ts/                 # engine (below)
src/styles/index.scss   # compiled to CSS that PHP prints inline
tests/                  # vitest, mirrors src/ts
```

- `vendor-prefixed/` scaffolding is kept only if removing it breaks the copied build/composer
  scripts; no strauss/mozart — there are no runtime PHP dependencies to prefix.
- Requirements, declared via composer.json metadata → stamped headers (no gate code, no
  admin notices): `Requires PHP: 8.0`, `Requires at least: 6.0`,
  `Requires Plugins: elementor` (enforced natively by WP 6.5+; on older WP the plugin
  simply no-ops without Elementor because everything hooks behind `elementor/loaded` or
  guards on Elementor's presence).
- Pre-commit via lefthook: biome → typecheck → vitest → phpstan (sequential).

## TypeScript architecture (`src/ts/`)

File roles (cursor-follower conventions):

- `index.ts` — library surface for source-compiling consumers: `createSmoothScrolling(options)`
  factory + public types. Not part of the WP bundle.
- `boot.ts` — WP entry (compiled to the injected bundle). Reads
  `window.artsSmoothScrollingOptions`, creates the controller, installs/claims the
  `window.artsSmoothScrolling` discovery global (racing-safe handshake with the gate's
  placeholder: gate may install a pending `ready` resolver first; boot claims it), wires the
  `arts-smooth-scrolling:kit-change` listener (editor live preview). Written
  DOM-timing-agnostic: the injected script executes on arrival (async semantics), so boot
  must not assume DOM readiness — Lenis attaches to the document scroller, anchors use
  event delegation on `document`.
- `gate.ts` — tiny inline pre-paint loader (separate build entry, no banner/sourcemap). See
  Loading strategy.
- `kitSettings.ts` — `mapKitSettings()`: raw Elementor kit-settings shape (`{size, unit}`
  sliders, `'yes' | ''` switchers) → `TOptions`. Manual mirror of PHP `Options::build()`;
  used only by the editor live-preview path.
- `global.d.ts` — Window contract (`artsSmoothScrolling`, `artsSmoothScrollingOptions`,
  `artsSmoothScrollingBoot`, custom event map entries).
- `env.d.ts` — `import.meta.env` + `__ARTS_SMOOTH_SCROLLING_VERSION__` define shims.

Core modules (`src/ts/core/`), each independently testable:

- **Controller** — owns lifecycle: `init()` / `destroy()` / `reinit(options)` with a simple
  reentrancy guard (no v1 async queue). Composes the modules below. When created with
  `enabled: false` (editor preview with the feature off), stays idle until a `reinit()`
  with `enabled: true` arrives from the kit-change bridge.
- **Media gate (runtime)** — `matchMedia` watcher; creates Lenis when the query matches
  (or when the query string is empty = always on), destroys it when it stops matching.
- **Lenis factory** — merges defaults with user options, resolves easing names to functions,
  builds the `anchors` config. Base Lenis options carried from v1: `duration 1.2`,
  `easing expo.out`, `autoRaf: false`, `autoToggle: true`, `stopInertiaOnNavigate: true`,
  the `.dialog-prevent-scroll` prevent callback. Each is validated against the Lenis 1.3.x
  API during implementation.
- **rAF driver** (~30 lines, replaces v1's RafManager + AnimationService pair) — drives
  `lenis.raf(time)`. Two modes, chosen at Lenis-creation time:
  - `window.gsap` present and `prefersGSAPRaf` true →
    `gsap.ticker.add(update, false, true)` — `prioritize: true` puts the callback at the
    front of the ticker queue so the per-frame order is: Lenis computes scroll → `scroll`
    event fires → `ScrollTrigger.update()` runs inside it → GSAP renders tweens sampling
    this frame's scroll value (eliminates one-frame lag on scrubbed/pinned animations).
    Ticker time is seconds; `lenis.raf` takes ms → `time * 1000`. On adopting the ticker,
    call `gsap.ticker.lagSmoothing(0)` once (standard Lenis recipe; deliberate global side
    effect, not restored on destroy, documented in readme). Destroy removes the ticker
    callback via `gsap.ticker.remove`.
  - otherwise → own `requestAnimationFrame` loop; destroy cancels it.
- **ScrollTrigger sync** — on every Lenis `scroll` event: `window.ScrollTrigger?.update()`.
  Optional-chained per event, so it costs nothing when absent and tolerates ScrollTrigger
  loading after the engine. No `scrollerProxy` — Lenis scrolls the real window, ScrollTrigger
  reads it natively. No `refresh()` calls needed — Lenis does not alter layout.
- **Anchors** — same-page anchor smooth scrolling for `#...`, `/#...`, `./#...` href forms
  (links whose path resolves to the current page and whose hash targets an existing element).
  Implementation preference: Lenis 1.3's native `anchors` option if it covers all three
  forms; otherwise a small delegated click-interceptor calling `lenis.scrollTo()` (v1's
  AnchorHandler behavior). Either way the observable behavior above is the contract.
- **DOM state** — toggles `has-smooth-scroll` / `no-smooth-scroll` / `has-smooth-anchors`
  on `<html>`; corrects any gate prediction after boot and on media-gate transitions.
- **Easings** — three local pure functions: `linear`, `expo.out`, `expo.inOut`; name → fn
  map. Unknown names fall back to Lenis's default (v1 behavior).

Options shape (printed by PHP, consumed by boot; also the `createSmoothScrolling` input):

```ts
type TOptions = {
  enabled: boolean
  matchMedia: string          // '' = always on; default '(hover: hover) and (pointer: fine)'
  prefersGSAPRaf: boolean     // default true; JSON/filter only, no UI control
  lenisOptions: {
    duration: number          // default 1.2
    easing: string            // 'expo.out' | 'linear'
    anchors: {
      offset: number; immediate: boolean; lock: boolean
      easing: string; duration: number; force: boolean
    }
  }
}
```

Discovery global: `window.artsSmoothScrolling = { ready: Promise<instance>, instance,
lenis }` — themes/plugins do `window.artsSmoothScrolling?.lenis?.on('scroll', ...)` or
`await window.artsSmoothScrolling.ready`.

## Loading strategy (matchMedia gate)

No `wp_enqueue_script`/`wp_enqueue_style` on the front end. `Plugin::print_head()` (hooked
`wp_head`, priority 99) prints, in order, all wrapped with optimizer opt-outs
(`data-no-optimize`, `data-cfasync="false"`, `nowprocket`, `<!--noptimize-->` comments):

1. **Options JSON** — `window.artsSmoothScrollingOptions = {...}` (final `TOptions` shape
   from `Options::build()`). Printed before the gate so the engine's config is on `window`
   no matter when the injected bundle executes.
2. **Inline CSS** — the compiled contents of `src/styles/index.scss` in a `<style>` tag
   (~0.5 KB: Lenis's required rules + `html.has-smooth-anchors { scroll-behavior: initial }`).
   No stylesheet request, no FOUC, no render-blocking `<link>` injection. All rules are
   class-scoped, so printing them unconditionally is inert until the engine adds classes.
3. **Boot descriptor + gate** — `window.artsSmoothScrollingBoot = { src, editor }` (bundle
   URL with `filemtime()` cache-bust, editor-preview flag), then the built `gate.js`
   contents inline. The gate reads the media query and enabled flag from the options
   global printed in step 1.

Gate behavior (synchronous, idempotent via a `window.artsSmoothScrolling` placeholder guard):

- Installs the placeholder discovery global with a pending `ready` resolver.
- Predicts and sets `has-smooth-scroll` / `no-smooth-scroll` on `<html>` pre-paint from the
  media query.
- Injects the `<script>` (dynamic injection = async semantics, low fetch priority — yields
  to LCP-critical resources; executes on arrival):
  - immediately when `editor` flag is set, or the media query is empty, or it matches;
  - otherwise attaches a `matchMedia` `change` listener and injects on first match
    (hybrid devices), then removes the listener.
- Touch devices with disable-on-touch on: **zero engine bytes downloaded**.

When the plugin is **disabled** (front end): nothing is printed except a `no-smooth-scroll`
class stamped server-side via the `language_attributes` filter (cursor-follower pattern),
so themes can style against the class without JS. In the **editor preview**: everything is
always printed regardless of the enabled setting (with `enabled: false` in the options and
the `editor` flag forcing immediate injection), so the enable toggle works live — v1's
behavior, preserved.

## PHP architecture (`src/php/`)

- **`Plugin.php`** — singleton (`instance()`, private constructor). Hooks:
  - `wp_head` (99) → `print_head()` (front end: only when Elementor is active; prints
    nothing when disabled — the disabled-state html class comes from the separate
    `language_attributes` filter below).
  - `language_attributes` → `no-smooth-scroll` class when disabled.
  - `elementor/loaded` → registers the Site Settings tab (`elementor/kit/register_tabs`)
    and the editor bridge (`elementor/editor/after_enqueue_scripts`).
  - `plugin_action_links_*` → "Settings" link deep-linking into the Elementor editor's
    Site Settings tab (guarded by `defined('ARTS_SMOOTH_SCROLLING_PLUGIN_FILE')` so it is
    absent when `src/php` is consumed as a composer package).
  - Editor bridge: `wp_add_inline_script` on `elementor-editor` — a
    `$e.modules.hookUI.After` hook on `document/elements/settings` that, on any
    `arts_smooth_scrolling_*` kit-setting change, dispatches
    `CustomEvent('arts-smooth-scrolling:kit-change', { detail: settings })` into the
    preview iframe. `boot.ts` responds: `mapKitSettings()` → controller `reinit()`
    (destroy + init with new options — v1's full-reinit behavior).
- **`Elementor/SiteSettingsTab.php`** — `Tab_Base` subclass, `TAB_ID 'arts-smooth-scrolling'`,
  group `settings`, label "Smooth Scrolling". Controls (all `frontend_available: true`):
  | Control | Type | Default |
  |---|---|---|
  | `arts_smooth_scrolling_enabled` | switcher | yes |
  | `arts_smooth_scrolling_disable_touch` | switcher | yes |
  | `arts_smooth_scrolling_duration` | slider 0.1–4.0, step 0.1 | 1.2 |
  | `arts_smooth_scrolling_easing` | select: `expo.out`, `linear` | `expo.out` |
- **`Options.php`** — static `build()`: reads kit settings via Elementor's API, produces the
  final `TOptions` shape (unwraps `{size, unit}` slider values, maps switchers to booleans,
  maps disable-touch → matchMedia string, derives the `anchors` block per the rules in
  Feature set). Result passes through `apply_filters('arts/smooth_scrolling/options', ...)`
  (where `prefersGSAPRaf` can be overridden).
- **Bootstrap** (`src/wordpress-plugin/smooth-scrolling-for-elementor.php`) — header
  docblock (stamped by `build/meta.js`), ABSPATH guard, constants, `vendor/autoload.php`,
  `Plugin::instance()`. ~25 lines.
- **`readme.txt`** — written with real content (v1's is an unedited Fluid Design System
  copy-paste): description, installation, FAQ (GSAP/ScrollTrigger interplay, how to access
  Lenis from JS, the `lagSmoothing(0)` side effect), changelog.

## Testing

Vitest, mirroring `src/ts/` 1:1; DOM tests opt in per-file via
`// @vitest-environment happy-dom` (`.dom.test.ts` naming); istanbul coverage; shared
fixtures in `tests/support.ts`, `tests/setup.ts` forces `import.meta.env.DEV` false.

Suites: easing math; `kitSettings` mapping (sliders, switchers, anchors derivation);
anchor-link matching (`#x`, `/#x`, `./#x` match; external URLs, other-path `/page#x`,
bare `#`, missing targets don't); media-gate create/destroy transitions incl. rapid
toggling under the reentrancy guard; rAF driver selection (gsap present/absent ×
`prefersGSAPRaf` true/false) and teardown (ticker callback removed, rAF cancelled);
ScrollTrigger sync (called per scroll when present, tolerated when absent/late); boot
idempotency + gate handshake (`ready` resolves once, placeholder claimed); the
`aliasBoundary` guard test copied as-is.

PHP: PHPStan (phpstan-wordpress + `arts/elementor-stubs`), no PHPUnit.

## Error handling / edge cases

- Missing options global, double gate print, double boot: no-ops (idempotency guards).
- Elementor missing: WP 6.5+ blocks activation via `Requires Plugins`; older WP → all
  behavior hooked behind `elementor/loaded`/Elementor guards, plugin is inert.
- `destroy()` fully restores native scroll: Lenis destroyed, driver stopped (ticker
  callback removed / rAF cancelled), delegated listeners removed, html classes flipped to
  `no-smooth-scroll`. `lagSmoothing(0)` is intentionally not reverted (documented).
- Unknown easing name → Lenis default easing (v1 behavior).

## Out of scope

Multiple/nested scroll containers; ScrollTrigger `scrollerProxy`; bundling GSAP; VitePress
docs site; wp.org submission assets; PHPUnit/wp-env harness; strauss/vendor-prefixing;
settings migration from v1; accessibility additions beyond what Lenis/v1 already do.

## Follow-up after release (separate effort, not part of this plan)

- Update the Velum theme integration (`/Users/art/Projects/Themes/Velum/DEV`) to consume
  the standalone plugin instead of v1 `ArtsSmoothScrolling`. Watch for: the renamed
  discovery global (`window.artsSmoothScrolling` vs v1's
  `window.artsSmoothScrollingForElementor`) and the removed GSAPLoader boot.

## Open implementation questions (resolve during planning/implementation)

1. Does Lenis 1.3's native `anchors` option intercept `/#...` and `./#...` href forms?
   If not → port v1's AnchorHandler as a delegated click-interceptor.
2. Validate carried Lenis option defaults (`autoToggle`, `stopInertiaOnNavigate`) against
   the exact bundled Lenis 1.3.x version; drop any that no longer exist.
3. Whether the copied build/composer scripts tolerate deleting `vendor-prefixed/` or it
   stays as empty scaffolding (cursor-follower keeps it).
