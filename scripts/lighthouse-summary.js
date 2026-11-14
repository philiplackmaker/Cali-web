// After Lighthouse CI: each page's median scores, LCP and CLS, as a table in the job summary
// and as check annotations (visible on the PR's Checks tab, and readable via the API
// without logging in). Pages that miss the brief's bar are flagged as errors.
import { readFile, readdir, appendFile } from 'node:fs/promises';

const DIR = '.lighthouseci/reports';
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const files = (await readdir(DIR).catch(() => [])).filter(
  (f) => f.endsWith('.json') && f !== 'manifest.json',
);
const runs = {};
for (const f of files) {
  let r;
  try {
    r = JSON.parse(await readFile(`${DIR}/${f}`, 'utf8'));
  } catch {
    continue;
  }
  if (!r.categories) continue;
  const page = new URL(r.finalDisplayedUrl).pathname;
  (runs[page] ??= []).push({
    scores: CATEGORIES.map((c) => Math.round(r.categories[c].score * 100)),
    lcp: r.audits['largest-contentful-paint'].numericValue,
    cls: r.audits['cumulative-layout-shift'].numericValue,
  });
}

if (!Object.keys(runs).length) {
  console.log('::warning title=Lighthouse::No Lighthouse reports found.');
  process.exit(0);
}

const rows = [];
for (const [page, list] of Object.entries(runs).sort()) {
  const scores = CATEGORIES.map((_, i) => median(list.map((x) => x.scores[i])));
  const lcp = Math.round(median(list.map((x) => x.lcp)));
  const cls = median(list.map((x) => x.cls));
  const ok = scores.every((s) => s >= 95) && lcp <= 2500 && cls <= 0.1;
  const line = `${page}: ${scores.join(' / ')} (perf / a11y / best practices / SEO), LCP ${lcp} ms, CLS ${cls.toFixed(3)}, ${list.length} runs`;
  console.log(
    `::${ok ? 'notice' : 'error'} title=Lighthouse ${ok ? 'pass' : 'FAIL'} ${page}::${line}`,
  );
  rows.push(
    `| ${ok ? '✅' : '❌'} | \`${page}\` | ${scores.join(' | ')} | ${lcp} | ${cls.toFixed(3)} |`,
  );
}

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '## Lighthouse (mobile, median run)',
      '',
      '| | Page | Perf | A11y | Best pr. | SEO | LCP ms | CLS |',
      '|---|---|---|---|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
  );
}
