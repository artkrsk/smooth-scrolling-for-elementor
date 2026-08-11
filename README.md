# Arts Smooth Scrolling for Elementor

[![Tests](https://img.shields.io/github/actions/workflow/status/artkrsk/smooth-scrolling-for-elementor/test.yml?style=flat-square&logo=githubactions&logoColor=white&label=tests)](https://github.com/artkrsk/smooth-scrolling-for-elementor/actions/workflows/test.yml)
[![PHP](https://img.shields.io/badge/PHP-8.0+-777bb4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
[![WordPress](https://img.shields.io/badge/WordPress-6.0+-21759b?style=flat-square&logo=wordpress&logoColor=white)](https://wordpress.org)
[![License](https://img.shields.io/badge/license-GPLv3-blue?style=flat-square)](LICENSE)

Lenis-powered momentum scrolling for Elementor, with automatic GSAP ScrollTrigger sync and zero engine bytes on touch devices.

Configured from Elementor → Site Settings → Smooth Scrolling. Requires Elementor (the free version is fine).

[Developer reference](docs/developers.md) — the discovery global, the two PHP filters, the `<html>` state classes.

## Development

```bash
pnpm install
composer install
```

To mirror builds into a local WordPress site, set `DEV_TARGET` in a `.env` file to the site's plugin directory.

| Command           | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev:plugin` | Watch-compile the bundle, mirroring to `DEV_TARGET` when set |
| `pnpm build`      | Release build (stages `dist/` and zips it)                   |
| `pnpm test`       | Vitest                                                        |
| `pnpm typecheck`  | `tsc --noEmit`                                                |
| `pnpm lint`       | Biome                                                         |
| `pnpm phpstan`    | PHPStan at level max                                          |

A `pre-commit` hook runs the lint, typecheck, test and PHPStan gate; `pnpm install` installs it.

## License

[GPL-3.0-or-later](LICENSE). Bundles [Lenis](https://github.com/darkroomengineering/lenis) (MIT) — see [third-party-licenses.txt](src/wordpress-plugin/third-party-licenses.txt).

---

Made by [Artem Semkin](https://artemsemkin.com)
