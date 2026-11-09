// Lighthouse CI: mobile scores of 95+ in every category, and LCP / CLS limits on the
// product page, from the brief's quality bar. Runs on the production build (_site).
// Locally it uses Playwright's Chromium unless CHROME_PATH is set.
let chromePath = process.env.CHROME_PATH;
if (!chromePath) {
  try {
    chromePath = require('playwright-core').chromium.executablePath();
  } catch {
    chromePath = undefined;
  }
}

const pages = [
  '/',
  '/shop/',
  '/shop/sun-hat-with-tulip/',
  '/shop/sun-hat-with-tulip-print/',
  '/about/',
  '/studio-letter/',
  '/contact/',
];

module.exports = {
  ci: {
    collect: {
      staticDistDir: './_site',
      url: pages.map((p) => `http://localhost${p}`),
      // 5 runs, judged by the median: the product page's LCP sits close to the limit on the
      // simulated network, and one slow run shouldn't decide the result.
      numberOfRuns: Number(process.env.LHCI_RUNS ?? 5),
      chromePath,
      settings: { chromeFlags: '--headless=new --no-sandbox' },
    },
    assert: {
      // Judge each page by its median run, not its best one.
      aggregationMethod: 'median-run',
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
