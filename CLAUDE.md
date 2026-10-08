# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lenis-powered smooth scrolling for Elementor, shipped two ways from one codebase:

- a standalone WordPress plugin (staged into `dist/` and zipped), and
- a composer package `arts/smooth-scrolling` (PSR-4 `Arts\SmoothScrolling\` → `src/php/`), consumed via composer symlink by themes (velum-core).

`ARTS_SMOOTH_SCROLLING_PLUGIN_FILE` is defined only by the standalone bootstrap (`src/wordpress-plugin/smooth-scrolling-for-elementor.php`); PHP code checks it to detect which mode it is running in.

"v1" in code comments and test docblocks means the predecessor this rewrite replaced — `Framework/packages/ArtsSmoothScrolling` in the Arts framework monorepo, not an earlier release of this plugin. Comments citing v1 (easing math ported from its `Easing.ts`, no async lifecycle queue, no `preventDefault` on top anchors, the shallow `Object.assign` its live-preview path used) are recording deliberate parity or a deliberate departure.

## Commands

- `pnpm test` — full Vitest suite. Single file: `pnpm test tests/ts/core/easings.test.ts`. Single test: append `-t 'name'`.
- `pnpm test:coverage` — Istanbul coverage (the format fallow's `health --coverage` requires; don't switch the provider to v8).
- `pnpm exec tsc --noEmit` — typecheck over `src/ts` + `tests` (the `tsconfig.json` include list)
- `pnpm exec biome check .` / `pnpm exec biome format --write .` — Biome
- `vendor/bin/phpstan analyse --memory-limit=1G` — PHPStan level max over `src/php` (WordPress + Elementor stubs; needs `composer install` first). Both the level and `treatPhpDocTypesAsCertain: false` live in the shared `vendor/arts/wp-plugin-standards/phpstan/base.neon`, not the local `phpstan.neon` (paths/bootstrap/stubs only). The relaxed setting is deliberate: Elementor types `Plugin::$instance` only via docblock, so the null-guards must not be flagged as dead code.
- `pnpm knip` — dead-export check
- `pnpm dev:plugin` — watch mode; compiles into `src/php/libraries/` and, only if `DEV_TARGET` is set in the gitignored `.env`, mirrors the plugin into that Local site directory.
- `pnpm build` — release build: stamps versions, stages `dist/smooth-scrolling-for-elementor/`, zips it.
- `pnpm build:library` — independent ESM/CSS + declaration output in `dist/esm` and `dist/types`; never mirrors WordPress assets.

Hooks (lefthook) run sequentially, since each step reads the previous one's rewrites. Pre-commit auto-fixes staged files with Biome, stylelint and phpcbf, then typechecks. Pre-push runs the proof: full test suite, PHPStan, phpcs. Both are advisory (`LEFTHOOK=0` skips them); CI is authoritative.

## Runtime architecture

A three-stage load spanning PHP and TS:

1. **PHP prints, never enqueues.** `Plugin::print_head()` (`wp_head`, priority 99) emits one inline block: `window.artsSmoothScrollingOptions` (from `Options::build()`, filtered through `arts_smooth_scrolling/options`), `window.artsSmoothScrollingBoot` (filemtime-versioned engine JS/CSS URLs plus the editor flag), and the compiled `gate.js` contents — all wrapped in optimizer opt-out markers (Autoptimize, LiteSpeed, Rocket Loader, WP Rocket). `arts_smooth_scrolling/enabled` is the per-request kill switch; a disabled request instead gets `no-smooth-scroll` on `<html>` via `language_attributes`. Everything is guarded on Elementor's presence — without Elementor the plugin is fully inert.
2. **`src/ts/gate.ts`** — a tiny pre-paint gate bundled separately (no sourcemap, no banner). Installs the `window.artsSmoothScrolling` discovery global with a pending `ready` promise, predicts the `has-smooth-scroll`/`no-smooth-scroll` class on `<html>`, and lazily injects the compiled stylesheet then — chained on its `onload`, so a CSS failure aborts the boot — the engine bundle: immediately in the editor preview or when the `matchMedia` query already matches, otherwise on the first matching `change` event. It also owns `load()`, the public "give me the bundled Lenis class for my own container" entry point: it forces that same injection on demand, memoized onto one promise that boot.ts settles via `__resolveLoad` — which is what the `loadImpl`/`loadPromise`/`settleLoad` machinery exists for.
3. **`src/ts/boot.ts`** — WordPress adapter around `createSmoothScrollingApp`, with disposable Elementor kit/anchor listeners. The public `/gate` factory is engine-free; its `load(signal)` callback imports the root factory after CSS and passes the original lifetime to `{ options, signal }`. Classic WordPress scripts carry that signal on `document.currentScript`, so delayed scripts cannot adopt a replacement gate. Both factories require explicit `init()` and are permanently disposed by `destroy()`.

The editor side of that CustomEvent is `Plugin::print_editor_bridge()`: a `$e` UI-After hook on `document/elements/settings` in the editor window that forwards kit-setting changes into the preview iframe. The editor preview bypasses both the `enabled` filter and lazy loading — the engine must be live before the first Site Settings change.

Invariants:

- **PHP/TS parity**: `Options::build()` (PHP, server render path) and `mapKitSettings()` (`src/ts/kitSettings.ts`, editor live-preview path) must derive the identical `TOptions` shape from the same kit controls, including quirks like `is_numeric()` semantics. Changing one means changing the other.
- **Idempotence**: `gate.ts` and `boot.ts` both guard against re-execution (double `wp_head` themes, AJAX-transition script replays). The gate script tag deliberately carries no `id`. Preserve these properties.
- **Public contract** is `docs/developers.md`: the discovery global, the two `arts_smooth_scrolling/*` filters, the three `<html>` classes. Elementor control IDs (`arts_smooth_scrolling_*`) are internal and free to change; the contract is not.
- `Plugin`'s constructor checks `did_action('elementor/loaded')` before adding the listener — this plugin sorts alphabetically after "elementor", so the action has already fired by the time it loads.

## Build system

Custom esbuild/sass pipeline shipped by `@arts/wp-plugin-tooling` (`arts-wp dev|build`), configured by `project.config.js`. There is no `build/` directory in this repo — the scripts live in the tooling package.

- Compiled assets land in `src/php/libraries/smooth-scrolling-for-elementor/` and are **gitignored** — the composer-symlink consumer (velum-core) sees whatever the local dev/build run produced; the release build stages fresh assets into `dist/`. Never hand-edit `gate.js`, `smooth-scrolling-for-elementor.js/.css` there; edit `src/ts` / `src/styles` and rebuild.
- `composer.json` `"version"` is the single version source. Runtime code imports its named version through `version.ts`; both builds inline it and source consumers need no version define. The WordPress build also stamps the plugin header, `readme.txt`, `package.json` and the PHP version constant. To release: bump composer.json, build, push a `v*` tag — the release workflow validates the tag against the stamped files and takes the changelog entry from `src/wordpress-plugin/readme.txt`.
- `project.config.js` edits need a dev-mode restart (Node module cache). `composer.json` is re-read fresh per call, and the watcher that restamps on a version bump only runs when `DEV_TARGET` is set — the running esbuild banner keeps the old value until dev restarts.

## Tests

- Default Vitest environment is `node`, so an accidental `document` reach fails loudly. DOM suites are named `*.dom.test.ts` and opt in with a `// @vitest-environment happy-dom` docblock (jsdom is not an option: no matchMedia/ResizeObserver/IntersectionObserver, so `init()` throws).
- Tests import source through the `@ts` alias. It is test-only — never valid inside `src/ts`, because consumers compile that source with their own config. `tests/ts/aliasBoundary.test.ts` enforces the split.
- `tests/ts/support.ts` holds shared factories (fake Lenis, controllable matchMedia); `tests/ts/setup.ts` forces `import.meta.env.DEV` to false, matching the production build define (nothing in `src/ts` reads it today).

## Package integration boundary

`src/ts/contract/index.ts` is the explicit `/contract` entry for themes integrating with the
installed WordPress provider. Export public types from leaf files, and keep runtime values passive
(constants or pure helpers). No engine, boot, producer globals, or version define may enter its
declaration/runtime graph. The package root remains the named factory API for direct library hosts;
root type imports and legacy source/style subpaths remain compatible.

Default exports resolve to the library build; editable source requires `arts-source` in both the
consumer bundler and TypeScript. Lenis is external in ESM and declared as a runtime dependency;
the WordPress bundle still owns its copy. `/styles.scss` and `/styles.css` are explicit so Sass's
package importer cannot confuse source and compiled files.

`tests/ts/packageEntries.test.ts` compiles isolated consumers with no workspace ambient types and
`skipLibCheck: false`, inspects contract bundles, and checks passive roots plus factory invocation.
These checks use temporary outputs and never run the WordPress synchronization build.
