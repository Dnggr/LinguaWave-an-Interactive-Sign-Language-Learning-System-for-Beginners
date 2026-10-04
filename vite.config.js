import { defineConfig } from 'vite';
import { resolve, relative } from 'node:path';
import { readdirSync } from 'node:fs';
import { cp } from 'node:fs/promises';

const root = import.meta.dirname;

/**
 * Find every HTML page in the repository.
 *
 * This means we do NOT have to manually maintain a list of 20+ pages.
 * Any new HTML page placed under the project will automatically become
 * a Vite entry point on the next build.
 */
function findHtmlEntries(dir, baseDir = dir) {
  const entries = {};

  for (const item of readdirSync(dir, { withFileTypes: true })) {
    // Never scan generated/dependency directories.
    if (
      item.name === 'node_modules' ||
      item.name === 'dist' ||
      item.name.startsWith('.')
    ) {
      continue;
    }

    const fullPath = resolve(dir, item.name);

    if (item.isDirectory()) {
      Object.assign(entries, findHtmlEntries(fullPath, baseDir));
      continue;
    }

    if (!item.isFile() || !item.name.endsWith('.html')) {
      continue;
    }

    const relativePath = relative(baseDir, fullPath)
      .replaceAll('\\', '/');

    // Example:
    // index.html
    // pages/dashboard.html
    // pages/admin-users.html
    const key = relativePath
      .replace(/\.html$/, '')
      .replace(/[^\w]+/g, '_');

    entries[key || 'index'] = fullPath;
  }

  return entries;
}

/**
 * Some parts of the existing LinguaWave frontend use runtime URLs such as:
 *
 *   /asl_static_model/model.json
 *   /asl_motion_model/model.json
 *   ../assets/...
 *   ../js/...
 *
 * We are deliberately NOT restructuring those files yet.
 *
 * During a production build, copy the existing runtime directories into
 * dist/ so the current application can continue to resolve those URLs.
 */
function copyRuntimeFiles() {
  return {
    name: 'copy-linguawave-runtime-files',
    apply: 'build',

    async closeBundle() {
      const directories = [
        'js',
        'assets',
        'asl_static_model',
        'asl_motion_model',
      ];

      await Promise.all(
        directories.map((directory) =>
          cp(
            resolve(root, directory),
            resolve(root, 'dist', directory),
            {
              recursive: true,
              force: true,
            }
          )
        )
      );
    },
  };
}

export default defineConfig({
  root,

  // This is still a normal multi-page website, not an SPA.
  appType: 'mpa',

  // Keep generated URLs relative to each HTML page.
  base: './',

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: findHtmlEntries(root),
    },
  },

  plugins: [
    copyRuntimeFiles(),
  ],
});