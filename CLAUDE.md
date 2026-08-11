# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lenis-powered smooth scrolling for Elementor, shipped two ways from one codebase:

- a standalone WordPress plugin (staged into `dist/` and zipped), and
- a composer package `arts/smooth-scrolling` (PSR-4 `Arts\SmoothScrolling\` → `src/php/`), consumed via composer symlink by themes (velum-core).

`ARTS_SMOOTH_SCROLLING_PLUGIN_FILE` is defined only by the standalone bootstrap (`src/wordpress-plugin/smooth-scrolling-for-elementor.php`); PHP code checks it to detect which mode it is running in.

## Commands

- `pnpm test` — full Vitest suite. Single file: `pnpm test tests/core/easings.test.ts`. Single test: append `-t 'name'`.
- `pnpm test:coverage` — Istanbul coverage (the format fallow's `health --coverage` requires; don't switch the provider to v8).
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` / `pnpm format` — Biome
- `pnpm phpstan` — PHPStan level max over `src/php` (WordPress + Elementor stubs; needs `composer install` first). `treatPhpDocTypesAsCertain: false` is deliberate — Elementor types `Plugin::$instance` only via docblock, and the null-guards must not be flagged as dead code.
- `pnpm knip` — dead-export check
- `pnpm dev:plugin` — watch mode; compiles into `src/php/libraries/` and, only if `DEV_TARGET` is set in the gitignored `.env`, mirrors the plugin into that Local site directory.
- `pnpm build` — release build: stamps versions, stages `dist/smooth-scrolling-for-elementor/`, zips it.

Pre-commit (lefthook): Biome auto-fixes staged files, then typecheck, the full test suite, and PHPStan (the latter only when `src/php` changed).

## Runtime architecture

A three-stage load spanning PHP and TS:

1. **PHP prints, never enqueues.** `Plugin::print_head()` (`wp_head`, priority 99) emits one inline block: `window.artsSmoothScrollingOptions` (from `Options::build()`, filtered through `arts_smooth_scrolling/options`), `window.artsSmoothScrollingBoot` (filemtime-versioned engine JS/CSS URLs plus the editor flag), and the compiled `gate.js` contents — all wrapped in optimizer opt-out markers (Autoptimize, LiteSpeed, Rocket Loader, WP Rocket). `arts_smooth_scrolling/enabled` is the per-request kill switch; a disabled request instead gets `no-smooth-scroll` on `<html>` via `language_attributes`. Everything is guarded on Elementor's presence — without Elementor the plugin is fully inert.
2. **`src/ts/gate.ts`** — a tiny pre-paint gate bundled separately (no sourcemap, no banner). Installs the `window.artsSmoothScrolling` discovery global with a pending `ready` promise, predicts the `has-smooth-scroll`/`no-smooth-scroll` class on `<html>`, and lazily injects the compiled stylesheet then — chained on its `onload`, so a CSS failure aborts the boot — the engine bundle: immediately in the editor preview or when the `matchMedia` query already matches, otherwise on the first matching `change` event.
3. **`src/ts/boot.ts`** — engine entry, side-effect boot (`index.ts` is the passive library surface for direct-import consumers). Claims the gate's `__resolveReady`, builds the controller via `createSmoothScrolling()` (`src/ts/core/controller.ts`, which owns the Lenis lifecycle: raf driver — GSAP ticker preferred when `window.gsap` exists — ScrollTrigger sync, anchor handling, `<html>` state), and listens for the `arts-smooth-scrolling:kit-change` CustomEvent to `reinit()` on Site Settings changes.

The editor side of that CustomEvent is `Plugin::print_editor_bridge()`: a `$e` UI-After hook on `document/elements/settings` in the editor window that forwards kit-setting changes into the preview iframe. The editor preview bypasses both the `enabled` filter and lazy loading — the engine must be live before the first Site Settings change.

Invariants:

- **PHP/TS parity**: `Options::build()` (PHP, server render path) and `mapKitSettings()` (`src/ts/kitSettings.ts`, editor live-preview path) must derive the identical `TOptions` shape from the same kit controls, including quirks like `is_numeric()` semantics. Changing one means changing the other.
- **Idempotence**: `gate.ts` and `boot.ts` both guard against re-execution (double `wp_head` themes, AJAX-transition script replays). The gate script tag deliberately carries no `id`. Preserve these properties.
- **Public contract** is `docs/developers.md`: the discovery global, the two `arts_smooth_scrolling/*` filters, the three `<html>` classes. Elementor control IDs (`arts_smooth_scrolling_*`) are internal and free to change; the contract is not.
- `Plugin`'s constructor checks `did_action('elementor/loaded')` before adding the listener — this plugin sorts alphabetically after "elementor", so the action has already fired by the time it loads.

## Build system

Custom esbuild/sass pipeline in `build/` (`node build/index.js dev|build`), configured by `project.config.js`.

- Compiled assets land in `src/php/libraries/smooth-scrolling-for-elementor/` and are **gitignored** — the composer-symlink consumer (velum-core) sees whatever the local dev/build run produced; the release build stages fresh assets into `dist/`. Never hand-edit `gate.js`, `smooth-scrolling-for-elementor.js/.css` there; edit `src/ts` / `src/styles` and rebuild.
- `composer.json` `"version"` is the single version source. The build stamps it into the plugin header, `readme.txt`, `package.json`, the `ARTS_SMOOTH_SCROLLING_PLUGIN_VERSION` constant, and the `__ARTS_SMOOTH_SCROLLING_VERSION__` esbuild define. To release: bump composer.json, build, push a `v*` tag — the release workflow validates the tag against the stamped files and takes the changelog entry from `src/wordpress-plugin/readme.txt`.
- `project.config.js` edits need a dev-mode restart (Node module cache); `composer.json` is re-read live by the watcher.

## Tests

- Default Vitest environment is `node`, so an accidental `document` reach fails loudly. DOM suites are named `*.dom.test.ts` and opt in with a `// @vitest-environment happy-dom` docblock (jsdom is not an option: no matchMedia/ResizeObserver/IntersectionObserver, so `init()` throws).
- Tests import source through the `@ts` alias. It is test-only — never valid inside `src/ts`, because consumers compile that source with their own config. `tests/aliasBoundary.test.ts` enforces the split.
- `tests/support.ts` holds shared factories (fake Lenis, controllable matchMedia); `tests/setup.ts` forces `import.meta.env.DEV` to false, matching the production build define (nothing in `src/ts` reads it today).
