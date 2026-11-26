import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { resolveOptions } from '@ts/core/options'
import { expect, it } from 'vitest'

/**
 * Options::build() with no Elementor behind it prints every control default. Running the real
 * PHP keeps the TypeScript defaults (resolveOptions) from drifting away from it. The WordPress
 * functions it touches are stubbed: `apply_filters` hands the value straight back.
 */
it('resolveOptions() equals what PHP Options::build() prints for an untouched Kit', () => {
  const stub = `
    define('ABSPATH', '/');
    function apply_filters($tag, $value) { return $value; }
    require $argv[1];
    echo json_encode(Arts\\SmoothScrolling\\Options::build());
  `
  const json = execFileSync('php', ['-r', stub, resolve('src/php/Options.php')], {
    encoding: 'utf8'
  })

  expect(JSON.parse(json)).toEqual(resolveOptions())
})
