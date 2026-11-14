import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '_site/**',
      '_site-e2e/**',
      '.lighthouseci/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
      'legacy/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/scripts/**/*.js', 'src/components/**/*.js', 'src/patterns/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      '*.js',
      'scripts/**/*.js',
      'src/_data/**/*.js',
      'src/**/*.11ty.js',
      'src/**/*.11tydata.js',
      'tests/**/*.js',
      'netlify/**/*.mjs',
      'tests/**/*.mjs',
      '*.cjs',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright specs run in Node, but page.evaluate() callbacks run in the browser.
    files: ['tests/e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
