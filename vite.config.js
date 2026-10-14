import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const DATA_FILE = fileURLToPath(new URL('./data/latest.json', import.meta.url));
const HOTSPOTS_FILE = fileURLToPath(new URL('./data/hotspots.json', import.meta.url));
const PUBLIC_DIR = fileURLToPath(new URL('./web/public/', import.meta.url));
const SW_TEMPLATE = fileURLToPath(new URL('./web/sw.js', import.meta.url));

// web/public files are copied after the bundle is generated, so the precache list has to name the app's own ones itself.
// robots.txt is for crawlers and og-image.png for link previews; the page needs neither offline.
// sat/ holds the hourly satellite photos: generated at build time, changing every run, so never cached with the shell.
const NOT_PRECACHED = new Set(['robots.txt', 'og-image.png']);
// The lazy map chunk (Leaflet and its CSS) is fetched on demand: precaching it would add it to every first visit's transfer.
const LAZY_CHUNK = /^assets\/(satmap|kids)-/;
const NOT_PRECACHED_DIRS = new Set(['sat']);
function publicFiles(dir = PUBLIC_DIR, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? (NOT_PRECACHED_DIRS.has(entry.name) ? [] : publicFiles(`${dir}${entry.name}/`, `${prefix}${entry.name}/`)) : NOT_PRECACHED.has(entry.name) ? [] : [`${prefix}${entry.name}`]);
}

/**
 * Adds what the bundle does not contain: data/latest.json and data/hotspots.json (written by the hourly ingest) and the service worker,
 * whose precache list is the built files plus the app's public files and whose cache version is a hash of that list. The version only changes
 * when a hashed file changes, so the hourly data refresh does not make every phone re-download the shell.
 */
function siteFiles() {
  return {
    name: 'site-files',
    configureServer(server) {
      for (const [route, file] of [['/data/latest.json', DATA_FILE], ['/data/hotspots.json', HOTSPOTS_FILE]]) {
        server.middlewares.use(route, (_req, res) => {
          res.setHeader('content-type', 'application/json');
          res.end(readFileSync(file));
        });
      }
    },
    // After Vite's own HTML and CSS steps, so the precache list holds every built file.
    generateBundle: { order: 'post', handler(_options, bundle) {
      const precache = [...Object.keys(bundle).filter(f => !LAZY_CHUNK.test(f)), ...publicFiles()].sort();
      // Public files keep their names, so their content goes into the version: a new icon must replace the cached one.
      const hash = createHash('sha256').update(precache.join('\n'));
      for (const file of publicFiles()) hash.update(readFileSync(PUBLIC_DIR + file));
      const version = hash.digest('hex').slice(0, 10);
      const source = readFileSync(SW_TEMPLATE, 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      this.emitFile({ type: 'asset', fileName: 'data/latest.json', source: readFileSync(DATA_FILE) });
      // Absent until the first ingest run after this file was introduced; the smoke check flags it if it stays missing.
      if (existsSync(HOTSPOTS_FILE)) this.emitFile({ type: 'asset', fileName: 'data/hotspots.json', source: readFileSync(HOTSPOTS_FILE) });
    } }
  };
}

export default defineConfig({
  root: 'web',
  base: './',
  plugins: [siteFiles()],
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2020', cssCodeSplit: true, chunkSizeWarningLimit: 700, rollupOptions: { output: { codeSplitting: { groups: [{ name: 'satmap', test: /node_modules[\\/]leaflet|web[\\/]satmap/, priority: 2 }, { name: 'kids', test: /web[\\/]kids/, priority: 2 }, { name: 'index', test: /./, priority: 1 }] } } }, assetsInlineLimit: 0, reportCompressedSize: true },
  server: { host: '127.0.0.1' }
});
