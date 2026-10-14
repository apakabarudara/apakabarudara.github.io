import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const DATA_FILE = fileURLToPath(new URL('./data/latest.json', import.meta.url));
const PUBLIC_DIR = fileURLToPath(new URL('./web/public/', import.meta.url));
const SW_TEMPLATE = fileURLToPath(new URL('./web/sw.js', import.meta.url));

// web/public files are copied after the bundle is generated, so the precache list has to name the app's own ones itself.
// robots.txt is for crawlers and og-image.png for link previews; the page needs neither offline.
const NOT_PRECACHED = new Set(['robots.txt', 'og-image.png']);
function publicFiles(dir = PUBLIC_DIR, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? publicFiles(`${dir}${entry.name}/`, `${prefix}${entry.name}/`) : NOT_PRECACHED.has(entry.name) ? [] : [`${prefix}${entry.name}`]);
}

/**
 * Adds what the bundle does not contain: data/latest.json (written by the hourly ingest) and the service worker,
 * whose precache list is the built files plus the app's public files and whose cache version is a hash of that list. The version only changes
 * when a hashed file changes, so the hourly data refresh does not make every phone re-download the shell.
 */
function siteFiles() {
  return {
    name: 'site-files',
    configureServer(server) {
      server.middlewares.use('/data/latest.json', (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(readFileSync(DATA_FILE));
      });
    },
    // After Vite's own HTML and CSS steps, so the precache list holds every built file.
    generateBundle: { order: 'post', handler(_options, bundle) {
      const precache = [...Object.keys(bundle), ...publicFiles()].sort();
      // Public files keep their names, so their content goes into the version: a new icon must replace the cached one.
      const hash = createHash('sha256').update(precache.join('\n'));
      for (const file of publicFiles()) hash.update(readFileSync(PUBLIC_DIR + file));
      const version = hash.digest('hex').slice(0, 10);
      const source = readFileSync(SW_TEMPLATE, 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      this.emitFile({ type: 'asset', fileName: 'data/latest.json', source: readFileSync(DATA_FILE) });
    } }
  };
}

export default defineConfig({
  root: 'web',
  base: './',
  plugins: [siteFiles()],
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2020', cssCodeSplit: false, chunkSizeWarningLimit: 700, rollupOptions: { output: { inlineDynamicImports: true } }, assetsInlineLimit: 0, reportCompressedSize: true },
  server: { host: '127.0.0.1' }
});
