import process from 'node:process'

export default {
  slug: 'smooth-scrolling-for-elementor',
  entry: { ts: './src/ts/boot.ts', gate: './src/ts/gate.ts', sass: './src/styles/index.scss' },
  paths: { php: './src/php', plugin: './src/wordpress-plugin', dist: './dist' },
  // Machine-specific: the Local site's plugin dir, from the gitignored .env (DEV_TARGET)
  devTarget: process.env.DEV_TARGET ?? null,
  esbuildTarget: 'es2022',
  versionConstant: 'ARTS_SMOOTH_SCROLLING_PLUGIN_VERSION',
  vendor: { autoloaderOnly: true }
}
